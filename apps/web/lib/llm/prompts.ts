/**
 * Prompt templates and builders for LLM report generation
 */
import type { FortuneInput, ProductCode } from "../types";
import { getCountryByLocale } from "@saju/shared";
import { Lunar } from "lunar-typescript";

/**
 * Convert lunar birth date to solar if calendarType is "lunar".
 * Returns a new FortuneInput with the solar date; calendarType stays "lunar" for context.
 */
export const convertLunarInputToSolar = (input: FortuneInput): FortuneInput => {
  if (input.calendarType !== "lunar") return input;
  try {
    const parts = input.birthDate.split("-").map(Number);
    const y = parts[0] ?? 2000;
    const m = parts[1] ?? 1;
    const d = parts[2] ?? 1;
    const solar = Lunar.fromYmd(y, m, d).getSolar();
    const solarDate = `${solar.getYear()}-${String(solar.getMonth()).padStart(2, "0")}-${String(solar.getDay()).padStart(2, "0")}`;
    return { ...input, birthDate: solarDate };
  } catch (err) {
    console.warn("[llm] lunar-to-solar conversion failed, using original date:", err);
    return input;
  }
};

/**
 * Sanitize user name for safe embedding in LLM prompts.
 */
export const sanitizeName = (name: string): string => {
  const cleaned = name.replace(
    /[^\p{Script=Hangul}\p{Script=Han}\p{Script=Latin}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\s.\-]/gu,
    ''
  );
  return cleaned.trim().slice(0, 50);
};

/** Create a sanitized copy of FortuneInput for use in prompts */
export const sanitizeInputForPrompt = (input: FortuneInput): FortuneInput => ({
  ...input,
  name: sanitizeName(input.name),
});

export const FIXED_JASI_NOTICE_KO =
  "※ 자시(23:00~01:00) 해석은 lunar-javascript 기본 규칙(초자시 기준)을 따릅니다. 전통/학파에 따라 초·후자시 기준이 다를 수 있으며, 본 리포트는 참고용입니다.";

// ── Locale-aware section definitions ──────────────────────

/** Personality section key/title per locale */
export const getPersonalityDef = (locale: string) =>
  locale === "ko"
    ? { key: "성격", title: "성격" }
    : { key: "personality", title: "Personality" };

/** Korean section chunks */
const SECTION_CHUNKS_KO: Array<Array<{ key: string; title: string }>> = [
  [{ key: "직업", title: "직업" }, { key: "연애·가족·배우자", title: "연애·가족·배우자" }],
  [{ key: "금전", title: "금전" }, { key: "건강", title: "건강" }],
  [{ key: "과거", title: "과거" }, { key: "현재", title: "현재" }],
  [{ key: "미래", title: "미래" }, { key: "대운 타임라인", title: "대운 타임라인" }],
];

/** International section chunks (English keys) */
const SECTION_CHUNKS_INTL: Array<Array<{ key: string; title: string }>> = [
  [{ key: "career", title: "Career" }, { key: "love_family", title: "Love & Family" }],
  [{ key: "finance", title: "Finance" }, { key: "health", title: "Health" }],
  [{ key: "past", title: "Past" }, { key: "present", title: "Present" }],
  [{ key: "future", title: "Future" }, { key: "fortune_timeline", title: "Life Timeline" }],
];

export const getSectionChunks = (locale: string) =>
  locale === "ko" ? SECTION_CHUNKS_KO : SECTION_CHUNKS_INTL;

/** Per-locale disclaimers */
const DISCLAIMERS: Record<string, string> = {
  ko: "본 서비스는 참고용 해석 정보이며, 의료·법률·투자 판단의 단독 근거로 사용할 수 없습니다.",
  ja: "本サービスは参考情報であり、医療・法律・投資判断の唯一の根拠として使用することはできません。",
  zh: "本服务仅供参考，不能作为医疗、法律或投资决策的唯一依据。",
  th: "บริการนี้เป็นข้อมูลอ้างอิงเท่านั้น ไม่สามารถใช้เป็นหลักฐานเดียวในการตัดสินใจทางการแพทย์ กฎหมาย หรือการลงทุน",
  vi: "Dịch vụ này chỉ mang tính tham khảo, không thể dùng làm căn cứ duy nhất cho quyết định y tế, pháp lý hoặc đầu tư.",
  id: "Layanan ini hanya untuk referensi dan tidak dapat digunakan sebagai dasar tunggal untuk keputusan medis, hukum, atau investasi.",
  en: "This service is for reference only and should not be used as the sole basis for medical, legal, or investment decisions.",
  hi: "यह सेवा केवल संदर्भ के लिए है और पेशेवर परामर्श का विकल्प नहीं है। महत्वपूर्ण निर्णयों के लिए कृपया विशेषज्ञ से संपर्क करें।",
};

