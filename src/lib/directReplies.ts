import type { KnowledgeData, Program } from "./businessData";
import type { ChatMessage } from "./conversation";

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("en-US").format(value)}₮`;
}

const REGISTRATION_PATTERNS = [
  /бүртг/,
  /элс/,
  /эхэлмээр/,
  /эхэлье/,
  /эхлэхийг/,
  /эхлэх/,
  /sign\s*up/,
  /signup/,
  /register/,
  /join/,
  /эхл(?:эх|ээр)/,
];

function isRegistrationIntent(text: string) {
  return REGISTRATION_PATTERNS.some((pattern) => pattern.test(text));
}

const CONTACT_PATTERNS = [
  /утас/,
  /phone/,
  /дугаар/,
  /и[-\s]?мэйл/,
  /email/,
  /мэйл/,
  /instagram/,
  /инстаграм/,
  /facebook/,
  /фэйсбүүк/,
  /фэйс/,
  /хаяг/,
  /contact/,
  /холбоо/,
];

function isContactIntent(text: string) {
  return CONTACT_PATTERNS.some((pattern) => pattern.test(text));
}

const ANNUAL_PATTERNS = [
  /жил/,
  /annual/,
  /yearly/,
  /per\s*year/,
  /20%/,
  /хөнгөл/,
  /discount/,
  /туршилт/,
  /free\s*trial/,
  /trial/,
];

function isAnnualIntent(text: string) {
  return ANNUAL_PATTERNS.some((pattern) => pattern.test(text));
}

const CHANNEL_PATTERNS = [
  /ямар\s*суваг/,
  /which\s*channel/,
  /channels?/,
  /суваг/,
  /instagram.*messenger|messenger.*instagram/,
  /telegram/,
  /whatsapp/,
  /ватсап/,
  /web\s*chat|website\s*widget|chat\s*widget|виджет|вэбсайт.*чат/,
  /мессенжер/,
  /инстаграм/,
];

function isChannelIntent(text: string) {
  const hasChannelKeyword = CHANNEL_PATTERNS.some((pattern) => pattern.test(text));
  const isPlanQuery = /багц|plan|starter|growth|pro|enterprise|free/.test(text);
  return hasChannelKeyword && !isPlanQuery;
}

const OVERAGE_PATTERNS = [
  /нэмэлт\s*төлбөр/,
  /гэнэтийн/,
  /overage/,
  /surprise\s*bill/,
  /хэтэрс/,
  /limit\s*(over|exceed)/,
];

function isOverageIntent(text: string) {
  return OVERAGE_PATTERNS.some((pattern) => pattern.test(text));
}

const SETUP_FEE_PATTERNS = [
  /setup\s*fee/,
  /онбординг.*төлбөр/,
  /нэг\s*удаагийн\s*төлбөр/,
  /setup.*cost/,
];

function isSetupFeeIntent(text: string) {
  return SETUP_FEE_PATTERNS.some((pattern) => pattern.test(text));
}

type PlanKey = "free" | "starter" | "growth" | "pro" | "enterprise";

const PLAN_KEYWORDS: Record<PlanKey, RegExp[]> = {
  free: [/\bfree\b/, /үнэгүй/, /free\s*plan/],
  starter: [/\bstarter\b/, /стартер/],
  growth: [/\bgrowth\b/, /өсөлт/],
  pro: [/\bpro\b/, /про/],
  enterprise: [/\benterprise\b/, /энтерпрайз/, /custom/, /байгууллага/],
};

function detectPlan(text: string): PlanKey | null {
  for (const key of Object.keys(PLAN_KEYWORDS) as PlanKey[]) {
    if (PLAN_KEYWORDS[key].some((pattern) => pattern.test(text))) return key;
  }
  return null;
}

function findProgramByName(knowledge: KnowledgeData, name: string): Program | undefined {
  return knowledge.packages.find(
    (program) => program.name.toLowerCase() === name.toLowerCase(),
  );
}

function buildPlanReply(knowledge: KnowledgeData, key: PlanKey): string | null {
  const nameMap: Record<PlanKey, string> = {
    free: "Free",
    starter: "Starter",
    growth: "Growth",
    pro: "Pro",
    enterprise: "Enterprise",
  };
  const plan = findProgramByName(knowledge, nameMap[key]);
  if (!plan) return null;

  const priceText = typeof plan.price === "number" && plan.price > 0
    ? `${formatCurrency(plan.price)}/сар`
    : "Үнэгүй";

  return `${plan.name} багц: ${priceText}. ${plan.description}`;
}

function buildRegistrationReply() {
  return "Бүртгүүлэхийн тулд /register хуудсаар ороод багцаа сонгоно уу. Free багцаар үнэгүй эхэлж болно, дараа нь хүссэн үедээ upgrade хийнэ.";
}

function buildContactReply() {
  return "Холбоо барих: утас +976 8618 5769, и-мэйл nexondigitalnova@gmail.com, Instagram @nexon_digital_nova, Facebook Nexon Digital Nova.";
}

function buildAnnualReply() {
  return "Жилийн төлбөрөөр 20% хөнгөлөлттэй: Starter 40,000₮/сар, Growth 96,000₮/сар, Pro 200,000₮/сар, Enterprise 400,000₮/сар. Жилийн багцад 14 хоногийн үнэгүй туршилт орно.";
}

function buildChannelReply() {
  return "Nexon нь 5 суваг дэмждэг: Instagram, Facebook Messenger, Telegram, WhatsApp, website chat widget. Starter-ээс дээш багцад бүгдийг нэг dashboard-оос удирдана (Free багцад зөвхөн 1 суваг).";
}

function buildQPayReply() {
  return "QPay-р хоёр янзаар ажиллана: (1) Nexon-д төлбөр төлөхдөө QPay эсвэл данс шилжүүлгээр төлнө, (2) Growth-ээс дээш багцад QPay in-flow payment орсон — хэрэглэгчээс чатан дотор шууд төлбөр авч чадна.";
}

function buildManyChatReply() {
  return "Nexon Монголд зориулсан: монгол хэл, QPay (ManyChat-д зөвхөн Stripe), Telegram дэмждэг (ManyChat үгүй), AI Agent (GPT-4) үндсэн багцад үнэгүй орсон (ManyChat-д нэмэлт төлбөртэй), <1 цагт монгол хэлээр чат дэмжлэг.";
}

function buildAIAgentReply() {
  return "AI Agent бол GPT-4 дээр суурилсан бот. Хэрэглэгчийн мессежийг ойлгож, context-той бүрэн хариу өгнө — зөвхөн keyword биш. Starter-ээс дээш бүх багцад үнэгүй орно.";
}

function buildWebhookReply() {
  return "Webhooks ба Zapier холболт Growth багцаас эхлэн орсон. Webhook-оор өөрийн backend эсвэл CRM-д event илгээх, Zapier-ээр 6000+ апптай холбоно.";
}

function buildOverageReply() {
  return "Nexon-ийн үнэ тогтмол — contact limit-ээс хэтэрсэн ч автоматаар нэмэлт төлбөр тавихгүй. Limit дүүрвэл дээд багц руу шилжихийг санал болгоно.";
}

function buildSetupFeeReply() {
  return "Setup fee буюу нэг удаагийн төлбөр одоогоор 0₮. Зөвхөн сонгосон багцынхаа сарын эсвэл жилийн төлбөрийг төлнө.";
}

export function maybeGetDirectReply(options: {
  userText: string;
  history: ChatMessage[];
  knowledge: KnowledgeData;
}) {
  const { userText, knowledge } = options;
  const text = normalize(userText);

  if (isRegistrationIntent(text)) return buildRegistrationReply();
  if (isContactIntent(text)) return buildContactReply();
  if (isSetupFeeIntent(text)) return buildSetupFeeReply();
  if (isOverageIntent(text)) return buildOverageReply();
  if (isAnnualIntent(text)) return buildAnnualReply();
  if (/manychat|мани\s*чат/.test(text)) return buildManyChatReply();
  if (/qpay|кюпэй|төлбөр\s*авах|хэрэглэгчээс\s*төлбөр|in.?flow\s*payment/.test(text)) return buildQPayReply();
  if (/ai\s*agent|gpt.?4|gpt|ai\s*бот|бүрэн\s*хариу/.test(text)) return buildAIAgentReply();
  if (/webhook|zapier|api\s*холбол|интеграц/.test(text)) return buildWebhookReply();

  const planKey = detectPlan(text);
  const isPlanDetailQuery =
    /үнэ|price|cost|хэд|how much|what|юу|багц|plan|contact|feature|орно|includes?/.test(text);
  if (planKey && isPlanDetailQuery) {
    const planReply = buildPlanReply(knowledge, planKey);
    if (planReply) return planReply;
  }

  if (isChannelIntent(text)) return buildChannelReply();

  return null;
}
