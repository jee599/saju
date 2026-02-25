import Fastify from "fastify";
import cors from "@fastify/cors";
import type {
  ApiErrorPayload,
  ApiSuccessPayload,
  CheckoutConfirmRequest,
  CheckoutConfirmResponse,
  CheckoutCreateRequest,
  CheckoutCreateResponse,
  ComparePaidReportResponse,
  FortuneInput,
  FortuneResult,
  GeneratePaidReportRequest,
  GetReportResponse,
  ModelReportDetail,
  OrderSummary,
  PreviewSection,
  ProductCode,
  ProductCta,
  ReportDetail
} from "../../shared/src/index.ts";

// Server uses a multi-tier preview structure (standard/deep) distinct from
// the web app's single-tier ReportPreview in shared.
type ServerReportPreview = {
  seed: number;
  tone: "expert_probability";
  free: { headline: string; summary: string; sections: PreviewSection[] };
  paid: {
    standard: { teaser: string; sections: PreviewSection[] };
    deep: { teaser: string; sections: PreviewSection[] };
  };
  ctas: ProductCta[];
};
import { callLlm } from "./llm";
import { buildPaidReportPrompt, FIXED_JASI_NOTICE_KO } from "./reportPrompt";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 3001);

await app.register(cors, { origin: true });

const priceTable: Record<"standard" | "deep" | "full", number> = {
  standard: 4900,
  deep: 12900,
  full: 12900
};

type StoredOrder = {
  order: OrderSummary;
  input: FortuneInput;
};

const orders = new Map<string, StoredOrder>();
const reports = new Map<string, ReportDetail>();

const ok = <T>(data: T): ApiSuccessPayload<T> => ({ ok: true, data });
const fail = (code: string, message: string, details?: ApiErrorPayload["error"]["details"]): ApiErrorPayload => ({
  ok: false,
  error: { code, message, details }
});

const isValidFortuneInput = (input: FortuneInput): boolean => {
  if (!input || typeof input !== "object") return false;
  if (!input.name || input.name.trim().length < 1) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) return false;
  if (input.birthTime && !/^\d{2}:\d{2}$/.test(input.birthTime)) return false;
  if (!["male", "female", "other"].includes(input.gender)) return false;
  if (!["solar", "lunar"].includes(input.calendarType)) return false;
  return true;
};

app.get("/health", async () => {
  return {
    ok: true,
    service: "api",
    timestamp: new Date().toISOString()
  };
});

const summaries = [
  "차분한 준비가 성과를 만드는 시점으로 해석됩니다.",
  "관계와 대화에서 실질적 단서를 얻을 확률이 높습니다.",
  "정리와 우선순위 조정이 체감 성과를 높일 가능성이 있습니다.",
  "새 시도보다 기존 계획 완성이 유리한 흐름으로 보입니다.",
  "속도보다 방향 점검이 결과 변동을 줄이는 데 도움 될 수 있습니다."
] as const;
const colors = ["blue", "green", "white", "gold", "navy"] as const;
const traitsPool = ["집중력", "공감력", "실행력", "통찰력", "성실함", "유연함"] as const;
const cautions = [
  "감정적 의사결정은 지연하는 편이 안정적일 수 있습니다.",
  "변동 지출을 먼저 통제하면 리스크가 낮아질 가능성이 있습니다.",
  "수면 리듬을 고정하면 집중 회복 확률이 높아질 수 있습니다.",
  "약속 밀도를 줄이면 피로 누적 위험을 완화할 수 있습니다.",
  "비교보다 자기 페이스 유지가 성과 편차를 줄일 수 있습니다."
] as const;

const periodOptions = ["과거", "현재", "가까운 미래"] as const;
const areaOptions = ["일/학업", "재정", "관계", "생활 리듬"] as const;
const insightFragments = [
  "기존 방식 유지 시 안정성이 높게 관찰됩니다.",
  "검증된 루틴 반복이 효율 개선에 기여할 확률이 큽니다.",
  "의사결정 전 24시간 점검이 실수 감소에 도움 될 수 있습니다.",
  "작은 단위 실행 누적이 결과 편차를 줄이는 경향이 있습니다.",
  "과잉 확장보다 선택과 집중이 유리할 가능성이 높습니다."
] as const;
const actionFragments = [
  "이번 주 핵심 목표 1개를 먼저 완료해 보세요.",
  "대화가 필요한 이슈를 문장으로 정리한 뒤 공유해 보세요.",
  "지출을 필요/선택 항목으로 나눠 점검해 보세요.",
  "수면 시간을 고정하면 집중력 회복에 도움이 될 수 있습니다.",
  "중요 결정을 오전 시간대로 배치해 보세요."
] as const;

