// "Try my agent": a scripted, in-browser simulation of the banking assistant.
// It parses the visitor's request, then plays the pipeline step by step:
// guardrails → orchestrator → KYC → risk → tools → reply. No model or bank is involved.

const DAILY_LIMIT = 100000;
const BENEFICIARIES = ['mom', 'dad', 'rahul', 'priya', 'ananya'];
const NODES = ['input', 'guardrail', 'orchestrator', 'kyc', 'risk', 'tools', 'reply'];

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- Parsing ---------------- */

// Mask personal data before anything else sees it. Returns the masked text and what was found.
function redact(text) {
  const found = [];
  const mask = (label) => (m) => {
    found.push(label);
    const digits = m.replace(/\D/g, '');
    return digits.length >= 4 ? `[${label} ••${digits.slice(-4)}]` : `[${label}]`;
  };
  let t = text;
  t = t.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, () => { found.push('email'); return '[email]'; });
  t = t.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/gi, () => { found.push('PAN'); return '[PAN]'; });
  t = t.replace(/\b\d{4}\s\d{4}\s\d{4}\b/g, mask('Aadhaar'));
  t = t.replace(/(?:\+91[\s-]?)?\b[6-9]\d{9}\b/g, mask('phone'));
  t = t.replace(/\b\d{9,18}\b/g, mask('account'));
  return { masked: t, found };
}

function parseAmount(t) {
  const m = t.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(k|lakhs?|lacs?|crores?|cr)?\b/i)
    || t.match(/\b([\d,]+(?:\.\d+)?)\s*(k|lakhs?|lacs?|crores?|cr|rupees|rs)\b/i)
    || t.match(/\b(?:send|transfer|pay)\s+([\d,]+(?:\.\d+)?)\b/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ''));
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'k') n *= 1e3;
  else if (unit.startsWith('lakh') || unit.startsWith('lac')) n *= 1e5;
  else if (unit.startsWith('crore') || unit === 'cr') n *= 1e7;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseRecipient(t) {
  const m = t.match(/\bto\s+(?:my\s+)?([a-z]+)/i);
  if (!m) return null;
  const w = m[1].toLowerCase();
  if (['an', 'a', 'the', 'this', 'that', 'account', 'someone', 'unknown', 'them', 'me'].includes(w)) return null;
  return w;
}

const INJECTION = /(ignore|bypass|override|disregard|forget)\b.*\b(rules?|instructions?|guardrails?|polic(y|ies)|limits?)|system prompt|jailbreak|developer mode|you are now|act as (an? )?admin/i;
const OTHERS = /(someone else'?s|other (customers?|users?|people)'?s?|every(one|body)'?s|all (customers|users|accounts|balances)|another (customer|user)'?s)/i;

/* ---------------- Planning ---------------- */

