// "Ask my agent": an optional chat drawer. Answers are pre-written in kb.js
// and routed by keyword score; nothing is generated.
import { TOPICS, PROJECTS, WELCOME, FALLBACK } from './kb.js?v=20260927';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

export function route(text) {
  const q = ' ' + text.toLowerCase().replace(/[^\w\s.;'-]/g, ' ').replace(/\s+/g, ' ') + ' ';
  let best = null;
  let bestScore = 0;
  for (const [id, t] of Object.entries(TOPICS)) {
    let score = 0;
    for (const k of t.keys) {
      // Short keys must match whole words ("ml" should not match "html").
      const hit = k.trim().length <= 3
        ? new RegExp(`\\b${k.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q)
        : q.includes(k);
      if (hit) score += k.length;
    }
    if (score > bestScore) { best = id; bestScore = score; }
  }
  return best;
}

const list = (items) => h(`<div class="b-list">${items.map(([t, d]) => `<div><b>${t}</b><span>${d}</span></div>`).join('')}</div>`);

export function mountChat({ reduced = false, onAsk } = {}) {
  const panel = $('[data-agent]');
  const fab = $('[data-agent-open]');
  const log = $('[data-log]', panel);
  const scroller = $('[data-scroll]', panel);
  const suggest = $('[data-suggest]', panel);
  const form = $('[data-form]', panel);
  const input = $('[data-input]', panel);
  const send = $('[data-send]', panel);
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const toBottom = () => { scroller.scrollTop = scroller.scrollHeight; };

  const BLOCKS = {
    stats: () => list([['4 banks', 'running my agentic assistant'], ['2+ years', 'shipping GenAI to production'], ['3 ML models', 'with business impact'], ['10 states', 'in a real-time onboarding flow']]),
    projects: () => {
      const el = h('<div class="b-list"></div>');
      PROJECTS.forEach((p) => {
        const b = h(`<button type="button"><b>${esc(p.title)}</b><span>${esc(p.blurb)}</span></button>`);
        b.addEventListener('click', () => ask(p.id));
        el.appendChild(b);
      });
      return el;
    },
    trace: () => {
      const rows = [
        ['orchestrator', 'intent: beneficiary.add, transfer'],
        ['guardrail', 'pii.redact ✓ policy.scope ✓'],
        ['kyc_agent', 'OTP verified ✓'],
        ['tool', 'core_banking.add_beneficiary → 200'],
        ['risk_agent', 'within daily limit ✓'],
        ['langfuse', 'trace a91f · 1.8s'],
      ];
      const el = h('<pre class="b-trace"></pre>');
      el.innerHTML = rows.map(([t, d]) => `<span class="t-tag">[${t}]</span>${' '.repeat(14 - t.length)}${esc(d).replace(/✓/g, '<span class="t-ok">✓</span>')}`).join('\n');
      return el;
    },
    states: () => h(`<ul class="b-chips">${['Greet', 'Consent', 'Identity', 'OTP', 'Verify', 'Documents', 'Capture', 'Review', 'Confirm', 'Done'].map((s, i) => `<li>${i + 1}. ${s}</li>`).join('')}</ul>`),
    sql: () => h('<pre class="b-trace"><span class="t-tag">SELECT</span> branch, COUNT(*)\n<span class="t-tag">FROM</span> accounts\n<span class="t-tag">GROUP BY</span> branch\n<span class="t-tag">ORDER BY</span> 2 <span class="t-tag">DESC LIMIT</span> 5;</pre>'),
    stack: () => list([
      ['AI / ML', 'LLMs, RAG, multi-agent systems, ML, vector DBs'],
      ['Frameworks', 'CrewAI, LangChain, AutoGen'],
      ['Voice AI', 'Gemini Live, ElevenLabs, LiveKit, Twilio'],
      ['Responsible AI', 'Guardrails, governance, Langfuse, monitoring'],
      ['Engineering', 'Python, SQL, FastAPI, Streamlit, React'],
      ['Documents', 'LlamaParse, Docling'],
      ['Security', 'Burp Suite, VAPT'],
    ]),
    pillars: () => list([
      ['Guardrails', 'Policy checks on every input and output, scope limits, PII handling.'],
      ['Observability', 'Every agent step traced in Langfuse.'],
      ['Governance', 'Monitoring after launch and a clear decision trail.'],
      ['Security', 'VAPT testing with Burp Suite.'],
    ]),
    steps: () => list([
      ['01 Decompose', 'Requirements, data flows, service boundaries.'],
      ['02 Prototype', 'A working POC in Streamlit or React on FastAPI.'],
      ['03 Orchestrate', 'Agents, tools, retrieval and document pipelines.'],
      ['04 Govern', 'Guardrails, tracing and monitoring from day one.'],
    ]),
    timeline: () => list([
      ['2024 – now', 'AI Solutions Consultant, Systems & GenAI Applications'],
      ['2024', 'Business Analyst, same organisation'],
      ['Education', 'B.Tech CSE, G.H. Raisoni College of Engineering, Nagpur. CGPA 8.98'],
    ]),
    contact: () => {
      const el = h(`<div class="b-contact"><a class="primary" href="mailto:adityabshukla12@gmail.com">Email me</a><button type="button">Copy email</button><a href="https://www.linkedin.com/in/aditya-shukla-2a86991b4/" target="_blank" rel="noopener">LinkedIn</a></div>`);
      const b = $('button', el);
      b.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText('adityabshukla12@gmail.com'); b.textContent = 'Copied'; } catch { b.textContent = 'adityabshukla12@gmail.com'; }
        setTimeout(() => (b.textContent = 'Copy email'), 2000);
      });
      return el;
    },
    chips: (b) => h(`<ul class="b-chips">${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`),
  };

  function chips(ids) {
    suggest.innerHTML = '';
    ids.filter((id) => TOPICS[id]).forEach((id) => {
      const b = h(`<button type="button" class="chip">${esc(TOPICS[id].q)}</button>`);
      b.addEventListener('click', () => ask(id));
      suggest.appendChild(b);
    });
  }

  async function stream(container, text) {
    const p = document.createElement('p');
    container.appendChild(p);
    for (const part of text.split(/(\*\*[^*]+\*\*)/).filter(Boolean)) {
      const bold = part.startsWith('**');
      const target = bold ? p.appendChild(document.createElement('strong')) : p;
      for (const w of (bold ? part.slice(2, -2) : part).split(/(\s+)/)) {
        target.append(w);
        if (w.trim()) { toBottom(); await wait(12); }
      }
    }
  }

  let busy = false;
  async function ask(id, typed) {
    if (busy) return;
    busy = true;
    send.disabled = true;
    const topic = TOPICS[id] || FALLBACK;
    suggest.innerHTML = '';

    const u = h('<div class="msg msg--user"></div>');
    u.textContent = typed || topic.q;
    log.appendChild(u);

    const m = h(`<div class="msg msg--bot"><p class="status">${esc(topic.status)}</p></div>`);
    log.appendChild(m);
    toBottom();
    onAsk?.(topic);
    await wait(550);
    $('.status', m).classList.add('is-done');

    for (const t of topic.text) await stream(m, t);
    for (const b of topic.blocks) {
      const el = BLOCKS[b.type](b);
      el.classList.add('block');
      m.appendChild(el);
      toBottom();
      await wait(80);
    }
    chips(topic.next || []);
    toBottom();
    busy = false;
    send.disabled = !input.value.trim();
  }

  function open() {
    panel.hidden = false;
    document.body.classList.add('agent-open');
    if (!log.children.length) {
      const m = h('<div class="msg msg--bot"><p>Hi! Ask me anything about my work. These answers are written by me ahead of time, not generated, so they are always accurate.</p></div>');
      log.appendChild(m);
      chips(WELCOME);
    }
    setTimeout(() => input.focus({ preventScroll: true }), 50);
  }
  function close() {
    panel.hidden = true;
    document.body.classList.remove('agent-open');
    fab.focus({ preventScroll: true });
  }

  fab.addEventListener('click', open);
  $('[data-agent-close]', panel).addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });
  input.addEventListener('input', () => { send.disabled = busy || !input.value.trim(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    ask(route(text), text);
  });
}
