// Agent Atlas: a hands-on field guide to AI agents. Every demo runs on
// simulated data in the browser; regions change currency, tax, IDs, systems
// and laws; universes are shared with the main portfolio.
import { REGIONS, REGION_ORDER, guessRegion, CHECKS, LEDGERS, JURIS, LAWS, ONCE, SOURCES } from './data.js?v=20261111';
import { UNIVERSES, loadFont, mountEffects, setEffectsUniverse } from '../assets/js/universes.js?v=20261111';
import { mountBuddy, BEAR_FACE } from '../assets/js/buddy.js?v=20261111';

const V = '20261111';
/* ---------- utilities ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(k)); }
  return e;
}
function hlJSON(obj) {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  return esc(s).replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)/g, (m, str, colon, kw, num) => {
    if (str) return colon ? `<span class="k">${str}</span>${colon}` : `<span class="s">${str}</span>`;
    if (kw) return `<span class="n">${kw}</span>`;
    if (num) return `<span class="n">${num}</span>`;
    return m;
  });
}
function codeBlock(obj, cap, capRight) {
  const wrap = h('div', null);
  if (cap) wrap.append(h('p', { class: 'code-cap' }, h('span', null, cap), capRight ? h('span', null, capRight) : null));
  const pre = h('pre', { class: 'code', tabindex: '0' });
  pre.innerHTML = typeof obj === 'string' && obj.startsWith('RAW:') ? obj.slice(4) : hlJSON(obj);
  wrap.append(pre);
  return wrap;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, REDUCED ? Math.min(ms, 60) : ms));
function runner() { let id = 0; return { next() { return ++id; }, alive(t) { return t === id; } }; }
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* blocked */ } } };

/* ---------- region ---------- */
let RK = store.get('atlas-region');
if (!REGIONS[RK]) RK = guessRegion();
let R = REGIONS[RK];
let LG = LEDGERS[R.ledger];
const money = (n, d = 2) => new Intl.NumberFormat(R.locale, { style: 'currency', currency: R.cur, minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
const moneyK = (n) => new Intl.NumberFormat(R.locale, { style: 'currency', currency: R.cur, notation: 'compact', maximumFractionDigits: 1 }).format(n);
const num2 = (n) => Number(n).toLocaleString(R.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = (n) => Math.round(n * 100) / 100;
const unitP = (base) => (R.cur === 'INR' ? Math.round(base * R.fx) : r2(base * R.fx)); // a unit price, local
const listP = (base) => Math.round((base * R.fx) / R.step) * R.step; // a list price, rounded
const pct = (x) => { const v = x * 100; return (Number.isInteger(Math.round(v * 100) / 100) ? v.toFixed(0) : v.toFixed(2)) + '%'; };
const dshort = (y, m, d) => new Intl.DateTimeFormat(R.locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d));
const dnum = (y, m, d) => new Intl.DateTimeFormat(R.locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(y, m - 1, d));
const fmtId = (v) => R.id.fmt(v);
const onRegion = []; // re-render hooks

function setRegion(k) {
  if (!REGIONS[k]) return;
  RK = k; R = REGIONS[k]; LG = LEDGERS[R.ledger];
  store.set('atlas-region', k);
  paintRegion();
  onRegion.forEach((f) => { try { f(); } catch (e) { console.warn(e); } });
}
function paintRegion() {
  $$('[data-r="ledger"]').forEach((e) => (e.textContent = LG.name));
  $$('[data-r="crm"]').forEach((e) => (e.textContent = R.crm));
  $$('[data-r="label"]').forEach((e) => (e.textContent = R.label));
  $$('#region-chips .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.k === RK)));
  $('#region-note').textContent = `Showing ${R.label}: prices in ${R.cur}, ${R.tax.name} at ${pct(R.tax.rate)}, ${R.id.name} checks, ${LG.name} and ${R.crm}. Every demo and the rules in chapter 7 follow your choice.`;
}
(function regionChips() {
  const box = $('#region-chips');
  REGION_ORDER.forEach((k) => box.append(h('button', { class: 'chip', type: 'button', 'data-k': k, 'aria-pressed': 'false', onclick: () => setRegion(k) }, h('i', null, REGIONS[k].code), REGIONS[k].short)));
})();

/* ---------- the five layers (shared by the 3D scene and the architecture section) ---------- */
const layers = () => [
  { id: 'L1', name: 'Channels', tier: 'Presentation tier', short: 'Channels',
    desc: 'Where people and documents come in: a phone line, a chat widget, WhatsApp, a shared inbox, Teams or Slack, a dashboard.',
    tech: ['Twilio', 'LiveKit', 'Web widget', 'WhatsApp Business', 'Microsoft Graph', 'Gmail API', 'Teams / Slack', 'Power BI / Data Studio'],
    io: ['Voice, text, files', 'an authenticated request'],
    nodes: [['web', 'Web chat'], ['phone', 'Phone line'], ['inbox', 'Email inbox'], ['upload', 'Upload / scan'], ['teams', 'Teams / Slack'], ['dash', 'Dashboard']] },
  { id: 'L2', name: 'API gateway · FastAPI', tier: 'Application tier · edge', short: 'API gateway',
    desc: 'One typed front door. Every request is authenticated, checked against a schema, tagged with a tenant and a trace ID, then answered or queued.',
    tech: ['FastAPI', 'Pydantic', 'OAuth2 / JWT', 'HMAC webhooks', 'SQS / Redis queue'],
    io: ['HTTP request or webhook', 'a validated job'],
    nodes: [['gateway', 'REST endpoints'], ['hooks', 'Webhook receiver'], ['auth', 'Auth & tenancy'], ['queue', 'Job queue']] },
  { id: 'L3', name: 'Agent orchestration', tier: 'Application tier · logic', short: 'Agents',
    desc: 'The LLMs that plan and decide, and the code around them: routing, memory, guardrails and the human approval step.',
    tech: ['Claude, Gemini or GPT via regional endpoints', 'Open models on vLLM', 'LangGraph / CrewAI / AutoGen', 'LlamaIndex', 'Guardrail checks', 'Approval inbox'],
    io: ['A job plus context', 'tool calls, then a result or a question for a person'],
    nodes: [['orch', 'Orchestrator'], ['spec', 'Specialist agents'], ['guard', 'Guardrails'], ['human', 'Human approval']] },
  { id: 'L4', name: 'Tools & integrations', tier: 'Application tier · adapters', short: 'Tools',
    desc: 'Each tool wraps one API call with an input schema and the narrowest permission it needs. Served over MCP so any agent can reuse it.',
    tech: [LG.name, 'Xero / QuickBooks / Zoho Books / Tally', R.crm, 'Calendar APIs', 'n8n', 'LlamaParse / Docling', 'ERP / inventory'],
    io: ['A validated JSON payload', 'an API call and a structured result'],
    nodes: [['acct', 'Ledger'], ['crm', 'CRM'], ['cal', 'Calendar'], ['n8n', 'n8n flows'], ['rag', 'Retrieval'], ['ocr', 'Doc parser'], ['erp', 'ERP / inventory']] },
  { id: 'L5', name: 'Data', tier: 'Data tier', short: 'Data',
    desc: `Our state lives here: jobs, features, embeddings, files and traces. Your systems of record stay put: ${LG.name} stays the ledger, ${R.crm} stays the CRM.`,
    tech: ['Postgres + pgvector', 'ChromaDB', 'Object store, in-region', 'BigQuery / Fabric', 'Langfuse'],
    io: ['Writes, vectors, traces', 'memory and an audit trail'],
    nodes: [['pg', 'Postgres'], ['vec', 'Vector index'], ['s3', 'Object store'], ['wh', 'Warehouse'], ['trace', 'Langfuse traces']] },
];
let LAYERS = layers();
const NODE_INFO = {};
LAYERS.forEach((L, li) => L.nodes.forEach(([id, label]) => (NODE_INFO[id] = { label, layer: li })));

/* routes for the 3D scene: [nodeId, caption] */
const routes = () => ({
  lead: { title: 'Inbound lead qualifier', sub: 'A prospect calls after hours and leaves with a booked site visit.', steps: [
    ['phone', 'Call lands on a Twilio number and streams into a LiveKit room'],
    ['gateway', 'Agent session opens; caller ID and tenant resolved'],
    ['orch', 'Voice agent runs the qualifying conversation'],
    ['rag', 'Product questions answered from the approved FAQ'],
    ['vec', 'Hybrid search over FAQ chunks'],
    ['crm', `Contact looked up in ${R.crm}, then created with the qualifying answers`],
    ['cal', 'Free rep slots found and the visit booked'],
    ['guard', 'Checks: AI disclosure given, no price promised'],
    ['trace', 'Transcript, tool calls and cost logged']] },
  scoring: { title: 'CRM lead scoring', sub: `A new contact in ${R.crm} is enriched, scored and routed.`, steps: [
    ['hooks', `${R.crm} webhook: contact created`],
    ['queue', 'Scoring job queued'],
    ['spec', 'Enrichment agent reads the form message and website'],
    ['pg', 'Features stored for the model and for audit'],
    ['spec', 'Model scores 0–100 and explains the top factors'],
    ['crm', 'Score and reasons written to custom fields'],
    ['teams', 'Hot leads alerted to the owner in Teams or Slack']] },
  quote: { title: 'Proposal & quoting', sub: 'A customer email becomes a priced, approved quote.', steps: [
    ['inbox', 'Customer asks for a quote by email'],
    ['gateway', 'Email parsed into a quote job'],
    ['spec', 'Extraction agent turns the request into line items'],
    ['erp', 'Live price, cost and stock pulled from the ERP'],
    ['guard', `Margin floor, discount rules and ${R.tax.name} applied in code`],
    ['human', 'Manager approves if margin drops below the floor'],
    ['acct', `Quote created in ${LG.name}`],
    ['s3', 'PDF stored and sent from the CRM']] },
  invoice: { title: 'Invoice capture', sub: 'How one supplier bill moves through the system.', steps: [
    ['inbox', 'Supplier PDF arrives in the accounts inbox'],
    ['s3', 'Original stored in-region and hashed for duplicate checks'],
    ['queue', 'Capture job queued'],
    ['ocr', 'Layout and text parsed'],
    ['spec', 'LLM fills the bill schema with confidence scores'],
    ['guard', `${R.id.name}, ${R.tax.name}, totals, duplicates and bank details checked`],
    ['acct', `Draft bill created in ${LG.name} with the PDF attached`],
    ['human', 'Exceptions go to the review queue'],
    ['trace', 'Every step traced for audit']] },
  middleware: { title: 'Cross-system middleware', sub: 'A legacy job system event updates three cloud apps.', steps: [
    ['hooks', 'Legacy job system reports "job completed"'],
    ['queue', 'Event queued with an idempotency key'],
    ['n8n', 'n8n maps codes and routes the event'],
    ['spec', "AI step reads the technician's notes for billable extras"],
    ['acct', `Draft invoice raised in ${LG.name}`],
    ['crm', `Deal stage updated in ${R.crm}`],
    ['teams', 'Team notified with a link to review']] },
  knowledge: { title: 'Knowledge assistant', sub: 'A staff question answered from SOPs, with sources.', steps: [
    ['teams', 'Question asked in Teams'],
    ['auth', 'User identified; their groups loaded'],
    ['orch', 'Question rewritten for search'],
    ['rag', 'Hybrid retrieval: keywords plus meaning'],
    ['vec', 'Top passages fetched with access labels'],
    ['guard', "Passages the user can't see removed; citations checked"],
    ['teams', 'Answer posted with links to the source paragraphs']] },
  reporting: { title: 'Executive reporting', sub: "Monday's numbers, assembled before Monday.", steps: [
    ['queue', 'Schedule fires at 06:00'],
    ['acct', `Revenue and cash pulled from ${LG.name}`],
    ['erp', 'Stock levels pulled from inventory'],
    ['wh', 'Joined in the warehouse with GA4 and Meta Ads data'],
    ['spec', 'Anomaly check, then the briefing is drafted'],
    ['guard', 'Every number in the briefing matched to a query result'],
    ['dash', 'Dashboard refreshed'],
    ['teams', 'Briefing posted to the leadership channel']] },
});
let ROUTES = routes();
const ROUTE_ORDER = ['invoice', 'lead', 'scoring', 'quote', 'middleware', 'knowledge', 'reporting'];
const ROUTE_LABEL = { lead: 'Lead qualifier', scoring: 'CRM scoring', quote: 'Quoting', invoice: 'Invoice capture', middleware: 'Middleware', knowledge: 'Knowledge assistant', reporting: 'Exec reporting' };

/* ---------- architecture bands ---------- */
function renderBands() {
  $('#bands').replaceChildren(...LAYERS.map((L, i) => h('div', { class: 'band' + (i >= 1 && i <= 3 ? ' tier-app' : '') },
    h('div', { class: 'tierlab' }, h('span', null, L.tier), h('b', null, L.name)),
    h('p', null, L.desc),
    h('div', { class: 'tech' }, L.tech.map((t) => h('span', { class: 'tag' }, t))),
    h('div', { class: 'io', html: `<b>In:</b> ${esc(L.io[0])} &nbsp;→&nbsp; <b>Out:</b> ${esc(L.io[1])}` }))));
}
function renderGateway() {
  const n = 'RT-20817';
  $('#gw-io').replaceChildren(
    codeBlock({ tenant_id: 'ridgeline', source: 'email', file_url: `s3://atlas-inbox-${R.bucket}/ridgeline/2026/11/${n}.pdf`, callback_url: 'https://hooks.ridgeline.example/ai' }, 'Input · POST /v1/jobs/invoice-capture', 'client → gateway'),
    codeBlock({ job_id: 'job_8f3a', status: 'needs_review', result: { supplier: R.supplier, currency: R.cur, total: unitP(2688.4), checks_failed: [`${R.tax.key}_mismatch`], ledger_bill_id: null }, review_url: 'https://app.example/review/job_8f3a', trace_id: 'lf_7c21e9' }, 'Output · 202 Accepted, then GET /v1/jobs/job_8f3a', 'gateway → client'));
}
function renderDeploy() {
  $('#deploy').replaceChildren(
    h('div', null, h('span', { class: 'eyebrow' }, 'Where it runs'), h('b', null, R.cloud.where), h('span', null, R.cloud.alt)),
    h('div', null, h('span', { class: 'eyebrow' }, 'Which models'), h('b', null, 'Frontier or open-weight'), h('span', null, 'Frontier models through Bedrock, Azure AI Foundry or Vertex AI, with in-region or geography-scoped inference where offered. When data must stay inside, open-weight models on vLLM in your own network.')),
    h('div', null, h('span', { class: 'eyebrow' }, 'How it ships'), h('b', null, 'Infrastructure as code'), h('span', null, 'Terraform, CI/CD, a separate staging tenant, and the eval suite as a release gate.')),
    h('div', null, h('span', { class: 'eyebrow' }, 'Who owns it'), h('b', null, 'You do'), h('span', null, 'Code, prompts, eval sets and data live in your accounts. No lock-in to us or to one model vendor.')));
}

/* ---------- foundations ladder ---------- */
const sampleInv = () => ({ number: 'INV-0412', contact: 'Harbourside Joinery', total: Math.round(4180 * R.fx), due: '2026-10-26' });
const rungs = () => [
  { t: 'LLM', d: 'Reads text, writes text', analogy: 'A brilliant new hire, locked in a room with no phone and no files.',
    adds: 'Language: summarising, drafting, classifying, extracting, reasoning over what it is given.',
    cant: 'Knows nothing about your business after its training date, and cannot press a single button.',
    io: { cap: 'Input → output', obj: { input: 'Summarise this complaint in one line: Third late delivery this month, I want a credit on my next order...', output: 'Customer reports a third late delivery this month and wants a credit.' } } },
  { t: 'RAG', d: 'Answers from your documents', analogy: 'The same hire, now handed the right pages from your filing cabinet before each question.',
    adds: 'Your facts. We search your SOPs, policies and past cases, paste the best passages into the prompt, and ask for an answer with citations.',
    cant: "Still read-only. It can tell you the refund policy; it can't issue the refund.",
    io: { cap: 'Retrieved context goes in with the question', obj: { question: 'How long do customers have to return a product?', context: [{ source: 'Returns Policy v3 §2', text: 'Change-of-mind returns accepted within 30 days with receipt.' }], answer: '30 days for change-of-mind returns, with a receipt [Returns Policy v3 §2].' } } },
  { t: 'API', d: 'How software talks to software', analogy: 'The order window of every app you own: a fixed menu, a fixed way to write the order.',
    adds: `${LG.name}, ${R.crm}, Google Calendar and Shopify all publish APIs: named requests over HTTPS that take and return JSON. This is how anything gets done in those systems without a person clicking.`,
    cant: 'An API does exactly what it is told. It has no idea whether the request makes sense.',
    io: { cap: `A real ${LG.name} API request and a trimmed response`, obj: { request: LG.get('INV-0412', R), headers: Object.fromEntries(LG.headers.split('\n').map((l) => l.split(': '))), response: LG.result(sampleInv()) } } },
  { t: 'Tool', d: 'An API the model can choose', analogy: 'A labelled button on the order window, with a form that says exactly what to fill in.',
    adds: 'We wrap each API call with a name, a plain-English description and a JSON Schema for its inputs. The model reads the labels, picks a tool and writes the input JSON. Our code validates it and makes the call.',
    cant: 'Pick a goal or sequence steps on its own. A tool is one action; something has to decide which, and when.',
    io: { cap: 'A tool definition, as the model sees it', obj: { name: LG.tool, description: `Look up one sales invoice in ${LG.name} by its number. Read-only.`, input_schema: { type: 'object', properties: { invoice_number: { type: 'string', pattern: '^INV-\\d{4}$' } }, required: ['invoice_number'] } } } },
  { t: 'Agent', d: 'LLM + tools, in a loop', analogy: 'The new hire with the filing cabinet, the order window, a checklist, and a manager who signs off on anything risky.',
    adds: 'Agent = LLM + tools + a loop + memory + guardrails. It plans a step, calls a tool, reads the result, decides the next step, and stops when the job is done or a person is needed. Several agents can split a job under an orchestrator.',
    cant: 'Be trusted blindly. Its freedom is exactly why permissions, approvals and traces matter more here than anywhere else.',
    io: { cap: 'One turn of the loop: the model asks for a tool', obj: { stop_reason: 'tool_use', content: [{ type: 'text', text: 'Checking whether INV-0412 is paid.' }, { type: 'tool_use', id: 'toolu_01', name: LG.tool, input: { invoice_number: 'INV-0412' } }] } } },
];
let ladderIdx = 0;
function ladderShow(i) {
  ladderIdx = i;
  const list = $('#ladder'), panel = $('#rung-panel'), RUNGS = rungs();
  $$('.rung', list).forEach((b, j) => b.setAttribute('aria-selected', j === i ? 'true' : 'false'));
  panel.setAttribute('aria-labelledby', 'rung-' + i);
  const r = RUNGS[i];
  panel.replaceChildren(
    h('div', null, h('p', { class: 'analogy' }, r.analogy),
      h('dl', { class: 'facts' },
        h('div', { class: 'fact' }, h('dt', null, 'What it adds'), h('dd', null, r.adds)),
        h('div', { class: 'fact' }, h('dt', null, "Still can't"), h('dd', null, r.cant)))),
    codeBlock(r.io.obj, r.io.cap));
}
(function ladder() {
  const list = $('#ladder');
  rungs().forEach((r, i) => {
    const b = h('button', { class: 'rung', role: 'tab', id: 'rung-' + i, 'aria-controls': 'rung-panel', 'aria-selected': i === 0 ? 'true' : 'false', type: 'button' },
      h('span', { class: 'n' }, `Step ${i + 1} of 5`), h('span', { class: 't' }, r.t), h('span', { class: 'd' }, r.d));
    b.addEventListener('click', () => ladderShow(i));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = (i + (e.key === 'ArrowRight' ? 1 : 4)) % 5; ladderShow(n); $('#rung-' + n).focus(); }
    });
    list.append(b);
  });
  ladderShow(0);
})();

