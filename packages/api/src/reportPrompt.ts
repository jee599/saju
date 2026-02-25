import type { FortuneInput, ProductCode } from "../../shared/src/index.ts";
import type { SajuResult } from "../../engine/saju/src/index.ts";

export const FIXED_JASI_NOTICE_KO =
  "※ 자시(23:00~01:00) 해석은 lunar-javascript 기본 규칙(초자시 기준)을 따릅니다. 전통/학파에 따라 초·후자시 기준이 다를 수 있으며, 본 리포트는 참고용입니다.";

// ── Output schema (JSON) ─────────────────────────────────

/** Report JSON schema for LLM output — fixed across all models */
export const REPORT_SCHEMA = {
  headline: "string",
  summary: "string",
  sections: [
    "성격", "직업", "연애", "금전", "건강",
    "가족·배우자", "과거", "현재", "미래", "대운 타임라인",
  ],
  recommendations: "string[]",
  disclaimer: "string",
} as const;

export const REPORT_SECTION_KEYS = REPORT_SCHEMA.sections;

/** Compact schema string for prompt injection (token-efficient) */
export const SCHEMA_COMPACT = `{"headline":str,"summary":str,"sections":[{"key":"성격","title":"성격","text":str},{"key":"직업","title":"직업","text":str},{"key":"연애","title":"연애","text":str},{"key":"금전","title":"금전","text":str},{"key":"건강","title":"건강","text":str},{"key":"가족·배우자","title":"가족·배우자","text":str},{"key":"과거","title":"과거","text":str},{"key":"현재","title":"현재","text":str},{"key":"미래","title":"미래","text":str},{"key":"대운 타임라인","title":"대운 타임라인","text":str}],"recommendations":str[],"disclaimer":str}`;

// ── Forbidden expressions (QA validation) ────────────────

export const FORBIDDEN_PATTERNS = [
  /반드시.*(?:될|합니다|입니다)/,       // 단정적 표현
  /절대.*(?:안|못|없)/,               // 절대 금지
  /(?:사망|죽|자살)/,                 // 공포 표현
  /(?:암|말기|불치)/,                 // 의료 단정
  /(?:확실히|틀림없이|분명히)/,        // 과도한 확신
  /(?:이혼|파산).*(?:합니다|입니다)/,  // 부정적 단정
];

// ── Prompt v1 (legacy, no saju engine) ──────────────────

export const buildPaidReportPrompt = (params: {
  input: FortuneInput;
  productCode: ProductCode;
}): { system: string; user: string } => {
  const { input, productCode } = params;

  const lengthGuide =
    productCode === "deep"
      ? "유료(심화) 기준으로 충분히 길게 작성하세요. 목표: 약 15,000자(±25%) 수준의 한국어 장문."
      : "유료(표준) 기준으로 중간 길이로 작성하세요. 목표: 약 8,000자(±25%) 수준의 한국어.";

  const system =
    "당신은 한국어로 사주/운세 리포트를 쓰는 전문 에디터입니다.\n" +
    "- 문체: 존댓말, 칼럼형(서사/근거/맥락), 단정 금지(확률/가능성 표현)\n" +
    "- 목표: 읽는 사람이 '아, 그래서 지금 뭘 하면 되지?'가 남도록 구체적 행동 제안 포함\n" +
    "- 금지: 의료/법률/투자 단정, 공포 조장, 과도한 확신\n" +
    "- 출력 형식: 반드시 JSON 하나만 출력 (추가 텍스트/마크다운 금지)";

  const user =
    `다음 사용자 입력을 바탕으로 유료 리포트를 작성해 주세요.\n\n` +
    `사용자: ${JSON.stringify(input)}\n` +
    `상품: ${productCode}\n\n` +
    `${FIXED_JASI_NOTICE_KO}\n\n` +
    `${lengthGuide}\n\n` +
    "반드시 아래 JSON 스키마로만 출력하세요.\n" +
    "{\n" +
    '  "headline": string,\n' +
    '  "summary": string,\n' +
    '  "sections": [\n' +
    '    {"key":"성격","title":"성격","text":string},\n' +
    '    {"key":"직업","title":"직업","text":string},\n' +
    '    {"key":"연애","title":"연애","text":string},\n' +
    '    {"key":"금전","title":"금전","text":string},\n' +
    '    {"key":"건강","title":"건강","text":string},\n' +
    '    {"key":"가족·배우자","title":"가족·배우자","text":string},\n' +
    '    {"key":"과거","title":"과거","text":string},\n' +
    '    {"key":"현재","title":"현재","text":string},\n' +
    '    {"key":"미래","title":"미래","text":string},\n' +
    '    {"key":"대운 타임라인","title":"대운 타임라인","text":string}\n' +
    "  ],\n" +
    '  "recommendations": string[],\n' +
    '  "disclaimer": string\n' +
    "}\n\n" +
    "작성 규칙:\n" +
    "- 각 섹션은 최소 6~10문장 이상(심화는 더 길게).\n" +
    "- '근거(왜)' → '패턴(어떻게 나타나는지)' → '리스크' → '실행 팁' 순으로 설득력 있게.\n" +
    "- 중복 문장/상투어 최소화.\n";

  return { system, user };
};

