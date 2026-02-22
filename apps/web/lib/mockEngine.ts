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

const priceTable: Record<ProductCode, number> = { standard: 4900, deep: 12900 };
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

type GlossaryTerm = {
  term: string;
  easy: string;
  practical: string;
};

const glossaryPool: readonly GlossaryTerm[] = [
  { term: "원국", easy: "타고난 기질의 기본 설계", practical: "현재 의사결정에서 반복되는 패턴을 읽는 기준" },
  { term: "오행", easy: "목·화·토·금·수 다섯 기운", practical: "에너지 배분이 어느 영역에 쏠리는지 판단" },
  { term: "일간", easy: "나 자신을 나타내는 중심 기운", practical: "스트레스 상황에서 어떤 반응을 보이는지 해석" },
  { term: "일지", easy: "일상과 관계가 드러나는 자리", practical: "가까운 관계에서의 정서적 패턴 점검" },
  { term: "월지", easy: "사회적 환경에 대한 적응 축", practical: "직장·조직에서 강점이 발휘되는 조건 파악" },
  { term: "십성", easy: "성향을 10가지 역할로 분류한 틀", practical: "업무 방식과 협업 선호를 구조화" },
  { term: "비견", easy: "자기주도성과 독립성", practical: "혼자 책임지는 상황에서 추진력이 오르는지 확인" },
  { term: "겁재", easy: "경쟁과 돌파 성향", practical: "속도전에서 리스크 관리가 필요한 구간 진단" },
  { term: "식신", easy: "생산성과 안정적 실행", practical: "루틴화된 과제에서 성과가 나는 이유 설명" },
  { term: "상관", easy: "표현력과 문제제기 능력", practical: "아이디어 제안과 개선 포인트 도출에 유리" },
  { term: "정재", easy: "안정적 재무 감각", practical: "고정비·현금흐름 관리에 강점이 나타나는 흐름" },
  { term: "편재", easy: "기회 포착과 확장 감각", practical: "새로운 수익 기회를 탐색할 때 유리한 태도" },
  { term: "정관", easy: "규범·책임·신뢰", practical: "평판이 중요한 프로젝트에서 안정성을 높임" },
  { term: "편관", easy: "압박 대응과 결단", practical: "고난도 과제에서 우선순위를 명확히 정리" },
  { term: "정인", easy: "학습·보호·내적 회복", practical: "새 지식을 흡수해 전략을 정교화하는 힘" },
  { term: "편인", easy: "직관·분석·재해석", practical: "불확실한 정보에서 핵심 신호를 걸러내는 역량" },
  { term: "용신", easy: "균형을 맞추는 핵심 기운", practical: "현재 과부하를 줄이고 성과를 안정화하는 포인트" },
  { term: "희신", easy: "도움을 주는 보조 기운", practical: "관계·환경에서 우호적 지원을 받기 쉬운 조건" },
  { term: "기신", easy: "과하면 흔들리는 기운", practical: "반복 실수를 유발하는 자극 요인을 식별" },
  { term: "대운", easy: "10년 단위의 큰 흐름", practical: "중장기 커리어 방향 전환 시점 점검" },
  { term: "세운", easy: "연 단위의 흐름", practical: "올해의 주요 기회와 부담 요인 판단" },
  { term: "합", easy: "기운이 연결되는 작용", practical: "협업·파트너십에서 시너지가 나는 조건 설명" },
  { term: "충", easy: "기운이 부딪히는 작용", practical: "변화 압력이 커지는 시기에 대비 전략 수립" },
  { term: "형", easy: "긴장과 조정이 필요한 작용", practical: "지연·마찰이 생길 때 프로세스 재정비 필요성 진단" },
  { term: "공망", easy: "힘이 비어 체감이 약한 구간", practical: "기대 대비 결과가 약할 때 기준을 재조정하는 지표" },
  { term: "통관", easy: "막힌 흐름을 연결하는 장치", practical: "갈등 상황에서 중재 변수를 설계하는 방법" }
] as const;

type SectionKey = "core" | "past" | "present" | "future" | "domain" | "glossary" | "guide";

type DraftSection = {
  key: SectionKey;
  title: string;
  priority: number;
  paragraphs: string[];
};