/* ---------- tool-call simulator ---------- */
const sim = () => {
  const inv = sampleInv(), amt = money(inv.total);
  const TOOLS_DEF = [
    { name: LG.tool, description: `Look up one sales invoice in ${LG.name} by number. Read-only.`, input_schema: { type: 'object', properties: { invoice_number: { type: 'string' } }, required: ['invoice_number'] } },
    { name: 'draft_reminder_email', description: 'Draft (not send) a payment reminder to the invoice contact using the approved template.', input_schema: { type: 'object', properties: { invoice_number: { type: 'string' }, tone: { enum: ['friendly', 'firm'] }, days_overdue: { type: 'integer' } }, required: ['invoice_number', 'tone'] } },
    { name: 'send_email', description: 'Send a drafted email. Requires human approval.', input_schema: { type: 'object', properties: { draft_id: { type: 'string' } }, required: ['draft_id'] } },
  ];
  return [
    { who: 'human', whoLabel: 'You', title: 'A finance manager asks in Teams', explain: "Plain English, no system names. The Teams bot forwards it to our FastAPI gateway with the user's identity attached.",
      art: () => codeBlock({ method: 'POST', path: '/v1/chat', body: { user: 'j.chen@ridgeline.example', role: 'finance', message: 'Has Harbourside Joinery paid INV-0412? If not, send them the usual reminder.' } }, 'Teams → FastAPI', 'request') },
    { who: 'code', whoLabel: 'FastAPI', title: 'The gateway builds the prompt and attaches the tool list', explain: "The model receives the rules, the conversation and three tool definitions. It cannot see API keys, and it only sees tools this user's role is allowed to use.",
      art: () => codeBlock({ system: 'You are the finance assistant for Ridgeline. Use tools for facts. Never send email without approval.', tools: TOOLS_DEF }, 'What the model is given', 'trimmed') },
    { who: 'llm', whoLabel: 'LLM', title: 'The model replies with a tool call, not an answer', explain: `This is the whole trick. The model writes structured JSON naming the tool and its inputs. It has not touched ${LG.name}.`,
      art: () => codeBlock({ stop_reason: 'tool_use', tool_use: { id: 'toolu_01', name: LG.tool, input: { invoice_number: 'INV-0412' } } }, 'Model output', 'a small model via a regional endpoint') },
    { who: 'code', whoLabel: 'Guardrails', title: 'Our code checks the payload before anything happens', explain: 'Schema valid, tool allowed for the finance role, read-only so no approval needed. A malformed or forbidden call stops here.',
      art: () => h('div', { class: 'checks' }, ['Input matches the JSON Schema', 'Tool allowed for role "finance"', 'Read-only: no approval required', `Rate budget: within ${LG.name}'s limit (${LG.limit})`].map((t) => h('div', { class: 'check' }, h('span', { class: 'tag ok' }, 'pass'), h('span', null, t)))) },
    { who: 'ext', whoLabel: `${LG.name} API`, title: `FastAPI makes the real call to ${LG.name}`, explain: "The tool implementation turns the model's JSON into an authenticated HTTPS request, then trims the response to what the model needs.",
      art: () => h('div', { style: 'display:grid; gap:.75rem' },
        codeBlock('RAW:<span class="m">' + esc(LG.get('INV-0412', R).replace(/^GET /, '')) .replace(/^/, 'GET</span> ') + '\n' + esc(LG.headers.replace('<token>', '••••••')), 'Request'),
        codeBlock(LG.result(inv), 'Result returned to the model')) },
    { who: 'llm', whoLabel: 'LLM', title: 'The model reads the result and chooses the next tool', explain: 'Due 26 October, unpaid, 16 days overdue today. The user asked for the usual reminder, so it calls the drafting tool.',
      art: () => codeBlock({ stop_reason: 'tool_use', tool_use: { id: 'toolu_02', name: 'draft_reminder_email', input: { invoice_number: 'INV-0412', tone: 'friendly', days_overdue: 16 } } }, 'Model output, loop 2') },
    { who: 'human', whoLabel: 'Approval', title: 'Sending to a customer needs a person', explain: 'The draft is ready, but send_email is gated. The agent pauses and posts an approval card back to Teams.',
      art: () => h('div', { class: 'approval' },
        h('div', { class: 'actor' }, h('span', { class: 'tag warn' }, 'approval needed'), h('span', { class: 'small muted' }, 'send_email · to accounts@harbourside.example')),
        h('p', { class: 'small' }, h('b', null, 'Subject: '), `Friendly reminder: INV-0412, ${amt} due 26 Oct`),
        h('p', { class: 'small muted' }, `Hi Harbourside team, a quick note that invoice INV-0412 for ${amt} was due on 26 October. If it's already on its way, thank you and please ignore this...`),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', type: 'button', onclick: (e) => { e.target.closest('.approval').replaceWith(h('p', { class: 'tag ok' }, 'Approved by j.chen at 10:42 · email sent · logged')); } }, 'Approve & send'), h('button', { class: 'btn', type: 'button' }, 'Edit'), h('button', { class: 'btn', type: 'button' }, 'Reject'))) },
    { who: 'llm', whoLabel: 'LLM', title: 'The final answer, with a trace behind it', explain: 'The user gets a plain answer. Langfuse holds the full record: both tool calls, the approval, token cost and timing.',
      art: () => h('div', { style: 'display:grid; gap:.75rem' },
        h('div', { class: 'msg agent', style: 'max-width:100%' }, h('span', { class: 'who' }, 'Finance assistant'), `Not paid yet. INV-0412 for ${amt} was due 26 October and is 16 days overdue. I've drafted the usual friendly reminder; approve it above to send.`),
        codeBlock({ trace_id: 'lf_7c21e9', steps: 4, tool_calls: [LG.tool, 'draft_reminder_email'], approvals: 1, latency_ms: 2840, cost_usd: 0.011 }, 'Trace summary')) },
  ];
};
let SIM = sim();
const simCtl = (function simulator() {
  const steps = $('#sim-steps');
  let cur = 0, timer = null;
  function buildSteps() {
    steps.replaceChildren(...SIM.map((s, i) => h('button', { class: 'sim-step', type: 'button', onclick: () => { stop(); go(i); } }, h('span', null, s.title, h('small', null, s.whoLabel)))));
  }
  function go(i) {
    cur = Math.max(0, Math.min(SIM.length - 1, i));
    const s = SIM[cur];
    $$('.sim-step', steps).forEach((b, j) => { b.classList.toggle('done', j < cur); if (j === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    const whoClass = { llm: 'llm', code: 'code', ext: 'ext', human: 'human' }[s.who];
    $('#sim-actor').replaceChildren(h('span', { class: 'who ' + whoClass }, s.whoLabel), h('span', { class: 'small muted' }, s.who === 'llm' ? 'The model is writing text (JSON is text)' : s.who === 'code' ? 'Deterministic code we own' : s.who === 'ext' ? 'Your existing system' : 'A person'));
    $('#sim-title').textContent = s.title;
    $('#sim-explain').textContent = s.explain;
    const art = s.art(); art.classList.add('appear');
    $('#sim-art').replaceChildren(art);
    $('#sim-prog').textContent = `Step ${cur + 1} of ${SIM.length}`;
    $('#sim-prev').disabled = cur === 0;
    $('#sim-next').disabled = cur === SIM.length - 1;
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; $('#sim-play').textContent = 'Play all'; } }
  $('#sim-prev').onclick = () => { stop(); go(cur - 1); };
  $('#sim-next').onclick = () => { stop(); go(cur + 1); };
  $('#sim-play').onclick = () => {
    if (timer) { stop(); return; }
    if (cur === SIM.length - 1) go(0);
    $('#sim-play').textContent = 'Pause';
    timer = setInterval(() => { if (cur >= SIM.length - 1) { stop(); return; } go(cur + 1); }, 3200);
  };
  buildSteps(); go(0);
  return { go: (i) => { stop(); go(i); }, refresh() { SIM = sim(); buildSteps(); go(cur); } };
})();
const simGo = (i) => simCtl.go(i);

/* ---------- use cases ---------- */
const UC_GROUPS = [{ id: 'rev', label: 'Revenue & front office' }, { id: 'ops', label: 'Operations & back office' }, { id: 'data', label: 'Data & executive dashboards' }];
const ucs = () => [
  { id: 'lead', group: 'rev', title: 'AI inbound lead qualifier', tabSub: 'Voice and chat, 24/7',
    job: "Every call that rings out after hours is a job that goes to a competitor. A voice and chat agent trained on your services answers 24/7, asks the questions your best salesperson asks, and books qualified prospects straight into a rep's calendar.",
    services: ['Customer-service automation', 'AI implementation'],
    flow: [
      { t: 'Call or chat arrives', tech: 'Twilio number on a SIP trunk into LiveKit; web widget or WhatsApp over WebSocket to FastAPI', io: 'audio stream / chat message' },
      { t: 'Speech to text, streaming', tech: 'Deepgram (or similar) with voice activity and turn detection', io: 'partial transcripts' },
      { t: 'Agent decides the next line or tool', tech: 'A small fast model (Claude Haiku, Gemini Flash) via a regional endpoint, with a qualification script and six tools', io: 'reply text or tool call', ai: true },
      { t: 'Tools run', tech: 'FAQ retrieval, service-area check, CRM lookup, calendar slots, booking, SMS', io: 'JSON results' },
      { t: 'Text to speech', tech: 'ElevenLabs streaming voice; target under a second per turn', io: 'audio back to caller' },
      { t: 'Wrap-up', tech: `Summary, BANT fields and transcript written to ${R.crm}; rep notified`, io: 'contact + deal + meeting', ai: true },
      { t: 'Handoff when needed', tech: 'Warm transfer to an on-call human on request or low confidence', io: 'live call transfer', human: true }],
    input: "Caller's voice or chat text; your service catalogue, FAQ and calendar rules.",
    output: 'A booked meeting, a CRM contact and deal with need, budget, authority and timeline filled in, and a call summary.',
    stack: [['Telephony', `Twilio (${R.code} number, SIP)`, 'Telnyx, Vonage, Exotel'], ['Real-time', 'LiveKit Agents', 'Pipecat, Vapi'], ['Speech to text', 'Deepgram', 'AssemblyAI, Google STT'], ['LLM', 'Claude Haiku or Gemini Flash', 'Open model on vLLM'], ['Text to speech', 'ElevenLabs', 'Cartesia, Kokoro (self-hosted)'], ['CRM + calendar', `${R.crm}, Google / Microsoft calendars`, R.crmAlt], ['Traces', 'Langfuse', '—']],
    guard: ['Opens with an AI disclosure and asks consent to record', 'Never quotes a price outside published ranges', 'Transfers to a person on request, or after two failed turns', R.voiceLaw],
    measure: ['After-hours answer rate', 'Qualified meetings booked per week', 'Human handoff rate', 'Cost per qualified lead', 'Turn latency (p95)'],
    weeks: '4–6', proof: 'Real-time voice and video onboarding with LiveKit, Twilio SIP, ElevenLabs and a 10-state workflow.' },
  { id: 'scoring', group: 'rev', title: 'CRM optimisation & AI scoring', tabSub: 'HubSpot, Salesforce, Zoho',
    job: 'Reps work leads in the order they arrive. A scoring engine ranks every lead by fit, engagement and buying intent read from what they actually wrote, writes the score back into the CRM, and lets the CRM\'s own workflows do the routing.',
    services: ['AI implementation', 'Workflow automation'],
    flow: [
      { t: 'Contact created or updated', tech: `${R.crm} webhook (or Salesforce platform event) to FastAPI`, io: 'contact ID + changed fields' },
      { t: 'Enrich', tech: 'Agent reads the form message and company website; extracts industry, size, trigger events', io: 'structured signals', ai: true },
      { t: 'Feature build', tech: 'Postgres feature table: firmographics, engagement counts, AI intent', io: 'feature vector' },
      { t: 'Score', tech: 'Gradient-boosted model trained on your won and lost deals, plus rules for hard filters', io: 'score 0–100 + top factors', ai: true },
      { t: 'Write back', tech: 'Custom fields ai_lead_score and ai_score_reason', io: 'CRM updated' },
      { t: 'Act', tech: 'CRM workflows assign owner, start a sequence, alert Teams or Slack above 80', io: 'routed lead' }],
    input: 'CRM contact and company records, web and email engagement, form messages, 12+ months of closed deals.',
    output: 'A score and a one-line reason on every contact, refreshed on each change; alerts for hot leads.',
    stack: [['CRM', R.crm === 'HubSpot' ? 'HubSpot CRM API v3' : 'Zoho CRM API', R.crmAlt], ['Native scoring', 'HubSpot or Zoho scoring', 'Salesforce Einstein'], ['Enrichment', 'Claude Sonnet or Gemini Pro', '—'], ['Model', 'XGBoost / scikit-learn', 'LightGBM'], ['Features', 'Postgres', 'BigQuery'], ['Triggers', 'n8n', 'CRM workflows, Make']],
    guard: ['No protected attributes as features', 'Every score carries its top three reasons', 'Reps can override; overrides retrain the model', 'Monthly drift check against actual conversions'],
    measure: ['Meeting rate by score band', 'Speed to first contact for A-band leads', 'Win rate, top decile vs baseline', 'Model AUC on recent deals'],
    weeks: '3–5', proof: "Conversion propensity and churn models; a CRM copilot for a bank's sales team." },
  { id: 'quote', group: 'rev', title: 'Proposal & quoting engine', tabSub: 'Live pricing from the ERP',
    job: 'A quote that takes a day of copying prices from the ERP into a Word template goes out in minutes, priced from live cost and stock, written in your voice, and sent to a manager when the margin dips.',
    services: ['Workflow automation', 'Finance/admin automation'],
    flow: [
      { t: 'Request arrives', tech: 'Email, web form or CRM deal stage', io: 'free text + attachments' },
      { t: 'Extract line items', tech: 'LLM maps the request to SKUs against your catalogue', io: 'items + quantities + dates', ai: true },
      { t: 'Price from the ERP', tech: `Tool calls to ${R.erp} for price, cost and stock`, io: 'priced lines' },
      { t: 'Apply rules in code', tech: `Customer tier, discount caps, margin floor, freight, ${R.tax.name}`, io: 'totals + flags' },
      { t: 'Write the proposal', tech: 'Writer agent drafts the cover note and scope from past winning proposals (RAG)', io: 'draft text', ai: true },
      { t: 'Approve', tech: 'Manager approval if margin or discount breaks a rule', io: 'approved quote', human: true },
      { t: 'Publish', tech: `DOCX/PDF from template; quote created in ${LG.name}; e-sign link`, io: 'sent quote' }],
    input: 'Customer request, catalogue, live ERP prices and stock, pricing rules, past proposals.',
    output: `A priced, approved proposal PDF, a quote record in ${LG.name}, and the follow-up task in the CRM.`,
    stack: [['Pricing source', R.erp.split(' or ')[0], 'NetSuite, SAP Business One'], ['Rules', 'Python (deterministic)', '—'], ['Writing', 'Claude Sonnet or Gemini Pro', 'Open model on vLLM'], ['Documents', 'docxtpl → PDF', 'Google Docs API'], ['Quote record', `${LG.name} API`, 'CRM quotes'], ['E-sign', 'DocuSign', 'Adobe Sign, Zoho Sign']],
    guard: ['The model never sets a price; prices come from the ERP via a tool', `All totals and ${R.tax.name} computed in code`, 'Approval when margin < 25% or discount > 12%', 'Every version stored with its inputs'],
    measure: ['Request-to-quote time', 'Quotes per rep per week', 'Win rate', 'Margin leakage vs list'],
    weeks: '4–6', proof: 'Specialist multi-agent workflows (prospect analysis, research) on CrewAI and LangChain.' },
  { id: 'invoice', group: 'ops', title: 'Invoice & document extraction', tabSub: 'Into Xero, QuickBooks, Zoho, Tally',
    job: `Supplier bills arrive as PDFs and phone photos in a shared inbox. The pipeline reads them, checks them, and creates draft bills in ${LG.name} with the original attached. People review the exceptions instead of keying every invoice.`,
    services: ['Finance/admin automation', 'AI implementation'],
    flow: [
      { t: 'Ingest', tech: `Shared mailbox via Microsoft Graph or Gmail API, an upload portal, or ${R.einv}`, io: 'PDF / image / structured e-invoice' },
      { t: 'Parse layout', tech: 'LlamaParse or Docling (self-hosted); Textract or Azure Document Intelligence as alternates', io: 'text + tables + positions' },
      { t: 'Extract to schema', tech: 'LLM fills a typed bill schema with a confidence per field', io: 'JSON bill', ai: true },
      { t: 'Validate in code', tech: `${R.id.name} check, ${R.tax.name} = ${R.tax.rule}, line sum = subtotal, supplier match, duplicate and PO match, bank details unchanged`, io: 'pass / fail per check' },
      { t: 'Decide', tech: 'All checks pass and confidence ≥ 0.90 → draft; otherwise review queue', io: 'route' },
      { t: 'Review exceptions', tech: 'Side-by-side review screen: PDF, extracted fields, failed checks', io: 'corrected bill', human: true },
      { t: 'Post as draft', tech: `${LG.path.bill} with the PDF attached`, io: 'draft bill in the ledger' }],
    input: `Supplier invoices and receipts as PDF, image or e-invoice; supplier list and open POs from ${LG.name}.`,
    output: `Draft bills in ${LG.name} with the source attached, plus an exceptions queue and an audit trail.`,
    stack: [['Parsing', 'LlamaParse, Docling', 'Textract AnalyzeExpense, Azure Doc Intelligence'], ['Extraction', 'Claude Sonnet or Gemini Pro', 'A small model for simple layouts'], ['Schema', 'Pydantic', '—'], ['Ledger', `${LG.name} API`, 'Xero, QuickBooks, Zoho Books, Tally'], ['Review UI', 'React or Streamlit', '—'], ['Storage', 'Object store in-region + Postgres', '—']],
    guard: ['Drafts only; payment approval stays in the ledger', 'Supplier bank detail changes blocked and escalated', 'Duplicate detection on supplier + number + amount + file hash', 'Invoice text treated as data: instructions inside a PDF are ignored'],
    measure: ['Touchless rate (no human edits)', 'Field-level accuracy', 'Minutes per invoice', 'Exceptions per 100', 'Duplicates and fraud caught'],
    weeks: '3–5', proof: 'Multi-parser document pipelines on LlamaParse and Docling, traced in Langfuse.' },
  { id: 'middleware', group: 'ops', title: 'Cross-ecosystem middleware', tabSub: 'Webhooks, n8n, Make, Zapier',
    job: "Your job system, accounts, CRM and inbox don't talk to each other, so people re-key data between them. Middleware listens for events in one system and makes the right thing happen in the others, with retries, logs and alerts.",
    services: ['Workflow automation', 'Microsoft/Google ecosystem implementation'],
    flow: [
      { t: 'Capture the event', tech: 'Webhook where the system has one; database poll, SFTP drop or email parse for legacy systems', io: 'raw event' },
      { t: 'Queue with a key', tech: 'Signed webhook (HMAC) into FastAPI; idempotency key from the source ID', io: 'queued event' },
      { t: 'Map and route', tech: 'n8n workflow: code lookups, field mapping, branching', io: 'normalised record' },
      { t: 'AI step where text needs judgement', tech: 'LLM reads free-text notes and returns structured extras', io: 'structured fields', ai: true },
      { t: 'Write to targets', tech: `${LG.name}, ${R.crm}, Teams/Slack; rate-limit aware, retries honour Retry-After`, io: 'records created / updated' },
      { t: 'Watch', tech: 'Dead-letter queue, alerts, replay button, per-run logs', io: 'health dashboard' }],
    input: 'Events from the systems you already have, including ones with no API.',
    output: 'The same fact entered once and reflected everywhere it belongs, with a log of every hop.',
    stack: [['Orchestration', `n8n self-hosted in ${R.cloud.where.split(' (')[0]}`, 'Make, Zapier'], ['Custom adapters', 'FastAPI services', '—'], ['Queue', 'Redis or SQS', '—'], ['Secrets', 'Cloud secrets manager', 'n8n credentials vault'], ['AI step', 'A small fast model', 'Open model on vLLM'], ['Alerts', 'Teams / Slack, PagerDuty', '—']],
    guard: ['Signed webhooks only', 'Idempotency keys on every write', 'Dead-letter queue with one-click replay', 'Least-privilege OAuth scopes per target'],
    measure: ['Hours of re-keying removed', 'Sync failures per week', 'Time to recover a failed run', 'Data freshness across systems'],
    weeks: '2–4', proof: 'Email-triage model for automated routing; system design across banking integrations.' },
  { id: 'knowledge', group: 'ops', title: 'Internal knowledge assistant', tabSub: 'Private RAG on SOPs and manuals',
    job: "Staff ask in Teams or Slack. The assistant answers from your SOPs, safety manuals and policies, shows the paragraph it used, says so when the documents don't cover it, and only searches what the person asking is allowed to see.",
    services: ['AI implementation', 'Microsoft/Google ecosystem implementation'],
    flow: [
      { t: 'Sync sources', tech: 'SharePoint and OneDrive (Graph), Google Drive, Confluence, Notion; delta sync nightly or on change', io: 'documents + permissions' },
      { t: 'Parse and chunk', tech: 'Docling; 400–800-token chunks with overlap and section titles', io: 'chunks' },
      { t: 'Index', tech: 'Embeddings plus keyword index (pgvector + full-text, or ChromaDB), access labels on every chunk', io: 'searchable index' },
      { t: 'Retrieve', tech: "Hybrid search, filter by the user's groups, then rerank", io: 'top passages' },
      { t: 'Answer with citations', tech: 'LLM answers only from passages; cites each claim; declines when unsupported', io: 'answer + sources', ai: true },
      { t: 'Learn', tech: 'Thumbs up/down and unanswered questions feed the content backlog and eval set', io: 'feedback' }],
    input: 'Your documents and their existing permissions; a staff question.',
    output: 'A cited answer in Teams or Slack, or an honest "not covered" with who to ask.',
    stack: [['Front end', 'Teams bot, Slack app', 'Web widget'], ['Framework', 'LlamaIndex + FastAPI', 'LangChain'], ['Search', 'Postgres pgvector + full-text', 'ChromaDB, OpenSearch'], ['Embeddings + rerank', 'Hosted embeddings, Cohere Rerank', 'Open models on vLLM'], ['LLM', 'Claude Sonnet or a local model', '—'], ['Evals', 'Golden Q&A set, Langfuse', '—']],
    guard: ['Permission filter applied before reranking', 'No citation, no answer', 'Documents are data: hidden instructions ignored', 'Your content is not used to train models'],
    measure: ['Answer acceptance rate', 'Citation accuracy on the golden set', 'Questions deflected from HR and ops leads', 'Unanswered-question backlog'],
    weeks: '3–4', proof: 'The RAG assistant now live at four banks: LlamaIndex, FastAPI, ChromaDB and SQLAlchemy, traced in Langfuse.' },
  { id: 'reporting', group: 'data', title: 'Automated reporting & dashboards', tabSub: 'GA4, Meta Ads, ledger, inventory',
    job: `Monday's numbers are ready before Monday. Sales and cash from ${LG.name}, traffic from GA4, spend from Meta and Google Ads, and stock from ${R.inventory} land in one dashboard, with a short written briefing that points at what changed and why.`,
    services: ['AI implementation', 'Microsoft/Google ecosystem implementation'],
    flow: [
      { t: 'Extract on a schedule', tech: `GA4 Data API, Meta Marketing API, Google Ads API, ${LG.name}, Shopify, ${R.inventory} via Airbyte, Fivetran or Python jobs`, io: 'raw tables' },
      { t: 'Load and model', tech: 'BigQuery or Postgres; dbt models define every metric once', io: 'clean fact tables' },
      { t: 'Visualise', tech: 'Power BI or Data Studio on the modelled tables', io: 'live dashboard' },
      { t: 'Detect changes', tech: 'Week-on-week and threshold checks in SQL', io: 'anomalies' },
      { t: 'Write the briefing', tech: 'LLM turns query results into five sentences; every figure is tied to a query', io: 'briefing', ai: true },
      { t: 'Ask your data', tech: 'Natural-language questions become read-only SQL against the metric layer', io: 'answer + SQL', ai: true }],
    input: 'Read access to your marketing, finance and inventory systems.',
    output: 'A dashboard that refreshes itself, a Monday briefing in Teams or email, and a chat box that answers with the query it ran.',
    stack: [['Connectors', 'Airbyte / Fivetran', 'Python jobs, n8n'], ['Warehouse', 'BigQuery', 'Postgres, Microsoft Fabric'], ['Modelling', 'dbt', '—'], ['BI', 'Power BI, Data Studio', 'Metabase'], ['Narrative', 'Claude Sonnet or Gemini Pro', '—'], ['NL-to-SQL', 'Read-only role on metric views', '—']],
    guard: ['The LLM never calculates a number; SQL does', 'Read-only credentials for every query', 'Metric definitions live in one place (dbt)', 'Meta has no first-party Data Studio connector: use a partner connector or the warehouse'],
    measure: ['Hours of manual reporting removed', 'Data latency (source to dashboard)', 'Weekly active viewers', 'Decisions logged from the briefing'],
    weeks: '3–6', proof: 'Natural-language interfaces for querying structured databases in real time.' },
];
let UC = ucs();
let ucCurrent = 'invoice';
const ucRun = runner();
(function ucNav() {
  const nav = $('#uc-nav');
  UC_GROUPS.forEach((g) => {
    const tabs = h('div', { class: 'uc-tabs', role: 'tablist', 'aria-label': g.label });
    UC.filter((u) => u.group === g.id).forEach((u) => tabs.append(
      h('button', { class: 'uc-tab', role: 'tab', id: 'tab-' + u.id, 'aria-controls': 'uc-panel', 'aria-selected': 'false', type: 'button', onclick: () => showUC(u.id, true) }, h('b', null, u.title), h('span', null, u.tabSub))));
    nav.append(h('div', { class: 'uc-group' }, h('p', { class: 'eyebrow' }, g.label), tabs));
  });
})();

const DEMOS = {};
function showUC(id, fromClick) {
  const u = UC.find((x) => x.id === id) || UC[3];
  ucCurrent = u.id;
  $$('.uc-tab').forEach((b) => b.setAttribute('aria-selected', b.id === 'tab-' + u.id ? 'true' : 'false'));
  const panel = $('#uc-panel'); panel.setAttribute('aria-labelledby', 'tab-' + u.id);
  const token = ucRun.next();
  const bar = h('div', { class: 'btn-row' });
  const body = h('div', { class: 'demo-body' });
  const g = UC_GROUPS.find((x) => x.id === u.group);
  panel.replaceChildren(
    h('div', { class: 'uc-head' },
      h('div', { style: 'display:grid; gap:.6rem' }, h('p', { class: 'eyebrow' }, g.label), h('h3', { class: 'h2', style: 'font-size:var(--step-3)' }, u.title), h('p', { class: 'lede', style: 'max-width:70ch' }, u.job)),
      h('div', { class: 'services' }, u.services.map((s) => h('span', { class: 'tag euc' }, s)), h('button', { class: 'tag acc', type: 'button', style: 'cursor:pointer', onclick: () => { setRoute(u.id); goTo($('#scene'), 'center'); } }, 'See it in the 3D stack ↑'))),
    h('div', { class: 'demo' },
      h('div', { class: 'demo-bar' }, h('span', { class: 'live' }, 'Demo'), h('span', { class: 'note' }, `Simulated data, real flow · ${R.label}`), bar),
      body),
    h('div', { class: 'uc-detail' },
      h('div', null, h('h4', { class: 'h4', style: 'margin-bottom:.9rem' }, "How it's built"),
        h('div', { class: 'flow' }, u.flow.map((f) => h('div', { class: 'flow-stage' + (f.ai ? ' ai' : '') + (f.human ? ' human' : '') },
          h('div', null, h('div', { class: 'fs-t' }, f.t, f.ai ? h('span', { class: 'tag acc', style: 'margin-left:.45rem' }, 'LLM') : null, f.human ? h('span', { class: 'tag warn', style: 'margin-left:.45rem' }, 'person') : null), h('div', { class: 'fs-tech' }, f.tech), h('div', { class: 'fs-io' }, '→ ' + f.io)))))),
      h('div', { style: 'display:grid; gap:1.25rem; align-content:start' },
        h('div', { class: 'kv' }, h('div', null, h('b', null, 'Input'), h('span', null, u.input)), h('div', null, h('b', null, 'Output'), h('span', null, u.output))),
        h('div', null, h('h4', { class: 'h4', style: 'margin-bottom:.4rem' }, 'Stack'),
          h('div', { class: 'tbl-wrap' }, h('table', { class: 'stack-table' }, h('thead', null, h('tr', null, h('th', null, 'Layer'), h('th', null, 'Default'), h('th', null, 'Alternatives'))),
            h('tbody', null, u.stack.map((r) => h('tr', null, r.map((c) => h('td', null, c)))))))))),
    h('div', { class: 'uc-foot' },
      h('div', { class: 'panel' }, h('h4', { class: 'h4' }, 'Guardrails'), h('ul', null, u.guard.map((x) => h('li', null, x)))),
      h('div', { class: 'panel' }, h('h4', { class: 'h4' }, 'What we measure'), h('ul', null, u.measure.map((x) => h('li', null, x)))),
      h('div', { class: 'panel' }, h('h4', { class: 'h4' }, 'Pilot build'), h('span', { class: 'build-n' }, u.weeks + ' weeks'), h('p', { class: 'small muted' }, 'One workflow, draft mode, on your real data in a staging tenant. Indicative; depends on API access and data quality.'))),
    h('p', { class: 'proof' }, h('b', null, 'Built before'), u.proof));
  DEMOS[u.id](body, bar, token);
  if (fromClick) { try { history.replaceState(null, '', '#uc-' + u.id); } catch { /* sandboxed */ } }
}

/* ===== Demo 1: lead qualifier ===== */
const leadScript = () => {
  const L = R.lead, z = R.tz;
  return [
    { a: 'agent', t: `Hi, thanks for calling ${L.company}. You're speaking with our AI assistant, and this call is recorded so the team can follow up. Is that OK?` },
    { a: 'user', t: `Yeah, that's fine. ${L.bizLine}` },
    { a: 'tool', n: 'crm_lookup', i: { phone: L.phone }, o: { match: null }, f: { biz: L.biz } },
    { a: 'agent', t: `Great, cafés are a good fit. Roughly how much is your power bill each ${L.per}, and do you own the building?` },
    { a: 'user', t: L.billLine },
    { a: 'tool', n: 'check_service_area', i: { [L.postKey]: L.post }, o: { in_area: true, region: L.area }, f: { need: L.need, area: `${L.post} · in service area`, auth: 'Tenant, landlord consent' } },
    { a: 'agent', t: `We install right across ${L.where}. For a café using that much power, systems are usually in the 10 to 20 kilowatt range. When were you hoping to have it in?` },
    { a: 'user', t: `${L.when} Budget's maybe ${L.budgetWords}.` },
    { a: 'tool', n: 'score_lead', i: { [`bill_per_${L.per}`]: L.bill, budget: L.budget, currency: R.cur, timeline_days: 60, owner: false, landlord_consent: true }, o: { score: 82, band: 'A', reasons: ['high usage', 'budget fits 10–20 kW', '<90-day timeline'] }, f: { budget: '~' + money(L.budget, 0), time: L.timeline, score: 82 } },
    { a: 'tool', n: 'calendar_free_slots', i: { team: 'commercial', days: 5 }, o: { slots: [`2026-11-17T10:00${z}`, `2026-11-18T14:30${z}`] } },
    { a: 'agent', t: `I can book a free site assessment with ${L.rep} from our commercial team. Tuesday at 10am or Wednesday at 2:30?` },
    { a: 'user', t: 'Tuesday at ten works.' },
    { a: 'tool', n: 'book_meeting', i: { slot: `2026-11-17T10:00${z}`, rep: L.rep.toLowerCase(), type: 'site_assessment' }, o: { booking_id: 'BK-20931', status: 'confirmed' }, f: { next: `Site visit Tue 17 Nov, 10:00 (${L.rep})` } },
    { a: 'tool', n: 'crm_upsert', i: { contact: { company: L.biz, phone: L.phone }, deal: { name: `Café rooftop – ${L.where}`, amount: L.budget, currency: R.cur, stage: 'appointment_scheduled' } }, o: { contact_id: '51207', deal_id: '88340' } },
    { a: 'agent', t: `Done. ${L.rep} will see you Tuesday the 17th at 10am. I'll text a confirmation to this number. Anything else I can help with?` },
    { a: 'user', t: "No, that's great, thanks." },
    { a: 'tool', n: 'send_sms', i: { template: 'booking_confirm', consent: 'verbal, on recording 00:01:41' }, o: { status: 'queued' } },
  ];
};
DEMOS.lead = (body, bar, token) => {
  const LEAD = leadScript();
  const tr = h('div', { class: 'transcript', 'aria-live': 'polite', 'data-lenis-prevent': '' });
  const wave = h('span', { class: 'wave' }, h('i'), h('i'), h('i'), h('i'), h('i'));
  const F = [['biz', 'Business'], ['need', 'Need'], ['budget', 'Budget'], ['auth', 'Authority'], ['time', 'Timeline'], ['area', 'Service area'], ['next', 'Next step']];
  const dds = {};
  const fields = h('dl', { class: 'fields' }, F.map(([k, l]) => { dds[k] = h('dd', { class: 'empty' }, 'waiting…'); return h('div', null, h('dt', null, l), dds[k]); }));
  const scoreN = h('span', { class: 'big tabnum' }, '—'), meterI = h('i', { style: 'width:0%' });
  const status = h('span', { class: 'tag' }, 'Idle');
  body.append(h('div', { class: 'split' },
    h('div', null, h('div', { class: 'actor', style: 'margin-bottom:.6rem' }, h('span', { class: 'tag acc' }, 'Inbound call · 8:47pm Fri'), wave, status), tr),
    h('div', { class: 'card' }, h('h5', null, `Lead card · writing to ${R.crm}`),
      h('div', { class: 'scoredial' }, scoreN, h('span', { class: 'muted small' }, '/ 100 lead score')), h('div', { class: 'meter' }, meterI), fields)));
  let i = 0, playing = false;
  function reset() { ucRun.next(); token = ucRun.next(); i = 0; tr.replaceChildren(); F.forEach(([k]) => { dds[k].textContent = 'waiting…'; dds[k].className = 'empty'; }); scoreN.textContent = '—'; meterI.style.width = '0%'; status.textContent = 'Idle'; status.className = 'tag'; wave.classList.remove('on'); playing = false; play.textContent = 'Play call'; }
  function stepOnce() {
    if (i >= LEAD.length) return false;
    const s = LEAD[i++];
    let node;
    if (s.a === 'tool') {
      node = h('div', { class: 'toolcall appear', html: `<span class="nm">${esc(s.n)}</span>(${esc(JSON.stringify(s.i))})<br><span class="res">→ ${esc(JSON.stringify(s.o))}</span>` });
      if (s.f) for (const k in s.f) {
        if (k === 'score') { scoreN.textContent = s.f.score; meterI.style.width = s.f.score + '%'; continue; }
        dds[k].textContent = s.f[k]; dds[k].className = 'fresh';
      }
      wave.classList.remove('on');
    } else {
      node = h('div', { class: 'msg appear ' + (s.a === 'agent' ? 'agent' : 'user') }, h('span', { class: 'who' }, s.a === 'agent' ? 'AI assistant' : 'Caller'), s.t);
      wave.classList.toggle('on', s.a === 'agent' && !REDUCED);
    }
    tr.append(node); tr.scrollTop = tr.scrollHeight;
    if (i >= LEAD.length) { status.textContent = 'Qualified · A band · meeting booked'; status.className = 'tag ok'; wave.classList.remove('on'); }
    else { status.textContent = 'On call'; status.className = 'tag acc'; }
    return true;
  }
  async function run() {
    const my = token; playing = true; play.textContent = 'Pause';
    while (playing && ucRun.alive(my) && stepOnce()) await sleep(LEAD[i - 1].a === 'tool' ? 900 : 1900);
    if (ucRun.alive(my)) { playing = false; play.textContent = i >= LEAD.length ? 'Replay' : 'Play call'; }
  }
  const play = h('button', { class: 'btn primary', type: 'button', onclick: () => { if (playing) { playing = false; play.textContent = 'Play call'; return; } if (i >= LEAD.length) reset(); token = ucRun.next(); run(); } }, 'Play call');
  const step = h('button', { class: 'btn', type: 'button', onclick: () => { playing = false; play.textContent = 'Play call'; stepOnce(); } }, 'Step');
  const rs = h('button', { class: 'btn', type: 'button', onclick: reset }, 'Reset');
  bar.append(play, step, rs);
  for (let k = 0; k < 4; k++) stepOnce();
  status.textContent = 'Paused'; status.className = 'tag'; wave.classList.remove('on');
};

/* ===== Demo 2: lead scoring ===== */
const LEADS = [
  { id: '1001', name: 'Mei Lin', co: 'Brightwell Dental Group', ind: 'Healthcare', size: 45, role: 'Practice Manager', dm: true, pages: 9, opens: 4, demo: true, web: true, msg: "We're opening a third clinic in March and need booking and invoicing sorted before then.", intent: 90, why: 'Named deadline, expansion trigger, specific process' },
  { id: '1002', name: 'Tom Keating', co: 'Keating Plumbing', ind: 'Trades', size: 12, role: 'Owner', dm: true, pages: 3, opens: 1, demo: false, web: true, msg: "Just looking at what's out there.", intent: 20, why: 'Browsing, no problem stated' },
  { id: '1003', name: 'Aisha Rahman', co: 'Northline Logistics', ind: 'Logistics', size: 140, role: 'Operations Director', dm: true, pages: 14, opens: 6, demo: true, web: true, msg: 'Our dispatch team re-keys 300 consignment notes a day from email into our TMS.', intent: 88, why: 'Quantified pain, clear workflow, senior buyer' },
  { id: '1004', name: 'Arjun Mehta', co: 'Mehta & Co Accountants', ind: 'Professional services', size: 28, role: 'Partner', dm: true, pages: 5, opens: 3, demo: false, web: true, msg: 'Can you integrate with our practice management system?', intent: 64, why: 'Specific technical question, early stage' },
  { id: '1005', name: 'Sophie Tran', co: 'Tran Studio', ind: 'Creative', size: 4, role: 'Founder', dm: true, pages: 11, opens: 8, demo: true, web: false, msg: 'Love the content! Doing a university project on AI in small business.', intent: 8, why: 'Research intent, not a buyer' },
  { id: '1006', name: 'Daniel Okafor', co: 'Okafor Civil', ind: 'Construction', size: 85, role: 'Finance Manager', dm: true, pages: 6, opens: 2, demo: false, web: true, msg: 'Our AP team is drowning in subcontractor invoices every month end.', intent: 78, why: 'Clear back-office pain, finance owner' },
  { id: '1007', name: 'Grace Whitfield', co: 'Whitfield Wines', ind: 'Hospitality', size: 30, role: 'Marketing Lead', dm: false, pages: 7, opens: 5, demo: false, web: true, msg: 'Interested in a chatbot for tasting-room bookings, need to run it by our GM.', intent: 55, why: 'Real use case, not the decision-maker' },
  { id: '1008', name: 'Ravi Patel', co: 'Patel Pharmacy Group', ind: 'Retail', size: 60, role: 'Owner', dm: true, pages: 2, opens: 0, demo: true, web: true, msg: 'Need a quote for automating supplier invoice entry across 5 stores, budget approved.', intent: 85, why: 'Budget approved, scoped request, owner' },
];
const TARGET_IND = ['Healthcare', 'Logistics', 'Professional services', 'Construction', 'Retail'];
const fitScore = (l) => (TARGET_IND.includes(l.ind) ? 30 : 0) + (l.size >= 20 && l.size <= 250 ? 30 : 0) + (l.dm ? 25 : 0) + (l.web ? 15 : 0);
const engScore = (l) => Math.min(100, l.pages * 4 + l.opens * 3 + (l.demo ? 25 : 0));
DEMOS.scoring = (body) => {
  const w = { fit: 5, eng: 3, ai: 6 };
  let sel = '1003';
  const tbody = h('tbody');
  const detail = h('div', { class: 'card' });
  const mk = (k, label) => {
    const out = h('b', { class: 'tabnum' }, String(w[k]));
    const inp = h('input', { type: 'range', min: '0', max: '10', step: '1', value: String(w[k]), id: 'w-' + k, oninput: (e) => { w[k] = +e.target.value; out.textContent = e.target.value; render(); } });
    return h('label', { for: 'w-' + k }, h('span', null, label, out), inp);
  };
  body.append(
    h('div', { class: 'sliders' }, mk('fit', 'Fit weight (firmographics)'), mk('eng', 'Engagement weight (clicks, opens)'), mk('ai', 'AI intent weight (what they wrote)')),
    h('div', { class: 'split' },
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'data-table' }, h('thead', null, h('tr', null, h('th', null, 'Lead'), h('th', { class: 'num' }, 'Fit'), h('th', { class: 'num' }, 'Eng.'), h('th', { class: 'num' }, 'AI'), h('th', { class: 'num' }, 'Score'), h('th', null, 'Band'))), tbody)),
      detail),
    h('p', { class: 'small muted', style: 'margin-top:.75rem' }, 'Try setting AI intent to 0: Tran Studio, a student with lots of clicks, climbs the list. Reading the message is what drops it.'));
  const score = (l) => { const t = w.fit + w.eng + w.ai || 1; return Math.round((w.fit * fitScore(l) + w.eng * engScore(l) + w.ai * l.intent) / t); };
  const band = (s) => (s >= 75 ? 'A' : s >= 50 ? 'B' : 'C');
  function render() {
    const rows = LEADS.map((l) => ({ l, s: score(l) })).sort((a, b) => b.s - a.s);
    tbody.replaceChildren(...rows.map(({ l, s }) => h('tr', { class: l.id === sel ? 'sel' : '', tabindex: '0', onclick: () => { sel = l.id; render(); }, onkeydown: (e) => { if (e.key === 'Enter') { sel = l.id; render(); } } },
      h('td', null, h('b', null, l.co), h('br'), h('span', { class: 'muted small' }, l.name + ' · ' + l.role)),
      h('td', { class: 'num' }, fitScore(l)), h('td', { class: 'num' }, engScore(l)), h('td', { class: 'num' }, l.intent),
      h('td', { class: 'num' }, h('b', null, s), h('span', { class: 'sbar' }, h('i', { style: `width:${s}%` }))),
      h('td', { class: 'band-' + band(s) }, h('b', null, band(s))))));
    const l = LEADS.find((x) => x.id === sel), s = score(l), t = w.fit + w.eng + w.ai || 1;
    const parts = [['Fit', (w.fit * fitScore(l)) / t], ['Engagement', (w.eng * engScore(l)) / t], ['AI intent', (w.ai * l.intent) / t]];
    const hub = R.crm === 'HubSpot';
    detail.replaceChildren(
      h('h5', null, 'Why this score'),
      h('div', null, h('b', null, l.co), h('div', { class: 'small muted' }, `${l.ind} · ${l.size} staff · ${l.role}`)),
      h('p', { class: 'small', style: 'font-style:italic; color:var(--fg-2)' }, '"' + l.msg + '"'),
      h('div', { class: 'fields' }, parts.map(([k, v]) => h('div', null, h('dt', null, k), h('dd', { class: 'tabnum' }, '+' + v.toFixed(1) + ' pts')))),
      h('p', { class: 'small' }, h('span', { class: 'tag acc' }, 'AI read'), ' ', l.why),
      hub ? codeBlock({ properties: { ai_lead_score: s, ai_score_band: band(s), ai_score_reason: l.why } }, 'PATCH /crm/v3/objects/contacts/' + l.id, 'write-back')
        : codeBlock({ data: [{ id: '5725…' + l.id, AI_Lead_Score: s, AI_Score_Band: band(s), AI_Score_Reason: l.why }] }, 'PUT /crm/v7/Leads', 'write-back'));
  }
  render();
};

/* ===== Demo 3: quoting ===== */
const SKUS_BASE = [
  { sku: 'DSK-1600', name: 'Height-adjustable desk 1600', list: 1190, cost: 760, stock: 42, def: 20 },
  { sku: 'CHR-ERG', name: 'Ergonomic task chair', list: 520, cost: 310, stock: 15, def: 20 },
  { sku: 'SCR-1200', name: 'Acoustic desk screen 1200', list: 210, cost: 118, stock: 120, def: 20 },
  { sku: 'PED-3D', name: 'Mobile pedestal, 3 drawer', list: 390, cost: 238, stock: 60, def: 10 },
  { sku: 'INST', name: 'Installation per workstation', list: 85, cost: 52, stock: null, def: 20 },
];
DEMOS.quote = (body) => {
  const SKUS = SKUS_BASE.map((s) => ({ ...s, list: listP(s.list), cost: listP(s.cost) }));
  const CUSTOMERS = [
    { id: 'new', name: `${R.city} Allied Health (new customer)`, tier: 'List price', disc: 0 },
    { id: 'b', name: 'Northside Medical Centre', tier: 'Tier B', disc: 0.05 },
    { id: 'a', name: 'Cityline Retail Group', tier: 'Tier A', disc: 0.1 },
  ];
  const st = { cust: 'new', extra: 0, qty: Object.fromEntries(SKUS.map((s) => [s.sku, s.def])) };
  const email = h('div', { class: 'msg user', style: 'max-width:100%; justify-self:stretch' }, h('span', { class: 'who' }, 'Email from ops@alliedhealth.example'), `Hi, we're fitting out our new ${R.city} clinic for 20 staff. We need desks, chairs, screens and some pedestals, installed by mid-December. Can you quote?`);
  const extracted = codeBlock({ items: [{ sku: 'DSK-1600', qty: 20 }, { sku: 'CHR-ERG', qty: 20 }, { sku: 'SCR-1200', qty: 20 }, { sku: 'PED-3D', qty: 10, note: '"some" → assumed 1 per 2 staff' }, { sku: 'INST', qty: 20 }], need_by: '2026-12-11', site: R.city }, 'Extraction agent output', 'LLM');
  const sel = h('select', { id: 'q-cust', onchange: (e) => { st.cust = e.target.value; render(); } }, CUSTOMERS.map((c) => h('option', { value: c.id }, `${c.name} · ${c.tier}`)));
  const extraOut = h('b', { class: 'tabnum' }, '0%');
  const extra = h('input', { type: 'range', id: 'q-extra', min: '0', max: '20', step: '1', value: '0', style: 'width:100%; accent-color:var(--accent)', oninput: (e) => { st.extra = +e.target.value; extraOut.textContent = e.target.value + '%'; render(); } });
  const lines = SKUS.map((s) => h('label', { class: 'qline', for: 'q-' + s.sku }, h('span', null, s.name, h('small', null, `${s.sku} · list ${money(s.list, 0)}` + (s.stock != null ? ` · ${s.stock} in stock` : ''))),
    h('input', { type: 'number', id: 'q-' + s.sku, min: '0', max: '200', value: String(s.def), oninput: (e) => { st.qty[s.sku] = Math.max(0, +e.target.value || 0); render(); } })));
  const doc = h('div', { class: 'qdoc' });
  const payload = h('div');
  body.append(h('div', { class: 'split' },
    h('div', { class: 'qform' }, email, extracted,
      h('label', { for: 'q-cust', class: 'small muted' }, 'Customer (sets the price tier)'), sel,
      h('div', null, h('label', { for: 'q-extra', class: 'small', style: 'display:flex; justify-content:space-between' }, h('span', { class: 'muted' }, 'Extra discount the rep wants to offer'), extraOut), extra),
      h('div', { style: 'display:grid; gap:.4rem' }, lines)),
    h('div', { style: 'display:grid; gap:.75rem; align-content:start' }, doc, payload)));
  function render() {
    const c = CUSTOMERS.find((x) => x.id === st.cust);
    const factor = (1 - c.disc) * (1 - st.extra / 100);
    let sub = 0, cost = 0; const notes = [];
    const rows = SKUS.filter((s) => st.qty[s.sku] > 0).map((s) => {
      const q = st.qty[s.sku], unit = r2(s.list * factor), amt = r2(unit * q);
      sub += amt; cost += s.cost * q;
      if (s.stock != null && q > s.stock) notes.push(`${s.sku}: ${s.stock} ship now, ${q - s.stock} in about 3 weeks`);
      return { s, q, unit, amt };
    });
    const freight = rows.length ? listP(180) : 0;
    const taxable = sub + freight, tax = r2(taxable * R.tax.rate), total = taxable + tax;
    const margin = sub ? (sub - cost) / sub : 0;
    const totDisc = 1 - factor;
    const needApproval = margin < 0.25 || totDisc > 0.12;
    const cover = `Thanks for considering us for the ${R.city} fit-out. This quote covers ${st.qty['DSK-1600'] || 0} height-adjustable workstations with chairs, screens and storage, fully installed. ` +
      (notes.length ? `Most items ship immediately; ${notes.length === 1 ? 'one line has' : 'some lines have'} a short lead time, noted below, and we can still complete installation before 11 December. ` : 'Everything is in stock, so we can install well before 11 December. ') +
      (c.disc || st.extra ? `Pricing includes a ${Math.round(totDisc * 1000) / 10}% discount${c.disc ? ' at your ' + c.tier + ' rate' : ''}.` : 'Pricing is at our standard list rates.');
    doc.replaceChildren(
      h('div', { class: 'qh' }, h('div', null, h('b', null, 'Quote Q-2026-0214'), h('div', { class: 'small muted' }, c.name)), h('div', { class: 'small muted', style: 'text-align:right' }, 'Issued ' + dshort(2026, 11, 10), h('br'), 'Valid until ' + dshort(2026, 12, 10))),
      h('p', { class: 'cover' }, cover),
      h('div', { class: 'tbl-wrap' }, h('table', null,
        h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, 'Qty'), h('th', null, 'Unit ' + R.tax.ex), h('th', null, 'Amount'))),
        h('tbody', null, rows.map((r) => h('tr', null, h('td', null, r.s.name), h('td', null, r.q), h('td', null, money(r.unit)), h('td', null, money(r.amt))))),
        h('tfoot', null,
          h('tr', null, h('td', { colspan: '3' }, 'Delivery, metro'), h('td', null, money(freight))),
          h('tr', null, h('td', { colspan: '3' }, 'Subtotal ' + R.tax.ex), h('td', null, money(taxable))),
          h('tr', null, h('td', { colspan: '3' }, `${R.tax.name} ${pct(R.tax.rate)}`), h('td', null, money(tax))),
          h('tr', { class: 'total' }, h('td', { colspan: '3' }, 'Total ' + R.tax.inc), h('td', null, money(total)))))),
      notes.length ? h('p', { class: 'small muted' }, 'Lead time: ' + notes.join('; ')) : null,
      h('div', { class: 'btn-row' },
        h('span', { class: 'tag ' + (margin < 0.25 ? 'bad' : 'ok') }, `Margin ${(margin * 100).toFixed(1)}%`),
        h('span', { class: 'tag ' + (totDisc > 0.12 ? 'bad' : 'ok') }, `Discount ${(totDisc * 100).toFixed(1)}%`),
        h('span', { class: 'tag ' + (needApproval ? 'warn' : 'ok') }, needApproval ? 'Needs manager approval' : 'Within rules · auto-send ready')),
      h('p', { class: 'small muted' }, `Prices, totals and ${R.tax.name} come from code and the ERP. The writer agent drafted only the cover note.`));
    const qlines = rows.map((r) => ({ sku: r.s.sku, desc: r.s.name, qty: r.q, unit: r.unit, amount: r.amt })).concat(freight ? [{ sku: 'FREIGHT', desc: 'Delivery, metro', qty: 1, unit: freight, amount: freight }] : []);
    payload.replaceChildren(codeBlock(LG.quote({ number: 'Q-2026-0214', date: '2026-11-10', expiry: '2026-12-10', draft: needApproval, lines: qlines }), LG.path.quote, needApproval ? 'held as draft' : 'ready'));
  }
  render();
};