const hashInput = (input: FortuneInput): number => {
  const serialized = [
    input.name.trim().toLowerCase(),
    input.birthDate,
    input.birthTime ?? "",
    input.gender,
    input.calendarType
  ].join("|");

  let hash = 5381;
  for (let i = 0; i < serialized.length; i += 1) {
    hash = (hash * 33) ^ serialized.charCodeAt(i);
  }
  return Math.abs(hash) >>> 0;
};

const pick = <T>(arr: readonly T[], seed: number, offset: number): T => {
  return arr[(seed + offset) % arr.length] as T;
};

const buildSections = (
  seed: number,
  keys: string[],
  sourceA: readonly string[],
  sourceB: readonly string[],
  locked: boolean
): PreviewSection[] => {
  return keys.map((key, index) => {
    const first = pick(sourceA, seed, index * 2 + 3);
    const second = pick(sourceB, seed, index * 2 + 4);

    return {
      key,
      title: key,
      text: `${first} ${second}`,
      locked
    };
  });
};

const generatePreview = (input: FortuneInput): ServerReportPreview => {
  const seed = hashInput(input);
  const freeSections = buildSections(seed, [...periodOptions], insightFragments, actionFragments, false);
  const standardSections = buildSections(seed + 9, [...areaOptions], insightFragments, actionFragments, true);
  const deepSections = buildSections(
    seed + 17,
    ["의사결정 패턴", "3개월 시나리오", "리스크 관리", "90일 실행 가이드"],
    insightFragments,
    actionFragments,
    true
  );

  return {
    seed,
    tone: "expert_probability",
    free: {
      headline: `${input.name}님의 현재 흐름은 안정적 축적 국면일 가능성이 있습니다.`,
      summary: `${pick(insightFragments, seed, 1)} ${pick(actionFragments, seed, 2)}`,
      sections: freeSections
    },
    paid: {
      standard: {
        teaser: "분야별 해석과 실행 우선순위를 확인할 수 있습니다.",
        sections: standardSections
      },
      deep: {
        teaser: "심화 리포트에서 90일 시나리오와 대응 전략을 제공합니다.",
        sections: deepSections
      }
    },
    ctas: [
      {
        code: "standard",
        label: "표준 리포트",
        priceLabel: "₩4,900",
        description: "핵심 해석 + 분야별 가이드"
      },
      {
        code: "deep",
        label: "심화 리포트",
        priceLabel: "₩12,900",
        description: "표준 포함 + 시나리오/90일 실행"
      }
    ]
  };
};

const generateFortune = (input: FortuneInput): FortuneResult => {
  const seed = hashInput(input);

  return {
    summary: pick(summaries, seed, 0),
    luckyColor: pick(colors, seed, 1),
    luckyNumber: (seed % 9) + 1,
    traits: [pick(traitsPool, seed, 2), pick(traitsPool, seed, 3)],
    caution: pick(cautions, seed, 4)
  };
};

const makeOrderId = (input: FortuneInput): string => {
  const seed = hashInput(input).toString(36);
  const nonce = Math.random().toString(36).slice(2, 7);
  return `ord_${seed}_${nonce}`;
};

const unlockSections = (sections: PreviewSection[]): Array<{ key: string; title: string; text: string }> => {
  return sections.map((section) => ({
    key: section.key,
    title: section.title,
    text: section.text
  }));
};

