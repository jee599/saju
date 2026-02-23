import type {
  CheckoutCreateRequest,
  CheckoutCreateResponse,
  CheckoutConfirmResponse,
  FortuneInput,
  FortuneResult,
  GetReportResponse,
  OrderSummary,
  PreviewSection,
  ProductCode,
  ReportDetail,
  ReportPreview
} from "./types";
import { buildLengthInfo, countReportChars, REPORT_LENGTH_RULES, type ReportTier } from "./reportLength";

const PRODUCT_CODE: ProductCode = "full";
const PRODUCT_PRICE = 12900;

const orders = new Map<string, { order: OrderSummary; input: FortuneInput }>();
const reports = new Map<string, ReportDetail>();

const pick = <T>(arr: readonly T[], seed: number, offset: number): T => arr[(seed + offset) % arr.length] as T;

const hashInput = (input: FortuneInput): number => {
  const s = [input.name.trim().toLowerCase(), input.birthDate, input.birthTime ?? "", input.gender, input.calendarType].join("|");
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = (h * 33) ^ s.charCodeAt(i);
  return Math.abs(h) >>> 0;
};

const seededRandom = (seed: number): (() => number) => {
  let t = seed + 0x6d2b79f5;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

type GlossaryTerm = { term: string; easy: string; practical: string };
const glossaryPool: readonly GlossaryTerm[] = [
  { term: "식신", easy: "아이디어를 결과물로 만드는 생산의 별", practical: "루틴을 쌓아 성과를 만들 때 강해집니다" },
  { term: "상관", easy: "표현력과 개선 감각", practical: "문제점을 빨리 발견하고 방식 자체를 바꿉니다" },
  { term: "정재", easy: "안정적 재무 감각", practical: "수입과 지출의 기준을 분리할 때 힘이 납니다" },
  { term: "편재", easy: "확장형 기회 감각", practical: "새로운 판을 볼 때 먼저 움직입니다" },
  { term: "정관", easy: "책임과 신뢰의 축", practical: "규칙이 필요한 판에서 평가가 올라갑니다" },
  { term: "편관", easy: "압박 대응과 결단", practical: "난도 높은 이슈를 쳐내는 순간에 강합니다" },
  { term: "정인", easy: "학습과 회복", practical: "정리하고 복기할 때 실수율이 낮아집니다" },
  { term: "편인", easy: "직관과 재해석", practical: "불확실한 정보에서 핵심을 뽑아냅니다" },
  { term: "합", easy: "연결과 시너지", practical: "사람과 일의 궁합이 맞을 때 속도가 붙습니다" },
  { term: "충", easy: "변화 압력", practical: "기존 방식을 재정비하라는 신호로 해석하면 유리합니다" },
  { term: "용신", easy: "균형을 세우는 핵심", practical: "과부하를 줄이고 흐름을 정렬하는 기준입니다" },
  { term: "대운", easy: "10년 단위 큰 흐름", practical: "중장기 선택의 타이밍을 읽는 프레임입니다" }
] as const;

const selectTerms = (seed: number, count: number): GlossaryTerm[] => {
  const rand = seededRandom(seed);
  return [...glossaryPool]
    .map((item) => ({ item, score: rand() }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((entry) => entry.item);
};

type DraftSection = { key: string; title: string; text: string };
type TierDraft = {
  headline: string;
  summary: string;
  sections: DraftSection[];
  recommendations: string[];
};

const phraseByGender = (gender: FortuneInput["gender"]): string => {
  if (gender === "female") return "관계 감각과 실행력을 동시에 챙기는 방식";
  if (gender === "male") return "우선순위를 빨리 정하고 결과로 확인하는 방식";
  return "고정된 틀보다 맥락을 읽어 유연하게 전환하는 방식";
};

const inlineTerm = (term: GlossaryTerm, input: FortuneInput, domain: string, suffix: string): string =>
  `${term.term}(${term.easy})이라는 말은 어렵게 들리지만, ${input.name}님 맥락에서는 ${domain}에서 ${term.practical}는 뜻에 가깝고, 그래서 ${suffix}할 확률이 높습니다.`;

const domainNarrative = (
  input: FortuneInput,
  seed: number,
  domain: "성격" | "직업" | "연애" | "금전" | "건강" | "가족·배우자",
  termA: GlossaryTerm,
  termB: GlossaryTerm,
  mustIncludeSikshin = false
): string => {
  const tempo = pick(["천천히 누적형", "정비 후 가속형", "관계 조율형", "선택 집중형"] as const, seed, 3);
  const bias = phraseByGender(input.gender);
  const sikshin = glossaryPool.find((item) => item.term === "식신") as GlossaryTerm;

  const commonPast = `과거를 보면 ${input.name}님은 ${tempo}으로 움직일 때 결과가 안정됐고, 너무 빠르게 판을 넓히면 체감 소모가 먼저 커지는 패턴이 반복됐을 가능성이 큽니다.`;
  const commonNow = `현재는 ${bias}이 특히 잘 먹히는 구간이라, 한 번에 많은 선택을 하기보다 기준을 먼저 문장으로 고정하면 흔들림이 줄어들 확률이 높습니다.`;
  const commonFuture = `앞으로 6~12개월은 작은 검증을 거쳐 확정하는 방식이 유리해 보이며, 준비된 영역부터 순차적으로 공개할수록 만족도가 올라갈 가능성이 큽니다.`;

  const termSentenceA = inlineTerm(termA, input, domain, "불필요한 시행착오를 줄일");
  const termSentenceB = inlineTerm(termB, input, domain, "의사결정 속도와 정확도를 같이 지킬");

  if (mustIncludeSikshin) {
    const sikshinSentence = inlineTerm(sikshin, input, domain, "한 번 만든 루틴이 실제 성과로 연결될");
    return `${commonPast} ${commonNow} ${sikshinSentence} ${termSentenceB} ${commonFuture}`;
  }

  return `${commonPast} ${commonNow} ${termSentenceA} ${termSentenceB} ${commonFuture}`;
};

const buildFreeDraft = (input: FortuneInput): TierDraft => {
  const seed = hashInput(input);
  const term = pick(glossaryPool, seed, 2);
  const support = pick(glossaryPool, seed, 5);

  const summary = `${input.name}님의 무료 요약입니다. 지금 흐름은 급한 확장보다 기준 정리가 먼저인 구간에 가깝고, ${inlineTerm(term, input, "일상 전반", "실수율을 낮출")} 또한 ${support.term}(${support.easy}) 신호도 함께 보여서, 이번 달은 새 일 추가보다 진행 중인 일의 완성도를 끌어올릴 때 체감 성과가 좋아질 가능성이 큽니다.`;

  return {
    headline: `${input.name}님 무료 요약 리포트`,
    summary: "핵심 흐름만 짧게 읽을 수 있는 대화형 요약입니다.",
    sections: [{ key: "free-summary", title: "짧은 핵심 요약", text: summary }],
    recommendations: [
      "오늘 바로 할 일은 한 가지로 좁히고 완료 기준부터 정해보세요.",
      "큰 결정보다 기존 일정의 마감률을 끌어올리는 편이 유리합니다.",
      "불확실할 때는 감보다 기록을 기준으로 판단하세요."
    ]
  };
};

const buildFortuneSections = (input: FortuneInput, seed: number): DraftSection[] => {
  const terms = selectTerms(seed + 99, 10);

  return [
    {
      key: "personality",
      title: "성격",
      text: domainNarrative(input, seed + 11, "성격", terms[0] as GlossaryTerm, terms[1] as GlossaryTerm)
    },
    {
      key: "career",
      title: "직업",
      text: domainNarrative(input, seed + 23, "직업", terms[2] as GlossaryTerm, terms[3] as GlossaryTerm, true)
    },
    {
      key: "love",
      title: "연애",
      text: domainNarrative(input, seed + 31, "연애", terms[4] as GlossaryTerm, terms[5] as GlossaryTerm)
    },
    {
      key: "money",
      title: "금전",
      text: domainNarrative(input, seed + 47, "금전", terms[6] as GlossaryTerm, terms[7] as GlossaryTerm)
    },
    {
      key: "health",
      title: "건강",
      text: domainNarrative(input, seed + 59, "건강", terms[8] as GlossaryTerm, terms[9] as GlossaryTerm)
    },
    {
      key: "family-partner",
      title: "가족·배우자",
      text: domainNarrative(input, seed + 71, "가족·배우자", terms[1] as GlossaryTerm, terms[6] as GlossaryTerm)
    }
  ];
};

const buildDaeunTimeline = (input: FortuneInput, seed: number): DraftSection => {
  const starts = pick(["학습과 정체성 탐색", "관계와 규칙 학습", "경험 폭 확장"] as const, seed, 1);
  const age23 = pick(["실전 선택의 부담", "역할 전환 압력", "관계 재정렬"] as const, seed, 2);
  const age24 = pick(["방향 재확인", "기준 재설계", "속도 조절"] as const, seed, 3);
  const later = pick(["성과 구조 고도화", "책임 범위 확장", "자기 방식 확립"] as const, seed, 4);

  const text = `${input.name}님의 대운 타임라인은 12~22세에는 ${starts} 쪽으로 에너지가 모였을 가능성이 높고, 23세에는 ${age23} 이슈가 커지면서 선택의 밀도가 올라갔을 확률이 큽니다. 24세에는 ${age24} 국면이 들어와 속도를 조정하는 과정이 있었을 수 있고, 25~34세에는 ${later} 흐름이 강해져 한 번 정한 기준을 길게 밀고 갈수록 성과가 커질 가능성이 높습니다. 35~44세는 대운(10년 단위 큰 흐름)상 안정성과 확장성이 같이 들어오는 구간으로 해석되므로, 무리한 점프보다 누적된 강점을 재배치할 때 체감 만족도가 올라갈 확률이 큽니다.`;

  return { key: "daeun", title: "대운 타임라인", text };
};

const buildPaidDraft = (input: FortuneInput): TierDraft => {
  const seed = hashInput(input) + 71;
  const sections = [...buildFortuneSections(input, seed), buildDaeunTimeline(input, seed + 19)];

  return {
    headline: `${input.name}님 대화형 장문 리포트`,
    summary: "도메인별로 과거, 현재, 미래를 한 흐름으로 연결해 읽기 쉽게 정리했습니다.",
    sections,
    recommendations: [
      "이번 주에는 도메인 하나만 골라 과거-현재-미래 기준을 메모로 정리해 보세요.",
      "결정이 애매하면 식신 루틴처럼 반복 가능한 행동부터 실행해 보세요.",
      "감정적으로 급한 판단은 하루 뒤 다시 읽고 확정하는 편이 안정적입니다."
    ]
  };
};

const ensurePaidLength = (draft: TierDraft, input: FortuneInput, seed: number): TierDraft => {
  const rule = REPORT_LENGTH_RULES.paid;
  const textOf = (s: DraftSection[]) => s.map((item) => `${item.title}\n${item.text}`).join("\n");
  let text = textOf(draft.sections);
  let count = countReportChars(text);

  const addOn = [
    `${input.name}님 케이스에서는 숫자 기록이 붙는 순간 판단 품질이 올라갈 가능성이 큽니다.`,
    `지금은 많이 하기보다 제대로 끝내는 패턴을 만들 때 변동성이 낮아질 확률이 높습니다.`,
    `관계와 성과를 동시에 잡으려면 기준 문장 한 줄을 먼저 만드는 방식이 효과적일 수 있습니다.`,
    `확률형 해석의 핵심은 단정이 아니라 재현 가능한 행동을 늘리는 데 있습니다.`
  ] as const;

  let idx = 0;
  while (count < rule.min) {
    const section = draft.sections[idx % draft.sections.length] as DraftSection;
    const piece = addOn[(seed + idx) % addOn.length] as string;
    section.text = `${section.text} ${piece}`;
    idx += 1;
    text = textOf(draft.sections);
    count = countReportChars(text);
    if (idx > 160) break;
  }

  while (count > rule.max) {
    const section = draft.sections[(seed + idx) % draft.sections.length] as DraftSection;
    if (section.text.length < 240) break;
    section.text = `${section.text.slice(0, Math.max(0, section.text.length - 130))} 그래서 당분간은 기준을 단순하게 유지하는 전략이 유리합니다.`;
    idx += 1;
    text = textOf(draft.sections);
    count = countReportChars(text);
    if (idx > 160) break;
  }

  return draft;
};

const toPreviewSections = (sections: DraftSection[], locked: boolean): PreviewSection[] =>
  sections.map((section) => ({ key: section.key, title: section.title, text: section.text, locked }));

const sectionsToPlainText = (sections: DraftSection[]): string =>
  sections.map((section) => `${section.title}\n${section.text}`).join("\n");

export const isValidFortuneInput = (input: FortuneInput): boolean => {
  if (!input?.name?.trim()) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) return false;
  if (input.birthTime && !/^\d{2}:\d{2}$/.test(input.birthTime)) return false;
  return ["male", "female", "other"].includes(input.gender) && ["solar", "lunar"].includes(input.calendarType);
};

export const generateFortune = (input: FortuneInput): FortuneResult => {
  const seed = hashInput(input);
  const summaries = [
    "차분한 준비가 성과를 만드는 시점입니다.",
    "관계와 대화에서 실질적 단서를 얻을 확률이 높습니다.",
    "정리와 우선순위 조정이 체감 성과를 높일 가능성이 있습니다.",
    "새 시도보다 기존 계획 완성이 유리한 흐름입니다."
  ] as const;
  const colors = ["blue", "green", "white", "gold", "navy"] as const;
  const traits = ["집중력", "공감력", "실행력", "통찰력", "성실함", "유연함"] as const;
  const cautions = [
    "감정적 의사결정은 지연하는 편이 안정적입니다.",
    "변동 지출을 먼저 통제하면 리스크가 낮아질 수 있습니다.",
    "수면 리듬 고정이 집중 회복에 유리합니다."
  ] as const;
  return {
    summary: pick(summaries, seed, 0),
    luckyColor: pick(colors, seed, 1),
    luckyNumber: (seed % 9) + 1,
    traits: [pick(traits, seed, 2), pick(traits, seed, 3)],
    caution: pick(cautions, seed, 4)
  };
};

export const generatePreview = (input: FortuneInput): ReportPreview => {
  const seed = hashInput(input);
  const freeDraft = buildFreeDraft(input);
  const paidDraft = ensurePaidLength(buildPaidDraft(input), input, seed);

  const freeText = sectionsToPlainText(freeDraft.sections);
  const paidText = sectionsToPlainText(paidDraft.sections);

  return {
    seed,
    tone: "expert_probability",
    free: {
      headline: freeDraft.headline,
      summary: freeDraft.summary,
      sections: toPreviewSections(freeDraft.sections, false)
    },
    paid: {
      teaser: "단일 유료 리포트에서 성격, 직업, 연애, 금전, 건강, 가족·배우자를 과거-현재-미래 흐름으로 읽고 마지막에 대운 타임라인으로 정리합니다.",
      sections: toPreviewSections(paidDraft.sections, true)
    },
    cta: {
      code: PRODUCT_CODE,
      label: "장문 리포트 잠금 해제",
      priceLabel: "₩12,900",
      description: "대화형 장문 해설 + 6개 도메인 + 대운 타임라인"
    },
    debugLengths: {
      free: buildLengthInfo("free", freeText),
      paid: buildLengthInfo("paid", paidText)
    }
  };
};

const unlock = (sections: DraftSection[]): Array<{ key: string; title: string; text: string }> =>
  sections.map((section) => ({ key: section.key, title: section.title, text: section.text }));

const buildReport = (order: OrderSummary, input: FortuneInput): ReportDetail => {
  const seed = hashInput(input);
  const draft = ensurePaidLength(buildPaidDraft(input), input, seed);
  const fullText = sectionsToPlainText(draft.sections);

  return {
    reportId: `rep_${order.orderId}`,
    orderId: order.orderId,
    productCode: order.productCode,
    generatedAt: new Date().toISOString(),
    headline: draft.headline,
    summary: draft.summary,
    sections: unlock(draft.sections),
    recommendations: draft.recommendations,
    disclaimer: "본 서비스는 참고용 해석 정보이며, 의료·법률·투자 판단의 단독 근거로 사용할 수 없습니다.",
    debugLength: buildLengthInfo("paid", fullText)
  };
};

export const createCheckout = (payload: CheckoutCreateRequest): CheckoutCreateResponse => {
  const order: OrderSummary = {
    orderId: `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    productCode: payload.productCode,
    amountKrw: PRODUCT_PRICE,
    status: "created",
    createdAt: new Date().toISOString()
  };
  orders.set(order.orderId, { order, input: payload.input });
  return { order };
};

export const confirmCheckout = (orderId: string): CheckoutConfirmResponse | null => {
  const found = orders.get(orderId);
  if (!found) return null;
  const updated: OrderSummary = { ...found.order, status: "confirmed", confirmedAt: new Date().toISOString() };
  orders.set(orderId, { ...found, order: updated });
  const report = buildReport(updated, found.input);
  reports.set(orderId, report);
  return { order: updated, report };
};

export const getReport = (orderId: string): GetReportResponse | null => {
  const found = orders.get(orderId);
  const report = reports.get(orderId);
  if (!found || !report || found.order.status !== "confirmed") return null;
  return { order: found.order, report };
};