/* ===== Demo 4: invoice capture ===== */
const INV_LINES = [['Hardwood timber 90×19 (per m)', 120, 8.4], ['Birch plywood 2400×1200×18 (sheet)', 14, 96.5], ['Delivery, metro', 1, 85]];
const LEDGER_EXISTING = ['RT-20791', 'RT-20655'];
DEMOS.invoice = (body, bar, token) => {
  let variant = 'clean';
  const invBox = h('div'), right = h('div', { style: 'display:grid; gap:.85rem; align-content:start' });
  const toggle = h('input', { type: 'checkbox', id: 'inv-problem', onchange: (e) => { variant = e.target.checked ? 'problem' : 'clean'; draw(); } });
  bar.append(h('label', { class: 'switch', for: 'inv-problem' }, toggle, 'Use a problem invoice'),
    h('button', { class: 'btn primary', type: 'button', onclick: () => run() }, 'Run pipeline'));
  body.append(h('div', { class: 'split' }, invBox, right));
  function data() {
    const lines = INV_LINES.map(([d, q, u]) => [d, q, unitP(u)]);
    const sub = r2(lines.reduce((s, l) => s + r2(l[1] * l[2]), 0));
    const clean = variant === 'clean';
    const tax = r2(sub * R.tax.rate * (clean ? 1 : 1.1));
    return { lines, sub, tax, total: r2(sub + tax), id: clean ? R.id.good : R.id.bad, number: clean ? 'RT-20817' : 'RT-20791', bank: clean ? '4471' : '9930', po: 'PO-5521' };
  }
  const fx = (f, txt) => h('span', { class: 'fx', 'data-f': f }, txt);
  function draw() {
    ucRun.next(); token = ucRun.next();
    const d = data();
    invBox.replaceChildren(h('div', { class: 'inv', 'aria-label': 'Sample supplier invoice' },
      h('div', { class: 'ih' }, h('div', null, h('div', { class: 'sup' }, fx('supplier', R.supplier)), h('div', null, R.addr), h('div', null, R.id.name + ' ', fx('taxid', fmtId(d.id)))),
        h('div', { style: 'text-align:right' }, h('div', { class: 'title' }, R.invTitle), h('div', null, 'No. ', fx('number', d.number)), h('div', null, 'Date ', fx('date', dnum(2026, 11, 2))), h('div', null, 'Due ', fx('due', dnum(2026, 12, 2))))),
      h('div', null, h('b', null, 'Bill to: '), R.billto, ' · Your ref ', fx('po', d.po)),
      h('table', null, h('thead', null, h('tr', null, h('th', null, 'Description'), h('th', null, 'Qty'), h('th', null, 'Unit'), h('th', null, 'Amount'))),
        h('tbody', { class: 'fx', 'data-f': 'lines' }, d.lines.map((l) => h('tr', null, h('td', null, l[0]), h('td', null, l[1]), h('td', null, num2(l[2])), h('td', null, num2(l[1] * l[2])))))),
      h('div', { style: 'display:grid; justify-content:end; text-align:right; gap:.1rem' },
        h('div', null, 'Subtotal ', fx('subtotal', num2(d.sub))),
        h('div', null, `${R.tax.name} ${pct(variant === 'clean' ? R.tax.rate : R.tax.rate)} `, fx('tax', num2(d.tax))),
        h('div', { style: 'font-weight:700; font-size:.9rem' }, `Total ${R.cur} `, fx('total', num2(d.total)))),
      h('div', { style: 'font-size:.7rem; color:#5C665F' }, R.pay + ' ', fx('bank', d.bank), ' · Terms 30 days')));
    right.replaceChildren(pipeEl(), h('p', { class: 'small muted' }, variant === 'clean' ? 'A normal bill. Press Run pipeline.' : `Same supplier, but with a mistyped ${R.id.name}, wrong ${R.tax.name}, a reused invoice number and new bank details. Press Run pipeline.`));
  }
  const STEPS = () => ['Ingest: stored in-region, file hashed', 'Parse: layout and text (Docling)', 'Extract: LLM fills the bill schema', 'Validate: checks run in code', 'Decide: draft or review', `Post: create the bill in ${LG.name}`];
  function pipeEl(state = []) { return h('div', { class: 'pipe' }, STEPS().map((s, i) => h('div', { class: 'pipe-step ' + (state[i] || '') }, h('i'), h('span', null, s), h('span', { class: 'small muted mono' }, state[i] === 'ok' ? 'done' : state[i] === 'run' ? '…' : state[i] === 'fail' ? 'flagged' : '')))); }
  async function run() {
    draw(); const my = ucRun.next(); token = my;
    const d = data(); const state = [];
    const pipe = right.firstChild; const setPipe = () => { const n = pipeEl(state); pipe.replaceChildren(...n.childNodes); };
    right.replaceChildren(pipe);
    const go = async (i, ms) => { state[i] = 'run'; setPipe(); await sleep(ms); if (!ucRun.alive(my)) throw 0; state[i] = 'ok'; setPipe(); };
    try {
      await go(0, 500); await go(1, 800);
      state[2] = 'run'; setPipe();
      const conf = { supplier: 0.99, taxid: 0.98, number: 0.99, date: 0.97, due: 0.96, po: 0.95, lines: 0.94, subtotal: 0.99, tax: 0.98, total: 0.99, bank: variant === 'clean' ? 0.97 : 0.93 };
      const vals = { supplier: R.supplier, taxid: fmtId(d.id), number: d.number, date: '2026-11-02', due: '2026-12-02', po: d.po, lines: d.lines.length + ' lines', subtotal: num2(d.sub), tax: num2(d.tax), total: num2(d.total), bank: '•••' + d.bank };
      const tb = h('tbody');
      right.append(h('div', { class: 'card' }, h('h5', null, 'Extracted fields'), h('div', { class: 'tbl-wrap' }, h('table', { class: 'data-table' }, h('thead', null, h('tr', null, h('th', null, 'Field'), h('th', null, 'Value'), h('th', { class: 'num' }, 'Conf.'))), tb))));
      for (const f of Object.keys(vals)) {
        const el = invBox.querySelector(`[data-f="${f}"]`); if (el) el.classList.add('hit');
        tb.append(h('tr', { class: 'appear' }, h('td', { class: 'mono small' }, f), h('td', null, vals[f]), h('td', { class: 'num' }, conf[f].toFixed(2))));
        await sleep(170); if (!ucRun.alive(my)) return;
      }
      state[2] = 'ok'; state[3] = 'run'; setPipe();
      const lineSum = r2(d.lines.reduce((s, l) => s + l[1] * l[2], 0));
      const expTax = r2(d.sub * R.tax.rate);
      const checks = [
        ['taxid', CHECKS[R.id.check](d.id), `${R.id.name} passes: ${R.id.how}`, `${R.id.name} ${fmtId(d.id)} ${R.id.badWhy}`],
        ['tax', Math.abs(d.tax - expTax) < 0.01, `${R.tax.name} ${money(d.tax)} = ${pct(R.tax.rate)} of ${money(d.sub)}`, `${R.tax.name} ${money(d.tax)} should be ${money(expTax)} (${pct(R.tax.rate)} of ${money(d.sub)})`],
        ['lines', Math.abs(lineSum - d.sub) < 0.01, `Lines sum to the subtotal (${money(lineSum)})`, "Lines don't sum to the subtotal"],
        ['total', Math.abs(d.sub + d.tax - d.total) < 0.01, `Total = subtotal + ${R.tax.name}`, "Total doesn't add up"],
        ['supplier', true, `Supplier matched to a ${LG.name} contact`, ''],
        ['number', !LEDGER_EXISTING.includes(d.number), `${d.number} not seen before for this supplier`, `${d.number} already exists in ${LG.name} (bill from 18 Oct): possible duplicate`],
        ['po', true, `${d.po} is open and covers this amount`, ''],
        ['bank', d.bank === '4471', 'Bank account matches the supplier record', `Bank account ending ${d.bank} differs from record (4471): blocked, call the supplier on a known number`],
      ];
      const ck = h('div', { class: 'checks' });
      right.append(h('div', { class: 'card' }, h('h5', null, 'Checks in code'), ck));
      const fails = [];
      for (const [f, ok, good, bad] of checks) {
        if (!ok) { fails.push(bad); const el = invBox.querySelector(`[data-f="${f}"]`); if (el) { el.classList.remove('hit'); el.classList.add('badhit'); } }
        ck.append(h('div', { class: 'check appear' }, h('span', { class: 'tag ' + (ok ? 'ok' : 'bad') }, ok ? 'pass' : 'fail'), h('span', null, ok ? good : bad)));
        await sleep(260); if (!ucRun.alive(my)) return;
      }
      state[3] = fails.length ? 'fail' : 'ok'; state[4] = 'run'; setPipe(); await sleep(500); if (!ucRun.alive(my)) return;
      if (fails.length) {
        state[4] = 'fail'; setPipe();
        right.append(h('div', { class: 'decision bad appear' }, h('b', null, `Sent to review: ${fails.length} check${fails.length > 1 ? 's' : ''} failed`), h('span', { class: 'small' }, `Nothing was written to ${LG.name}. The reviewer sees the PDF, the fields and the reasons above. The bank-detail change also alerts the finance manager.`)));
      } else {
        state[4] = 'ok'; state[5] = 'run'; setPipe(); await sleep(700); if (!ucRun.alive(my)) return; state[5] = 'ok'; setPipe();
        const blines = d.lines.map((l) => ({ desc: l[0], qty: l[1], unit: l[2], amount: r2(l[1] * l[2]), freight: l[0].startsWith('Delivery') }));
        right.append(h('div', { class: 'decision ok appear' }, h('b', null, 'Draft bill created · no human touch needed'), h('span', { class: 'small' }, `All checks passed and every field ≥ 0.90 confidence. Accounts approves payment in ${LG.name} as usual.`)),
          codeBlock(LG.bill({ number: d.number, ref: d.po, date: '2026-11-02', due: '2026-12-02', lines: blines }), LG.path.bill, 'then attach ' + d.number + '.pdf'));
      }
    } catch { /* cancelled */ }
  }
  draw();
};

