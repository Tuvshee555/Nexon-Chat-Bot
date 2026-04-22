/* eslint-disable @typescript-eslint/no-explicit-any */
export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  text: string;
};

type ChatSession = {
  messages: ChatMessage[];
  updatedAt: number;
};

const STORE = new Map<string, ChatSession>();
const MAX_MESSAGES = 12;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [key, session] of STORE.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) STORE.delete(key);
  }
}

export function getHistory(id: string): ChatMessage[] {
  prune();
  return STORE.get(id)?.messages || [];
}

export function appendMessage(id: string, role: ChatRole, text: string) {
  prune();
  const session = STORE.get(id) || { messages: [], updatedAt: Date.now() };
  session.messages.push({ role, text });

  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES);
  }

  session.updatedAt = Date.now();
  STORE.set(id, session);
}

export function buildPrompt(options: {
  systemPrompt: string;
  business: {
    name?: string;
    knowledgeBase?: any;
  };
  history: ChatMessage[];
  userText: string;
}) {
  const { systemPrompt, business, history, userText } = options;
  const lines: string[] = [];

  const recentHistory = history.slice(-6);

  lines.push(systemPrompt.trim());
  lines.push("");

  lines.push("Reply rules:");
  lines.push("- ALWAYS reply in Mongolian only. Never use English or any other language in your reply, even if the user writes in English or mixes languages. Translate your answer to Mongolian before sending.");
  lines.push("- Keep replies short (1-3 sentences). If the user asks multiple questions, answer each briefly.");
  lines.push("- Use only the provided context. Do not invent features, prices, or integrations.");
  lines.push("- If unsure, say you will connect them to a human and share the contact email or Messenger link.");

  lines.push("- Always guide the user toward a plan that fits their size.");
  lines.push(
    "- If the user is unsure, recommend Growth (120,000₮/сар) as the most popular default, or Free if they want to just try.",
  );
  lines.push(
    "- If the user mentions budget concerns, suggest Free (0₮) first, then Starter (50,000₮/сар) as the cheapest paid step.",
  );
  lines.push(
    "- Do not push Pro or Enterprise unless the user mentions a larger team, high message volume, or custom needs.",
  );

  lines.push(
    "- When answering about plans, include name, price, and contact limit clearly.",
  );
  lines.push(
    "- If the user asks about annual billing, mention the 20% discount and 14-day free trial on annual plans.",
  );
  lines.push(
    "- If the user asks about overage or surprise bills, confirm Nexon has fixed pricing with no automatic overage charges; suggest upgrading if their contact limit fills up.",
  );
  lines.push(
    "- There is no setup fee right now (SETUP_FEE is 0). Do not claim otherwise.",
  );
  lines.push(
    "- Supported channels are Instagram, Messenger, Telegram, WhatsApp, and a website chat widget. Free plan only gets 1 channel; Starter+ unlocks all five.",
  );
  lines.push(
    "- When asked about ManyChat: position Nexon as Mongolia-first — Mongolian language, QPay payments, Telegram support (ManyChat has none), AI Agent (GPT-4) included in base plans (ManyChat charges extra), <1h Mongolian-language support.",
  );
  lines.push(
    "- QPay works two ways: (1) customers pay Nexon in QPay or bank transfer; (2) from Growth plan up, businesses can collect QPay payments from their own customers inside the chat flow (in-flow QPay).",
  );
  lines.push(
    "- AI Agent means GPT-4 full-conversation replies, included free from Starter up.",
  );
  lines.push(
    "- Webhooks and Zapier are available from Growth up (6000+ app integrations via Zapier).",
  );
  lines.push(
    "- Pro+ plans include Mongolian chat support with <1 hour response time; Starter/Growth get email support.",
  );

  lines.push(
    "- Only ask for name/phone/email when the user shows clear intent to sign up or asks for a call-back.",
  );
  lines.push(
    "- When the user clearly wants to register, point them to the /register page and mention they can start on Free.",
  );
  lines.push(
    "- For custom workflows, integrations, or large rollouts, point the user to the Enterprise plan and offer to connect them to the Nexon team (email: nexondigitalnova@gmail.com, phone: +976 8618 5769).",
  );

  lines.push(
    "- If the question is unclear, ask one short clarifying question (e.g. which channel, how many messages/day, team size).",
  );
  lines.push("- Do not repeat the same phrase in every response.");
  lines.push(
    "- If the user input is random or off-topic, politely redirect to what Nexon does (AI messaging automation for Instagram/Messenger/Telegram).",
  );

  lines.push("");
  lines.push(`Business name: ${business?.name || "N/A"}`);

  lines.push("Context:");

  if (typeof business?.knowledgeBase === "string") {
    lines.push(business.knowledgeBase);
  } else {
    lines.push(JSON.stringify(business?.knowledgeBase || {}));
  }

  lines.push("");

  if (recentHistory.length) {
    lines.push("Conversation so far:");
    for (const message of recentHistory) {
      const role = message.role === "user" ? "User" : "Assistant";
      lines.push(`${role}: ${message.text}`);
    }
    lines.push("");
  }

  lines.push(`User: ${userText}`);
  lines.push("Assistant:");

  return lines.join("\n");
}
