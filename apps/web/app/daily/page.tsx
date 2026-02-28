"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { calculateFourPillars, ELEMENT_KR, ELEMENT_EMOJI } from "@saju/engine-saju";
import type { Element } from "@saju/engine-saju";

// 오행 상성 관계
const ELEMENT_RELATIONS: Record<Element, { generates: Element; overcomes: Element; generatedBy: Element; overcomeBy: Element }> = {
  wood: { generates: "fire", overcomes: "earth", generatedBy: "water", overcomeBy: "metal" },
  fire: { generates: "earth", overcomes: "metal", generatedBy: "wood", overcomeBy: "water" },
  earth: { generates: "metal", overcomes: "water", generatedBy: "fire", overcomeBy: "wood" },
  metal: { generates: "water", overcomes: "wood", generatedBy: "earth", overcomeBy: "fire" },
  water: { generates: "wood", overcomes: "fire", generatedBy: "metal", overcomeBy: "earth" },
};

// 일간 운세 메시지 생성 (LLM 없이 규칙 기반)
function generateDailyFortune(dayMaster: Element, todayElement: Element, todayDate: string) {
  const rel = ELEMENT_RELATIONS[dayMaster];
  const dayOfWeek = new Date(todayDate).getDay();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  let fortune = "";
  let luck = 0; // -2 ~ +2
  let advice = "";
  let luckyColor = "";
  let luckyDirection = "";

  if (todayElement === dayMaster) {
    fortune = `오늘은 ${ELEMENT_KR[dayMaster]}의 기운이 배가되는 날입니다. 자신의 본질에 충실하면 좋은 결과를 얻을 수 있어요.`;
    luck = 1;
    advice = "자신감을 가지고 주도적으로 행동하세요.";
  } else if (todayElement === rel.generates) {
    fortune = `오늘 ${ELEMENT_KR[todayElement]}의 기운은 당신의 ${ELEMENT_KR[dayMaster]}에서 비롯됩니다. 창의적인 에너지가 넘치는 하루예요.`;
    luck = 1;
    advice = "새로운 아이디어를 실행에 옮기기 좋은 날입니다.";
  } else if (todayElement === rel.generatedBy) {
    fortune = `${ELEMENT_KR[todayElement]}의 기운이 당신의 ${ELEMENT_KR[dayMaster]}을 도와주는 날입니다. 주변의 도움을 적극적으로 받아보세요.`;
    luck = 2;
    advice = "협력과 소통이 행운의 열쇠입니다.";
  } else if (todayElement === rel.overcomes) {
    fortune = `당신의 ${ELEMENT_KR[dayMaster]} 기운이 오늘의 ${ELEMENT_KR[todayElement]}을 제어합니다. 리더십을 발휘하기 좋은 날이에요.`;
    luck = 1;
    advice = "적극적으로 나서면 상황을 유리하게 이끌 수 있어요.";
  } else if (todayElement === rel.overcomeBy) {
    fortune = `오늘의 ${ELEMENT_KR[todayElement]} 기운이 강하니 무리하지 마세요. 내면의 힘을 기르는 데 집중하면 좋겠어요.`;
    luck = -1;
    advice = "조급함보다는 차분한 준비가 필요한 날입니다.";
  }

  // Lucky color based on generating element
  const luckyElement = rel.generatedBy;
  const colorMap: Record<Element, string> = { wood: "초록색", fire: "빨간색", earth: "노란색", metal: "흰색/은색", water: "파란색/검정색" };
  const directionMap: Record<Element, string> = { wood: "동쪽", fire: "남쪽", earth: "중앙", metal: "서쪽", water: "북쪽" };
  luckyColor = colorMap[luckyElement];
  luckyDirection = directionMap[luckyElement];

  // Add day-specific nuance
  const dayMessages = [
    "일요일, 휴식하며 에너지를 충전하세요.",
    "월요일, 새로운 시작의 기운이 있습니다.",
    "화요일, 열정적으로 움직이기 좋은 날입니다.",
    "수요일, 중간 점검으로 방향을 잡으세요.",
    "목요일, 성장과 확장의 기운이 감지됩니다.",
    "금요일, 결실을 맺기 좋은 시간입니다.",
    "토요일, 안정과 조화를 추구하세요.",
  ];

  return { fortune, luck, advice, luckyColor, luckyDirection, dayMessage: dayMessages[dayOfWeek], weekday: weekdays[dayOfWeek] };
}