/* ===== Demo 5: middleware ===== */
DEMOS.middleware = (body, bar, token) => {
  const NODES = [['src', 'JobTrack', 'on-prem SQL'], ['hook', 'Webhook + queue', 'FastAPI'], ['map', 'Map & route', 'n8n'], ['ai', 'Read tech notes', 'LLM', true], ['led', 'Draft invoice', `${LG.name} API`], ['crm', 'Deal stage', `${R.crm} API`], ['tm', 'Notify', 'Teams']];
  const nodeEls = {}; const nodesBox = h('div', { class: 'nodes' }, NODES.map(([id, b, s, ai]) => (nodeEls[id] = h('div', { class: 'mw-node' + (ai ? ' ai' : '') }, h('b', null, b), h('span', null, s)))));
  const log = h('div', { class: 'log', 'aria-live': 'polite', 'data-lenis-prevent': '' });
  const out = h('div', { style: 'display:grid; gap:.75rem; align-content:start' });
  const rl = h('input', { type: 'checkbox', id: 'mw-429', checked: true });
  bar.append(h('label', { class: 'switch', for: 'mw-429' }, rl, `${LG.name} rate-limits the first try`), h('button', { class: 'btn primary', type: 'button', onclick: () => run() }, 'Fire event'));
  const EVENT = { source: 'JobTrack', event: 'job.completed', job_id: 4471, customer_code: 'NORTH-MED', tech: 'L. Nguyen', labour_hours: 3.5, notes: 'Replaced 2x 20A RCBOs in switchboard B. Extra 40m cat6 run to reception, approved by site mgr on the day.', completed_at: `2026-11-10T14:20:00${R.tz}` };
  body.append(nodesBox, h('div', { class: 'split' }, h('div', null, codeBlock(EVENT, 'Incoming event', 'legacy system'), h('div', { style: 'height:.75rem' }), log), out));
  let t0;
  const ts = () => new Date(t0).toTimeString().slice(0, 8);
  const L = (cls, txt) => { log.append(h('div', { class: 'appear', html: `<span class="t">${ts()}</span> <span class="${cls}">${esc(txt)}</span>` })); log.scrollTop = log.scrollHeight; };
  const set = (id, s) => { nodeEls[id].classList.remove('run', 'ok', 'wait'); if (s) nodeEls[id].classList.add(s); };
  function idle() { Object.keys(nodeEls).forEach((k) => set(k, null)); log.replaceChildren(h('div', { class: 't' }, 'Waiting for an event. Press Fire event.')); out.replaceChildren(h('p', { class: 'small muted' }, 'The legacy job system has no API. A small adapter watches its database for completed jobs and posts them to our webhook. Everything downstream is ordinary cloud APIs.')); }
  async function run() {
    const my = ucRun.next(); token = my;
    idle(); log.replaceChildren(); out.replaceChildren(); t0 = new Date(2026, 10, 10, 14, 20, 3).getTime();
    const tick = (s) => { t0 += s * 1000; };
    const step = async (id, ms) => { set(id, 'run'); await sleep(ms); if (!ucRun.alive(my)) throw 0; set(id, 'ok'); };
    try {
      L('a', 'job.completed received from JobTrack adapter (job 4471)'); await step('src', 500);
      tick(1); L('ok', 'Signature verified (HMAC-SHA256). Idempotency key: job-4471-v1'); await step('hook', 600);
      tick(1); L('', `n8n: NORTH-MED → ${LG.name} contact 3f9a… (cache hit); labour 3.5h → item LAB-STD`); await step('map', 700);
      tick(2); L('a', 'LLM: extracting billable extras from technician notes'); set('ai', 'run'); await sleep(900); if (!ucRun.alive(my)) throw 0; set('ai', 'ok');
      out.append(codeBlock({ billable_extras: [{ item_code: 'RCBO-20', qty: 2 }, { item_code: 'CAT6-M', qty: 40, unit: 'm' }], approval: 'verbal, site manager', confidence: 0.91, flag: 'Attach note: extra cabling approved verbally' }, 'AI step output', 'structured JSON'));
      L('ok', 'Extras found: RCBO-20 ×2, CAT6-M ×40 (confidence 0.91)');
      const inv = LG.invoice({ ref: 'Job 4471', lines: [{ sku: 'LAB-STD', qty: 3.5 }, { sku: 'RCBO-20', qty: 2 }, { sku: 'CAT6-M', qty: 40 }] });
      set('led', 'run'); tick(1);
      const path = LG.path.invoice.replace(/^POST /, '');
      if (rl.checked) {
        L('w', `POST ${path} → 429 Too Many Requests (Retry-After: 12)`); set('led', 'wait'); await sleep(1100); if (!ucRun.alive(my)) throw 0;
        tick(12); L('', 'Waited 12s. Retrying with the same Idempotency-Key: job-4471-v1'); set('led', 'run'); await sleep(600); if (!ucRun.alive(my)) throw 0;
      }
      L('ok', `POST ${path} → 200 OK · INV-1188 (draft). One invoice, no duplicate.`); set('led', 'ok');
      out.append(codeBlock(inv, LG.path.invoice, 'Idempotency-Key: job-4471-v1'));
      tick(1); await step('crm', 500); L('ok', `${R.crm} deal 88102 → stage "Completed – invoiced"`);
      tick(1); await step('tm', 500); L('ok', 'Teams: posted to #accounts with review link');
      out.append(h('div', { class: 'msg agent appear', style: 'max-width:100%' }, h('span', { class: 'who' }, 'Teams · #accounts'), 'Job 4471 (Northside Medical) is complete. Draft invoice INV-1188 is ready for review. Note: the extra cabling was approved verbally on site.'));
      L('t', `Run finished in ${rl.checked ? '18' : '6'}s · 4 API calls · trace lf_mw_4471`);
    } catch { /* cancelled */ }
  }
  idle();
};

