// Agent Atlas: the data behind the guide. Regions change every demo's
// currency, tax rules, business IDs, systems and laws. All companies, people
// and figures in the demos are fictional.

/* ---------------- business-ID checks (run in the browser, like production code would) ---------------- */
const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const clean = (s) => String(s).toUpperCase().replace(/[\s-]/g, '');
export const CHECKS = {
  // India GSTIN: state code, PAN, entity, 'Z', then a base-36 check character.
  gstin(v) {
    const g = clean(v);
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return false;
    let sum = 0;
    for (let i = 0; i < 14; i++) { const x = B36.indexOf(g[i]) * (i % 2 ? 2 : 1); sum += Math.floor(x / 36) + (x % 36); }
    return B36[(36 - (sum % 36)) % 36] === g[14];
  },
  // Ireland VAT: seven digits, a mod-23 check letter, then A, H or W.
  ievat(v) {
    const m = clean(v).match(/^IE(\d{7})([A-W])([AHW]?)$/);
    if (!m) return false;
    let s = 0;
    for (let i = 0; i < 7; i++) s += +m[1][i] * (8 - i);
    if (m[3]) s += 'WABCDEFGHI'.indexOf(m[3]) * 9;
    return 'WABCDEFGHIJKLMNOPQRSTUV'[s % 23] === m[2];
  },
  // UK VAT: nine digits, weighted mod 97 (old and new "9755" schemes).
  ukvat(v) {
    const d = clean(v).replace(/^GB/, '');
    if (!/^\d{9}$/.test(d)) return false;
    let s = 0;
    for (let i = 0; i < 7; i++) s += +d[i] * (8 - i);
    const c = +d.slice(7);
    return (s + c) % 97 === 0 || (s + 55 + c) % 97 === 0;
  },
  // US EIN: no checksum, but only certain two-digit prefixes are issued by the IRS.
  ein(v) {
    const d = clean(v);
    if (!/^\d{9}$/.test(d)) return false;
    const p = +d.slice(0, 2);
    return [[1, 6], [10, 16], [20, 27], [30, 39], [40, 48], [50, 68], [71, 77], [80, 88], [90, 95], [98, 99]].some(([a, b]) => p >= a && p <= b);
  },
  // UAE TRN: 15 digits starting with 100; the FTA portal confirms it is live.
  trn(v) { return /^100\d{12}$/.test(clean(v)); },
  // Australia ABN: weights 10,1,3…19 after subtracting 1 from the first digit, mod 89.
  abn(v) {
    const d = clean(v).split('').map(Number);
    if (d.length !== 11 || d.some(isNaN)) return false;
    const w = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    d[0] -= 1;
    return d.reduce((s, x, i) => s + x * w[i], 0) % 89 === 0;
  },
};

/* ---------------- ledgers: what a real API request looks like in each ---------------- */
export const LEDGERS = {
  xero: {
    name: 'Xero', tool: 'xero_get_invoice', limit: '60 calls a minute per organisation',
    get: (n) => `GET https://api.xero.com/api.xro/2.0/Invoices?InvoiceNumbers=${n}`,
    headers: 'Authorization: Bearer <token>\nxero-tenant-id: <org id>',
    result: (d) => ({ Invoices: [{ InvoiceNumber: d.number, Contact: { Name: d.contact }, Status: 'AUTHORISED', Total: d.total, AmountDue: d.total, DueDate: d.due }] }),
    path: { quote: 'POST /api.xro/2.0/Quotes', bill: 'POST /api.xro/2.0/Invoices', invoice: 'POST /api.xro/2.0/Invoices' },
    quote: (q) => ({ Contact: { ContactID: 'c41f…' }, Date: q.date, ExpiryDate: q.expiry, QuoteNumber: q.number, Status: q.draft ? 'DRAFT' : 'SENT', LineAmountTypes: 'Exclusive', LineItems: q.lines.map((l) => ({ ItemCode: l.sku, Description: l.desc, Quantity: l.qty, UnitAmount: l.unit, TaxType: 'OUTPUT' })) }),
    bill: (b) => ({ Type: 'ACCPAY', Status: 'DRAFT', Contact: { ContactID: '9b2e…' }, InvoiceNumber: b.number, Reference: b.ref, Date: b.date, DueDate: b.due, LineAmountTypes: 'Exclusive', LineItems: b.lines.map((l) => ({ Description: l.desc, Quantity: l.qty, UnitAmount: l.unit, AccountCode: l.freight ? '425' : '310', TaxType: 'INPUT' })) }),
    invoice: (v) => ({ Type: 'ACCREC', Status: 'DRAFT', Contact: { ContactID: '3f9a…' }, Reference: v.ref, LineAmountTypes: 'Exclusive', LineItems: v.lines.map((l) => ({ ItemCode: l.sku, Quantity: l.qty })) }),
  },
  qbo: {
    name: 'QuickBooks Online', tool: 'qbo_get_invoice', limit: '500 requests a minute per company',
    get: (n) => `GET https://quickbooks.api.intuit.com/v3/company/<realm>/query?query=select * from Invoice where DocNumber = '${n}'`,
    headers: 'Authorization: Bearer <token>\nAccept: application/json',
    result: (d) => ({ QueryResponse: { Invoice: [{ DocNumber: d.number, CustomerRef: { name: d.contact }, TotalAmt: d.total, Balance: d.total, DueDate: d.due }] } }),
    path: { quote: 'POST /v3/company/<realm>/estimate', bill: 'POST /v3/company/<realm>/bill', invoice: 'POST /v3/company/<realm>/invoice' },
    quote: (q) => ({ CustomerRef: { value: '58' }, DocNumber: q.number, TxnDate: q.date, ExpirationDate: q.expiry, TxnStatus: 'Pending', Line: q.lines.map((l) => ({ DetailType: 'SalesItemLineDetail', Amount: l.amount, SalesItemLineDetail: { ItemRef: { name: l.sku }, Qty: l.qty, UnitPrice: l.unit, TaxCodeRef: { value: 'TAX' } } })) }),
    bill: (b) => ({ VendorRef: { value: '41' }, DocNumber: b.number, TxnDate: b.date, DueDate: b.due, PrivateNote: b.ref, Line: b.lines.map((l) => ({ DetailType: 'AccountBasedExpenseLineDetail', Amount: l.amount, Description: l.desc, AccountBasedExpenseLineDetail: { AccountRef: { name: l.freight ? 'Freight' : 'Materials' } } })) }),
    invoice: (v) => ({ CustomerRef: { value: '73' }, PrivateNote: v.ref, Line: v.lines.map((l) => ({ DetailType: 'SalesItemLineDetail', SalesItemLineDetail: { ItemRef: { name: l.sku }, Qty: l.qty } })) }),
  },
  zoho: {
    name: 'Zoho Books', tool: 'zoho_books_get_invoice', limit: '100 requests a minute per organisation',
    get: (n, R) => `GET https://www.zohoapis.${R.code === 'IN' ? 'in' : 'com'}/books/v3/invoices?organization_id=<org>&invoice_number=${n}`,
    headers: 'Authorization: Zoho-oauthtoken <token>',
    result: (d) => ({ invoices: [{ invoice_number: d.number, customer_name: d.contact, status: 'overdue', total: d.total, balance: d.total, due_date: d.due }] }),
    path: { quote: 'POST /books/v3/estimates', bill: 'POST /books/v3/bills', invoice: 'POST /books/v3/invoices' },
    quote: (q) => ({ customer_id: '4600…', estimate_number: q.number, date: q.date, expiry_date: q.expiry, line_items: q.lines.map((l) => ({ name: l.sku, quantity: l.qty, rate: l.unit, tax_id: '<tax>' })) }),
    bill: (b) => ({ vendor_id: '4600…', bill_number: b.number, reference_number: b.ref, date: b.date, due_date: b.due, line_items: b.lines.map((l) => ({ name: l.desc, quantity: l.qty, rate: l.unit, account_name: l.freight ? 'Freight' : 'Materials', tax_id: '<tax>' })) }),
    invoice: (v) => ({ customer_id: '4600…', reference_number: v.ref, line_items: v.lines.map((l) => ({ name: l.sku, quantity: l.qty })) }),
  },
};

