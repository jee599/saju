import Fastify from "fastify";
import cors from "@fastify/cors";
import type { FortuneInput, FortuneResult, ReportPreview, PreviewSection } from "@saju/shared";
import { isValidFortuneInput } from "@saju/shared";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 3001);

await app.register(cors, { origin: true });

app.get("/health", async () => {
  return {
    ok: true,
    service: "api",
    timestamp: new Date().toISOString()
  };
});

const summaries = [
  "차분한 준비가 성과를 만드는 날입니다.",
  "인연과 대화에서 힌트를 얻는 흐름입니다.",
  "정리정돈이 운을 끌어올리는 포인트입니다.",
  "새로운 시작보다 기존 계획 완성이 유리합니다.",
  "속도보다 방향 점검이 중요한 시기입니다."
];
const colors = ["blue", "green", "white", "gold", "navy"];
const traitsPool = ["집중력", "공감력", "실행력", "통찰력", "성실함", "유연함"];
const cautions = [
  "감정적인 결정을 잠시 미루세요.",
  "과한 지출을 주의하세요.",
  "수면 리듬을 우선 관리하세요.",
  "약속 과부하를 피하세요.",
  "비교보다 자기 페이스를 유지하세요."
];

const periodOptions = ["과거", "현재", "가까운 미래"] as const;
const areaOptions = ["일/학업", "재정", "관계", "생활 리듬"] as const;
const insightFragments = [
  "기존 방식 유지 시 안정성이 높습니다.",
  "검증된 루틴을 반복할수록 효율이 올라갈 확률이 큽니다.",
  "의사결정 전 24시간 점검이 실수를 줄일 가능성이 높습니다.",
  "작은 단위 실행을 누적하면 결과 편차가 줄어드는 경향이 있습니다.",
  "과잉 확장보다 선택과 집중이 유리할 가능성이 높습니다."
];
const actionFragments = [
  "이번 주 1개 목표만 우선 완료하세요.",
  "대화가 필요한 이슈를 먼저 정리해 전달하세요.",
  "지출은 필요/선택 항목으로 나눠 점검하세요.",
  "수면 시간을 고정하면 집중력 회복 확률이 높습니다.",
  "중요한 결정은 오전 시간에 배치하세요."
];

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

const pick = <T>(arr: readonly T[] | T[], seed: number, offset: number): T => {
  return arr[(seed + offset) % arr.length] as T;
};

const buildSections = (
  seed: number,
  keys: string[],
  sourceA: readonly string[] | string[],
  sourceB: readonly string[] | string[],
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

const generatePreview = (input: FortuneInput): ReportPreview => {
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
      headline: `${input.name}님의 현재 흐름은 안정적 축적 국면에 가깝습니다.`,
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

app.post<{ Body: FortuneInput }>("/fortune/mock", async (request, reply) => {
  const input = request.body;

  if (!isValidFortuneInput(input)) {
    return reply.status(400).send({ error: "Invalid input" });
  }

  const seed = hashInput(input);
  const result: FortuneResult = {
    summary: pick(summaries, seed, 0),
    luckyColor: pick(colors, seed, 1),
    luckyNumber: (seed % 9) + 1,
    traits: [pick(traitsPool, seed, 2), pick(traitsPool, seed, 3)],
    caution: pick(cautions, seed, 4)
  };

  return result;
});

app.post<{ Body: FortuneInput }>("/report/preview", async (request, reply) => {
  const input = request.body;

  if (!isValidFortuneInput(input)) {
    return reply.status(400).send({ error: "Invalid input" });
  }

  return generatePreview(input);
});

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
