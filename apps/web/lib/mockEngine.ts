import type { CheckoutCreateRequest, CheckoutCreateResponse, CheckoutConfirmResponse, FortuneInput, FortuneResult, GetReportResponse, OrderSummary, PreviewSection, ProductCode, ReportDetail, ReportPreview } from "./types";

const priceTable: Record<ProductCode, number> = { standard: 4900, deep: 12900 };
const orders = new Map<string, { order: OrderSummary; input: FortuneInput }>();
const reports = new Map<string, ReportDetail>();

const pick = <T>(arr: readonly T[], seed: number, offset: number): T => arr[(seed + offset) % arr.length] as T;
const hashInput = (input: FortuneInput): number => {
  const s = [input.name.trim().toLowerCase(), input.birthDate, input.birthTime ?? "", input.gender, input.calendarType].join("|");
  let h = 5381;
  for (let i=0;i<s.length;i++) h = (h * 33) ^ s.charCodeAt(i);
  return Math.abs(h) >>> 0;
};

export const isValidFortuneInput = (input: FortuneInput): boolean => {
  if (!input?.name?.trim()) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) return false;
  if (input.birthTime && !/^\d{2}:\d{2}$/.test(input.birthTime)) return false;
  return ["male","female","other"].includes(input.gender) && ["solar","lunar"].includes(input.calendarType);
};

export const generateFortune = (input: FortuneInput): FortuneResult => {
  const seed = hashInput(input);
  const summaries = ["차분한 준비가 성과를 만드는 시점입니다.","관계와 대화에서 실질적 단서를 얻을 확률이 높습니다.","정리와 우선순위 조정이 체감 성과를 높일 가능성이 있습니다.","새 시도보다 기존 계획 완성이 유리한 흐름입니다."] as const;
  const colors = ["blue","green","white","gold","navy"] as const;
  const traits = ["집중력","공감력","실행력","통찰력","성실함","유연함"] as const;
  const cautions = ["감정적 의사결정은 지연하는 편이 안정적입니다.","변동 지출을 먼저 통제하면 리스크가 낮아질 수 있습니다.","수면 리듬 고정이 집중 회복에 유리합니다."] as const;
  return { summary: pick(summaries, seed, 0), luckyColor: pick(colors, seed, 1), luckyNumber: (seed % 9)+1, traits: [pick(traits, seed, 2), pick(traits, seed, 3)], caution: pick(cautions, seed, 4)};
};

const buildSections = (seed:number, keys:string[], locked:boolean): PreviewSection[] => keys.map((k,i)=>({key:k,title:k,text:`${pick(["기존 방식 유지 시 안정성이 높습니다.","검증된 루틴 반복이 효율 개선에 기여합니다.","선택과 집중이 유리할 가능성이 높습니다.","작은 단위 실행 누적이 편차를 줄입니다."],seed,i)} ${pick(["이번 주 핵심 목표 1개를 먼저 완료하세요.","중요 결정은 오전 시간에 배치하세요.","지출은 필요/선택 항목으로 나눠 점검하세요."],seed,i+3)}`,locked}));

export const generatePreview = (input: FortuneInput): ReportPreview => {
  const seed = hashInput(input);
  return {
    seed,
    tone: "expert_probability",
    free: { headline: `${input.name}님의 현재 흐름은 안정적 축적 국면일 가능성이 있습니다.`, summary: "작은 단위 실행 누적이 결과 편차를 줄이는 경향이 있습니다.", sections: buildSections(seed,["과거","현재","가까운 미래"],false)},
    paid: {
      standard: { teaser: "분야별 해석과 실행 우선순위를 제공합니다.", sections: buildSections(seed+9,["일/학업","재정","관계","생활 리듬"],true)},
      deep: { teaser: "심화 리포트에서 90일 시나리오를 제공합니다.", sections: buildSections(seed+17,["의사결정 패턴","3개월 시나리오","리스크 관리","90일 실행 가이드"],true)}
    },
    ctas: [
      { code:"standard", label:"표준 리포트", priceLabel:"₩4,900", description:"핵심 해석 + 분야별 가이드" },
      { code:"deep", label:"심화 리포트", priceLabel:"₩12,900", description:"표준 포함 + 시나리오/90일 실행" }
    ]
  };
};

const unlock = (s: PreviewSection[]) => s.map(x=>({key:x.key,title:x.title,text:x.text}));

const buildReport = (order: OrderSummary, input: FortuneInput): ReportDetail => {
  const p = generatePreview(input);
  const sections = order.productCode === "deep" ? [...p.free.sections, ...p.paid.standard.sections, ...p.paid.deep.sections] : [...p.free.sections, ...p.paid.standard.sections];
  return {
    reportId: `rep_${order.orderId}`,
    orderId: order.orderId,
    productCode: order.productCode,
    generatedAt: new Date().toISOString(),
    headline: `${input.name}님 맞춤 확률 기반 해석 리포트`,
    summary: p.free.summary,
    sections: unlock(sections),
    recommendations: ["결정 전 1회 재검토를 권장합니다.","실행 계획은 주 단위로 기록하세요.","과도한 확신 대신 관찰 가능한 지표를 우선하세요."],
    disclaimer: "본 서비스는 참고 정보입니다. 의료·법률·투자 판단의 단독 근거로 사용하지 마세요."
  };
};

export const createCheckout = (payload: CheckoutCreateRequest): CheckoutCreateResponse => {
  const order: OrderSummary = { orderId: `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`, productCode: payload.productCode, amountKrw: priceTable[payload.productCode], status: "created", createdAt: new Date().toISOString() };
  orders.set(order.orderId, { order, input: payload.input });
  return { order };
};

export const confirmCheckout = (orderId: string): CheckoutConfirmResponse | null => {
  const found = orders.get(orderId); if (!found) return null;
  const updated: OrderSummary = { ...found.order, status: "confirmed", confirmedAt: new Date().toISOString() };
  orders.set(orderId, { ...found, order: updated });
  const report = buildReport(updated, found.input);
  reports.set(orderId, report);
  return { order: updated, report };
};

export const getReport = (orderId: string): GetReportResponse | null => {
  const found = orders.get(orderId); const report = reports.get(orderId);
  if (!found || !report || found.order.status !== "confirmed") return null;
  return { order: found.order, report };
};