const getDisclaimer = (locale: string) => DISCLAIMERS[locale] ?? DISCLAIMERS.en!;

/** Language map for i18n prompts */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", ja: "Japanese (日本語)", zh: "Simplified Chinese (简体中文)",
  th: "Thai (ภาษาไทย)", vi: "Vietnamese (tiếng Việt)",
  id: "Indonesian (Bahasa Indonesia)", hi: "English (for Hindi-speaking Indian audience)",
};

/** International system prompt with cultural context */
export const getI18nSystemPrompt = (locale: string, country: import("@saju/shared").CountryConfig) => {
  const targetLang = LANGUAGE_NAMES[locale] ?? "English";
  const ctx = country.culturalContext;
  return (
    `You are a world-class K-Saju (Korean Four Pillars) destiny reading expert and life counselor with over 20 years of experience.\n\n` +
    `## Cultural Framework\n` +
    `- ${ctx.framework}\n` +
    `- Terminology: ${ctx.terminology}\n` +
    `- Advice style: ${ctx.culturalTips}\n` +
    `- Sensitivities: ${ctx.sensitivities}\n\n` +
    `## Language & Writing Style\n` +
    `- Write ALL output in ${targetLang}.\n` +
    `- Tone: ${country.llmTone}\n` +
    `- ${ctx.writingStyle}\n` +
    `- CRITICAL: Write as a NATIVE ${targetLang} speaker. Do NOT translate from English or any other language. Use natural ${targetLang} expressions, idioms, proverbs, and sentence structures that feel authentic to a native reader.\n\n` +
    `## Core Principles\n` +
    `1. **Plain language**: Never use raw Four Pillars jargon (Day Master, Heavenly Stems, Earthly Branches, etc.) directly. Use nature metaphors (water, fire, wood, earth, metal) to explain concepts.\n` +
    `2. **Specific descriptions**: Use vivid metaphors, concrete situational examples, and actionable life tips.\n` +
    `3. **Personalized**: Address the person by name in a warm 1-on-1 counseling tone.\n` +
    `4. **Balanced perspective**: Praise strengths specifically, present cautions with positive alternatives.\n` +
    `5. **Practical advice**: Include 2-3 actionable tips at the end of each section.\n` +
    `6. **No absolutes**: Avoid medical/legal/investment assertions, fear-mongering, or excessive certainty.\n` +
    `7. **Output format**: Output ONLY valid JSON (no markdown, no extra text).`
  );
};

/** Korean section prompts (실시간 연도 반영) */
const getSectionPromptsKo = (): Record<string, string> => {
  const now = new Date();
  const year = now.getFullYear();
  const nextYear = year + 1;
  const month = now.getMonth() + 1;
  return {
    "성격": "타고난 성격적 특성, 강점과 약점, 대인관계 스타일, 감정 표현 방식, 스트레스 대처 패턴. 주변 사람들이 느끼는 첫인상과 깊이 알게 된 후의 인상 차이.",
    "직업": "적합한 직업군, 일하는 스타일, 리더십/팔로워십 특성, 직장에서의 강점과 주의점. 추천 업종/직종 3~5가지와 이유. 사업 적합성.",
    "연애·가족·배우자": "연애 스타일, 사랑 표현 방식, 이상형, 연애 패턴. 가족 관계 특성, 부모님 관계 패턴, 배우자운, 결혼생활 특성, 자녀운. 갈등 해소법과 관계 개선 팁.",
    "금전": "재물운 흐름, 돈 대하는 태도, 소비 패턴, 저축/투자 성향. 재물 유입 경로(월급형/사업형/투자형)와 돈 새는 포인트.",
    "건강": "체질적 특성, 주의할 건강 영역, 스트레스가 몸에 나타나는 방식, 계절별 관리 팁. 좋은 운동/음식/생활습관.",
    "과거": "지나온 시기 해석: 어린 시절, 학창 시절, 20대 도전과 성장, 큰 전환점들을 시기별로.",
    "현재": `${year}~${nextYear}년 운의 흐름. 지금은 ${year}년 ${month}월입니다. 올해 핵심 키워드 3가지, 주의할 시기, 기회 시기, 이번 달부터 실천할 행동 3가지.`,
    "미래": `${year}년 기준 앞으로 3~5년(${year+1}~${year+5}년) 전망: 커리어/재물/인간관계 변화 흐름, 큰 기회 시기와 준비 사항.`,
    "대운 타임라인": "10년 단위 대운 흐름: 10대~80대 각 시기 핵심 테마, 특징, 주의사항, 인생 조언.",
  };
};