/* ===== Demo 6: knowledge assistant ===== */
const CORPUS = {
  c1: { doc: 'Cold Store SOP v4.2', sec: '§3.1 PPE', acl: 'all', text: 'Staff entering the blast freezer (−25 °C) must wear a freezer suit, insulated gloves, a balaclava and safety boots. Maximum continuous stay is 20 minutes, followed by a 10-minute warm-up break.' },
  c2: { doc: 'Health & Safety Manual', sec: '§7.4 Cold environments', acl: 'all', text: 'Lone work in freezers is not permitted. A second person must be within sight or radio contact. Check the internal door release before entering.' },
  c3: { doc: 'Site Induction Guide', sec: '§2 General PPE', acl: 'all', text: 'Hi-vis vests and safety boots are required on the production floor at all times.' },
  c4: { doc: 'Incident Procedure v2', sec: '§1 Reporting', acl: 'all', text: 'Report every incident and near miss in the SafetyCulture app before the end of your shift. Add photos and the area code.' },
  c5: { doc: 'Incident Procedure v2', sec: '§3 Review', acl: 'all', text: 'Your supervisor reviews each near miss within 48 hours and assigns a corrective action.' },
  c6: { doc: 'HR Policy: Redundancy', sec: '§4 Entitlements', acl: 'HR only', text: 'Redundancy pay follows the statutory minimum for the country of employment, plus one additional week per completed year of service for employees with more than five years.' },
  c7: { doc: 'Collective agreement summary', sec: '§9 Leave', acl: 'all', text: 'Full-time staff accrue four weeks of annual leave a year; shift workers on continuous rosters accrue five.' },
  c9: { doc: 'Cold Store SOP v4.2', sec: '§5 Defrost schedule', acl: 'all', text: 'Blast freezer defrost runs Sundays 02:00–04:00. Do not enter during defrost.' },
  c11: { doc: 'IT Acceptable Use', sec: '§2 Networks', acl: 'all', text: 'Staff devices connect to the CORP Wi-Fi using their own login. Personal devices must not be connected to CORP.' },
};
const RAG_QS = [
  { q: 'What PPE do I need for the blast freezer?', rewrite: 'blast freezer PPE requirements clothing entry rules', cands: [['c1', 1, 1, 0.97], ['c3', 2, 4, 0.46], ['c2', 3, 2, 0.81], ['c9', 4, 3, 0.12]],
    answer: 'Wear a freezer suit, insulated gloves, a balaclava and safety boots<sup>[1]</sup>. Stay no longer than 20 minutes at a time, then take a 10-minute warm-up break<sup>[1]</sup>. Never go in alone: someone must be in sight or on radio, and check the door release before entering<sup>[2]</sup>. Hi-vis and boots apply on the production floor too<sup>[3]</sup>.' },
  { q: 'How do I report a near miss?', rewrite: 'near miss incident reporting procedure', cands: [['c4', 1, 1, 0.95], ['c5', 2, 2, 0.88], ['c3', 3, null, 0.1], ['c2', null, 3, 0.15]],
    answer: 'Log it in the SafetyCulture app before your shift ends, with photos and the area code<sup>[1]</sup>. Your supervisor will review it within 48 hours and assign a corrective action<sup>[2]</sup>.' },
  { q: "What's the redundancy payout policy?", rewrite: 'redundancy pay entitlements policy', cands: [['c6', 1, 1, 0.96], ['c7', 2, 2, 0.22]],
    answer: 'Redundancy pay follows the statutory minimum for your country of employment, plus one extra week for each completed year of service for anyone with more than five years<sup>[1]</sup>.',
    denied: "I couldn't find this in documents you have access to. HR policies on entitlements are restricted; please contact HR directly." },
  { q: "What's the guest Wi-Fi password?", rewrite: 'guest wifi password network access', cands: [['c11', 1, 1, 0.31], ['c7', null, 2, 0.04]], answer: null },
];
DEMOS.knowledge = (body) => {
  let qi = 0, role = 'warehouse';
  const chips = h('div', { class: 'rag-q', role: 'group', 'aria-label': 'Sample questions' });
  const roleSel = h('select', { id: 'rag-role', onchange: (e) => { role = e.target.value; render(); }, style: 'background:var(--bg); border:1px solid var(--line); border-radius:4px; padding:.3rem .45rem; color:var(--fg); font:inherit; font-size:.8125rem' },
    h('option', { value: 'warehouse' }, 'Asking as: Warehouse team member'), h('option', { value: 'hr' }, 'Asking as: HR manager'));
  const left = h('div', null), right = h('div', { style: 'display:grid; gap:.75rem; align-content:start' });
  body.append(h('div', { class: 'btn-row', style: 'margin-bottom:.75rem' }, h('label', { for: 'rag-role', class: 'sr-only' }, 'Role'), roleSel), chips, h('div', { class: 'split' }, left, right));
  RAG_QS.forEach((q, i) => chips.append(h('button', { class: 'chip', type: 'button', 'aria-pressed': i === 0 ? 'true' : 'false', onclick: () => { qi = i; $$('.chip', chips).forEach((c, j) => c.setAttribute('aria-pressed', j === i ? 'true' : 'false')); render(); } }, q.q)));
  function render() {
    const Q = RAG_QS[qi];
    const rows = Q.cands.map(([id, kr, vr, rr]) => {
      const c = CORPUS[id]; const rrf = (kr ? 1 / (60 + kr) : 0) + (vr ? 1 / (60 + vr) : 0);
      return { id, c, kr, vr, rr, rrf, allowed: c.acl === 'all' || role === 'hr' };
    }).sort((a, b) => b.rrf - a.rrf);
    const kept = rows.filter((r) => r.allowed && r.rr >= 0.4).sort((a, b) => b.rr - a.rr);
    left.replaceChildren(
      h('p', { class: 'code-cap' }, h('span', null, 'Query rewritten for search'), h('span', null, 'LLM, small model')),
      h('pre', { class: 'code', style: 'margin-bottom:.75rem' }, Q.rewrite),
      h('p', { class: 'code-cap' }, h('span', null, 'Candidates: keyword rank + meaning rank, fused (RRF)'), h('span', null, 'then permission filter + rerank ≥ 0.40')),
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'data-table cand' },
        h('thead', null, h('tr', null, h('th', null, 'Passage'), h('th', { class: 'num' }, 'Kw'), h('th', { class: 'num' }, 'Vec'), h('th', { class: 'num' }, 'RRF'), h('th', null, 'Access'), h('th', { class: 'num' }, 'Rerank'))),
        h('tbody', null, rows.map((r) => h('tr', { class: !r.allowed || r.rr < 0.4 ? 'drop' : 'top' },
          h('td', null, h('b', null, r.c.doc), h('br'), h('span', { class: 'muted small' }, r.c.sec)),
          h('td', { class: 'num' }, r.kr || '—'), h('td', { class: 'num' }, r.vr || '—'), h('td', { class: 'num' }, r.rrf.toFixed(4)),
          h('td', { class: r.allowed ? '' : 'acl-no' }, r.allowed ? r.c.acl : 'blocked'),
          h('td', { class: 'num' }, r.allowed ? r.rr.toFixed(2) : '—')))))));
    let ans, srcs = [];
    if (kept.length && Q.answer) { ans = Q.answer; srcs = kept; }
    else if (Q.denied && !kept.length) ans = esc(Q.denied);
    else ans = "The documents I can search don't cover this, so I won't guess. Try the IT service desk.";
    right.replaceChildren(
      h('div', { class: 'msg user', style: 'justify-self:end' }, h('span', { class: 'who' }, role === 'hr' ? 'HR manager' : 'Warehouse team'), Q.q),
      h('div', { class: 'answer appear' }, h('span', { class: 'eyebrow' }, 'Assistant'), h('p', { html: ans }),
        srcs.length ? h('div', { class: 'srcs' }, srcs.map((r, i) => h('span', null, h('b', null, `[${i + 1}]`), `${r.c.doc} ${r.c.sec}: “${r.c.text}”`))) : h('div', { class: 'srcs' }, h('span', null, kept.length ? '' : 'No passage passed both the permission filter and the relevance bar.'))),
      codeBlock({ user_groups: role === 'hr' ? ['all-staff', 'hr'] : ['all-staff', 'warehouse'], passages_in_prompt: kept.map((r) => r.id), citation_check: srcs.length ? 'every sentence cites a passage' : 'declined: nothing to cite', model: 'LlamaIndex + a local model on vLLM' }, 'Guardrail log'));
  }
  render();
};

/* ===== Demo 7: reporting ===== */
const WEEKS = ['17 Aug', '24 Aug', '31 Aug', '7 Sep', '14 Sep', '21 Sep', '28 Sep', '5 Oct', '12 Oct', '19 Oct', '26 Oct', '2 Nov'];
const REV = [48.2, 51.0, 49.6, 53.8, 55.1, 52.4, 57.9, 60.3, 58.7, 62.4, 64.1, 57.2];
const ADS = [6.1, 6.4, 6.2, 6.8, 7.0, 6.9, 7.4, 7.8, 7.6, 8.1, 8.3, 9.6];
const SESS = [18.2, 19.0, 18.7, 20.1, 21.4, 20.8, 22.6, 23.9, 23.1, 24.8, 25.6, 24.1];
const COVER = [34, 33, 31, 30, 29, 31, 28, 26, 27, 25, 24, 19];
const CASH = [212, 208, 219, 224, 217, 229, 236, 231, 242, 249, 255, 247];
DEMOS.reporting = (body) => {
  const n = REV.length - 1, pctc = (a, b) => ((a - b) / b) * 100;
  const K = (v) => moneyK(v * 1000 * R.fx); // base thousands → local, compact
  const roas = REV.map((r, i) => r / ADS[i]);
  const k = (l, v, d, good, alert) => h('div', { class: 'kpi' + (alert ? ' alert' : '') }, h('span', { class: 'l' }, l), h('span', { class: 'v' }, v),
    h('span', { class: 'd ' + (Math.abs(d) < 0.05 ? 'flat' : good ? 'up' : 'down') }, (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '') + Math.abs(d).toFixed(1) + '% wk'));
  const dRev = pctc(REV[n], REV[n - 1]), dAds = pctc(ADS[n], ADS[n - 1]), dRoas = pctc(roas[n], roas[n - 1]), dS = pctc(SESS[n], SESS[n - 1]), dC = pctc(COVER[n], COVER[n - 1]);
  const kpis = h('div', { class: 'kpis' },
    k(`Revenue · ${LG.name}`, K(REV[n]), dRev, dRev >= 0),
    k('Ad spend · Meta+Google', K(ADS[n]), dAds, dAds <= 0),
    k('Blended ROAS', roas[n].toFixed(2) + '×', dRoas, dRoas >= 0),
    k('Sessions · GA4', SESS[n].toFixed(1) + 'k', dS, dS >= 0),
    k(`Stock cover · ${R.inventory}`, COVER[n] + ' days', dC, dC >= 0, COVER[n] < 21));
  const W = 640, H = 250, m = { l: 56, r: 104, t: 12, b: 30 };
  const x = (i) => m.l + (i * (W - m.l - m.r)) / n, y = (v) => m.t + (1 - v / 70) * (H - m.t - m.b);
  const path = (arr) => arr.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly revenue and ad spend in ${R.cur}, 17 August to 2 November 2026">`;
  [0, 20, 40, 60].forEach((t) => { svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" style="stroke:var(--line-soft)" stroke-width="1"/><text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end" style="fill:var(--muted); font:11px var(--f-mono)">${esc(K(t))}</text>`; });
  WEEKS.forEach((wk, i) => { if (i % 2 === 1) svg += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" style="fill:var(--muted); font:10.5px var(--f-mono)">${wk}</text>`; });
  svg += `<path d="${path(REV)} L${x(n)} ${y(0)} L${x(0)} ${y(0)} Z" style="fill:var(--s1); opacity:.10"/>`;
  svg += `<path d="${path(REV)}" fill="none" style="stroke:var(--s1)" stroke-width="2" stroke-linejoin="round"/>`;
  svg += `<path d="${path(ADS)}" fill="none" style="stroke:var(--s2)" stroke-width="2" stroke-linejoin="round"/>`;
  svg += `<circle cx="${x(n)}" cy="${y(REV[n])}" r="4" style="fill:var(--s1); stroke:var(--bg)" stroke-width="2"/><circle cx="${x(n)}" cy="${y(ADS[n])}" r="4" style="fill:var(--s2); stroke:var(--bg)" stroke-width="2"/>`;
  svg += `<text x="${x(n) + 9}" y="${y(REV[n]) + 4}" style="fill:var(--fg); font:600 11px var(--f-body)">Revenue ${esc(K(REV[n]))}</text>`;
  svg += `<text x="${x(n) + 9}" y="${y(ADS[n]) + 4}" style="fill:var(--fg); font:600 11px var(--f-body)">Ads ${esc(K(ADS[n]))}</text>`;
  svg += `<line id="xh" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" style="stroke:var(--muted)" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>`;
  svg += `<rect id="hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/></svg>`;
  const chart = h('div', { class: 'chartbox' }, h('div', { class: 'legend' }, h('span', null, h('i', { style: 'background:var(--s1)' }), `Revenue (${LG.name})`), h('span', null, h('i', { style: 'background:var(--s2)' }), 'Ad spend (Meta + Google Ads)'), h('span', { class: 'muted' }, `Weekly, ${R.cur}, week commencing`)));
  chart.insertAdjacentHTML('beforeend', svg);
  const tip = h('div', { class: 'tip', hidden: true }); chart.append(tip);
  const svgEl = chart.querySelector('svg'), xh = chart.querySelector('#xh');
  svgEl.addEventListener('pointermove', (e) => {
    const r = svgEl.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(n, Math.round((px - m.l) / ((W - m.l - m.r) / n))));
    xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('opacity', '1');
    tip.hidden = false; tip.innerHTML = `<b>w/c ${WEEKS[i]}</b><br>Revenue ${esc(K(REV[i]))}<br>Ad spend ${esc(K(ADS[i]))}<br>ROAS ${roas[i].toFixed(2)}×`;
    const cr = chart.getBoundingClientRect(); const left = r.left - cr.left + (x(i) / W) * r.width;
    tip.style.left = Math.min(cr.width - 150, Math.max(8, left + 12)) + 'px'; tip.style.top = '2.2rem';
  });
  svgEl.addEventListener('pointerleave', () => { tip.hidden = true; xh.setAttribute('opacity', '0'); });
  const table = h('details', { style: 'margin-top:.5rem' }, h('summary', { class: 'small muted', style: 'cursor:pointer' }, 'Show the numbers as a table'),
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'data-table' }, h('thead', null, h('tr', null, ['Week of', 'Revenue', 'Ad spend', 'ROAS', 'Sessions k', 'Stock cover d'].map((c, i) => h('th', { class: i ? 'num' : '' }, c)))),
      h('tbody', null, WEEKS.map((wk, i) => h('tr', { style: 'cursor:default' }, h('td', null, wk), h('td', { class: 'num' }, K(REV[i])), h('td', { class: 'num' }, K(ADS[i])), h('td', { class: 'num' }, roas[i].toFixed(2)), h('td', { class: 'num' }, SESS[i].toFixed(1)), h('td', { class: 'num' }, COVER[i])))))));
  const fresh = h('div', { class: 'fresh-strip' }, [['GA4', '06:00'], ['Meta Ads', '06:04'], ['Google Ads', '06:05'], [LG.name, '06:09'], [R.inventory, '06:11']].map(([s, t]) => h('span', { class: 'tag ok' }, `${s} synced ${t}`)));
  const brief = h('div', { class: 'brief' }, h('span', { class: 'eyebrow' }, h('b', null, 'AI briefing'), ' · Monday 9 November, 07:00 · week of 2 Nov'),
    h('p', null, h('strong', null, `Revenue fell ${Math.abs(dRev).toFixed(1)}% to ${K(REV[n])} while ad spend rose ${dAds.toFixed(1)}% to ${K(ADS[n])}`), `, so blended ROAS dropped from ${roas[n - 1].toFixed(2)}× to ${roas[n].toFixed(2)}×.`),
    h('p', null, `Most of the revenue drop came from Meta paid (−${K(4.1)}), the channel with the new campaign launched 27 Oct. Site sessions dipped ${Math.abs(dS).toFixed(1)}%.`),
    h('p', null, h('strong', null, `Stock cover is ${COVER[n]} days, below the 21-day floor`), `, led by two fast movers. Cash at bank is ${K(CASH[n])}, down ${K(CASH[n - 1] - CASH[n])} on the week.`),
    h('p', { class: 'small muted' }, 'Suggested checks: Meta campaign targeting; reorder points for SKU-1042 and SKU-0877. Every figure above is linked to the SQL that produced it.'));
  const ASK = [
    { q: "Which channel drove last week's revenue drop?", sql: "SELECT channel,\n  SUM(CASE WHEN week = '2026-11-02' THEN revenue END)\n - SUM(CASE WHEN week = '2026-10-26' THEN revenue END) AS change\nFROM metrics.revenue_by_channel\nWHERE week IN ('2026-10-26','2026-11-02')\nGROUP BY channel ORDER BY change;", cols: ['Channel', 'Change'], rows: [['Meta paid', '−' + K(4.1)], ['Organic search', '−' + K(1.6)], ['Email', '−' + K(0.9)], ['Google Ads', '−' + K(0.3)], ['Total', '−' + K(6.9)]], a: `Meta paid accounts for ${K(4.1)} of the ${K(6.9)} drop.` },
    { q: 'Which SKUs are lowest on stock cover?', sql: 'SELECT sku, name, on_hand, avg_daily_units,\n  ROUND(on_hand / NULLIF(avg_daily_units,0)) AS cover_days\nFROM metrics.stock_cover\nORDER BY cover_days LIMIT 5;', cols: ['SKU', 'Item', 'Cover days'], rows: [['SKU-1042', 'Cold brew 500 ml', '9'], ['SKU-0877', 'Oat milk 1 L', '12'], ['SKU-0310', 'Sourdough crackers', '24'], ['SKU-0551', 'Chilli oil 250 ml', '31'], ['SKU-0120', 'Olive oil 1 L', '40']], a: 'Two SKUs are under the 21-day floor: cold brew (9 days) and oat milk (12 days).' },
    { q: 'How is cash tracking against a month ago?', sql: "SELECT week, cash_at_bank\nFROM metrics.cash_weekly\nWHERE week IN ('2026-10-05','2026-11-02');", cols: ['Week of', 'Cash'], rows: [['5 Oct', K(CASH[7])], ['2 Nov', K(CASH[n])]], a: `Cash is ${K(CASH[n])}, up ${K(CASH[n] - CASH[7])} (${pctc(CASH[n], CASH[7]).toFixed(1)}%) on four weeks earlier.` },
  ];
  const askOut = h('div');
  const askChips = h('div', { class: 'rag-q' }, ASK.map((a, i) => h('button', { class: 'chip', type: 'button', 'aria-pressed': i === 0 ? 'true' : 'false', onclick: () => { $$('.chip', askChips).forEach((c, j) => c.setAttribute('aria-pressed', j === i ? 'true' : 'false')); ask(i); } }, a.q)));
  function ask(i) {
    const a = ASK[i];
    askOut.replaceChildren(h('div', { class: 'grid-2', style: 'gap:.75rem' },
      codeBlock('RAW:' + esc(a.sql), 'Generated SQL', 'read-only role'),
      h('div', { style: 'display:grid; gap:.5rem; align-content:start' },
        h('div', { class: 'tbl-wrap' }, h('table', { class: 'data-table' }, h('thead', null, h('tr', null, a.cols.map((c, j) => h('th', { class: j === a.cols.length - 1 ? 'num' : '' }, c)))),
          h('tbody', null, a.rows.map((r) => h('tr', { style: 'cursor:default' }, r.map((c, j) => h('td', { class: j === r.length - 1 ? 'num' : '' }, c))))))),
        h('p', { class: 'small' }, h('span', { class: 'tag acc' }, 'Answer'), ' ', a.a))));
  }
  ask(0);
  body.append(kpis, h('div', { class: 'split' }, h('div', null, chart, table, fresh), brief),
    h('div', { style: 'margin-top:1.25rem' }, h('h4', { class: 'h4', style: 'margin-bottom:.5rem' }, 'Ask your data'), askChips, askOut));
};