const buildReport = (order: OrderSummary, input: FortuneInput): ReportDetail => {
  const preview = generatePreview(input);
  const sections =
    order.productCode === "deep"
      ? [...preview.free.sections, ...preview.paid.standard.sections, ...preview.paid.deep.sections]
      : [...preview.free.sections, ...preview.paid.standard.sections];

  return {
    reportId: `rpt_${order.orderId}`,
    orderId: order.orderId,
    productCode: order.productCode,
    generatedAt: new Date().toISOString(),
    headline: `${input.name}님 맞춤 확률 기반 해석 리포트`,
    summary: preview.free.summary,
    sections: unlockSections(sections),
    recommendations: [
      "결정 전 최소 1회 재검토를 권장합니다.",
      "실행 계획은 주 단위로 나눠 기록하세요.",
      "과도한 확신 대신 관찰 가능한 지표를 우선하세요."
    ],
    disclaimer:
      "본 서비스는 전통 해석과 데이터 패턴을 결합한 참고 정보이며, 의료·법률·투자 판단의 근거로 단독 사용해서는 안 됩니다."
  };
};

app.post<{ Body: FortuneInput }>("/fortune/mock", async (request, reply) => {
  const input = request.body;

  if (!isValidFortuneInput(input)) {
    return reply
      .status(400)
      .send(fail("INVALID_INPUT", "입력값이 유효하지 않습니다."));
  }

  return ok(generateFortune(input));
});

app.post<{ Body: FortuneInput }>("/report/preview", async (request, reply) => {
  const input = request.body;

  if (!isValidFortuneInput(input)) {
    return reply
      .status(400)
      .send(fail("INVALID_INPUT", "입력값이 유효하지 않습니다."));
  }

  return ok(generatePreview(input));
});

app.post<{ Body: CheckoutCreateRequest }>("/checkout/create", async (request, reply) => {
  const body = request.body;

  if (!body || !body.input || !body.productCode) {
    return reply.status(400).send(fail("INVALID_REQUEST", "요청 바디가 누락되었습니다."));
  }

  if (!Object.keys(priceTable).includes(body.productCode)) {
    return reply.status(400).send(fail("INVALID_PRODUCT", "지원하지 않는 상품 코드입니다."));
  }

  if (!isValidFortuneInput(body.input)) {
    return reply.status(400).send(fail("INVALID_INPUT", "입력값이 유효하지 않습니다."));
  }

  const order: OrderSummary = {
    orderId: makeOrderId(body.input),
    productCode: body.productCode,
    amountKrw: priceTable[body.productCode],
    status: "created",
    createdAt: new Date().toISOString()
  };

  orders.set(order.orderId, { order, input: body.input });

  return ok<CheckoutCreateResponse>({ order });
});

app.post<{ Body: CheckoutConfirmRequest }>("/checkout/confirm", async (request, reply) => {
  const body = request.body;

  if (!body || !body.orderId) {
    return reply.status(400).send(fail("INVALID_REQUEST", "orderId가 필요합니다."));
  }

  const stored = orders.get(body.orderId);
  if (!stored) {
    return reply.status(404).send(fail("ORDER_NOT_FOUND", "주문 정보를 찾을 수 없습니다."));
  }

  if (stored.order.status === "confirmed") {
    const report = reports.get(stored.order.orderId);
    if (!report) {
      return reply.status(500).send(fail("REPORT_MISSING", "확정 주문 리포트가 없습니다."));
    }
    return ok<CheckoutConfirmResponse>({ order: stored.order, report });
  }

  const confirmedOrder: OrderSummary = {
    ...stored.order,
    status: "confirmed",
    confirmedAt: new Date().toISOString()
  };
  const report = buildReport(confirmedOrder, stored.input);

  orders.set(body.orderId, { ...stored, order: confirmedOrder });
  reports.set(body.orderId, report);

  return ok<CheckoutConfirmResponse>({ order: confirmedOrder, report });
});

app.get<{ Params: { orderId: string } }>("/report/:orderId", async (request, reply) => {
  const { orderId } = request.params;
  const stored = orders.get(orderId);

  if (!stored) {
    return reply.status(404).send(fail("ORDER_NOT_FOUND", "주문 정보를 찾을 수 없습니다."));
  }

  if (stored.order.status !== "confirmed") {
    return reply.status(403).send(fail("PAYMENT_REQUIRED", "결제 확정 후 리포트를 조회할 수 있습니다."));
  }

  const report = reports.get(orderId);
  if (!report) {
    return reply.status(500).send(fail("REPORT_MISSING", "리포트 생성 상태를 확인해 주세요."));
  }

  return ok<GetReportResponse>({ order: stored.order, report });
});