/** Per-locale cultural additions to section guides */
const SECTION_CULTURAL_ADDITIONS: Record<string, Partial<Record<string, string>>> = {
  en: {
    career: "Consider American work culture: career pivots, entrepreneurship, side hustles, work-life balance, remote work trends.",
    love_family: "Frame relationship advice in modern dating context: communication styles, attachment theory, boundary-setting.",
    health: "Include wellness trends: mindfulness, therapy, fitness routines, nutrition science.",
  },
  ja: {
    career: "日本の職場文化を考慮：終身雇用の変化、転職トレンド、ワークライフバランス、副業、フリーランス。",
    love_family: "日本の結婚観：晩婚化、パートナーシップの多様化、義実家関係、共働きの課題。",
    health: "季節の変わり目の体調管理、温泉・入浴文化、和食の養生法。",
    finance: "日本の金融環境：NISA、iDeCo、円安の影響、老後資金2000万円問題。",
  },
  zh: {
    career: "考虑中国职场文化：体制内vs体制外、创业浪潮、副业经济、35岁焦虑。",
    love_family: "中国婚恋观：彩礼/嫁妆文化、房产问题、催婚压力、婆媳关系。",
    finance: "中国理财环境：房产投资、基金股票、创业机会、存款习惯。",
    health: "中医养生建议：食疗、穴位按摩、四季养生、体质调理。",
  },
  th: {
    career: "อาชีพในบริบทไทย：ธุรกิจส่วนตัว/ค้าขาย、ราชการ、สตาร์ทอัพ、อาชีพอิสระ",
    love_family: "วัฒนธรรมครอบครัวไทย：ความกตัญญู、การดูแลพ่อแม่、สินสอด、ความเชื่อเรื่องวันแต่งงาน",
    health: "สุขภาพแบบไทย：สมุนไพรไทย、นวดแผนโบราณ、อาหารตามธาตุ",
    finance: "การเงินในบริบทไทย：ทอง/ที่ดิน、ธุรกิจ SME、กองทุนรวม、หวย/โชคลาภ",
  },
  vi: {
    career: "Bối cảnh nghề nghiệp Việt Nam：kinh doanh gia đình、công chức、startup、xuất khẩu lao động。",
    love_family: "Văn hóa gia đình Việt：thờ cúng tổ tiên、hiếu thảo、sính lễ、mẹ chồng-nàng dâu。",
    health: "Y học cổ truyền Việt：thuốc nam、châm cứu、dưỡng sinh theo mùa。",
    finance: "Tài chính Việt Nam：vàng、bất động sản、gửi tiết kiệm、buôn bán nhỏ。",
  },
  id: {
    career: "Konteks karir Indonesia: bisnis keluarga, PNS/ASN, startup, UMKM, kerja di luar negeri.",
    love_family: "Budaya keluarga Indonesia: restu orang tua, mas kawin/mahar, keharmonisan keluarga besar.",
    health: "Kesehatan khas Indonesia: jamu tradisional, pijat refleksi, makanan sehat Nusantara.",
    finance: "Keuangan Indonesia: emas/properti, reksadana, usaha sampingan, arisan.",
  },
  hi: {
    career: "Indian career context: family business, IT/engineering preference, government jobs (sarkari naukri), startup ecosystem, NRI opportunities.",
    love_family: "Indian family dynamics: arranged vs love marriage, joint family system, in-law relationships, dowry sensitivity, family honour.",
    health: "Ayurvedic wellness: dosha balance, yoga, pranayama, seasonal diet (ritucharya), gemstone therapy.",
    finance: "Indian financial context: gold investment, real estate, FDs, SIPs/mutual funds, family financial obligations.",
  },
};