/* ---------------- regions ---------------- */
// fx: rough multiplier from the demo's base prices so amounts look local.
export const REGIONS = {
  in: {
    code: 'IN', label: 'India', short: 'India', locale: 'en-IN', cur: 'INR', fx: 55, step: 10, tz: '+05:30', city: 'Pune', law: 'india',
    tax: { name: 'GST', key: 'gst', rate: 0.18, ex: 'ex GST', inc: 'incl. GST', rule: '18% of taxable value' },
    id: { name: 'GSTIN', check: 'gstin', good: '27AAKCS4471M1ZQ', bad: '27AAKCS4417M1ZQ', fmt: (v) => v, how: 'base-36 check character (15th) recomputed', badWhy: 'fails the GSTIN check character: likely a typo' },
    ledger: 'zoho', crm: 'Zoho CRM', crmAlt: 'HubSpot, Salesforce', inventory: 'Zoho Inventory', erp: 'Tally Prime, Zoho Inventory or SAP Business One',
    einv: 'IRN-signed e-invoice JSON from the IRP (mandatory above ₹5 crore turnover)',
    cloud: { where: 'AWS Mumbai (ap-south-1)', alt: 'Or Azure Central India and GCP Mumbai. Containers, managed Postgres and object storage all in-region.' },
    bucket: 'mum', invTitle: 'TAX INVOICE', pay: 'NEFT / RTGS · IFSC ••••0•••••• · A/c ending',
    supplier: 'Sahyadri Timber Supply Pvt Ltd', addr: 'Plot 14, MIDC Bhosari, Pune, Maharashtra 411026', billto: 'Ridgeline Interiors Pvt Ltd',
    lead: { company: 'Suryodaya Solar', biz: 'Café, Pune', bizLine: 'I run a café in Pune and I want to look at solar for the roof.', billLine: "About forty thousand rupees a month. We lease, but the landlord's on board.", bill: 40000, per: 'month', need: 'Commercial rooftop, ~₹40k/month bill', post: '411045', postKey: 'pin_code', area: 'Pune & PCMC', where: 'Pune', when: 'Before the end of January if we can.', budgetWords: 'eight lakh', budget: 800000, timeline: 'Before end of January (≤ 60 days)', rep: 'Priya', phone: '+91 98••• ••218' },
    voiceLaw: "Outbound promotional calls follow TRAI's commercial-communication rules (TCCCPR) and the DND preference registry; inbound answering is not telemarketing.",
  },
  eu: {
    code: 'IE', label: 'EU (Ireland)', short: 'EU', locale: 'en-IE', cur: 'EUR', fx: 0.6, step: 1, tz: '+00:00', city: 'Dublin', law: 'eu',
    tax: { name: 'VAT', key: 'vat', rate: 0.23, ex: 'ex VAT', inc: 'incl. VAT', rule: '23% standard rate' },
    id: { name: 'VAT number', check: 'ievat', good: 'IE4718263GA', bad: 'IE4781263GA', fmt: (v) => v, how: 'mod-23 check letter recomputed (and VIES lookup for cross-border)', badWhy: 'fails the mod-23 check letter: likely a typo' },
    ledger: 'xero', crm: 'HubSpot', crmAlt: 'Salesforce, Pipedrive', inventory: 'Cin7', erp: 'Cin7, Unleashed or NetSuite',
    einv: 'Peppol / EN 16931 e-invoice (UBL), already required in some member states',
    cloud: { where: 'AWS Ireland (eu-west-1)', alt: 'Or Azure North Europe (Dublin) and GCP europe-west1. EU personal data stays in the EU.' },
    bucket: 'dub', invTitle: 'VAT INVOICE', pay: 'SEPA transfer · IBAN IE29 •••• •••• •••• ••',
    supplier: 'Liffey Timber Supply Ltd', addr: '14 Mill Road, Ballymount, Dublin 12', billto: 'Ridgeline Joinery Ltd',
    lead: { company: 'Emerald Solar', biz: 'Café, Dublin', bizLine: 'I run a café in Dublin and I want to look at solar for the roof.', billLine: "About twelve hundred euros a month. We lease, but the landlord's on board.", bill: 1200, per: 'month', need: 'Commercial rooftop, ~€1.2k/month bill', post: 'D08', postKey: 'eircode_area', area: 'Dublin & Wicklow', where: 'Dublin', when: 'Before the end of January if we can.', budgetWords: 'twenty-five thousand', budget: 25000, timeline: 'Before end of January (≤ 60 days)', rep: 'Ciara', phone: '+353 87 ••• •218' },
    voiceLaw: 'The EU AI Act (Art. 50) requires telling callers they are talking to an AI; recording needs a GDPR lawful basis and notice; marketing calls must respect the National Directory Database opt-outs.',
  },
  uk: {
    code: 'GB', label: 'United Kingdom', short: 'UK', locale: 'en-GB', cur: 'GBP', fx: 0.52, step: 1, tz: '+00:00', city: 'Bristol', law: 'uk',
    tax: { name: 'VAT', key: 'vat', rate: 0.2, ex: 'ex VAT', inc: 'incl. VAT', rule: '20% standard rate' },
    id: { name: 'VAT number', check: 'ukvat', good: 'GB384627563', bad: 'GB386427563', fmt: (v) => v.replace(/^GB(\d{3})(\d{4})(\d{2})$/, 'GB $1 $2 $3'), how: 'weighted mod-97 check recomputed (and HMRC lookup)', badWhy: 'fails the mod-97 check: likely a typo' },
    ledger: 'xero', crm: 'HubSpot', crmAlt: 'Salesforce, Pipedrive', inventory: 'Cin7', erp: 'Cin7, Unleashed or Sage',
    einv: 'Peppol e-invoice where the supplier sends one',
    cloud: { where: 'AWS London (eu-west-2)', alt: 'Or Azure UK South and GCP europe-west2.' },
    bucket: 'lon', invTitle: 'VAT INVOICE', pay: 'Bank transfer · Sort code ••-••-•• · A/c ending',
    supplier: 'Severn Timber Supply Ltd', addr: '14 Mill Road, Avonmouth, Bristol BS11', billto: 'Ridgeline Joinery Ltd',
    lead: { company: 'Severnside Solar', biz: 'Café, Bristol', bizLine: 'I run a café in Bristol and I want to look at solar for the roof.', billLine: "About eleven hundred pounds a month. We lease, but the landlord's on board.", bill: 1100, per: 'month', need: 'Commercial rooftop, ~£1.1k/month bill', post: 'BS1', postKey: 'postcode_district', area: 'Bristol & Bath', where: 'Bristol', when: 'Before the end of January if we can.', budgetWords: 'twenty thousand', budget: 20000, timeline: 'Before end of January (≤ 60 days)', rep: 'Sam', phone: '+44 7••• ••• 218' },
    voiceLaw: 'Marketing calls must be screened against the Telephone Preference Service (PECR); tell callers it is an AI and that the call is recorded, under UK GDPR.',
  },
  us: {
    code: 'US', label: 'United States', short: 'US', locale: 'en-US', cur: 'USD', fx: 0.66, step: 1, tz: '-06:00', city: 'Austin', law: 'us',
    tax: { name: 'Sales tax', key: 'sales_tax', rate: 0.0825, ex: 'pre-tax', inc: 'incl. tax', rule: '8.25% (Austin, TX)' },
    id: { name: 'EIN', check: 'ein', good: '84-2718366', bad: '07-2718366', fmt: (v) => v, how: 'format and IRS-issued prefix checked, W-9 on file', badWhy: 'uses prefix 07, which the IRS does not issue: likely a typo' },
    ledger: 'qbo', crm: 'HubSpot', crmAlt: 'Salesforce, Zoho CRM', inventory: 'Cin7', erp: 'Cin7, NetSuite or Fishbowl',
    einv: 'PDF or EDI from larger suppliers',
    cloud: { where: 'AWS N. Virginia (us-east-1)', alt: 'Or Ohio and Oregon, Azure East US and GCP us-central1.' },
    bucket: 'use1', invTitle: 'INVOICE', pay: 'ACH · Routing ••••••••• · A/c ending',
    supplier: 'Lone Star Lumber Supply LLC', addr: '1400 Mill Rd, Austin, TX 78744', billto: 'Ridgeline Millwork LLC',
    lead: { company: 'Lone Star Solar', biz: 'Café, Austin', bizLine: 'I run a café in Austin and I want to look at solar for the roof.', billLine: "About thirteen hundred dollars a month. We lease, but the landlord's on board.", bill: 1300, per: 'month', need: 'Commercial rooftop, ~$1.3k/month bill', post: '78704', postKey: 'zip', area: 'Austin metro', where: 'Austin', when: 'Before the end of January if we can.', budgetWords: 'thirty-five thousand', budget: 35000, timeline: 'Before end of January (≤ 60 days)', rep: 'Jordan', phone: '+1 512 ••• ••18' },
    voiceLaw: "The FCC treats AI-generated voices as 'artificial' under the TCPA, so outbound AI calls need prior express consent; some states require every party's consent to record.",
  },
  ae: {
    code: 'AE', label: 'UAE', short: 'UAE', locale: 'en-AE', cur: 'AED', fx: 2.4, step: 1, tz: '+04:00', city: 'Dubai', law: 'gulf',
    tax: { name: 'VAT', key: 'vat', rate: 0.05, ex: 'ex VAT', inc: 'incl. VAT', rule: '5% standard rate' },
    id: { name: 'TRN', check: 'trn', good: '100352718400003', bad: '100352718400', fmt: (v) => v, how: '15-digit format checked, then confirmed on the FTA portal', badWhy: 'has 12 digits, not 15: likely a typo' },
    ledger: 'zoho', crm: 'Zoho CRM', crmAlt: 'HubSpot, Salesforce', inventory: 'Zoho Inventory', erp: 'Zoho Inventory, Odoo or SAP Business One',
    einv: 'Peppol-based e-invoice (UAE mandate phasing in from 2026–27)',
    cloud: { where: 'AWS UAE (me-central-1)', alt: 'Or Azure UAE North (Dubai); GCP Doha and Dammam for the wider Gulf.' },
    bucket: 'uae', invTitle: 'TAX INVOICE', pay: 'Bank transfer · IBAN AE07 •••• •••• ••',
    supplier: 'Gulf Timber Trading LLC', addr: 'Warehouse 14, Al Quoz Industrial 3, Dubai', billto: 'Ridgeline Interiors LLC',
    lead: { company: 'Falcon Solar', biz: 'Café, Dubai', bizLine: 'I run a café in Dubai and I want to look at solar for the roof.', billLine: "About forty-five hundred dirhams a month. We lease, but the landlord's on board.", bill: 4500, per: 'month', need: 'Commercial rooftop, ~AED 4.5k/month bill', post: 'Al Quoz', postKey: 'community', area: 'Dubai & Sharjah', where: 'Dubai', when: 'Before the end of January if we can.', budgetWords: 'ninety thousand dirhams', budget: 90000, timeline: 'Before end of January (≤ 60 days)', rep: 'Omar', phone: '+971 50 ••• ••18' },
    voiceLaw: "Marketing calls follow the UAE's 2024 telemarketing rules (Cabinet Resolution 56): licensed numbers, 9am–6pm only, recorded with notice, and no calls to the Do Not Call Registry.",
  },
  au: {
    code: 'AU', label: 'Australia', short: 'Australia', locale: 'en-AU', cur: 'AUD', fx: 1, step: 1, tz: '+11:00', city: 'Sydney', law: 'australia',
    tax: { name: 'GST', key: 'gst', rate: 0.1, ex: 'ex GST', inc: 'incl. GST', rule: '10% of taxable lines' },
    id: { name: 'ABN', check: 'abn', good: '53555979711', bad: '53555799711', fmt: (v) => v.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4'), how: 'ATO checksum recomputed (weights 10,1,3…19, mod 89)', badWhy: 'fails the ATO checksum: likely a typo' },
    ledger: 'xero', crm: 'HubSpot', crmAlt: 'Salesforce, Zoho CRM', inventory: 'Cin7', erp: 'Cin7, Unleashed or MYOB Acumatica',
    einv: 'Peppol (PINT A-NZ) e-invoice',
    cloud: { where: 'AWS Sydney (ap-southeast-2)', alt: 'Or Azure Australia East and GCP Sydney.' },
    bucket: 'syd', invTitle: 'TAX INVOICE', pay: 'EFT · BSB •••-••• · Account ending',
    supplier: 'Southern Cross Timber Supply Pty Ltd', addr: '14 Mill Road, Dandenong South VIC 3175', billto: 'Ridgeline Joinery Pty Ltd',
    lead: { company: 'Coastline Solar', biz: 'Café, Geelong', bizLine: 'I run a café in Geelong and I want to look at solar for the roof.', billLine: "About four and a half grand a quarter. We lease, but the landlord's on board.", bill: 4500, per: 'quarter', need: 'Commercial rooftop, ~$4.5k/qtr bill', post: '3220', postKey: 'postcode', area: 'Geelong & Surf Coast', where: 'Geelong', when: 'Before summer if we can.', budgetWords: 'twenty-five thousand', budget: 25000, timeline: 'Before summer (≤ 60 days)', rep: 'Sam', phone: '+61 4•• ••• 218' },
    voiceLaw: 'Outbound campaigns check the Do Not Call Register first (Do Not Call Register Act 2006); SMS follow-ups need consent and an opt-out (Spam Act 2003).',
  },
};
export const REGION_ORDER = ['in', 'eu', 'uk', 'us', 'ae', 'au'];

// A first guess from the visitor's time zone; they can always change it.
export function guessRegion() {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* old browser */ }
  if (/Calcutta|Kolkata/.test(tz)) return 'in';
  if (/^Europe\/(London|Belfast)/.test(tz)) return 'uk';
  if (/^Europe\//.test(tz)) return 'eu';
  if (/^America\//.test(tz)) return 'us';
  if (/Dubai|Muscat|Riyadh|Qatar|Bahrain|Kuwait/.test(tz)) return 'ae';
  if (/^Australia\//.test(tz)) return 'au';
  return 'in';
}

/* ---------------- the world's rules (as of November 2026) ---------------- */
// st: in = in force, soon = dated and coming, soft = guidance or a bill.
export const JURIS = [
  ['eu', 'European Union'], ['uk', 'United Kingdom'], ['us', 'United States'], ['india', 'India'], ['canada', 'Canada'],
  ['singapore', 'Singapore'], ['japan', 'Japan'], ['korea', 'South Korea'], ['china', 'China'], ['vietnam', 'Vietnam'],
  ['brazil', 'Brazil'], ['gulf', 'UAE & Saudi Arabia'], ['australia', 'Australia'], ['standards', 'Global standards'],
];
export const LAWS = {
  eu: {
    intro: 'One horizontal law, the AI Act, sits on top of the GDPR. It is phased: bans first, then general-purpose models, then transparency, with high-risk duties pushed back by the 2026 Digital Omnibus.',
    rows: [
      ['2 Feb 2025', 'in', 'AI Act: banned practices and AI literacy', 'Social scoring, manipulative techniques and emotion recognition at work or school are prohibited. Anyone deploying AI must make sure staff using it have sufficient AI literacy.', ['euomni']],
      ['2 Aug 2025', 'in', 'General-purpose AI model duties', 'Model providers publish technical documentation, a copyright policy and a summary of training data; a Code of Practice shows how. Deployers mostly inherit this through their vendor contracts.', ['euomni']],
      ['2 Aug 2026', 'in', 'Transparency (Article 50)', 'Tell people when they are talking to an AI, label deepfakes, and mark synthetic content in a machine-readable way (systems already on the market have until 2 Dec 2026 for the marking). National authorities can now enforce.', ['eu50']],
      ['2 Dec 2027', 'soon', 'High-risk systems (Annex III)', 'Credit scoring, hiring, access to essential services and similar uses need risk management, data governance, logging, human oversight and registration. Moved from August 2026 by the Digital Omnibus on AI (in force 27 July 2026); AI inside regulated products follows on 2 Aug 2028.', ['euomni', 'euomni2']],
      ['Always', 'in', 'GDPR Article 22 and DPIAs', 'People can refuse decisions based solely on automated processing that have legal or similarly significant effects, and ask for human review. High-risk processing needs a data protection impact assessment.', ['gdpr22']],
      ['17 Jan 2025', 'in', 'DORA, for banks and insurers', 'Financial entities must manage ICT third-party risk, which now includes AI model and cloud providers: contracts, exit plans, incident reporting.', []],
    ],
  },
  uk: {
    intro: 'No AI Act. Regulators (ICO, FCA, CMA, Ofcom) apply five cross-sector principles inside existing law, and data law was updated in 2025.',
    rows: [
      ['5 Feb 2026', 'in', 'Data (Use and Access) Act: automated decisions', 'Solely automated significant decisions are allowed more widely, but only with safeguards: tell people, let them make representations and contest, and offer human review. Stricter limits stay for special-category data.', ['ukduaa']],
      ['2026', 'soft', 'ICO guidance on ADM and profiling', 'Updated guidance and an AI and ADM code of practice are being consulted on through 2026. Design for explanation and human review now.', ['ukduaa']],
      ['Ongoing', 'in', 'FCA Consumer Duty', 'Firms must deliver good outcomes for retail customers, including when AI is in the loop: fair value, understandable communications, support that works.', []],
    ],
  },
  us: {
    intro: 'No federal AI statute. A December 2025 executive order pushes to preempt state AI laws through litigation and funding, but an order cannot strike down a state law on its own, so state and sector rules still apply.',
    rows: [
      ['Dec 2025', 'soft', 'Federal preemption push (EO 14365)', 'A Justice Department task force challenges state AI laws; Congress has not passed a preemption law. Treat state laws as live unless a court says otherwise.', ['usfed']],
      ['1 Jan 2026', 'in', 'Texas TRAIGA', 'Bans intentionally harmful uses (such as manipulation toward self-harm or intended unlawful discrimination), requires disclosure when government agencies use AI, and is enforced by the Attorney General with a cure period.', ['ustx']],
      ['1 Jan 2027', 'soon', 'California: automated decision-making rules', 'CCPA regulations took effect in 2026; from 1 Jan 2027 businesses using ADMT for significant decisions owe pre-use notices, opt-outs and access rights. Risk assessments are phased in through 2027–28.', ['usca']],
      ['1 Jan 2027', 'soon', 'Colorado: the rewritten AI Act', 'SB 26-189 replaced the 2024 law, swapping risk-management duties for disclosure and transparency around automated decision tools. Enforcement of the earlier law is stayed pending a federal challenge.', ['usco']],
      ['Always', 'in', 'Sector rules that already cover AI', 'Credit decisions need specific adverse-action reasons under ECOA, even when a model decided. AI voices in calls count as "artificial" under the TCPA, so outbound AI calls need consent. NYC requires bias audits for automated hiring tools.', ['fcc']],
    ],
  },
  india: {
    intro: 'No umbrella AI law, by design. India governs AI through its data protection law, IT Rules and sector regulators, guided by voluntary national principles.',
    rows: [
      ['5 Nov 2025', 'soft', 'India AI Governance Guidelines (MeitY)', 'Seven principles, from "trust is the foundation" to "understandable by design", and a coordinated oversight structure. Voluntary: the government says it is not regulating AI with a new law for now.', ['indgov']],
      ['13 Nov 2026', 'in', 'DPDP Rules: consent managers', 'The Digital Personal Data Protection Rules were notified on 13 Nov 2025 and phase in. Consent-manager registration opens a year after notification.', ['indpdp']],
      ['13 May 2027', 'soon', 'DPDP Rules: core duties', 'Clear notices, valid consent, reasonable security safeguards, breach reporting to the Data Protection Board and affected people, retention limits and verifiable consent for children\'s data.', ['indpdp']],
      ['20 Feb 2026', 'in', 'IT Rules: label synthetic content', 'Platforms must label AI-generated audio, images and video, embed permanent metadata and take down unlawful deepfakes faster.', ['indit']],
      ['Aug 2025', 'soft', 'RBI FREE-AI framework, for banks and NBFCs', 'Board-approved AI policy, an AI inventory, disclosure to customers when AI is used, a way to contest AI decisions, and AI-specific incident reporting. Recommendations today; expect them to harden into directions.', ['rbi']],
    ],
  },
  canada: {
    intro: 'The proposed federal AI Act (AIDA) died in January 2025. Privacy law carries the load, and a new federal privacy bill is in Parliament.',
    rows: [
      ['Sep 2023', 'in', 'Quebec Law 25: automated decisions', 'Tell people when a decision about them is made exclusively by automated processing, explain the factors on request, and let them have it reviewed by a person.', []],
      ['15 Jun 2026', 'soft', 'Bill C-36, Protecting Privacy and Consumer Data Act', 'Would add a right to an explanation for automated decisions with significant effects, require describing their use in privacy policies, and create a new regulator with fines up to 5% of global revenue. Not yet law.', ['cac36']],
    ],
  },
  singapore: {
    intro: 'Guidance first. Singapore publishes practical frameworks and testing tools instead of a statute, and was first with a framework written for agents.',
    rows: [
      ['22 Jan 2026', 'soft', 'Model AI Governance Framework for Agentic AI (IMDA)', 'Bound the agent\'s risks up front, keep humans meaningfully accountable, add technical controls such as approval checkpoints before irreversible actions, test tool use before launch, and help users stay responsible.', ['sgag']],
      ['Always', 'in', 'PDPA', 'Consent, purpose limitation and protection duties apply to personal data used by AI; advisory guidelines explain how for recommendation and decision systems.', []],
    ],
  },
  japan: {
    intro: 'Promotion over penalties. Japan\'s first AI law sets national policy and a basic plan, and leans on business guidelines and existing privacy law.',
    rows: [
      ['Sep 2025', 'in', 'AI Promotion Act', 'Principles-based, with no fines: the government can investigate misuse and publish guidance. Businesses are expected to cooperate with national measures.', ['jp']],
      ['23 Dec 2025', 'soft', 'AI Basic Plan', 'The first national plan for research, adoption and safety, updated every year. METI and MIC\'s AI Guidelines for Business remain the practical reference.', ['jp']],
    ],
  },
  korea: {
    intro: 'The second comprehensive AI law after the EU\'s, with a lighter touch and a long grace period.',
    rows: [
      ['22 Jan 2026', 'in', 'AI Basic Act', 'Human oversight and risk management for "high-impact" AI (including credit evaluation), advance notice when generative AI is used, and labels on AI-generated content. Fines are held back for a grace period of at least a year.', ['kr']],
    ],
  },
  china: {
    intro: 'Targeted rules for each technology, enforced through filings and platform duties.',
    rows: [
      ['Aug 2023', 'in', 'Interim measures for generative AI services', 'Public-facing generative AI needs a security assessment and algorithm filing, lawful training data and content controls.', []],
      ['1 Sep 2025', 'in', 'Labelling of AI-generated content', 'Visible labels plus hidden metadata on AI-generated text, images, audio, video and virtual scenes, backed by the mandatory national standard GB 45438-2025.', ['cn']],
      ['Always', 'in', 'PIPL: automated decisions', 'People can ask for an explanation and refuse decisions made solely by automated means that significantly affect their rights.', []],
    ],
  },
  vietnam: {
    intro: 'South-East Asia\'s first standalone AI law, risk-based and influenced by the EU.',
    rows: [
      ['1 Mar 2026', 'in', 'Law on Artificial Intelligence', 'Three risk tiers, a local point of contact for foreign providers of high-risk systems, and machine-readable labels on AI-generated audio, images and video. Penalties come by government decree.', ['vn']],
    ],
  },
  brazil: {
    intro: 'Data protection law already covers automated decisions; a broad AI bill is still in Congress.',
    rows: [
      ['Always', 'in', 'LGPD Article 20', 'People can ask for a review of decisions made solely on automated processing that affect their interests, and for the criteria used.', []],
      ['Nov 2026', 'soft', 'AI bill PL 2338/2023', 'Passed by the Senate in December 2024, it still awaits its special-committee opinion in the Chamber of Deputies. Not law; election-year timing may push it into 2027.', ['br']],
    ],
  },
  gulf: {
    intro: 'National AI strategies, data protection laws and free-zone rules, rather than an AI statute.',
    rows: [
      ['Always', 'in', 'UAE Personal Data Protection Law', 'Federal Decree-Law 45 of 2021 sets consent, purpose and security duties, with stricter rules for sensitive data. In the DIFC free zone, Data Protection Regulation 10 adds notice and oversight duties for AI systems that process personal data.', []],
      ['Aug 2024', 'in', 'UAE telemarketing rules (Cabinet Resolution 56)', 'Licensed numbers, calls only between 9am and 6pm, recorded with notice, no calls to the Do Not Call Registry. Automated calling is allowed within these conditions.', ['uaetm']],
      ['Sep 2024', 'in', 'Saudi Personal Data Protection Law', 'Fully enforced since September 2024, with SDAIA\'s AI Ethics Principles and generative AI guidelines as the reference for responsible use.', []],
    ],
  },
  australia: {
    intro: 'No AI Act. Australia chose to apply existing, technology-neutral laws, with voluntary guidance and one new privacy duty.',
    rows: [
      ['Oct 2025', 'soft', 'Guidance for AI Adoption (National AI Centre)', 'Six essential practices replace the ten voluntary guardrails, with an SME foundations version, an AI register template and a policy template.', ['auguid']],
      ['10 Dec 2026', 'soon', 'Automated decision-making transparency (APP 1.7–1.9)', 'If a computer program makes, or substantially helps make, a decision that could significantly affect someone using their personal information, the privacy policy must say so. Assisted decisions count too.', ['auadm']],
    ],
  },
  standards: {
    intro: 'Laws differ; the engineering answers are converging. These are the frameworks auditors and procurement teams ask about everywhere.',
    rows: [
      ['2023', 'in', 'ISO/IEC 42001: AI management system', 'A certifiable management system for AI: policy, roles, risk and impact assessment, lifecycle controls, supplier management. The closest thing to a global AI audit.', ['iso42001']],
      ['2023 · 2024', 'in', 'NIST AI RMF and its Generative AI Profile', 'Govern, map, measure, manage. Voluntary, but the default vocabulary for AI risk in US procurement and beyond.', ['nist']],
      ['2025', 'in', 'OWASP Top 10 for LLM Applications', 'Prompt injection first, then sensitive data disclosure, supply chain, data poisoning, improper output handling and excessive agency.', ['owasp']],
      ['Dec 2025', 'in', 'OWASP Top 10 for Agentic Applications', 'The first list built for agents, led by agent goal hijack: steering an agent through content it reads. Tool misuse, identity abuse and memory poisoning follow.', ['owaspag']],
      ['Sep 2024', 'soft', 'Council of Europe AI Convention', 'The first binding international AI treaty, signed by the EU, UK, US and others: human rights, democracy and the rule of law across the AI lifecycle.', ['coe']],
    ],
  },
};

// The common denominator: controls that keep showing up across regimes.
export const ONCE = [
  ['Say it\'s an AI', 'Disclose at the start of every chat and call, and label generated media.', ['EU AI Act Art. 50', 'Korea AI Basic Act', 'US TCPA (voice)', 'UAE telemarketing']],
  ['Keep a person on decisions that matter', 'Approval gates and human review for credit, hiring, money and anything irreversible.', ['GDPR Art. 22', 'UK DUAA', 'Singapore agentic framework', 'RBI FREE-AI']],
  ['Explain, and let people appeal', 'Log the factors behind every automated decision so you can explain it and reverse it.', ['ECOA adverse action', 'Quebec Law 25', 'LGPD Art. 20', 'Australia APP 1.7', 'California ADMT']],
  ['Label generated content', 'Visible labels plus machine-readable metadata on images, audio and video.', ['China GB 45438', 'India IT Rules 2026', 'EU Art. 50(2)', 'Vietnam AI Law']],
  ['Keep data where it belongs', 'In-region hosting, minimal data in prompts, retention limits, no training on client data.', ['India DPDP', 'GDPR', 'UAE & Saudi PDPL', 'China PIPL']],
  ['Keep records and assess risk', 'An AI register, traces of every run, and an impact assessment before launch.', ['ISO/IEC 42001', 'NIST AI RMF', 'EU high-risk', 'California risk assessments']],
];

/* ---------------- sources ---------------- */
export const SOURCES = [
  ['mck26', 'McKinsey: The state of AI in 2026', 'https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai'],
  ['kpmg25', 'KPMG & University of Melbourne: Trust, attitudes and use of AI, 2025', 'https://kpmg.com/us/en/media/news/trust-in-ai-2025.htm'],
  ['anth', 'Anthropic: Building effective agents', 'https://www.anthropic.com/research/building-effective-agents'],
  ['mcp', 'IT Brief: Anthropic donates MCP to the Agentic AI Foundation', 'https://itbrief.com.au/story/anthropic-donates-mcp-to-new-agentic-ai-foundation'],
  ['euomni', 'AI Act Explorer: the Digital Omnibus on AI', 'https://artificialintelligenceact.eu/ai-act-explorer/digital-omnibus/'],
  ['euomni2', 'VerifyWise: EU AI Act omnibus, the new high-risk deadlines', 'https://verifywise.ai/blog/eu-ai-act-omnibus-what-changed'],
  ['eu50', 'Sidley: EU AI Act transparency obligations from 2 August 2026', 'https://datamatters.sidley.com/2026/06/24/eu-ai-act-transparency-obligations-preparing-for-compliance-by-2-august-2026/'],
  ['gdpr22', 'GDPR Article 22: automated individual decision-making', 'https://gdpr-info.eu/art-22-gdpr/'],
  ['ukduaa', 'Travers Smith: UK data reforms take effect, a new era for automated decision-making', 'https://www.traverssmith.com/knowledge/knowledge-container/uks-data-protection-reforms-take-effect-a-new-era-for-automated-decision-making/'],
  ['usfed', 'Baker Donelson: Emerging federal AI policy', 'https://www.bakerdonelson.com/emerging-federal-ai-policy-what-to-know-and-how-to-prepare'],
  ['ustx', 'Texas Attorney General: the Responsible AI Governance Act', 'https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-ai-rights'],
  ['usca', 'Hunton: CPPA finalises ADMT, risk-assessment and audit regulations', 'https://www.hunton.com/privacy-and-cybersecurity-law-blog/cppa-finalizes-ccpa-regulations-on-automated-decision-making-technology-risk-assessments-and-cybersecurity-audits'],
  ['usco', 'Norton Rose Fulbright: Colorado enacts revised AI law', 'https://www.nortonrosefulbright.com/en/knowledge/publications/18733d31/colorado-enacts-revised-ai-law'],
  ['fcc', 'FCC: AI-generated voices in robocalls are "artificial" under the TCPA', 'https://www.fcc.gov/document/fcc-makes-ai-generated-voices-robocalls-illegal'],
  ['indgov', 'Tribune India: MeitY unveils the India AI Governance Guidelines', 'https://www.tribuneindia.com/news/business/meity-unveils-india-ai-governance-guidelines-to-ensure-safe-inclusive-and-responsible-ai-adoption'],
  ['indpdp', 'YourStory: DPDP Rules 2025 notified, rollout over 18 months', 'https://yourstory.com/2025/11/digital-personal-data-protection-dpdp-rules-2025-rollout-over-18-months'],
  ['indit', 'Business Today: IT Rules amended to label AI-generated content (Feb 2026)', 'https://www.businesstoday.in/technology/story/govt-tightens-rules-on-ai-generated-content-mandates-labels-and-faster-takedowns-515505-2026-02-10'],
  ['rbi', 'KPMG India: RBI FREE-AI committee report', 'https://kpmg.com/in/en/insights/2025/08/rbi-free-ai-committee-report-on-framework-for-responsible-and-ethical-enablement-of-artificial-intelligence.html'],
  ['cac36', 'Gowling WLG: Understanding Bill C-36', 'https://gowlingwlg.com/en/insights-resources/articles/2026/understanding-bill-c36'],
  ['sgag', 'Baker McKenzie: Singapore launches a governance framework for agentic AI', 'https://www.bakermckenzie.com/en/insight/publications/2026/01/singapore-governance-framework-for-agentic-ai-launched'],
  ['jp', 'Adnkronos: Japan adopts its first AI Basic Plan', 'https://english.adnkronos.com/2025/12/23/japan-govt-adopts-1st-basic-plan-on-ai/'],
  ['kr', 'The Daily Star: South Korea rolls out its AI Basic Act', 'https://www.thedailystar.net/tech-startup/news/south-korea-rolls-out-new-law-regulate-ai-4089151'],
  ['cn', 'Loeb & Loeb: China\'s AI labelling measures take effect 1 September 2025', 'https://www.loeb.com/en/insights/publications/2025/03/chinas-ai-labeling-measures-and-mandatory-national-standards-take-effect-september-1'],
  ['vn', 'Rajah & Tann: Vietnam\'s Law on AI takes effect 1 March 2026', 'https://www.rajahtannasia.com/viewpoints/new-law-on-artificial-intelligence-takes-effect-on-1-march-2026/'],
  ['br', 'Chambers: Artificial Intelligence 2026, Brazil trends', 'https://practiceguides.chambers.com/practice-guides/artificial-intelligence-2026/brazil/trends-and-developments'],
  ['uaetm', 'Al Tamimi: New UAE telemarketing regulations', 'https://tamimi.com/news/new-uae-telemarketing-regulations-what-you-need-to-know'],
  ['auguid', 'Department of Industry: Guidance for AI Adoption', 'https://industry.gov.au/publications/guidance-for-ai-adoption'],
  ['auadm', 'OAIC: transparency for AI and automated decision-making', 'https://www.oaic.gov.au/news/media-centre/new-resources-on-transparency-for-use-of-ai-and-automated-decision-making'],
  ['iso42001', 'ISO: ISO/IEC 42001:2023 AI management systems', 'https://www.iso.org/standard/81230.html'],
  ['nist', 'NIST: AI Risk Management Framework', 'https://www.nist.gov/itl/ai-risk-management-framework'],
  ['owasp', 'Outpost24: OWASP Top 10 for LLM Applications 2025', 'https://outpost24.com/blog/owasp-top-10-llm-risks-explained/'],
  ['owaspag', 'TechRepublic: OWASP\'s first AI agent risk list', 'https://www.techrepublic.com/article/news-owasp-ai-agent-risk-list/'],
  ['coe', 'Council of Europe: Framework Convention on Artificial Intelligence', 'https://www.coe.int/en/web/artificial-intelligence/the-framework-convention-on-artificial-intelligence'],
  ['xero', 'Xero Developer: API rate limits', 'https://developer.xero.com/faq/limits'],
  ['hubspot', 'HubSpot: lead scoring tool overview', 'https://knowledge.hubspot.com/scoring/understand-the-lead-scoring-tool'],
  ['copilot', 'Office Watch: Microsoft 365 Copilot Business for up to 300 users', 'https://office-watch.com/2025/microsoft-365-copilot-business-ai-add-on/'],
  ['datastudio', 'Dataslayer: Looker Studio renamed Data Studio (April 2026)', 'https://www.dataslayer.ai/blog/looker-studio-data-studio-rebrand-2026'],
  ['n8n', 'Branch8: n8n vs Zapier vs Make, 2026', 'https://branch8.com/posts/n8n-vs-zapier-vs-make-enterprise-automation-comparison-2026'],
  ['voice', 'Fora Soft: voice AI agents on LiveKit, latency budget', 'https://www.forasoft.com/blog/article/voice-ai-agents-livekit-guide'],
  ['rag', 'Coding Shuttle: production RAG with hybrid search and reranking', 'https://www.codingshuttle.com/blogs/building-production-ready-rag-hybrid-search-reranking-and-conversational-memory'],
  ['ocr', 'AIMultiple: invoice OCR benchmark, LLMs vs OCR', 'https://aimultiple.com/invoice-ocr'],
  ['kokoro', 'Kokoro-82M: the open-weight voice model used for the narration', 'https://huggingface.co/hexgrad/Kokoro-82M'],
];