// ── Prompt v2 (with saju engine result) ──────────────────

/**
 * System prompt — cacheable across all users.
 * Contains: role, rules, output schema, forbidden expressions.
 * Token-efficient: ~250 tokens.
 */
export const SYSTEM_PROMPT_V2 =
  "역할: 한국 사주(四柱) 전문 리포트 작성자.\n" +
  "규칙:\n" +
  "1) 존댓말, 칼럼형(근거→패턴→리스크→실행팁)\n" +
  "2) 단정 금지 — '~할 수 있습니다', '~경향이 있습니다' 형태만 허용\n" +
  "3) 의료/법률/투자 단정, 공포 조장, 과도한 확신 금지\n" +
  "4) 엔진이 계산한 사주 데이터를 근거로 해석할 것 (재계산 금지)\n" +
  "5) 각 섹션 최소 6문장 이상, 구체적 행동 제안 포함\n" +
  "출력: 아래 JSON만 출력 (추가 텍스트/마크다운 금지)\n" +
  SCHEMA_COMPACT;

/**
 * User prompt — per-request, includes engine calculation result.
 * Token-efficient: only necessary fields from SajuResult.
 */
export const buildUserPromptV2 = (params: {
  input: FortuneInput;
  saju: SajuResult;
  productCode: ProductCode;
}): string => {
  const { input, saju, productCode } = params;

  // Compact saju data — only what LLM needs for interpretation
  const sajuCompact = {
    year: saju.pillars.year.fullKr,
    month: saju.pillars.month.fullKr,
    day: saju.pillars.day.fullKr,
    hour: saju.pillars.hour.fullKr,
    yearH: saju.pillars.year.full,
    monthH: saju.pillars.month.full,
    dayH: saju.pillars.day.full,
    hourH: saju.pillars.hour.full,
  };

  const lengthHint =
    productCode === "deep" ? "심화(15000자±25%)" :
    productCode === "full" ? "풀(20000자±25%)" : "표준(8000자±25%)";

  return [
    `사용자: ${input.name}, ${input.gender}, ${input.birthDate} ${input.birthTime ?? "시간미상"}, ${input.calendarType}`,
    `사주: ${JSON.stringify(sajuCompact)}`,
    `상품: ${productCode} (${lengthHint})`,
  ].join("\n");
};

/**
 * Build v2 prompt pair (system + user).
 * System is static/cacheable, user is per-request.
 */
export const buildPromptV2 = (params: {
  input: FortuneInput;
  saju: SajuResult;
  productCode: ProductCode;
}): { system: string; user: string } => ({
  system: SYSTEM_PROMPT_V2,
  user: buildUserPromptV2(params),
});