// Turn a request into the steps the pipeline will play, and the final reply.
export function plan(raw, { pending = false } = {}) {
  const text = raw.trim();
  const { masked, found } = redact(text);
  const t = masked.toLowerCase();
  const steps = [];
  const add = (node, state, log) => steps.push({ node, state, log });

  add('input', 'ok', `received ${text.length} chars`);
  add('guardrail', found.length ? 'warn' : 'ok',
    found.length ? `pii.redact: masked ${found.length} item${found.length > 1 ? 's' : ''} (${[...new Set(found)].join(', ')})` : 'pii.redact: nothing to mask');

  // 1. Prompt injection and other people's data: stopped at the gate.
  if (INJECTION.test(t)) {
    add('guardrail', 'block', 'policy.injection: attempt to override instructions → BLOCKED');
    return { steps, masked, reply: "I can't do that. My safety rules can't be switched off, and this request has been logged. I'm happy to help with your own account though." };
  }
  if (OTHERS.test(t)) {
    add('guardrail', 'block', "policy.scope: request for other customers' data → BLOCKED");
    return { steps, masked, reply: 'I can only access your own accounts. Other customers\' information is private, so I can\'t share it.' };
  }
  add('guardrail', 'ok', 'policy.scope ✓  policy.injection ✓');

  // 2. Block a card: urgent, skips the risk check.
  if (/\b(block|freeze|lost|stolen)\b.*\bcard\b|\bcard\b.*\b(block|freeze|lost|stolen)\b/.test(t)) {
    add('orchestrator', 'ok', 'intent → card.block (priority: urgent)');
    add('kyc', 'ok', 'session verified ✓');
    add('risk', 'skip', 'skipped for urgent card block');
    add('tools', 'ok', 'card_services.block(card ••4821) → 200');
    return { steps, masked, reply: 'Done. Your debit card ending 4821 is blocked, so no new payments can go through. Would you like me to order a replacement?' };
  }

  // 3. Money transfer.
  if (/\b(send|transfer|pay|wire)\b/.test(t)) {
    const amount = parseAmount(t);
    const who = parseRecipient(t);
    const toAccount = /\[account/.test(masked);
    add('orchestrator', 'ok', `intent → transfer.initiate${amount ? ` (${inr(amount)})` : ''}${who ? ` → ${who}` : toAccount ? ' → external account' : ''}`);
    if (!amount) {
      add('orchestrator', 'warn', 'missing slot: amount → ask user');
      return { steps, masked, reply: `Sure. How much would you like to send${who ? ` to ${cap(who)}` : ''}?` };
    }
    if (!who && !toAccount) {
      add('orchestrator', 'warn', 'missing slot: recipient → ask user');
      return { steps, masked, reply: `Who should I send ${inr(amount)} to? You can pick a saved beneficiary or give me their account.` };
    }
    add('kyc', 'ok', 'OTP sent to registered mobile → verified ✓ (demo)');
    if (amount > DAILY_LIMIT) {
      add('risk', 'block', `amount ${inr(amount)} > daily limit ${inr(DAILY_LIMIT)} → HOLD`);
      return { steps, masked, reply: `I can't send ${inr(amount)} in one go. Your daily limit is ${inr(DAILY_LIMIT)}. You can split it across days, or visit a branch to approve a larger transfer.` };
    }
    const known = who && BENEFICIARIES.includes(who);
    if (!known) {
      add('risk', 'warn', 'new payee → cooling period, extra confirmation required');
      add('tools', 'ok', `core_banking.add_beneficiary(${who ? cap(who) : 'external'}) → 200`);
      add('tools', 'ok', 'core_banking.transfer → pending confirmation');
      return { steps, masked, reply: `${who ? cap(who) : 'That account'} isn't a saved beneficiary yet, so I've added them first. New payees need one extra confirmation. Reply "confirm" to send ${inr(amount)}.` };
    }
    add('risk', 'ok', `within daily limit ✓  known payee ✓`);
    add('tools', 'ok', `core_banking.transfer(${cap(who)}, ${inr(amount)}) → pending confirmation`);
    return { steps, masked, reply: `Ready to send ${inr(amount)} to ${cap(who)}. Reply "confirm" and it goes through.` };
  }

  // 4. Confirmation of a pending transfer.
  if (/^\s*(confirm|yes|ok|go ahead|do it)\b/.test(t)) {
    if (!pending) {
      add('orchestrator', 'warn', 'intent → transfer.confirm, but nothing is pending');
      return { steps, masked, reply: "There's nothing waiting for confirmation. Try sending money first, e.g. \"Send ₹2,000 to Rahul\"." };
    }
    add('orchestrator', 'ok', 'intent → transfer.confirm');
    add('kyc', 'ok', 'session verified ✓');
    add('risk', 'ok', 'final check ✓');
    add('tools', 'ok', 'core_banking.transfer.commit → 200 · ref TXN8841');
    return { steps, masked, reply: 'Sent! Reference TXN8841. You\'ll get an SMS confirmation in a moment.' };
  }

  // 5. Add a beneficiary.
  if (/\badd\b.*\b(beneficiar|payee)|\badd (my )?\w+ as\b/.test(t)) {
    const m = t.match(/\badd (?:my )?(\w+)/);
    const who = m ? m[1] : 'payee';
    add('orchestrator', 'ok', `intent → beneficiary.add (${who})`);
    add('kyc', 'ok', 'OTP sent to registered mobile → verified ✓ (demo)');
    add('risk', 'ok', 'new payee → 30-min cooling period applied');
    add('tools', 'ok', 'core_banking.add_beneficiary → 200');
    return { steps, masked, reply: `Added your ${who} as a beneficiary. For your safety, you can send up to ₹25,000 to a new payee for the first 30 minutes.` };
  }

  // 6. Balance.
  if (/\b(balance|how much (money|do i have))\b/.test(t)) {
    add('orchestrator', 'ok', 'intent → account.balance');
    add('kyc', 'ok', 'session verified ✓');
    add('risk', 'skip', 'read-only request');
    add('tools', 'ok', 'core_banking.get_balance(savings) → 200');
    return { steps, masked, reply: 'Your savings account balance is ₹48,250.00 (demo account).' };
  }

  // 7. Recent transactions.
  if (/\b(transactions?|statement|spent|history)\b/.test(t)) {
    add('orchestrator', 'ok', 'intent → account.transactions(last 3)');
    add('kyc', 'ok', 'session verified ✓');
    add('risk', 'skip', 'read-only request');
    add('tools', 'ok', 'core_banking.list_transactions → 200');
    return { steps, masked, reply: 'Your last 3 transactions: ₹1,200 to Swiggy (yesterday), ₹15,000 salary credit (25 Sep), ₹499 to Netflix (22 Sep). (Demo data.)' };
  }

  // 8. Greetings and help.
  if (/^\s*(hi|hello|hey|namaste|help|what can you do)\b/.test(t)) {
    add('orchestrator', 'ok', 'intent → help');
    return { steps, masked, reply: 'Hi! I can check your balance, show recent transactions, send money, add beneficiaries and block a lost card. What do you need?' };
  }

  // 9. Anything else is out of scope.
  add('orchestrator', 'warn', 'no matching tool → out of scope');
  return { steps, masked, reply: "That's outside what I can do. I handle banking tasks: balances, transfers, beneficiaries and cards." };
}

/* ---------------- UI ---------------- */

export function mountDemo(root, { reduced = false } = {}) {
  const msgs = root.querySelector('[data-demo-msgs]');
  const trace = root.querySelector('[data-demo-trace]');
  const form = root.querySelector('[data-demo-form]');
  const input = root.querySelector('[data-demo-input]');
  const send = root.querySelector('[data-demo-send]');
  const nodes = Object.fromEntries(NODES.map((n) => [n, root.querySelector(`[data-node="${n}"]`)]));
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  let busy = false;
  let pending = false; // a transfer is waiting for "confirm"

  const bubble = (who, html) => {
    const el = document.createElement('div');
    el.className = `dm dm--${who}`;
    el.innerHTML = html;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  };

  function reset() {
    Object.values(nodes).forEach((n) => { n.dataset.state = 'idle'; n.querySelector('.pipe__note').textContent = ''; });
    trace.innerHTML = '';
  }

  async function run(text) {
    if (busy || !text.trim()) return;
    busy = true;
    send.disabled = true;
    root.querySelectorAll('[data-demo-chip]').forEach((c) => (c.disabled = true));

    const result = plan(text, { pending });
    pending = /Reply "confirm"/.test(result.reply);
    bubble('user', esc(text));
    reset();

    let ms = 0;
    for (const step of result.steps) {
      const node = nodes[step.node];
      node.dataset.state = 'run';
      await wait(260);
      ms += 120 + Math.round(Math.random() * 220);
      node.dataset.state = step.state;
      node.querySelector('.pipe__note').textContent = { ok: 'passed', warn: 'flagged', block: 'blocked', skip: 'skipped' }[step.state];
      trace.innerHTML += `<span class="t-time">+${String(ms).padStart(4)}ms</span>  <span class="t-${step.state}">${step.node.padEnd(12)}</span> ${esc(step.log)}\n`;
      trace.scrollTop = trace.scrollHeight;
      await wait(220);
    }

    // Anything that never ran stays dim; the reply node lights up last.
    const blocked = result.steps.some((s) => s.state === 'block');
    nodes.reply.dataset.state = blocked ? 'block' : 'ok';
    nodes.reply.querySelector('.pipe__note').textContent = blocked ? 'refused' : 'sent';
    ms += 180;
    trace.innerHTML += `<span class="t-time">+${String(ms).padStart(4)}ms</span>  <span class="t-ok">langfuse    </span> trace saved · local LLM (vLLM) · ${result.steps.length + 1} steps · ${(ms / 1000).toFixed(1)}s\n`;

    const typing = bubble('bot', '<span class="dm__typing"><i></i><i></i><i></i></span>');
    await wait(450);
    typing.innerHTML = esc(result.reply);
    msgs.scrollTop = msgs.scrollHeight;

    busy = false;
    send.disabled = !input.value.trim();
    root.querySelectorAll('[data-demo-chip]').forEach((c) => (c.disabled = false));
  }

  root.querySelectorAll('[data-demo-chip]').forEach((c) => c.addEventListener('click', () => run(c.textContent)));
  input.addEventListener('input', () => { send.disabled = busy || !input.value.trim(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = '';
    send.disabled = true;
    run(text);
  });
  reset();
}