const safeJsonParse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    // Some models may accidentally wrap with code fences; try a minimal salvage.
    const trimmed = text.trim();
    const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenceMatch?.[1]) {
      return JSON.parse(fenceMatch[1]);
    }
    throw new Error("JSON_PARSE_FAILED");
  }
};

const normalizeToReportDetail = (params: {
  orderId: string;
  productCode: ProductCode;
  generatedAt: string;
  json: any;
}): ReportDetail => {
  const { orderId, productCode, generatedAt, json } = params;

  if (!json || typeof json !== "object") {
    throw new Error("INVALID_REPORT_JSON");
  }

  const headline = typeof json.headline === "string" ? json.headline : "맞춤 해석 리포트";
  const summary = typeof json.summary === "string" ? json.summary : "";
  const sections = Array.isArray(json.sections) ? json.sections : [];
  const recommendations = Array.isArray(json.recommendations) ? json.recommendations : [];
  const disclaimer = typeof json.disclaimer === "string" ? json.disclaimer : "";

  return {
    reportId: `rpt_${orderId}`,
    orderId,
    productCode,
    generatedAt,
    headline,
    summary,
    sections: sections
      .filter((s: any) => s && typeof s === "object")
      .map((s: any) => ({
        key: String(s.key ?? "section"),
        title: String(s.title ?? s.key ?? "섹션"),
        text: String(s.text ?? "")
      })),
    recommendations: recommendations.map((r: any) => String(r)),
    disclaimer
  };
};

// Paid report compare endpoint (Claude vs GPT) for QA / tuning.
app.post<{ Body: GeneratePaidReportRequest }>("/report/compare", async (request, reply) => {
  const body = request.body;
  if (!body || !body.input || !body.productCode) {
    return reply.status(400).send(fail("INVALID_REQUEST", "요청 바디가 누락되었습니다."));
  }

  if (!Object.keys(priceTable).includes(body.productCode)) {
    return reply.status(400).send(fail("INVALID_PRODUCT", "지원하지 않는 상품 코드입니다."));
  }

  if (!isValidFortuneInput(body.input)) {
    return reply.status(400).send(fail("INVALID_INPUT", "입력값이 유효하지 않습니다."));
  }

  const { system, user } = buildPaidReportPrompt({ input: body.input, productCode: body.productCode });

  const maxTokens = body.productCode === "deep" ? 6000 : 3500;
  const generatedAt = new Date().toISOString();
  const orderId = makeOrderId(body.input);

  try {
    const [gptRes, claudeRes] = await Promise.all([
      callLlm({ model: "gpt", system, user, maxTokens, temperature: 0.7 }),
      callLlm({ model: "claude", system, user, maxTokens, temperature: 0.7 })
    ]);

    const gptJson = safeJsonParse(gptRes.text);
    const claudeJson = safeJsonParse(claudeRes.text);

    const gptReport: ModelReportDetail = {
      ...normalizeToReportDetail({ orderId, productCode: body.productCode, generatedAt, json: gptJson }),
      model: "gpt",
      usage: gptRes.usage
    };

    const claudeReport: ModelReportDetail = {
      ...normalizeToReportDetail({ orderId, productCode: body.productCode, generatedAt, json: claudeJson }),
      model: "claude",
      usage: claudeRes.usage
    };

    const payload: ComparePaidReportResponse = {
      productCode: body.productCode,
      gpt: gptReport,
      claude: claudeReport,
      notes: {
        costWarning:
          "심화(15k급) 장문 생성은 토큰 사용량이 커서 모델 비용이 증가합니다. 재생성/추가질문을 막으면 비용 폭발을 크게 줄일 수 있습니다.",
        fixedJasiNotice: FIXED_JASI_NOTICE_KO
      }
    };

    return ok(payload);
  } catch (err: any) {
    request.log.error({ err }, "report_compare_failed");
    return reply
      .status(500)
      .send(fail("REPORT_GENERATION_FAILED", "리포트 생성에 실패했습니다.", [{ field: "report", reason: String(err?.message ?? err) }]));
  }
});

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
