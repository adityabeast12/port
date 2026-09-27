// Everything the chat can answer. Each topic has:
//   q        the question shown on its suggestion chip
//   keys     words that route a typed question here (matched as substrings)
//   shape    which particle shape the background orb morphs into
//   status   the short "working" line shown before the answer streams in
//   text     paragraphs, streamed word by word (**bold** is supported)
//   blocks   rich content rendered after the text
//   next     follow-up topics offered as chips
// Client names are deliberately withheld.

export const PROJECTS = [
  {
    id: 'banking',
    title: 'Agentic banking assistant',
    meta: 'Banking · Conversational AI',
    blurb: 'Multi-agent assistant for account operations, beneficiaries and transfers. Live at four banks.',
  },
  {
    id: 'platform',
    title: 'Multi-agent orchestration platform',
    meta: 'Internal platform',
    blurb: 'Grew a retrieval chatbot into an orchestrator with specialist agents.',
  },
  {
    id: 'voice',
    title: 'Real-time voice and video onboarding',
    meta: 'Voice AI · Compliance',
    blurb: 'A 10-state onboarding agent with OTP verification and document capture.',
  },
  {
    id: 'crm',
    title: 'Sales copilot for relationship teams',
    meta: 'CRM · Indian private bank',
    blurb: 'Lead guidance, objection handling and next-step recommendations.',
  },
  {
    id: 'vision',
    title: 'Logo and hologram validation',
    meta: 'Computer vision · UK trade body',
    blurb: 'Image embeddings and similarity search, plus a maritime query system.',
  },
  {
    id: 'ml',
    title: 'Predictive ML models',
    meta: 'Insurance · Machine learning',
    blurb: 'Churn prediction, customer propensity and email triage.',
  },
  {
    id: 'sql',
    title: 'Talk to your data',
    meta: 'Data · Natural language',
    blurb: 'Natural-language questions answered from live databases.',
  },
];