/* ---------- the world's rules ---------- */
const SRC_NUM = Object.fromEntries(SOURCES.map(([id], i) => [id, i + 1]));
let lawKey = R.law;
function renderSources() {
  $('#sources-list').replaceChildren(...SOURCES.map(([id, label, url]) => h('li', { id: 'src-' + id }, h('a', { href: url, target: '_blank', rel: 'noopener' }, label))));
}
function showLaw(k) {
  if (!LAWS[k]) return;
  lawKey = k;
  $$('#law-chips .chip').forEach((c) => c.setAttribute('aria-selected', String(c.dataset.k === k)));
  const L = LAWS[k];
  const ST = { in: ['in', 'In force'], soon: ['soon', 'Coming'], soft: ['soft', 'Guidance / bill'] };
  $('#law-panel').setAttribute('aria-labelledby', 'law-' + k);
  $('#law-panel').replaceChildren(
    h('p', { class: 'law-intro' }, L.intro),
    ...L.rows.map(([when, st, title, text, src]) => h('div', { class: 'law-row' }, h('span', { class: 'when' }, when),
      h('div', null, h('b', null, title, h('span', { class: 'st ' + ST[st][0] }, ST[st][1])),
        h('p', null, text, ...src.map((s) => h('a', { class: 'src', href: '#src-' + s, title: SOURCES[SRC_NUM[s] - 1][1] }, `[${SRC_NUM[s]}]`)))))));
}
(function world() {
  const chips = $('#law-chips');
  JURIS.forEach(([k, label]) => chips.append(h('button', { class: 'chip', type: 'button', role: 'tab', id: 'law-' + k, 'data-k': k, 'aria-selected': 'false', 'aria-controls': 'law-panel', onclick: () => showLaw(k) }, label)));
  $('#once').replaceChildren(...ONCE.map(([t, p, tags], i) => h('div', null, h('span', { class: 'n' }, String(i + 1).padStart(2, '0')), h('b', null, t), h('p', null, p), h('div', { class: 'tags' }, tags.map((x) => h('span', { class: 'tag' }, x))))));
  renderSources();
  showLaw(lawKey);
})();

/* ---------- hero: route list, layer info, 3D stack ---------- */
const SCN = { route: 'invoice', step: 0, pinned: null, api: null };
function layerInfo(li) {
  const L = LAYERS[li];
  $('#layerinfo').replaceChildren(...[
    h('div', { class: 'layer-btns', role: 'group', 'aria-label': 'Inspect a layer' }, LAYERS.map((x, j) => h('button', { type: 'button', 'aria-pressed': j === li ? 'true' : 'false', onclick: () => pinLayer(j) }, x.short))),
    h('span', { class: 'tier' }, L.tier + (SCN.pinned == null ? ' · following the route' : '')),
    h('h3', null, L.name), h('p', null, L.desc),
    h('span', { class: 'io' }, L.io[0] + '  →  ' + L.io[1]),
    SCN.pinned != null ? h('button', { class: 'btn', type: 'button', style: 'justify-self:start; padding:.25rem .6rem; font-size:.75rem', onclick: () => { SCN.pinned = null; onStep(SCN.step); } }, 'Follow the route again') : null].filter(Boolean));
}
function pinLayer(j) { SCN.pinned = j; layerInfo(j); }
function renderRouteList() {
  const RT = ROUTES[SCN.route];
  $('#route-title').textContent = RT.title; $('#route-sub').textContent = RT.sub;
  $('#route-steps').replaceChildren(...RT.steps.map(([id, cap], i) => h('li', { tabindex: '0', onclick: () => jumpStep(i), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpStep(i); } } },
    h('span', null, h('b', null, NODE_INFO[id].label + ' · ' + LAYERS[NODE_INFO[id].layer].short), cap))));
  $$('#route-chips .chip').forEach((c) => c.setAttribute('aria-pressed', c.dataset.r === SCN.route ? 'true' : 'false'));
  $$('#route-steps li').forEach((li, j) => li.classList.toggle('now', j === SCN.step));
}
function onStep(i) {
  SCN.step = i;
  $$('#route-steps li').forEach((li, j) => li.classList.toggle('now', j === i));
  const id = ROUTES[SCN.route].steps[i][0];
  if (SCN.pinned == null) layerInfo(NODE_INFO[id].layer);
}
function jumpStep(i) { if (SCN.api) SCN.api.jump(i); else onStep(i); }
function setRoute(k) {
  if (!ROUTES[k]) return;
  SCN.route = k; SCN.step = 0; SCN.pinned = null;
  renderRouteList(); onStep(0);
  if (SCN.api) SCN.api.setRoute(k);
}
(function chips() {
  const box = $('#route-chips');
  ROUTE_ORDER.forEach((k) => box.append(h('button', { class: 'chip', type: 'button', 'data-r': k, 'aria-pressed': 'false', onclick: () => setRoute(k) }, ROUTE_LABEL[k])));
})();

function initThree(THREE) {
  const stage = $('#stage'), canvas = $('#scene-canvas'), labelsBox = $('#labels');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const root = new THREE.Group(); scene.add(root);
  const amb = new THREE.AmbientLight(0xffffff, 2.4); scene.add(amb);
  const dl = new THREE.DirectionalLight(0xffffff, 1.7); dl.position.set(4, 9, 6); scene.add(dl);

  const C = {};
  const readColors = () => { const cs = getComputedStyle(document.documentElement); ['--scene-slab', '--scene-edge', '--scene-node', '--accent', '--euc', '--fg'].forEach((k) => { C[k] = new THREE.Color((cs.getPropertyValue(k) || '#888888').trim()); }); };
  readColors();

  const SW = 7.6, SD = 4.4, GAP = 1.45;
  const slabs = [], edgeMats = [], nodeMeshes = {}, nodePos = {};
  LAYERS.forEach((L, i) => {
    const yy = (2 - i) * GAP;
    const g = new THREE.BoxGeometry(SW, 0.07, SD);
    const slab = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: C['--scene-slab'], transparent: true, opacity: 0.6, roughness: 0.85, metalness: 0.05, depthWrite: false }));
    slab.position.y = yy; slab.userData.layer = i; root.add(slab); slabs.push(slab);
    const em = new THREE.LineBasicMaterial({ color: C['--scene-edge'], transparent: true, opacity: 0.95 }); edgeMats.push(em);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), em); e.position.y = yy; root.add(e);
    const nn = L.nodes.length, rows = nn > 4 ? 2 : 1, perRow = Math.ceil(nn / rows);
    L.nodes.forEach(([id], j) => {
      const r = Math.floor(j / perRow), c = j % perRow, cnt = r === rows - 1 ? nn - perRow * (rows - 1) : perRow;
      const xx = cnt === 1 ? 0 : -2.8 + c * (5.6 / (cnt - 1));
      const z = rows === 1 ? 0.15 : r === 0 ? -0.95 : 0.95;
      const geo = new THREE.BoxGeometry(0.6, 0.24, 0.6);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: C['--scene-node'], emissive: new THREE.Color(0x000000), roughness: 0.5, metalness: 0.1, transparent: true, opacity: 1 }));
      mesh.position.set(xx, yy + 0.155, z); mesh.userData = { layer: i, id };
      const ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: C['--scene-edge'], transparent: true, opacity: 0.9 }));
      mesh.add(ed); mesh.userData.edge = ed;
      root.add(mesh); nodeMeshes[id] = mesh; nodePos[id] = new THREE.Vector3(xx, yy + 0.3, z);
    });
  });
  const pil = [];
  [[-SW / 2, -SD / 2], [SW / 2, -SD / 2], [-SW / 2, SD / 2], [SW / 2, SD / 2]].forEach(([xx, z]) => pil.push(new THREE.Vector3(xx, 2 * GAP, z), new THREE.Vector3(xx, -2 * GAP - 0.9, z)));
  const pillarMat = new THREE.LineDashedMaterial({ color: C['--scene-edge'], dashSize: 0.12, gapSize: 0.12, transparent: true, opacity: 0.55 });
  const pillars = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pil), pillarMat); pillars.computeLineDistances(); root.add(pillars);
  const grid = new THREE.GridHelper(16, 32); grid.position.y = -2 * GAP - 0.9;
  grid.material.vertexColors = false; grid.material.transparent = true; grid.material.opacity = 0.16; grid.material.color = C['--scene-edge'].clone(); root.add(grid);

  const gc = document.createElement('canvas'); gc.width = gc.height = 64;
  const g2 = gc.getContext('2d'); const gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
  const coreMat = new THREE.MeshBasicMaterial({ color: C['--accent'] });
  const haloMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), color: C['--accent'], transparent: true, depthWrite: false, opacity: 0.95 });
  const packet = new THREE.Group(); const halo = new THREE.Sprite(haloMat); halo.scale.set(0.9, 0.9, 0.9);
  packet.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), coreMat), halo); root.add(packet);
  const trail = [];
  for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloMat.map, color: C['--accent'], transparent: true, depthWrite: false, opacity: 0.35 })); s.scale.setScalar(0.35 - i * 0.025); s.visible = false; root.add(s); trail.push(s); }
  const trailPts = [];

  const layerLabels = LAYERS.map((L, i) => { const d = h('div', { class: 'lbl layer' }, h('i', null, 'L' + (i + 1)), L.short); labelsBox.append(d); return { d, p: new THREE.Vector3(-SW / 2 + 0.15, (2 - i) * GAP + 0.05, SD / 2) }; });
  const nodeLabels = {};
  Object.keys(nodeMeshes).forEach((id) => { const d = h('div', { class: 'lbl node' }, NODE_INFO[id].label); d.style.opacity = '0'; labelsBox.append(d); nodeLabels[id] = d; });

  let curves = [], pathLine = null, routeIds = [], seg = 0, t = 0, phase = 'dwell', dwell = 0;
  const pathMat = new THREE.LineDashedMaterial({ color: C['--accent'], dashSize: 0.16, gapSize: 0.09, transparent: true, opacity: 0.85 });
  function buildRoute(k) {
    routeIds = ROUTES[k].steps.map((s) => s[0]); curves = [];
    for (let i = 0; i < routeIds.length - 1; i++) {
      const a = nodePos[routeIds[i]], b = nodePos[routeIds[i + 1]];
      const mid = a.clone().add(b).multiplyScalar(0.5);
      if (a.distanceTo(b) < 0.01) mid.y += 0.7;
      else if (Math.abs(a.y - b.y) < 0.01) mid.y += 0.85;
      else { mid.z += 0.55; mid.x += (b.x - a.x) * 0.1; }
      curves.push(new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone()));
    }
    const pts = []; curves.forEach((c) => pts.push(...c.getPoints(36)));
    if (pathLine) { root.remove(pathLine); pathLine.geometry.dispose(); }
    pathLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.length ? pts : [nodePos[routeIds[0]]]), pathMat);
    pathLine.computeLineDistances(); root.add(pathLine);
    seg = 0; t = 0; phase = 'dwell'; dwell = 0; trailPts.length = 0;
    packet.position.copy(nodePos[routeIds[0]]);
    style(0);
  }
  function style(step) {
    const on = new Set(routeIds), cur = routeIds[step];
    Object.entries(nodeMeshes).forEach(([id, m]) => {
      const inR = on.has(id), now = id === cur;
      m.material.color.copy(inR ? C['--accent'].clone().lerp(C['--scene-node'], now ? 0.0 : 0.55) : C['--scene-node']);
      m.material.emissive.copy(C['--accent']).multiplyScalar(now ? 0.55 : inR ? 0.12 : 0);
      m.material.opacity = inR ? 1 : 0.5;
      m.userData.edge.material.color.copy(inR ? C['--accent'] : C['--scene-edge']);
      m.userData.edge.material.opacity = inR ? 1 : 0.5;
      m.userData.target = now ? 1.22 : 1;
      const lb = nodeLabels[id]; lb.style.opacity = inR ? '1' : '0'; lb.classList.toggle('on', inR); lb.classList.toggle('now', now);
    });
  }
  function recolor() {
    readColors();
    slabs.forEach((s) => s.material.color.copy(C['--scene-slab']));
    edgeMats.forEach((mm) => mm.color.copy(C['--scene-edge']));
    pillarMat.color.copy(C['--scene-edge']); grid.material.color.copy(C['--scene-edge']);
    coreMat.color.copy(C['--accent']); haloMat.color.copy(C['--accent']); pathMat.color.copy(C['--accent']);
    trail.forEach((s) => s.material.color.copy(C['--accent']));
    style(SCN.step);
  }
  new MutationObserver(() => requestAnimationFrame(recolor)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-universe'] });

  const camDir = new THREE.Vector3(0.95, 0.62, 1.05).normalize();
  let W = 1, H = 1;
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight; if (!W || !H) return;
    renderer.setSize(W, H, false); camera.aspect = W / H;
    const dist = camera.aspect < 0.85 ? 29 : camera.aspect < 1.25 ? 23.5 : 20;
    camera.position.copy(camDir).multiplyScalar(dist); camera.lookAt(0, -0.55, 0); camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();

  let yaw = -0.18, pitch = 0, yawT = yaw, pitchT = 0, drag = null, lastInteract = -1e9;
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  stage.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false }; stage.classList.add('dragging'); });
  window.addEventListener('pointermove', (e) => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 5) drag.moved = true;
      yawT += dx * 0.008; pitchT = Math.max(-0.22, Math.min(0.28, pitchT + dy * 0.004)); lastInteract = performance.now();
    } else if (e.target === canvas) {
      const r = canvas.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera); canvas.style.cursor = ray.intersectObjects(slabs.concat(Object.values(nodeMeshes))).length ? 'pointer' : '';
    }
  }, { passive: true });
  window.addEventListener('pointerup', (e) => {
    if (!drag) return; stage.classList.remove('dragging');
    if (!drag.moved) {
      const r = canvas.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(Object.values(nodeMeshes).concat(slabs))[0];
      if (hit) pinLayer(hit.object.userData.layer);
    }
    drag = null;
  });
  window.addEventListener('pointercancel', () => { drag = null; stage.classList.remove('dragging'); });
  let visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) loop(); }).observe(stage);
  const tmp = new THREE.Vector3();
  function project(v, el, dy = 0) {
    tmp.copy(v).applyMatrix4(root.matrixWorld).project(camera);
    const xx = ((tmp.x + 1) / 2) * W, yy = ((1 - tmp.y) / 2) * H + dy;
    if (tmp.z > 1 || xx < -40 || xx > W + 40 || yy < -20 || yy > H + 20) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = 'visible'; el.style.left = xx.toFixed(1) + 'px'; el.style.top = yy.toFixed(1) + 'px';
  }
  let last = performance.now(), running = false;
  const MOVE = 1.15, DWELL = 0.75, END = 2.4;
  function loop() {
    if (running) return; running = true;
    const frame = (now) => {
      if (!visible || document.hidden) { running = false; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!REDUCED && routeIds.length > 1) {
        if (phase === 'dwell') {
          dwell += dt;
          if (dwell >= (seg >= routeIds.length - 1 ? END : DWELL)) {
            if (seg >= routeIds.length - 1) { seg = 0; trailPts.length = 0; packet.position.copy(nodePos[routeIds[0]]); onStep(0); style(0); dwell = 0; }
            else { phase = 'move'; t = 0; }
          }
        } else {
          t += dt / MOVE; const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          curves[seg].getPoint(Math.min(1, e), packet.position);
          if (t >= 1) { seg++; phase = 'dwell'; dwell = 0; onStep(seg); style(seg); }
        }
      }
      trailPts.unshift(packet.position.clone()); if (trailPts.length > 30) trailPts.pop();
      trail.forEach((s, i) => { const p = trailPts[Math.min(trailPts.length - 1, (i + 1) * 3)]; if (p) { s.position.copy(p); s.visible = phase === 'move'; } });
      halo.scale.setScalar(0.85 + Math.sin(now / 220) * (REDUCED ? 0 : 0.08));
      Object.values(nodeMeshes).forEach((m) => { const tg = m.userData.target || 1; m.scale.y += (tg - m.scale.y) * 0.15; m.scale.x += (tg - m.scale.x) * 0.15; m.scale.z = m.scale.x; });
      const idle = now - lastInteract > 2500;
      if (!REDUCED && idle && !drag) yawT += dt * 0.06 * Math.cos(now / 9000);
      yaw += (yawT - yaw) * 0.08; pitch += (pitchT - pitch) * 0.08;
      root.rotation.y = yaw; root.rotation.x = pitch;
      root.updateMatrixWorld();
      renderer.render(scene, camera);
      layerLabels.forEach((l) => project(l.p, l.d));
      Object.entries(nodeLabels).forEach(([id, d]) => { if (d.style.opacity !== '0') project(nodePos[id], d, -14); });
      requestAnimationFrame(frame);
    };
    last = performance.now(); requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });
  buildRoute(SCN.route); loop();
  return {
    setRoute(k) { buildRoute(k); },
    jump(i) { seg = i; phase = 'dwell'; dwell = 0; trailPts.length = 0; packet.position.copy(nodePos[routeIds[i]]); style(i); onStep(i); lastInteract = performance.now(); },
  };
}

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!REDUCED && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.1, prevent: (node) => !!node.closest?.('[data-lenis-prevent], .route, .transcript, .log, pre, .tbl-wrap, .g-body, .g-toc, .upick__menu, .guide') });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
const headH = () => $('.top').offsetHeight;
function goY(y) {
  if (lenis) lenis.scrollTo(Math.max(0, y), { duration: 1.1 });
  else window.scrollTo({ top: Math.max(0, y), behavior: REDUCED ? 'auto' : 'smooth' });
}
function goTo(el, block = 'start') {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const y = scrollY + r.top - headH() - 16 - (block === 'center' ? Math.max(0, (innerHeight - headH() - r.height) / 2) : 0);
  goY(y);
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.defaultPrevented) return;
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const target = id === '#top' ? $('#top') : document.getElementById(id.slice(1));
  if (!target) return;
  e.preventDefault();
  if (id === '#top') goY(0); else goTo(target);
  try { history.replaceState(null, '', id); } catch { /* sandboxed */ }
});