/** International section prompts with cultural additions */
const getSectionPromptsIntl = (locale: string): Record<string, string> => {
  const now = new Date();
  const year = now.getFullYear();
  const nextYear = year + 1;
  const month = now.getMonth() + 1;
  const base: Record<string, string> = {
    "career": "Suitable career paths, work style, leadership qualities, strengths and cautions at work. 3-5 recommended industries/roles with reasons. Business aptitude.",
    "love_family": "Dating style, love language, ideal partner traits. Family dynamics, parent relationships, spouse fortune, marriage characteristics, children fortune. Conflict resolution tips.",
    "finance": "Wealth flow patterns, attitude toward money, spending habits, savings/investment tendencies. Income channels and financial blind spots.",
    "health": "Constitutional traits, health areas requiring attention, how stress manifests physically, seasonal care tips. Recommended exercises, foods, and habits.",
    "past": "Interpretation of past periods: childhood, school years, twenties challenges and growth, major turning points.",
    "present": `${year}-${nextYear} fortune flow. Current date: ${year}/${month}. Three key themes for this year, cautious periods, opportunity windows, 3 actions to start this month.`,
    "future": `From ${year}, 3-5 year outlook (${year+1}-${year+5}): career/wealth/relationship trajectory, major opportunities and preparation.`,
    "fortune_timeline": "Decade-by-decade life fortune flow: core theme, characteristics, cautions, and advice from teens through eighties.",
  };

  const additions = SECTION_CULTURAL_ADDITIONS[locale];
  if (additions) {
    for (const [key, addition] of Object.entries(additions)) {
      if (base[key] && addition) {
        base[key] += `\n\nCultural context: ${addition}`;
      }
    }
  }
  return base;
};

/** Get section prompts based on locale */
export const getSectionPromptsForLocale = (locale: string) =>
  locale === "ko" ? getSectionPromptsKo() : getSectionPromptsIntl(locale);

/** Get report fallback texts */
export const getReportTexts = (locale: string, name: string, sectionCount: number) => ({
  headline: locale === "ko"
    ? `${name}님 사주 분석 리포트`
    : `${name}'s K-Saju Analysis Report`,
  summary: locale === "ko"
    ? `${sectionCount}개 섹션 분석 완료`
    : `${sectionCount} section analysis complete`,
  disclaimer: getDisclaimer(locale),
});