export const TOPICS = {
  intro: {
    q: 'Who are you?',
    keys: ['who are you', 'about you', 'yourself', 'introduce', 'background', 'hello', 'hi ', 'hey', 'aditya', 'where are you', 'based', 'location', 'nagpur'],
    shape: 0,
    status: 'Loading profile',
    text: [
      "I'm Aditya Shukla, an AI Solutions Consultant based in Nagpur, India. I build production-grade AI agent systems, LLM and RAG pipelines, and ML models, mostly for **banking and insurance**.",
      'I started as a Business Analyst and grew into building whole systems myself: the front end, the back end and the multi-agent orchestration in between. Every build I ship has guardrails, tracing and governance from day one.',
    ],
    blocks: [{ type: 'stats' }],
    next: ['projects', 'banking', 'stack', 'contact'],
  },

  projects: {
    q: 'What have you built?',
    keys: ['project', 'built', 'build', 'work', 'portfolio', 'case stud', 'shipped', 'made', 'examples'],
    shape: 1,
    status: 'Searching projects',
    text: ["Here are seven systems I've built, most of them running in production. Client names are withheld. Tap any card for details."],
    blocks: [{ type: 'projects' }],
    next: ['banking', 'voice', 'responsible'],
  },

  banking: {
    q: 'Tell me about the banking assistant',
    keys: ['bank', 'banking', 'beneficiar', 'transaction', 'transfer', 'account', 'fintech', 'bfsi'],
    shape: 1,
    status: 'Opening case study',
    text: [
      'This is the project I\'m proudest of. I architected an **agentic banking assistant** that handles account operations, beneficiary management and transactions through natural conversation.',
      "It's live at **four banks: three in India and one international.** An orchestrator routes each request to specialist agents for KYC, risk and core-banking tools. Guardrails check every input and output, and every step is traced in Langfuse. It has contributed directly to my organisation's revenue growth.",
      "Here's what a single request looks like inside the system:",
    ],
    blocks: [
      { type: 'trace' },
      { type: 'chips', items: ['CrewAI', 'LangChain', 'FastAPI', 'Guardrails', 'Langfuse'] },
    ],
    next: ['responsible', 'voice', 'projects'],
  },

  platform: {
    q: 'How does your multi-agent platform work?',
    keys: ['multi-agent', 'multi agent', 'orchestrat', 'crewai', 'autogen', 'platform', 'internal'],
    shape: 1,
    status: 'Opening case study',
    text: [
      'I worked on this internal platform from its first day. It started as a simple retrieval chatbot, and I evolved it into a **multi-agent platform**: an orchestrator that plans the task and hands it to specialist agents.',
      'The specialist agents cover travel planning, competitor intelligence, prospect analysis and deep research. Each one has its own tools and prompts, and the orchestrator combines their output into one answer.',
    ],
    blocks: [{ type: 'chips', items: ['CrewAI', 'AutoGen', 'LangChain', 'Vector DBs', 'RAG'] }],
    next: ['banking', 'approach', 'stack'],
  },

  voice: {
    q: 'What voice AI have you built?',
    keys: ['voice', 'call', 'speech', 'livekit', 'elevenlabs', 'twilio', 'sip', 'onboarding', 'video', 'gemini live', 'kyc'],
    shape: 2,
    status: 'Opening case study',
    text: [
      "I've built voice agent systems for **compliance-grade calls and onboarding**, using the Gemini Live API, ElevenLabs and LiveKit with Twilio for SIP and outbound calling.",
      'The biggest one is a **real-time voice and video onboarding system**. It runs a 10-state workflow that guides the customer through the process, verifies them with an OTP and captures their documents, all live on a call.',
    ],
    blocks: [
      { type: 'states' },
      { type: 'chips', items: ['Gemini Live API', 'ElevenLabs', 'LiveKit', 'Twilio SIP'] },
    ],
    next: ['banking', 'responsible', 'projects'],
  },

  crm: {
    q: 'Tell me about the sales copilot',
    keys: ['crm', 'sales', 'copilot', 'lead', 'objection', 'relationship', 'support'],
    shape: 1,
    status: 'Opening case study',
    text: [
      'For an Indian private-sector bank I built a **CRM enhancement tool** for sales teams. It guides them through leads, helps them handle objections and recommends the next step based on context.',
      'Alongside it, I built **retrieval-based support systems** that search internal knowledge bases and past cases, so issues get resolved faster.',
    ],
    blocks: [{ type: 'chips', items: ['LLM', 'RAG', 'Python', 'SQL'] }],
    next: ['banking', 'sql', 'projects'],
  },

  vision: {
    q: 'Have you done computer vision?',
    keys: ['vision', 'image', 'logo', 'hologram', 'maritime', 'embedding', 'similarity', 'international', 'uk', 'foreign', 'global'],
    shape: 1,
    status: 'Opening case study',
    text: [
      'Yes. For an **international trade organisation in the UK**, I built logo and hologram validation using **image embeddings and similarity search**. A submitted image is compared against known originals to flag fakes.',
      'For the same organisation I also delivered a **maritime query system** for answering questions over their domain data.',
    ],
    blocks: [{ type: 'chips', items: ['Image embeddings', 'Similarity search', 'Vector DBs', 'LLM'] }],
    next: ['ml', 'projects', 'stack'],
  },

  ml: {
    q: 'What ML models have you built?',
    keys: ['ml', 'machine learning', 'churn', 'propensity', 'triage', 'model', 'insurance', 'predict', 'classif', 'data science'],
    shape: 2,
    status: 'Opening case study',
    text: [
      "I've built and deployed three ML models with direct business impact:",
      '**Churn prediction** for a term insurance plan, now moving to production. A **propensity model** that scores how likely each customer is to convert. An **email triage model** that routes incoming emails to the right team automatically.',
    ],
    blocks: [{ type: 'chips', items: ['Python', 'SQL', 'Machine learning', 'Model monitoring'] }],
    next: ['sql', 'responsible', 'projects'],
  },

  sql: {
    q: 'Can business users query data in plain English?',
    keys: ['sql', 'database', 'query', 'natural language', 'nl2sql', 'text to sql', 'analytics', 'data'],
    shape: 2,
    status: 'Opening case study',
    text: [
      'Yes. I build **natural-language interfaces** over structured databases. A business user asks a question in plain English, the system writes the SQL, runs it in real time and returns the answer.',
    ],
    blocks: [{ type: 'sql' }],
    next: ['crm', 'stack', 'projects'],
  },

  stack: {
    q: "What's your tech stack?",
    keys: ['stack', 'skill', 'tech', 'tool', 'language', 'framework', 'python', 'langchain', 'fastapi', 'react', 'streamlit', 'llamaparse', 'docling', 'know'],
    shape: 1,
    status: 'Listing tools',
    text: ["Here's what I work with day to day:"],
    blocks: [{ type: 'stack' }],
    next: ['approach', 'responsible', 'projects'],
  },

  responsible: {
    q: 'How do you make AI safe?',
    keys: ['responsible', 'guardrail', 'governance', 'safe', 'safety', 'observab', 'langfuse', 'monitor', 'security', 'vapt', 'burp', 'trust', 'compliance', 'hallucin', 'risk'],
    shape: 3,
    status: 'Checking guardrails',
    text: [
      'In banking, an agent that is right 95% of the time is not good enough. So **responsible AI is part of every build**, not something added at the end:',
    ],
    blocks: [{ type: 'pillars' }],
    next: ['banking', 'approach', 'contact'],
  },

  approach: {
    q: 'How do you approach a new problem?',
    keys: ['approach', 'process', 'how do you work', 'workflow', 'poc', 'prototype', 'method', 'system design', 'requirement', 'jira', 'sprint', 'lead'],
    shape: 2,
    status: 'Thinking',
    text: ['I go from business problem to working system in four steps:'],
    blocks: [{ type: 'steps' }],
    next: ['responsible', 'stack', 'contact'],
  },

  experience: {
    q: "What's your experience?",
    keys: ['your experience', 'work experience', 'how much experience', 'what experience', 'career', 'job', 'role', 'journey', 'analyst', 'years', 'company', 'resume', 'cv', 'education', 'college', 'degree', 'cgpa', 'study', 'b.tech', 'btech'],
    shape: 0,
    status: 'Loading timeline',
    text: ['I have 2+ years of experience shipping GenAI to production, and I grew from business analysis into engineering:'],
    blocks: [{ type: 'timeline' }],
    next: ['projects', 'stack', 'contact'],
  },

  contact: {
    q: 'How can I reach you?',
    keys: ['contact', 'email', 'hire', 'reach', 'linkedin', 'available', 'freelance', 'together', 'collaborat', 'call you', 'phone', 'talk', 'job offer', 'opportunit'],
    shape: 4,
    status: 'Finding contact details',
    text: ["I'm open to interesting AI problems, especially agents that have to work in regulated, high-stakes settings. The fastest way to reach me is email."],
    blocks: [{ type: 'contact' }],
    next: ['projects', 'experience'],
  },

  overview: {
    q: 'Give me the full overview',
    keys: ['everything', 'overview', 'summary', 'summar', 'tldr', 'tl;dr', 'all of it', 'full'],
    shape: 0,
    status: 'Putting it together',
    text: [
      'Here is the short version. I\'m an **AI Solutions Consultant** with 2+ years building agentic AI, RAG pipelines, voice agents and ML models for banking and insurance. My agentic banking assistant is live at four banks, and every build I ship has guardrails, tracing and governance built in.',
    ],
    blocks: [{ type: 'stats' }, { type: 'projects' }, { type: 'contact' }],
    next: ['banking', 'responsible', 'stack'],
  },
};

export const WELCOME = ['projects', 'banking', 'voice', 'responsible', 'stack', 'contact'];

export const FALLBACK = {
  shape: 0,
  status: 'Searching',
  text: [
    "I don't have a written answer for that yet. Here are the things I can tell you about. For anything else, email me and I'll reply personally.",
  ],
  blocks: [],
  next: ['projects', 'experience', 'stack', 'contact'],
};