/* ---------- boot ---------- */
(function boot() {
  const fromHash = (location.hash || '').replace('#uc-', '');
  const startUC = UC.some((u) => u.id === fromHash) ? fromHash : 'invoice';
  SCN.route = startUC;
  renderRouteList(); onStep(0);
  renderBands(); renderGateway(); renderDeploy();
  paintRegion();
  showUC(startUC, false);
  if (fromHash && startUC === fromHash) setTimeout(() => goTo($('#usecases')), 80);
  // three.js loads in the background; the guide never waits for it.
  import('../assets/vendor/three.module.min.js').then((THREE) => {
    try { SCN.api = initThree(THREE); } catch (e) { console.warn(e); SCN.api = null; }
    if (!SCN.api) fallback();
  }).catch(fallback);
  function fallback() {
    $('#stage').append(h('div', { class: 'stage-fallback' }, h('p', null, '3D view unavailable in this browser. The route on the right and the architecture section below show the same stack.')));
    $('.stage-hint').hidden = true;
    if (!REDUCED) setInterval(() => { const nn = ROUTES[SCN.route].steps.length; onStep((SCN.step + 1) % nn); }, 2200);
  }
})();

// Region changes re-render everything that mentions money, tax, IDs or systems.
onRegion.push(() => {
  LAYERS = layers(); ROUTES = routes(); UC = ucs();
  renderRouteList(); onStep(SCN.step); renderBands(); renderGateway(); renderDeploy();
  ladderShow(ladderIdx); simCtl.refresh(); showUC(ucCurrent, false); showLaw(R.law);
});

/* ---------- reading flow: chapters, route map, up next, active nav ---------- */
const CHAPTERS = [
  { n: 1, id: 'top', title: 'The big picture', blurb: 'What an agent is, and the whole system in 3D', min: 3 },
  { n: 2, id: 'foundations', title: 'Five ideas', blurb: 'LLM → RAG → API → Tool → Agent', min: 4 },
  { n: 3, id: 'toolcall', title: 'The trick', blurb: 'How the AI uses your systems safely', min: 3 },
  { n: 4, id: 'architecture', title: 'The blueprint', blurb: 'Layers, FastAPI, where it runs', min: 3 },
  { n: 5, id: 'usecases', title: 'Seven jobs', blurb: 'Working demos you can run', min: 8 },
  { n: 6, id: 'ecosystems', title: 'Your platform', blurb: 'Microsoft 365, Google or Zoho', min: 1 },
  { n: 7, id: 'guardrails', title: 'Trust & rules', blurb: 'Guardrails and the law in 13 regions', min: 4 },
  { n: 8, id: 'playbook', title: 'How to start', blurb: 'Rules of thumb, phases, track record', min: 2 },
];
(function flow() {
  $('#rm-list').replaceChildren(...CHAPTERS.map((c) => h('li', null, h('a', { href: '#' + c.id, 'data-ch': c.n },
    h('span', { class: 'n' }, c.n), h('b', null, c.title), h('span', null, c.blurb + ' · ' + c.min + ' min')))));
  CHAPTERS.forEach((c, i) => {
    const sec = c.n === 8 ? $('#proof') : $('#' + c.id);
    const nx = CHAPTERS[i + 1];
    const link = nx ? h('a', { href: '#' + nx.id }, `${nx.n} · ${nx.title} →`) : h('a', { href: '#glossary' }, 'Appendix · Glossary →');
    sec.querySelector('.wrap').append(h('div', { class: 'upnext' }, h('span', null, `You've finished chapter ${c.n} of 8. Up next${nx ? ': ' + nx.blurb : ': every term in one line'}`), link));
  });
  const secs = $$('section[data-ch]');
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    $('#readbar').style.width = (max > 0 ? Math.min(100, (scrollY / max) * 100) : 0) + '%';
    let cur = 1; const line = innerHeight * 0.35;
    secs.forEach((s) => { if (s.getBoundingClientRect().top <= line) cur = +s.dataset.ch; });
    $$('.nav a[data-ch]').forEach((a) => a.classList.toggle('active', +a.dataset.ch === cur));
    $$('#rm-list a').forEach((a) => a.classList.toggle('here', +a.dataset.ch === cur));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update); update();
})();

/* ---------- universes (shared with the main site) ---------- */
let universe = document.documentElement.dataset.universe || 'console';
function paintUniverse(u) {
  universe = u;
  if (u === 'console') delete document.documentElement.dataset.universe;
  else document.documentElement.dataset.universe = u;
  $('[data-verse-label]').textContent = UNIVERSES[u].name;
  $$('[data-verse-menu] [data-universe]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.universe === u)));
  $('meta[name="theme-color"]').setAttribute('content', UNIVERSES[u].bg);
  setEffectsUniverse(u);
  store.set('universe', u);
  loadFont(u);
}
function switchUniverse(u) {
  if (u === universe) return;
  const r = $('[data-verse-toggle]').getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  loadFont(u);
  if (!document.startViewTransition || REDUCED) { paintUniverse(u); return; }
  const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const tr = document.startViewTransition(() => paintUniverse(u));
  tr.ready.then(() => {
    document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] }, { duration: 750, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' });
  }).catch(() => {});
}
(function picker() {
  const menu = $('[data-verse-menu]'), btn = $('[data-verse-toggle]');
  const setMenu = (open) => { menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); setMenu(menu.hidden); });
  $$('[data-universe]', menu).forEach((b) => b.addEventListener('click', () => { setMenu(false); switchUniverse(b.dataset.universe); }));
  document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('[data-verse]')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  mountEffects({ reduced: REDUCED, exclude: 'a, button, select, label, summary, input, textarea, tr, li, pre, canvas, .stage, .guide, .upick, .chip, .inv, [role="tab"], [tabindex]' });
  paintUniverse(UNIVERSES[universe] ? universe : 'console');
})();

/* ---------- narration: pre-recorded with a local voice model (Kokoro-82M) ---------- */
const NARRATOR = (() => {
  const a = new Audio();
  a.preload = 'auto';
  let caps = null, cur = -1, rate = 1, onEnd = null, onCue = null, failed = false;
  const ready = fetch(`audio/captions.json?v=${V}`).then((r) => r.json()).then((j) => { caps = j; }).catch(() => { failed = true; });
  const src = (i) => `audio/stop-${String(i).padStart(2, '0')}.mp3?v=${V}`;
  a.addEventListener('timeupdate', () => {
    if (cur < 0 || !caps || !caps[cur]) return;
    const tt = a.currentTime, s = caps[cur].s;
    let k = -1;
    for (let i = 0; i < s.length; i++) if (tt >= s[i][0] - 0.05) k = i;
    onCue && onCue(k >= 0 ? s[k][2] : '', Math.min(1, tt / (caps[cur].d || a.duration || 1)));
  });
  a.addEventListener('ended', () => { const f = onEnd; onEnd = null; f && f(); });
  a.addEventListener('error', () => { if (cur >= 0) { failed = true; const f = onEnd; onEnd = null; f && f('error'); } });
  return {
    ready,
    get ok() { return !failed && 'Audio' in window; },
    get pos() { return a.currentTime; },
    get rate() { return rate; },
    setRate(r) { rate = r; a.playbackRate = r; },
    play(i, { from = 0, end, cue } = {}) {
      onEnd = end || null; onCue = cue || null;
      if (cur !== i || !a.src) { cur = i; a.src = src(i); }
      try { a.currentTime = from; } catch { /* not seekable yet */ }
      a.playbackRate = rate;
      const p = a.play();
      const next = new Audio(); next.preload = 'auto'; next.src = src(Math.min(35, i + 1)); // warm the cache
      return p ? p.then(() => true).catch(() => false) : Promise.resolve(true);
    },
    pause() { a.pause(); },
    stop() { onEnd = null; onCue = null; a.pause(); },
  };
})();

/* ---------- live voice: Microsoft's neural voices, where the browser has them ----------
   Edge ships Microsoft's natural voices (the UK male voice is "Ryan"). When one
   is available the tour speaks live with it; other browsers play the recording. */
const LIVE = (() => {
  const ok = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const PREF = [/Ryan.*(Natural|Neural)/i, /Thomas.*(Natural|Neural)/i, /(Andrew|Brian|Guy|Christopher|Eric|Roger|Steffan|Davis|Tony|Jason|William|Liam).*(Natural|Neural)/i];
  let voice = null, caps = null, rate = 1, token = 0, qi = 0;
  const listeners = [];
  fetch(`audio/captions.json?v=${V}`).then((r) => r.json()).then((j) => { caps = j; listeners.forEach((f) => f()); }).catch(() => {});
  function load() {
    if (!ok) return;
    const vs = (speechSynthesis.getVoices() || []).filter((v) => /^en([-_]|$)/i.test(v.lang || ''));
    voice = null;
    for (const re of PREF) { voice = vs.find((v) => re.test(v.name)); if (voice) break; }
    listeners.forEach((f) => f());
  }
  if (ok) { load(); try { speechSynthesis.addEventListener('voiceschanged', load); } catch { speechSynthesis.onvoiceschanged = load; } }
  const stop = () => { token++; if (ok) try { speechSynthesis.cancel(); } catch { /* ignore */ } };
  return {
    get ok() { return !!(ok && voice && caps); },
    get name() { return voice ? voice.name.replace(/^Microsoft\s+/, '').replace(/\s+Online.*$/, '').replace(/\s+-\s+.*$/, '') : ''; },
    get pos() { return qi; },
    get rate() { return rate; },
    setRate(r) { rate = r; },
    onChange(f) { listeners.push(f); },
    play(i, { from = 0, end, cue } = {}) {
      stop();
      const my = token, s = caps[i].s; qi = from;
      const next = () => {
        if (my !== token) return;
        if (qi >= s.length) { end && end(); return; }
        const u = new SpeechSynthesisUtterance(s[qi][2]);
        u.voice = voice; u.lang = voice.lang; u.rate = rate;
        u.onend = () => { if (my !== token) return; qi++; next(); };
        u.onerror = (e) => { if (my !== token) return; if (e && (e.error === 'interrupted' || e.error === 'canceled')) return; qi++; next(); };
        cue && cue(s[qi][2], (qi + 0.5) / s.length);
        speechSynthesis.speak(u);
      };
      setTimeout(next, 40);
      return Promise.resolve(true);
    },
    pause() { stop(); },
    stop,
  };
})();

/* ---------- the guide ---------- */
const clickSel = (sel, delay = 350) => setTimeout(() => { const b = $(sel); if (b) b.click(); }, delay);
const TOUR = [
  // 1 · big picture
  { ch: 1, t: ['.hero-grid'], title: 'Welcome. The whole idea in four words.', body: 'An LLM, like ChatGPT, can only write. An agent is an LLM connected to your business systems, so it can look things up and get work done. I\'ll take you through the guide one stop at a time.', doText: 'Nothing yet. Listen, or press pause to stay here.' },
  { ch: 1, t: ['.stats'], title: 'Why this matters now', body: 'Four in ten large companies say they are scaling AI agents, but only about 6% earn real profit from AI, and fewer than half of people trust it. Everything here is about closing that gap safely.' },
  { ch: 1, t: ['#regionbar'], title: 'Where are you building?', body: 'Pick your region. Every demo switches its currency, tax rules, business IDs, software and laws to match. I guessed from your time zone.', doText: 'Pick a region, or keep my guess.', doSel: '#region-chips', doLabel: 'Pick a region' },
  { ch: 1, t: ['#route-map'], title: 'Your map of the guide', body: 'Eight chapters, top to bottom. Each box is one chapter with its reading time. The numbered menu at the top does the same, and the thin line under it shows how far down you are.', doText: 'Later, click any chapter box to jump straight there.', doSel: '#rm-list li:nth-child(5) a', doLabel: 'Jump to any chapter' },
  { ch: 1, t: ['#stage'], act: () => setRoute('invoice'), title: 'The whole system in one picture', body: 'Each sheet is one layer of the software. The top sheet is where work arrives (email, phone, chat). The bottom sheet is where data is stored. The glowing dot is one supplier invoice travelling through it.', doText: 'Drag the picture left or right to turn it.', doSel: '#stage', doLabel: 'Drag to turn' },
  { ch: 1, t: ['.route'], title: 'Follow the dot, step by step', body: "This list narrates the dot's journey in plain English. The highlighted line is where the dot is right now.", doText: 'Click any line to send the dot to that step.', doSel: '#route-steps li:nth-child(4)', doLabel: 'Click a step' },
  { ch: 1, t: ['#layerinfo'], act: () => pinLayer(2), title: 'What each layer does', body: "This panel explains the layer you choose: what it is for, what goes in and what comes out. I've opened the Agents layer, where the AI makes decisions.", doText: 'Click a sheet in the picture, or one of these buttons.', doSel: '.layer-btns', doLabel: 'Pick a layer' },
  { ch: 1, t: ['#route-chips', '#stage'], act: () => setRoute('lead'), title: 'Same system, different job', body: "I've switched to Lead qualifier. Now the dot starts at a phone call instead of an email. Every job uses the same five layers; only the route changes.", doText: 'Try another job from this row.', doSel: '#route-chips', doLabel: 'Pick a job' },
  // 2 · five ideas
  { ch: 2, t: ['#ladder', '#rung-panel'], act: () => ladderShow(0), title: 'Idea 1 of 5: the LLM', body: "Picture a brilliant new hire locked in a room. It reads and writes very well, but knows nothing about your business and can't touch any system.", doText: 'Read the example on the right.' },
  { ch: 2, t: ['#ladder', '#rung-panel'], act: () => ladderShow(1), title: 'Idea 2 of 5: RAG', body: "Before answering, we search your documents and hand the model the relevant pages, so it answers from your facts and cites them. It still can't do anything." },
  { ch: 2, t: ['#ladder', '#rung-panel'], act: () => ladderShow(2), title: 'Idea 3 of 5: the API', body: 'Every app you use has an API: a fixed list of requests other software can send it. The example is a real request to your region\'s accounting system.' },
  { ch: 2, t: ['#ladder', '#rung-panel'], act: () => ladderShow(3), title: 'Idea 4 of 5: the tool', body: 'We wrap one API request with a name, a plain description and a form to fill in (the schema). The model picks a tool and fills in the form; it never sends the request itself.' },
  { ch: 2, t: ['#ladder', '#rung-panel'], act: () => ladderShow(4), title: 'Idea 5 of 5: the agent', body: 'An LLM plus tools, working in a loop: choose a step, use a tool, read the result, choose again, and stop when the job is done or a person needs to approve.', doText: 'Click the five idea tabs yourself to compare them.', doSel: '#ladder', doLabel: 'Click any idea' },
  { ch: 2, t: ['.vs'], title: 'Workflow or agent?', body: 'A workflow fixes the steps in code and uses the AI only where judgement is needed. An agent chooses its own steps. Start with workflows; give more freedom only where it pays off.' },
  // 3 · the trick
  { ch: 3, t: ['#sim'], act: () => simGo(0), title: 'Watch one request, end to end', body: 'A finance manager asks in Teams whether a client has paid. The badge at the top of the box says who is acting: the AI, our code, the accounting system or a person.', doText: 'Use Next step inside the box to go at your own pace.', doSel: '#sim-next', doLabel: 'Next step' },
  { ch: 3, t: ['#sim'], act: () => simGo(2), title: 'The key moment', body: 'The AI\'s reply is not an answer. It is a filled-in form asking for the "get invoice" tool. Nothing has touched the accounting system yet. Our code checks the form, then makes the real call.' },
  { ch: 3, t: ['#sim'], act: () => simGo(6), title: 'A person stays in charge', body: 'Emailing a customer is a gated action, so the agent stops and asks. Approval cards like this keep you in control while the AI does the legwork.', doText: 'Click Approve & send to finish the request.', doSel: '#sim-art .approval .btn.primary', doLabel: 'Approve & send' },
  { ch: 3, t: ['#toolcall .grid-2'], title: 'The whole loop is about ten lines', body: 'Every action passes through code you own, so permissions, approvals and logs are guaranteed whichever AI model you use. MCP is the open standard for publishing these tools.' },
  // 4 · blueprint
  { ch: 4, t: ['#bands'], title: 'The blueprint', body: 'The classic three tiers still apply. AI splits the logic tier into three: the gateway that checks requests (FastAPI), the agents that decide, and the tools that act.', doText: 'Read the accent-edged rows: that is the new part.' },
  { ch: 4, t: ['.cross'], title: 'What runs through every layer', body: 'Security, guardrails, tracing, testing and an audit trail. Designed in from day one, not bolted on later.' },
  { ch: 4, t: ['#architecture .grid-2'], title: 'The front door, in code', body: 'FastAPI checks every request against a strict shape before any AI runs. Long jobs return a ticket number and finish in the background.' },
  { ch: 4, t: ['#deploy'], title: 'Where it runs, who owns it', body: 'In the cloud region your data must stay in, or on open models inside your own network. Code, prompts and data live in your accounts, so you are never locked in.' },
  // 5 · seven jobs
  { ch: 5, t: ['#uc-nav'], title: 'Seven jobs, three groups', body: "Front office, back office and reporting. Each tab opens a working demo on made-up data, followed by the full build plan. I'll show you three.", doText: 'Each card is a tab. You can click any of them later.', doSel: '#tab-scoring', doLabel: 'Tabs' },
  { ch: 5, t: ['.demo'], act: () => { showUC('invoice'); clickSel('#uc-panel .demo-bar .btn.primary', 500); }, title: 'Demo: invoice capture', body: "I've pressed Run pipeline for you. Watch fields light up, then get checked by code: tax ID, tax maths, duplicates, bank details. A clean invoice becomes a draft bill.", doText: 'Then tick "Use a problem invoice" and press Run pipeline to see a bad one stopped.', doSel: '#inv-problem', doLabel: 'Tick, then Run' },
  { ch: 5, t: ['.uc-detail'], title: 'Under every demo: the build plan', body: 'The numbered pipeline (LLM steps and person steps are marked), what goes in and out, and the exact technology. Below sit the guardrails, what we measure and the pilot length.' },
  { ch: 5, t: ['.demo'], act: () => { showUC('lead'); clickSel('#uc-panel .demo-bar .btn.primary', 400); }, title: 'Demo: an AI answering the phone', body: 'A prospect calls a solar installer at 8:47pm. Dashed boxes are tools the agent uses. The lead card on the right fills itself in and the site visit gets booked.', doText: 'Press Pause on the demo to read at your own pace.', doSel: '#uc-panel .demo-bar .btn.primary', doLabel: 'Play / pause the call' },
  { ch: 5, t: ['.demo'], act: () => showUC('reporting'), title: 'Demo: the Monday briefing', body: 'Ledger, analytics, ad platforms and inventory in one place, plus a short written summary of what changed. Each "Ask your data" answer shows the SQL that produced it.', doText: 'Hover the chart, then click an "Ask your data" question.', doSel: '#uc-panel .rag-q', doLabel: 'Ask a question' },
  { ch: 5, t: ['#uc-nav'], title: 'Explore the rest yourself', body: 'CRM scoring, quoting, middleware and the knowledge assistant work the same way. Good ones to try: drag the scoring sliders, or switch the knowledge assistant between staff and HR.', doSel: '#tab-knowledge', doLabel: 'Try this one' },
  // 6 · platform
  { ch: 6, t: ['.eco'], title: 'Microsoft, Google or Zoho?', body: 'Build on what you already pay for. Built-in AI handles personal productivity; custom agents handle work that crosses systems, like reading the ledger and updating the CRM.' },
  // 7 · trust & rules
  { ch: 7, t: ['.guard-grid'], title: 'How we keep it safe', body: 'Three habits: limit what the AI can do, distrust what it reads, and record everything it does.' },
  { ch: 7, t: ['#law-chips', '#law-panel'], act: () => showLaw(R.law), title: 'The rules, region by region', body: 'Thirteen jurisdictions plus the global standards, with dates and sources. I\'ve opened yours. A planning summary, not legal advice.', doText: 'Click another region to compare.', doSel: '#law-chips', doLabel: 'Pick a region' },
  { ch: 7, t: ['#once'], title: 'Design once', body: 'Six controls show up almost everywhere: say it\'s an AI, keep a person on decisions that matter, explain and allow appeal, label generated content, keep data in place, keep records.' },
  // 8 · how to start
  { ch: 8, t: ['.rules'], title: 'Ten rules of thumb', body: 'The short version of what we\'ve learned building these. If you remember one: the AI writes, the code does, a person approves.' },
  { ch: 8, t: ['.phases'], title: 'How an engagement runs', body: 'Start with one process that costs real hours. Discover it, pilot it in draft mode, prove it with numbers, then scale.' },
  { ch: 8, t: ['.proofs'], title: 'Built before', body: 'Every pattern in this guide has already been built for banks and insurers. One RAG assistant built this way is live at four banks.' },
  { ch: 8, t: ['#route-map'], title: "That's the tour", body: 'A good next step: pick the one job in Chapter 5 that eats the most hours in your business, and map it with Aditya. The Guided tour button brings me back any time.', doText: 'Jump to any chapter to dig deeper, or press Restart.', doSel: '#rm-list', doLabel: 'Pick a chapter' },
];