function DailyContent() {
  const params = useSearchParams();
  const router = useRouter();
  const name = params.get("name") ?? "";
  const birthDate = params.get("birthDate") ?? "";
  const birthTime = params.get("birthTime");

  const [inputName, setInputName] = useState(name);
  const [inputDate, setInputDate] = useState(birthDate);
  const [showResult, setShowResult] = useState(!!birthDate);

  const todayStr = new Date().toISOString().split("T")[0];

  const result = useMemo(() => {
    if (!inputDate || !showResult) return null;
    const parts = inputDate.split("-").map(Number);
    const y = parts[0] ?? 2000, m = parts[1] ?? 1, d = parts[2] ?? 1;
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

    const hour = birthTime ? parseInt(birthTime.split(":")[0], 10) : 12;
    const userPillars = calculateFourPillars({ year: y, month: m, day: d, hour: isNaN(hour) ? 12 : hour, minute: 0 });

    // Today's pillars
    const today = new Date();
    const todayPillars = calculateFourPillars({ year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate(), hour: today.getHours(), minute: 0 });

    const dayMaster = userPillars.elements.dayMaster;
    const todayElement = todayPillars.elements.dayMaster;
    const daily = generateDailyFortune(dayMaster, todayElement, todayStr);

    return { dayMaster, todayElement, ...daily };
  }, [inputDate, birthTime, showResult, todayStr]);

  const handleSubmit = () => {
    if (inputDate) setShowResult(true);
  };

  const luckStars = (luck: number) => {
    const total = luck + 3; // -2~+2 → 1~5
    return "★".repeat(Math.max(1, Math.min(5, total))) + "☆".repeat(5 - Math.max(1, Math.min(5, total)));
  };

  return (
    <main className="page">
      <div className="container">
        <section className="glassCard" style={{ textAlign: "center" }}>
          <p className="heroEyebrow" style={{ color: "var(--accent-gold)" }}>매일 무료</p>
          <h1 style={{ fontSize: "1.5rem" }}>오늘의 운세</h1>
          <p className="muted" style={{ marginTop: 4 }}>{todayStr} · 당신의 사주로 보는 오늘</p>
        </section>

        {!showResult ? (
          <section className="glassCard" style={{ marginTop: 16 }}>
            <h3>생년월일을 입력하세요</h3>
            <div className="form" style={{ maxWidth: 360, margin: "16px auto 0" }}>
              <div className="formGroup">
                <label>이름</label>
                <input type="text" className="input" placeholder="홍길동" value={inputName} onChange={(e) => setInputName(e.target.value)} />
              </div>
              <div className="formGroup">
                <label>생년월일</label>
                <input type="date" className="input" value={inputDate} onChange={(e) => setInputDate(e.target.value)} min="1930-01-01" max="2010-12-31" />
              </div>
              <button className="btn btn-primary btn-lg btn-full" onClick={handleSubmit} disabled={!inputDate}>
                오늘의 운세 보기
              </button>
            </div>
          </section>
        ) : result ? (
          <>
            <section className={`glassCard dayMasterCard ${result.dayMaster}`} style={{ marginTop: 16, textAlign: "center" }}>
              <div className="dayMasterEmoji" style={{ fontSize: "2.5rem" }}>{ELEMENT_EMOJI[result.dayMaster]}</div>
              <h2 style={{ color: `var(--element-${result.dayMaster})`, fontSize: "1.2rem", marginTop: 8 }}>
                {inputName || "회원"}님의 오늘
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--t2)", marginTop: 4 }}>
                오늘의 기운: {ELEMENT_EMOJI[result.todayElement]} {ELEMENT_KR[result.todayElement]}
              </p>
            </section>

            <section className="glassCard" style={{ marginTop: 12 }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <p style={{ fontSize: "1.3rem", letterSpacing: 4, color: "var(--accent-gold)" }}>
                  {luckStars(result.luck)}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--t2)", marginTop: 4 }}>{result.weekday}요일 운세</p>
              </div>

              <p style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--t1)" }}>{result.fortune}</p>

              <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(196,139,159,0.08)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent)" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent)" }}>오늘의 조언</p>
                <p style={{ fontSize: "0.9rem", color: "var(--t1)", marginTop: 4 }}>{result.advice}</p>
              </div>

              <p style={{ fontSize: "0.8rem", color: "var(--t2)", marginTop: 12 }}>{result.dayMessage}</p>

              <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, padding: "10px 12px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", textAlign: "center", minWidth: 120 }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--t2)" }}>행운의 색</p>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--t1)", marginTop: 2 }}>{result.luckyColor}</p>
                </div>
                <div style={{ flex: 1, padding: "10px 12px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", textAlign: "center", minWidth: 120 }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--t2)" }}>행운의 방향</p>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--t1)", marginTop: 2 }}>{result.luckyDirection}</p>
                </div>
              </div>
            </section>

            {/* CTA: 전체 사주 분석 */}
            <section className="ctaPanel" style={{ marginTop: 16 }}>
              <h3>더 자세한 사주 분석이 궁금하다면?</h3>
              <p className="muted">30,000자 분량의 전문 AI 사주 분석을 받아보세요.</p>
              <div className="buttonRow">
                <Link href={`/result?name=${encodeURIComponent(inputName)}&birthDate=${inputDate}&birthTime=${birthTime ?? ""}`} className="btn btn-primary btn-lg">
                  무료 사주 분석 보기
                </Link>
              </div>
            </section>

            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => setShowResult(false)}>
                다른 생년월일로 보기
              </button>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

export default function DailyPage() {
  return (
    <Suspense fallback={<div className="loadingScreen"><p className="muted">로딩 중...</p></div>}>
      <DailyContent />
    </Suspense>
  );
}