const sectionMeta: readonly { key: SectionKey; title: string; priority: number }[] = [
  { key: "core", title: "1. 원국 핵심 요약", priority: 100 },
  { key: "past", title: "2. 과거 경향 분석", priority: 82 },
  { key: "present", title: "3. 현재 흐름 분석", priority: 96 },
  { key: "future", title: "4. 가까운 미래 전망", priority: 92 },
  { key: "domain", title: "5. 분야별(일/재정/관계/건강) 분석", priority: 90 },
  { key: "glossary", title: "6. 용어 해설(쉽게)", priority: 74 },
  { key: "guide", title: "7. 실행 가이드", priority: 88 }
] as const;

const tierOffset: Record<ReportTier, number> = { free: 0, standard: 79, deep: 131 };
const termCountByTier: Record<ReportTier, number> = { free: 8, standard: 16, deep: 22 };

type TierDraft = {
  headline: string;
  summary: string;
  sections: DraftSection[];
  recommendations: string[];
  terms: GlossaryTerm[];
};

const selectTerms = (seed: number, count: number): GlossaryTerm[] => {
  const rand = seededRandom(seed);
  return [...glossaryPool]
    .map((item) => ({ item, score: rand() }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((entry) => entry.item);
};

const formatTerm = (term: GlossaryTerm): string => `${term.term}(${term.easy})`;

const sentenceByGender = (gender: FortuneInput["gender"]): string => {
  if (gender === "female") return "관계 조율과 실행 균형을 동시에 잡는 방식";
  if (gender === "male") return "우선순위를 빠르게 정하고 결과로 증명하는 방식";
  return "고정 관념보다 맥락을 읽고 유연하게 선택하는 방식";
};

const buildBaseSections = (input: FortuneInput, tier: ReportTier, seed: number, terms: GlossaryTerm[]): DraftSection[] => {
  const mood = pick([
    "안정 축적형",
    "정비 후 확장형",
    "관계 조율형",
    "선택과 집중형"
  ] as const, seed, 2);

  const calendarText = input.calendarType === "lunar" ? "음력 기준 흐름" : "양력 기준 흐름";
  const timeHint = input.birthTime ? `${input.birthTime} 출생시간 정보` : "출생시간 미입력 조건";

  const term = (index: number): GlossaryTerm => terms[index % terms.length] as GlossaryTerm;

  const coreParagraphs: string[] = [
    `${input.name}님의 원국은 ${mood} 성향이 우세하게 드러납니다. ${formatTerm(term(0))}과 ${formatTerm(term(1))}의 상호작용이 비교적 분명하여, 목표를 좁히고 반복 실행할 때 성과 분산이 줄어들 가능성이 높습니다. ${calendarText}과 ${timeHint}을 함께 보면, 급격한 전환보다 축적형 전략이 더 유리할 경향이 있습니다.`,
    `${formatTerm(term(2))} 관점에서는 스스로 기준을 세운 뒤 움직일 때 안정성이 올라가는 패턴이 관찰됩니다. 동시에 ${formatTerm(term(3))} 성향이 살아나는 구간에서는 주변 요구를 과도하게 수용하기보다 핵심 지표를 먼저 고정하는 편이 결과 품질을 높일 가능성이 큽니다.`
  ];

  const pastParagraphs: string[] = [
    `과거 흐름을 회고하면, ${formatTerm(term(4))}이 강조된 시점에 책임 범위가 넓어지며 성장 폭이 커졌을 가능성이 있습니다. 다만 ${formatTerm(term(5))}이 과해질 때는 속도는 빨라졌지만 체력·집중력 소모가 누적되는 경향도 함께 나타났을 확률이 높습니다.`,
    `${formatTerm(term(6))}이 작동한 구간에서는 학습 투자 대비 실전 전환 속도가 좋았을 가능성이 큽니다. 반대로 ${formatTerm(term(7))}의 압력이 커진 시기에는 외부 기대치에 맞추느라 본인 페이스가 흔들리는 경향이 있었을 수 있습니다.`
  ];

  const presentParagraphs: string[] = [
    `현재는 ${formatTerm(term(8))}과 ${formatTerm(term(9))}이 동시에 작동하는 구간으로 해석됩니다. 즉, 구조화된 계획을 유지하면서도 예외 상황에 즉시 대응해야 하는 복합 국면일 가능성이 높습니다. 이때 ${sentenceByGender(input.gender)}이 현재의 체감 성과를 좌우할 확률이 큽니다.`,
    `또한 ${formatTerm(term(10))} 신호가 활성화되면 지출·시간·집중 자원에서 선택 기준이 분명해지는 경향이 있습니다. 지금 시점에서는 해야 할 일의 양을 늘리기보다, 이미 시작한 과제의 완료율을 끌어올리는 것이 유리할 가능성이 높습니다.`
  ];

  const futureParagraphs: string[] = [
    `가까운 미래(약 4~10주)는 ${formatTerm(term(11))}의 확장성과 ${formatTerm(term(12))}의 안정성이 균형을 찾는 단계로 보입니다. 준비가 충분한 영역부터 단계적으로 공개하거나 실행하면, 외부 반응의 변동폭이 줄어들 가능성이 높습니다.`,
    `${formatTerm(term(13))} 성향이 강해지는 주간에는 큰 결정을 단번에 확정하기보다, 중간 검증 지점을 두는 방식이 리스크를 낮출 확률이 큽니다. 특히 협업·계약·이직 같은 사안은 2회 이상 교차검토할 때 판단 정밀도가 올라가는 경향이 있습니다.`
  ];

  const domainParagraphs: string[] = [
    `일/커리어: ${formatTerm(term(14))} 흐름이 살아날수록 체계적인 준비와 기록이 실적 안정에 기여할 가능성이 높습니다. 한 번에 완성도를 높이기보다, 주간 단위 개선 사이클을 유지하면 편차가 줄어드는 경향이 있습니다.`,
    `재정: ${formatTerm(term(15))}이 유입되면 기회 탐색 욕구가 커지지만, 고정비·변동비 분리 점검이 선행될 때 순효과가 커질 확률이 높습니다. 단기 수익보다 손실 상한을 먼저 정하는 접근이 유리합니다.`,
    `관계: ${formatTerm(term(16))}은 협업 시 장점을 확대하지만, ${formatTerm(term(17))}이 겹치면 기대치 차이로 오해가 생길 수 있습니다. 핵심 합의 사항을 문장으로 남기는 습관이 관계 안정성에 도움이 될 가능성이 큽니다.`,
    `건강/리듬: ${formatTerm(term(18))}이 흔들릴 때 수면 부채와 회복 지연이 동반될 경향이 있습니다. 집중력이 떨어지는 시점을 먼저 기록하고, 강한 업무는 고집중 시간대로 옮기면 피로 누적을 완화할 가능성이 높습니다.`
  ];

  const glossaryParagraphs: string[] = terms.map(
    (item) => `${item.term}: ${item.easy}. 실무 해석에서는 '${item.practical}'으로 읽으면 이해가 쉽습니다.`
  );

  const guideParagraphs: string[] = [
    `1주 실행: 현재 진행 중인 과제 중 성과지표가 분명한 1개를 정해 완료율 80% 이상을 목표로 두는 전략이 유효할 가능성이 높습니다.`,
    `4주 실행: 회의·메시지·결정 로그를 주 1회 정리하면 ${formatTerm(term(19))} 구간의 흔들림을 줄이고, 재작업 비용을 낮출 확률이 큽니다.`,
    `8~12주 실행: 새로운 시도는 한 번에 1개씩만 추가하고, 나머지는 유지·개선 모드로 두면 변동성을 통제하면서 성장 속도를 확보할 가능성이 높습니다.`
  ];

  if (tier === "free") {
    return sectionMeta.map((meta) => {
      const paragraphs = {
        core: coreParagraphs.slice(0, 1),
        past: pastParagraphs.slice(0, 1),
        present: presentParagraphs.slice(0, 1),
        future: futureParagraphs.slice(0, 1),
        domain: domainParagraphs.slice(0, 2),
        glossary: glossaryParagraphs.slice(0, 8),
        guide: guideParagraphs.slice(0, 2)
      }[meta.key];
      return { ...meta, paragraphs };
    });
  }

  if (tier === "standard") {
    return sectionMeta.map((meta) => {
      const paragraphs = {
        core: coreParagraphs,
        past: pastParagraphs,
        present: presentParagraphs,
        future: futureParagraphs,
        domain: domainParagraphs,
        glossary: glossaryParagraphs.slice(0, 16),
        guide: guideParagraphs
      }[meta.key];
      return { ...meta, paragraphs };
    });
  }

  const deepExtra = [
    `${formatTerm(term(20))} 신호가 살아나는 시점에는 새로운 제안이 잦아질 수 있습니다. 다만 제안 수를 늘리기보다, 성공 확률이 높은 2개 이내로 압축할 때 실질 성과가 커질 가능성이 높습니다.`,
    `${formatTerm(term(21))} 작용이 보일 때는 기존 갈등을 정면 돌파하기보다 중간 매개 변수를 설계하는 접근이 유리할 경향이 있습니다.`
  ];

  return sectionMeta.map((meta) => {
    const paragraphs = {
      core: [...coreParagraphs, deepExtra[0] as string],
      past: [...pastParagraphs, deepExtra[1] as string],
      present: [...presentParagraphs, deepExtra[0] as string],
      future: [...futureParagraphs, deepExtra[1] as string],
      domain: [...domainParagraphs, deepExtra[0] as string],
      glossary: glossaryParagraphs,
      guide: [...guideParagraphs, deepExtra[1] as string]
    }[meta.key];
    return { ...meta, paragraphs };
  });
};

const sectionsToPlainText = (sections: DraftSection[]): string => sections.map((section) => section.paragraphs.join("\n\n")).join("\n\n");

const expansionSentence = (key: SectionKey, term: GlossaryTerm, input: FortuneInput, seed: number): string => {
  const detail = pick([
    "지표를 숫자로 기록하면 체감 편향이 줄어들 수 있습니다.",
    "결정 전 검토 간격을 24시간 이상 두면 과잉 확신을 줄일 가능성이 큽니다.",
    "작은 단위 실험을 병행하면 비용 대비 학습효율이 높아지는 경향이 있습니다.",
    "타인의 반응보다 실행 데이터 중심으로 수정하면 재현성이 올라갈 수 있습니다."
  ] as const, seed, 5);

  const context = {
    core: `${formatTerm(term)} 관점에서 보면, ${input.name}님은 기준이 분명할수록 안정적으로 결과를 축적하는 경향이 있습니다.`,
    past: `회고 구간에서 ${formatTerm(term)}이 반복되었다면, 비슷한 환경에서 동일한 선택 패턴이 재현되었을 가능성이 높습니다.`,
    present: `현재는 ${formatTerm(term)} 신호가 활성화되기 쉬운 시기라 우선순위 관리의 정밀도가 성과 편차를 좌우할 확률이 큽니다.`,
    future: `단기 전망에서는 ${formatTerm(term)} 흐름이 점진적으로 강화될 수 있어 준비된 과제를 선공개하는 전략이 유리할 가능성이 있습니다.`,
    domain: `분야별 해석에서 ${formatTerm(term)}을 적용하면, 일·재정·관계·건강의 선택 기준을 같은 프레임으로 정렬할 수 있습니다.`,
    glossary: `${term.term}은 단순한 개념 설명에 그치지 않고, 실제 실행 우선순위를 정할 때 기준점으로 쓰일 가능성이 높습니다.`,
    guide: `실행 단계에서는 ${formatTerm(term)}을 체크리스트 항목으로 넣으면 주간 단위 개선 루프가 안정적으로 유지될 확률이 높습니다.`
  }[key];

  return `${context} ${detail}`;
};

const minParagraphsToKeep = (key: SectionKey): number => (key === "glossary" ? 6 : 1);

const ensureTierLength = (tier: ReportTier, seed: number, input: FortuneInput, terms: GlossaryTerm[], sections: DraftSection[]): DraftSection[] => {
  const rule = REPORT_LENGTH_RULES[tier];
  let count = countReportChars(sectionsToPlainText(sections));

  let expansionCursor = 0;
  const expansionOrder: SectionKey[] = tier === "free"
    ? ["present", "future", "guide", "domain", "core", "past"]
    : ["present", "domain", "future", "guide", "core", "past", "glossary"];

  while (count < rule.min || (tier === "deep" && count < rule.target)) {
    const sectionKey = expansionOrder[expansionCursor % expansionOrder.length] as SectionKey;
    const section = sections.find((item) => item.key === sectionKey);
    if (!section) break;
    const term = terms[(expansionCursor + seed) % terms.length] as GlossaryTerm;
    section.paragraphs.push(expansionSentence(sectionKey, term, input, seed + expansionCursor));
    expansionCursor += 1;
    count = countReportChars(sectionsToPlainText(sections));
    if (expansionCursor > 220) break;
  }

  while (count > rule.max) {
    const trimTarget = [...sections].sort((a, b) => a.priority - b.priority).find((section) => section.paragraphs.length > minParagraphsToKeep(section.key));
    if (!trimTarget) break;
    trimTarget.paragraphs.pop();
    count = countReportChars(sectionsToPlainText(sections));
  }

  if (count > rule.max) {
    const fallbackSection = [...sections].sort((a, b) => a.priority - b.priority)[0];
    if (fallbackSection) {
      const idx = fallbackSection.paragraphs.length - 1;
      const base = fallbackSection.paragraphs[idx] ?? "";
      fallbackSection.paragraphs[idx] = `${base.slice(0, Math.max(0, base.length - (count - rule.max) - 30))} 정리하면, 변동성 관리가 중요합니다.`;
    }
  }

  return sections;
};

const buildTierDraft = (input: FortuneInput, tier: ReportTier): TierDraft => {
  const seed = hashInput(input) + tierOffset[tier];
  const terms = selectTerms(seed, termCountByTier[tier]);
  const sections = buildBaseSections(input, tier, seed, terms);
  const adjusted = ensureTierLength(tier, seed, input, terms, sections);

  const headlineMap: Record<ReportTier, string> = {
    free: `${input.name}님 무료 요약 리포트`,
    standard: `${input.name}님 표준 확률 기반 명리 리포트`,
    deep: `${input.name}님 심화 확률 기반 명리 리포트`
  };

  const summaryMap: Record<ReportTier, string> = {
    free: "핵심 흐름을 빠르게 파악할 수 있도록 7개 섹션으로 요약했습니다.",
    standard: "원국 해석과 분야별 전략을 연결해 실행 우선순위를 제안합니다.",
    deep: "장문 심화 분석으로 구조적 패턴, 리스크, 실행 설계를 장기 관점에서 제시합니다."
  };

  const recommendationBase = [
    "중요 결정은 최소 24시간 간격으로 2회 재검토하세요.",
    "주간 목표는 3개 이하로 제한하고 완료율을 먼저 관리하세요.",
    "관계 이슈는 추측보다 사실 문장으로 합의 기준을 명확히 남기세요."
  ];

  return {
    headline: headlineMap[tier],
    summary: summaryMap[tier],
    sections: adjusted,
    recommendations: recommendationBase,
    terms
  };
};

const toPreviewSections = (sections: DraftSection[], locked: boolean): PreviewSection[] =>
  sections.map((section) => ({
    key: section.key,
    title: section.title,
    text: section.paragraphs.join("\n\n"),
    locked
  }));

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
  const baseSeed = hashInput(input);
  const freeDraft = buildTierDraft(input, "free");
  const standardDraft = buildTierDraft(input, "standard");
  const deepDraft = buildTierDraft(input, "deep");

  const freeText = sectionsToPlainText(freeDraft.sections);
  const standardText = sectionsToPlainText(standardDraft.sections);
  const deepText = sectionsToPlainText(deepDraft.sections);

  return {
    seed: baseSeed,
    tone: "expert_probability",
    free: {
      headline: freeDraft.headline,
      summary: freeDraft.summary,
      sections: toPreviewSections(freeDraft.sections, false)
    },
    paid: {
      standard: {
        teaser: "표준 리포트는 7개 구조를 더 깊게 확장해 분야별 실행 우선순위를 제공합니다.",
        sections: toPreviewSections(standardDraft.sections, true)
      },
      deep: {
        teaser: "심화 리포트는 장문 구조(목표 9,000~11,000자)로 리스크·시나리오·실행 체계를 확장합니다.",
        sections: toPreviewSections(deepDraft.sections, true)
      }
    },
    ctas: [
      { code: "standard", label: "표준 리포트", priceLabel: "₩4,900", description: "7개 섹션 심화 해설 + 분야별 전략" },
      { code: "deep", label: "심화 리포트", priceLabel: "₩12,900", description: "장문 분석 + 용어 확장 + 90일 실행 설계" }
    ],
    debugLengths: {
      free: buildLengthInfo("free", freeText),
      standard: buildLengthInfo("standard", standardText),
      deep: buildLengthInfo("deep", deepText)
    }
  };
};

const unlock = (sections: DraftSection[]): Array<{ key: string; title: string; text: string }> =>
  sections.map((section) => ({ key: section.key, title: section.title, text: section.paragraphs.join("\n\n") }));

const buildReport = (order: OrderSummary, input: FortuneInput): ReportDetail => {
  const tier: ReportTier = order.productCode === "deep" ? "deep" : "standard";
  const draft = buildTierDraft(input, tier);
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
    debugLength: buildLengthInfo(tier, fullText)
  };
};

export const createCheckout = (payload: CheckoutCreateRequest): CheckoutCreateResponse => {
  const order: OrderSummary = {
    orderId: `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    productCode: payload.productCode,
    amountKrw: priceTable[payload.productCode],
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