(function guide() {
  const G = $('#guide'), ring = $('#tour-ring');
  const tip = h('div', { class: 'do-tip', hidden: true }), pulse = h('div', { class: 'do-pulse', hidden: true });
  document.body.append(tip, pulse);
  const S = { state: 'intro', idx: 0, playing: false, elapsed: 0, dur: 12, note: '' };
  const saved = +store.get('atlas-guide-idx'); if (saved > 0 && saved < TOUR.length) S.idx = saved;
  const gs = store.get('atlas-guide');
  if (gs === 'closed' || (!gs && innerWidth <= 640)) S.state = 'closed';
  // Arriving from the bear on the CV page (?tour=1) opens the guide.
  const fromBear = new URLSearchParams(location.search).get('tour') === '1';
  if (fromBear) {
    S.state = 'intro'; S.idx = 0;
    try { history.replaceState(null, '', location.pathname + location.hash); } catch { /* sandboxed */ }
  }
  S.size = store.get('atlas-guide-size') || (innerHeight < 760 ? 'bar' : 'full');
  S.audio = store.get('atlas-guide-audio') !== 'off';
  S.hold = false; S.cc = ''; S.spoke = 'idle'; S.prog = 0; S.doneAt = 0; S.resumeFrom = 0;
  { const r = +store.get('atlas-rate'); if (r) { NARRATOR.setRate(r); LIVE.setRate(r); } }

  /* move + resize: the dock stays anchored by its left and bottom edges */
  const geo = (() => { try { return JSON.parse(store.get('atlas-guide-geo') || '{}'); } catch { return {}; } })();
  function applyGeo() {
    if (innerWidth <= 640) { G.style.left = G.style.bottom = G.style.width = ''; G.style.removeProperty('--g-body-h'); return; }
    if (geo.left != null) G.style.left = Math.max(8, Math.min(innerWidth - 120, geo.left)) + 'px';
    if (geo.bottom != null) G.style.bottom = Math.max(8, Math.min(innerHeight - 60, geo.bottom)) + 'px';
    if (geo.w) G.style.width = geo.w + 'px';
    if (geo.bh) G.style.setProperty('--g-body-h', geo.bh + 'px');
  }
  applyGeo(); addEventListener('resize', applyGeo);
  G.addEventListener('pointerdown', (e) => {
    if (innerWidth <= 640 || e.button !== 0) return;
    const grip = e.target.closest('.g-grip'), handle = e.target.closest('.g-drag');
    if (!grip && (!handle || e.target.closest('button'))) return;
    e.preventDefault();
    const r = G.getBoundingClientRect(), body = G.querySelector('.g-body');
    const st0 = { x: e.clientX, y: e.clientY, left: r.left, bottom: innerHeight - r.bottom, w: r.width, bh: body ? body.getBoundingClientRect().height : 0 };
    const mv = (ev) => {
      const dx = ev.clientX - st0.x, dy = ev.clientY - st0.y;
      if (grip) {
        geo.w = Math.round(Math.max(280, Math.min(innerWidth - st0.left - 8, 720, st0.w + dx)));
        if (body) geo.bh = Math.round(Math.max(70, Math.min(innerHeight * 0.7, st0.bh - dy)));
      } else {
        geo.left = Math.round(Math.max(8, Math.min(innerWidth - r.width - 8, st0.left + dx)));
        geo.bottom = Math.round(Math.max(8, Math.min(innerHeight - r.height - 8, st0.bottom - dy)));
      }
      applyGeo();
    };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); G.classList.remove('moving'); store.set('atlas-guide-geo', JSON.stringify(geo)); };
    G.classList.add('moving'); addEventListener('pointermove', mv); addEventListener('pointerup', up);
  });

  const words = (s) => (s || '').split(/\s+/).length;
  const durFor = (st) => Math.max(9, Math.min(26, (words(st.body) + words(st.doText)) * 0.32 + 4));
  const ICON = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>',
    on: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.5L8 3v10L4.5 10H2z"/><path d="M10.5 5.2a3.5 3.5 0 0 1 0 5.6M12.3 3.4a6 6 0 0 1 0 9.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    off: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.5L8 3v10L4.5 10H2z"/><path d="M10.5 6l4 4M14.5 6l-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  };
  S.voice = store.get('atlas-voice') || 'ms';
  const ENG = () => (S.voice === 'ms' && LIVE.ok ? LIVE : NARRATOR);
  const audioOn = () => S.audio && (NARRATOR.ok || LIVE.ok);
  LIVE.onChange(() => { if (S.state === 'tour' || S.state === 'intro') render(); });
  const soundBtn = (cls) => h('button', { class: 'g-snd' + (cls ? ' ' + cls : ''), type: 'button', 'aria-pressed': S.audio ? 'true' : 'false', 'aria-label': S.audio ? 'Mute the voice' : 'Turn the voice on', title: S.audio ? 'Mute voice' : 'Voice on', html: S.audio ? ICON.on : ICON.off, onclick: () => toggleSound() });

  function render() {
    G.dataset.state = S.state;
    if (S.state === 'closed') {
      G.replaceChildren(h('button', { class: 'g-pill', type: 'button', onclick: () => open() }, h('span', { class: 'g-mark', html: BEAR_FACE }), S.idx > 0 ? `Resume tour · stop ${S.idx + 1} of ${TOUR.length}` : 'Narrated tour'));
      ring.hidden = true; tip.hidden = true; pulse.hidden = true; return;
    }
    if (S.state === 'intro') {
      G.replaceChildren(
        h('div', { class: 'g-top' }, h('span', { class: 'g-mark talk', html: BEAR_FACE }), h('div', { class: 'g-where' }, h('b', null, 'Atlas, your guide'), h('span', null, `${TOUR.length} stops · about 12 minutes`)), soundBtn(), h('button', { class: 'g-x', type: 'button', 'aria-label': 'Close the guide', onclick: () => close() }, '×')),
        h('div', { class: 'g-intro' },
          h('h3', null, "Hi, I'm Atlas. New to AI agents? I'll walk you through."),
          h('p', null, 'I talk you through the guide chapter by chapter, light up what to look at, and tell you what to click.'),
          h('ul', null,
            h('li', null, 'Sound is ' + (S.audio ? 'on' : 'off') + '. The speaker button mutes me; captions show what I\'m saying.'),
            h('li', null, 'The round button pauses me on any stop for as long as you like.'),
            h('li', null, "Click around whenever you like: I'll finish my sentence, then wait for you."),
            h('li', null, 'Drag me by my top bar, resize me from the corner, or shrink me to a bar.')),
          h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => start(S.idx > 0 ? S.idx : 0) }, S.idx > 0 ? `Resume at stop ${S.idx + 1}` : 'Start the tour'), S.idx > 0 ? h('button', { class: 'btn', type: 'button', onclick: () => start(0) }, 'Start over') : null, h('button', { class: 'btn', type: 'button', onclick: () => close() }, 'Explore on my own'))));
      ring.hidden = true; tip.hidden = true; pulse.hidden = true; return;
    }
    const st = TOUR[S.idx], ch = CHAPTERS[st.ch - 1], last = S.idx === TOUR.length - 1;
    const playBtn = (cls) => h('button', { class: 'g-play' + (cls ? ' ' + cls : ''), type: 'button', id: 'g-play', 'aria-label': S.playing ? 'Pause the tour' : 'Play the tour', title: S.playing ? 'Pause' : 'Play', html: S.playing ? ICON.pause : ICON.play, onclick: () => toggle() });
    const backBtn = (txt) => h('button', { class: 'btn', type: 'button', title: 'Previous stop', 'aria-label': 'Previous stop', disabled: S.idx === 0, onclick: () => go(S.idx - 1) }, txt);
    const nextBtn = (txt) => h('button', { class: 'btn', type: 'button', title: last ? 'Restart' : 'Next stop', 'aria-label': last ? 'Restart the tour' : 'Next stop', onclick: () => (last ? start(0) : go(S.idx + 1)) }, last ? 'Restart' : txt);
    const sizeBtn = h('button', { class: 'g-x', type: 'button', title: S.size === 'bar' ? 'Show the explanation' : 'Shrink to a bar', 'aria-label': S.size === 'bar' ? 'Expand the guide' : 'Shrink the guide', onclick: () => { S.size = S.size === 'bar' ? 'full' : 'bar'; store.set('atlas-guide-size', S.size); render(); } }, S.size === 'bar' ? '▴' : '▾');
    const closeBtn = h('button', { class: 'g-x', type: 'button', title: 'Close', 'aria-label': 'Close the guide', onclick: () => close() }, '×');
    G.dataset.size = S.size;
    if (S.size === 'bar') {
      G.replaceChildren(
        h('div', { class: 'g-barrow' }, playBtn('sm'), soundBtn('sm'),
          h('div', { class: 'g-where g-drag', title: 'Drag to move' }, h('b', null, st.title), h('span', { id: 'g-status' }, '')),
          backBtn('←'), nextBtn('→'), sizeBtn, closeBtn),
        h('div', { class: 'g-timer bar', 'aria-hidden': 'true' }, h('i', { id: 'g-bar' })));
      setStatus(); return;
    }
    const speed = h('details', { class: 'g-voice' }, h('summary', null, 'Voice'),
      h('div', { class: 'g-voice-body' },
        LIVE.ok ? h('label', { for: 'g-voice-name' }, 'Voice') : null,
        LIVE.ok ? h('select', { id: 'g-voice-name', onchange: (e) => { S.voice = e.target.value; store.set('atlas-voice', S.voice); NARRATOR.stop(); LIVE.stop(); if (S.playing) speakStep(0); render(); } },
          h('option', { value: 'ms', selected: S.voice === 'ms' ? true : null }, `Microsoft ${LIVE.name} (live)`),
          h('option', { value: 'rec', selected: S.voice !== 'ms' ? true : null }, 'Recorded voice')) : null,
        h('label', { for: 'g-voice-rate' }, 'Speed'),
        h('select', { id: 'g-voice-rate', onchange: (e) => { NARRATOR.setRate(+e.target.value); LIVE.setRate(+e.target.value); store.set('atlas-rate', e.target.value); } }, [['0.9', 'Relaxed'], ['1', 'Normal'], ['1.1', 'Brisk'], ['1.25', 'Fast']].map(([v, l]) => h('option', { value: v, selected: String(NARRATOR.rate) === v ? true : null }, l))),
        h('p', { class: 'g-hint' }, LIVE.ok ? "Your browser has Microsoft's neural voices, so I speak live in Microsoft's UK voice." : "In Microsoft Edge I speak live in Microsoft's UK voice. Here you hear a recorded voice made with an open-source model.")));
    G.replaceChildren(
      h('span', { class: 'g-grip', title: 'Drag to resize', 'aria-hidden': 'true' }),
      h('div', { class: 'g-top g-drag', title: 'Drag to move' }, h('span', { class: 'g-mark' + (S.playing ? ' talk' : ''), html: BEAR_FACE }),
        h('div', { class: 'g-where' }, h('b', null, `Chapter ${ch.n} of 8 · ${ch.title}`), h('span', null, `Stop ${S.idx + 1} of ${TOUR.length} · drag to move`)),
        sizeBtn, closeBtn),
      h('div', { class: 'g-body', 'aria-live': 'polite' }, h('h3', null, st.title), h('p', null, st.body),
        st.doText ? h('div', { class: 'g-do' }, h('b', null, 'Do'), h('span', null, st.doText)) : null),
      audioOn() ? h('div', { class: 'g-cc', id: 'g-cc', 'aria-live': 'off' }, S.cc ? '“' + S.cc + '”' : '') : null,
      h('div', { class: 'g-timer', 'aria-hidden': 'true' }, h('i', { id: 'g-bar' })),
      h('div', { class: 'g-status', id: 'g-status' }, status()),
      h('div', { class: 'g-ctrl' }, playBtn(), soundBtn(), backBtn('← Back'), nextBtn('Next →'),
        h('div', { class: 'g-more' }, audioOn() ? speed : null,
          h('details', { class: 'g-toc' }, h('summary', null, `${S.idx + 1}/${TOUR.length} · all stops`),
            h('ol', null, TOUR.map((x, i) => h('li', null, h('button', { type: 'button', class: i === S.idx ? 'cur' : '', onclick: () => go(i) }, h('i', null, x.ch + '·' + String(i + 1).padStart(2, '0')), x.title))))))));
    setStatus();
  }
  function status() {
    if (S.note) return S.note;
    const last = S.idx === TOUR.length - 1;
    if (!S.playing) return last ? 'End of the tour.' : 'Paused. Take your time; press play or Next when ready.';
    if (audioOn()) {
      if (S.spoke === 'speaking') return S.hold ? "Talking · I'll wait for you after this stop" : 'Talking · press pause to stay here';
      if (S.spoke === 'done') return last ? 'End of the tour.' : 'Moving on…';
      return 'Starting…';
    }
    return `Playing · next stop in ${Math.max(0, Math.ceil(S.dur - S.elapsed))}s` + (S.hold ? " · then I'll wait" : ' · press pause to stay here');
  }
  function progress() {
    if (audioOn() && S.playing) return S.spoke === 'done' ? 1 : S.prog;
    return Math.min(1, S.elapsed / S.dur);
  }
  function setStatus() {
    const el = $('#g-status');
    if (el) el.textContent = S.state === 'tour' && S.size === 'bar' ? `Stop ${S.idx + 1}/${TOUR.length} · ` + (!S.playing ? 'paused' : audioOn() ? 'talking' : `next in ${Math.max(0, Math.ceil(S.dur - S.elapsed))}s`) : status();
    const bar = $('#g-bar'); if (bar) bar.style.width = (progress() * 100).toFixed(1) + '%';
    const cc = $('#g-cc'); if (cc) cc.textContent = S.cc ? '“' + S.cc + '”' : '';
  }
  function speakStep(from = 0) {
    if (!audioOn()) return;
    const my = S.idx;
    S.spoke = 'speaking';
    ENG().play(my, {
      from,
      cue: (s, p) => { if (S.idx !== my) return; S.cc = s; S.prog = p; setStatus(); },
      end: (err) => {
        if (S.idx !== my) return;
        if (err) { S.audio = false; S.spoke = 'idle'; S.elapsed = 0; render(); return; }
        S.spoke = 'done'; S.doneAt = performance.now(); S.cc = ''; S.prog = 1; setStatus();
      },
    }).then((ok) => {
      if (ok || S.idx !== my) return;
      // The browser blocked sound without a click: wait for the visitor.
      S.playing = false; S.spoke = 'idle'; S.note = 'Press play to hear me.'; render();
    });
  }
  function toggleSound() {
    S.audio = !S.audio; store.set('atlas-guide-audio', S.audio ? 'on' : 'off');
    if (!S.audio) { NARRATOR.stop(); LIVE.stop(); S.cc = ''; S.spoke = 'idle'; S.elapsed = 0; }
    else if (S.state === 'tour' && S.playing) speakStep(0);
    render();
  }
  function toggle() {
    S.note = ''; S.hold = false;
    if (S.playing) {
      S.playing = false;
      if (audioOn() && S.spoke === 'speaking') { S.resumeFrom = ENG().pos; ENG().pause(); S.spoke = 'paused'; }
    } else {
      if (S.idx === TOUR.length - 1 && (S.spoke === 'done' || !audioOn())) { render(); return; }
      S.playing = true;
      if (audioOn()) { if (S.spoke === 'done') advance(); else speakStep(S.spoke === 'paused' ? S.resumeFrom : 0); }
    }
    render();
  }
  function advance() {
    if (S.hold) { S.hold = false; S.playing = false; S.note = "Waiting for you. Press play when you're ready for the next stop."; render(); return; }
    go(S.idx + 1);
  }
  function open() { S.state = S.idx > 0 ? 'tour' : 'intro'; if (S.state === 'tour') { S.playing = true; go(S.idx); } else render(); store.set('atlas-guide', 'open'); }
  function close() { S.state = 'closed'; S.playing = false; NARRATOR.stop(); LIVE.stop(); S.cc = ''; store.set('atlas-guide', 'closed'); render(); }
  function start(i) { S.state = 'tour'; S.playing = true; store.set('atlas-guide', 'open'); go(i); }
  function go(i) {
    NARRATOR.stop(); LIVE.stop();
    S.idx = Math.max(0, Math.min(TOUR.length - 1, i)); S.elapsed = 0; S.note = ''; S.hold = false; S.cc = ''; S.spoke = 'idle'; S.prog = 0;
    const st = TOUR[S.idx]; S.dur = durFor(st);
    if (S.idx === TOUR.length - 1 && !audioOn()) S.playing = false;
    store.set('atlas-guide-idx', String(S.idx));
    try { if (st.act) st.act(); } catch { /* ignore */ }
    render();
    setTimeout(() => scrollToStop(st), 80);
    // Start the voice straight away so it stays inside the click that asked for it.
    if (S.playing && audioOn()) speakStep(0);
  }
  function rectOf(sels) {
    let r = null;
    sels.forEach((sel) => {
      const e = $(sel); if (!e) return; const b = e.getBoundingClientRect(); if (!b.width && !b.height) return;
      r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    });
    return r;
  }
  function scrollToStop(st) {
    const r = rectOf(st.t); if (!r) return;
    const hh = headH(), dockH = G.offsetHeight + 24;
    const mobile = innerWidth <= 640, bottomLimit = innerHeight - (mobile ? dockH : Math.min(dockH, innerHeight * 0.45));
    const avail = bottomLimit - hh - 16, hgt = r.bottom - r.top;
    let y = scrollY + r.top - hh - 16;
    if (hgt < avail) y -= (avail - hgt) / 2;
    goY(y);
  }
  // When the reader starts trying things, finish this stop, then wait for them.
  document.addEventListener('pointerdown', (e) => {
    if (S.state !== 'tour' || !S.playing || G.contains(e.target)) return;
    if (e.target.closest('.top')) return;
    if (!S.hold) { S.hold = true; setStatus(); }
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.state !== 'closed' && !e.target.closest?.('.upick')) close(); });
  $('#guide-open').addEventListener('click', () => { if (S.state === 'closed') { if (S.idx > 0) start(S.idx); else { S.state = 'intro'; render(); } } else if (S.state === 'intro') start(0); });
  $('#guide-start-inline').addEventListener('click', () => start(0));

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (S.state === 'tour') {
      const st = TOUR[S.idx];
      if (S.playing) {
        if (audioOn()) {
          if (S.spoke === 'done' && now - S.doneAt > 1100 && S.idx < TOUR.length - 1) advance();
          else if (S.spoke === 'done' && S.idx === TOUR.length - 1) { S.playing = false; render(); }
        } else {
          S.elapsed += dt; if (S.elapsed >= S.dur) { if (S.idx < TOUR.length - 1) advance(); else { S.playing = false; render(); } }
        }
        setStatus();
      }
      const r = rectOf(st.t);
      if (r) { ring.hidden = false; const p = 8; Object.assign(ring.style, { left: r.left - p + 'px', top: r.top - p + 'px', width: r.right - r.left + 2 * p + 'px', height: r.bottom - r.top + 2 * p + 'px' }); }
      else ring.hidden = true;
      const d = st.doSel && $(st.doSel);
      const b = d && d.getBoundingClientRect();
      const hh = headH();
      if (b && b.width && b.bottom > hh && b.top < innerHeight) {
        pulse.hidden = false; Object.assign(pulse.style, { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' });
        tip.hidden = false; tip.textContent = st.doLabel || 'Try this';
        const below = b.top < hh + 44; tip.classList.toggle('below', below);
        tip.style.left = Math.max(70, Math.min(innerWidth - 70, b.left + Math.min(b.width, 260) / 2)) + 'px';
        tip.style.top = (below ? b.bottom : b.top) + 'px';
      } else { pulse.hidden = true; tip.hidden = true; }
    }
    requestAnimationFrame(frame);
  }
  addEventListener('pagehide', () => { NARRATOR.stop(); LIVE.stop(); });
  // Atlas the bear sits on the dock while it is open (and talks with the
  // narration), and strolls along the bottom when it is closed.
  const bear = mountBuddy({ reduced: REDUCED, mode: 'atlas', avoid: ['.guide'], onActivate: () => { if (S.state === 'closed') open(); else bear.wave(); } });
  const dockRect = () => { const r = G.getBoundingClientRect(); return S.state === 'closed' || !r.width ? null : r; };
  (function bearLoop() {
    bear.dockTo(S.state === 'closed' ? null : dockRect);
    bear.setTalking(S.state === 'tour' && S.playing && S.spoke === 'speaking' && audioOn());
    requestAnimationFrame(bearLoop);
  })();
  render(); requestAnimationFrame(frame);
  if (fromBear) setTimeout(() => { const b = G.querySelector('.btn.primary'); if (b) b.focus({ preventScroll: true }); }, 1200);
})();