export const buildPaidReportPrompt = (params: { input: FortuneInput; productCode: ProductCode; charTarget?: number }) => {
  const { productCode } = params;
  const input = sanitizeInputForPrompt(convertLunarInputToSolar(params.input));
  const charTarget = params.charTarget ?? 20000;

  const lengthGuide =
    `유료 기준으로 최대한 길고 상세하게 작성하세요. 목표: 약 ${charTarget.toLocaleString()}자(±15%) 수준의 한국어 장문. ` +
    `각 섹션마다 최소 ${Math.round(charTarget / 10 / 100) * 100}자 이상 작성하세요.`;

  const system =
    "당신은 한국 최고의 사주명리학자이자 인생 상담 전문가입니다. 20년 이상의 상담 경험을 바탕으로, 사주팔자를 깊이 분석하여 의뢰인에게 실질적으로 도움이 되는 따뜻하고 통찰력 있는 리포트를 작성합니다.\n\n" +
    "## 핵심 작성 원칙\n" +
    "1. **일상 언어 사용**: 사주 전문용어(일간, 천간, 지지, 비견, 식신, 정관, 편인 등)를 절대 그대로 쓰지 마세요.\n" +
    "   - BAD: '일간이 기토이고 월간에 경금이 있어 식신생재의 구조입니다'\n" +
    "   - GOOD: '당신은 타고나길 따뜻하고 포용력 있는 성품을 지녔어요. 마치 비옥한 땅처럼 주변 사람들에게 안정감을 주는 존재랍니다. 여기에 창의적인 재능까지 겸비하고 있어서, 아이디어를 현실로 만들어내는 능력이 뛰어나요.'\n" +
    "2. **구체적 묘사**: 추상적 표현 대신 생생한 비유, 구체적 상황 예시, 실제 행동 팁을 제시하세요.\n" +
    "   - BAD: '대인관계가 좋습니다'\n" +
    "   - GOOD: '처음 만난 사람과도 금방 친해지는 타입이에요. 회식 자리에서 분위기를 띄우는 역할을 자주 맡게 되고, 친구들 사이에서 \"너는 누구랑이든 잘 지내더라\"는 말을 들을 수 있어요.'\n" +
    "3. **개인화된 서술**: 이름을 직접 호명하며, '당신'이라는 표현으로 1:1 상담처럼 작성하세요.\n" +
    "4. **균형 잡힌 시각**: 장점은 구체적으로 칭찬하고, 주의할 점은 긍정적 대안과 함께 제시하세요.\n" +
    "5. **실용적 조언**: 각 섹션마다 \"이렇게 해보세요\"라는 실생활 행동 팁을 2~3가지 포함하세요.\n" +
    "6. **문체**: 존댓말, 따뜻하고 친근한 톤. 친한 언니/오빠가 인생 상담해주듯이.\n" +
    "- 금지: 의료/법률/투자 단정, 공포 조장, 과도한 확신, 한자 남발\n" +
    "- 출력 형식: 반드시 JSON 하나만 출력 (추가 텍스트/마크다운 금지)";

  const user =
    `다음 사용자의 사주를 깊이 분석하여 프리미엄 유료 리포트를 작성해 주세요.\n\n` +
    `사용자 정보: ${JSON.stringify(input)}\n` +
    `상품: ${productCode}\n\n` +
    `${FIXED_JASI_NOTICE_KO}\n\n` +
    `${lengthGuide}\n\n` +
    "반드시 아래 JSON 스키마로만 출력하세요.\n" +
    "{\n" +
    '  "headline": string,  // 이 사람의 사주를 한 문장으로 요약한 매력적인 헤드라인 (예: "따뜻한 대지처럼 사람을 품고, 단단한 책임감으로 빛나는 OO님의 인생 여정")\n' +
    '  "summary": string,  // 전체 리포트의 핵심을 3~4줄로 요약\n' +
    '  "sections": [\n' +
    '    {"key":"성격","title":"성격","text":string},  // 타고난 성격, 장단점, 대인관계 스타일, 스트레스 대처법\n' +
    '    {"key":"직업","title":"직업","text":string},  // 적성, 추천 직종/업종, 직장생활 팁, 사업 적합성\n' +
    '    {"key":"연애·가족·배우자","title":"연애·가족·배우자","text":string},  // 연애 스타일, 이상형, 가족 관계, 배우자운, 결혼생활, 부모/자녀 관계\n' +
    '    {"key":"금전","title":"금전","text":string},  // 재물운 흐름, 돈 관리 스타일, 투자 성향, 재테크 팁\n' +
    '    {"key":"건강","title":"건강","text":string},  // 체질적 특성, 주의할 건강 영역, 건강 관리 팁, 스트레스 해소법\n' +
    '    {"key":"과거","title":"과거","text":string},  // 지나온 시기 해석 (어린 시절~현재까지 시기별 특성)\n' +
    `    {"key":"현재","title":"현재","text":string},  // ${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 기준 현재 운의 흐름, 올해 주요 키워드, 당장 실천할 것\n` +
    `    {"key":"미래","title":"미래","text":string},  // ${new Date().getFullYear()}년 기준 앞으로 3~5년 전망, 기회의 시기, 준비해야 할 것\n` +
    '    {"key":"대운 타임라인","title":"대운 타임라인","text":string}  // 10년 단위 인생 흐름, 각 시기별 핵심 테마와 조언\n' +
    "  ],\n" +
    '  "recommendations": string[],  // 5~8개의 구체적 실천 체크리스트\n' +
    '  "disclaimer": string\n' +
    "}\n\n" +
    "## 섹션별 작성 가이드\n" +
    "- 각 섹션은 최소 8~15문장 이상, 여러 문단으로 나눠서 작성하세요.\n" +
    "- 첫 문장은 그 섹션의 핵심을 담은 인상적인 문장으로 시작하세요.\n" +
    "- 사주의 기운을 자연물(물, 불, 나무, 땅, 금속)에 비유하여 쉽게 설명하세요.\n" +
    "- 구체적인 상황 예시를 들어 '아, 나 그래!' 하고 공감하게 만드세요.\n" +
    "- 각 섹션 끝에 실천 가능한 구체적 행동 팁 2~3개를 포함하세요.\n" +
    "- '~할 수 있어요', '~하는 편이에요' 같은 부드러운 표현을 사용하세요.\n" +
    "- 중복 문장/상투어를 줄이고, 읽는 사람이 자기 이야기처럼 느끼도록 작성하세요.\n" +
    "- 모든 섹션의 text는 반드시 한국어 " + Math.round(charTarget / 9) + "자 이상이어야 합니다.\n";

  return { system, user };
};
