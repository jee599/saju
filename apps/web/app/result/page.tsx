"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { calculateFourPillars, analyzeElements, ELEMENT_KR, ELEMENT_EMOJI, ELEMENT_KR_NATIVE } from "@saju/engine-saju";
import type { Element } from "@saju/engine-saju";
import { track } from "../../lib/analytics";

// 오행별 블러 맛보기 템플릿
const BLUR_TEASERS: Record<Element, { sections: Array<{ title: string; teaser: string; icon: string }> }> = {
  wood: {
    sections: [
      { title: "올해 총운", teaser: "2026년은 성장과 확장의 기운이 강한 해입니다...", icon: "🌿" },
      { title: "직업/재물", teaser: "木의 기운이 재물운에 새로운 싹을 틔우고 있습니다...", icon: "🌿" },
      { title: "연애/결혼", teaser: "봄처럼 새로운 만남의 에너지가 감지됩니다...", icon: "🌿" },
      { title: "건강", teaser: "木의 에너지가 간과 담에 영향을 주고 있습니다...", icon: "🌿" },
      { title: "가족/대인", teaser: "가족 관계에서 새로운 성장의 계기가 보입니다...", icon: "🌿" },
      { title: "월별 운세", teaser: "상반기와 하반기의 흐름이 뚜렷하게 갈립니다...", icon: "🌿" },
      { title: "대운 타임라인", teaser: "10년 주기의 대운 흐름에서 전환점이 다가옵니다...", icon: "🌿" },
    ],
  },
  fire: {
    sections: [
      { title: "올해 총운", teaser: "2026년은 열정과 변화의 기운이 강한 해입니다...", icon: "🔥" },
      { title: "직업/재물", teaser: "火의 에너지가 사업운에 강한 추진력을 만들고 있습니다...", icon: "🔥" },
      { title: "연애/결혼", teaser: "뜨거운 인연이 하반기에 찾아올 기운이 보입니다...", icon: "🔥" },
      { title: "건강", teaser: "심장과 소장에 火 기운이 집중되고 있습니다...", icon: "🔥" },
      { title: "가족/대인", teaser: "주변에 활력을 불어넣는 역할이 강해집니다...", icon: "🔥" },
      { title: "월별 운세", teaser: "여름철 운기가 특히 강하게 작용합니다...", icon: "🔥" },
      { title: "대운 타임라인", teaser: "인생의 가장 활발한 시기가 다가오고 있습니다...", icon: "🔥" },
    ],
  },
  earth: {
    sections: [
      { title: "올해 총운", teaser: "2026년은 안정과 수확의 기운이 강한 해입니다...", icon: "⛰️" },
      { title: "직업/재물", teaser: "土의 기운이 재물을 단단히 지켜주고 있습니다...", icon: "⛰️" },
      { title: "연애/결혼", teaser: "신뢰를 기반으로 한 깊은 인연이 보입니다...", icon: "⛰️" },
      { title: "건강", teaser: "비위(소화기)에 土 기운이 집중됩니다...", icon: "⛰️" },
      { title: "가족/대인", teaser: "가족의 중심 역할이 더 강해지는 시기입니다...", icon: "⛰️" },
      { title: "월별 운세", teaser: "환절기마다 운기의 변화가 뚜렷합니다...", icon: "⛰️" },
      { title: "대운 타임라인", teaser: "안정적인 기반 위에 새로운 도약이 준비됩니다...", icon: "⛰️" },
    ],
  },
  metal: {
    sections: [
      { title: "올해 총운", teaser: "2026년은 결실과 정리의 기운이 강한 해입니다...", icon: "⚙️" },
      { title: "직업/재물", teaser: "金의 에너지가 커리어에 날카로운 판단력을 줍니다...", icon: "⚙️" },
      { title: "연애/결혼", teaser: "진지하고 명확한 관계를 원하는 시기입니다...", icon: "⚙️" },
      { title: "건강", teaser: "폐와 대장에 金 기운이 집중됩니다...", icon: "⚙️" },
      { title: "가족/대인", teaser: "관계 정리와 핵심 인연에 집중하는 시기입니다...", icon: "⚙️" },
      { title: "월별 운세", teaser: "가을철 운기가 절정에 달합니다...", icon: "⚙️" },
      { title: "대운 타임라인", teaser: "성과를 거두고 다음 단계를 준비하는 전환기입니다...", icon: "⚙️" },
    ],
  },
  water: {
    sections: [
      { title: "올해 총운", teaser: "2026년은 지혜와 유연함의 기운이 강한 해입니다...", icon: "🌊" },
      { title: "직업/재물", teaser: "水의 흐름이 새로운 기회를 끌어오고 있습니다...", icon: "🌊" },
      { title: "연애/결혼", teaser: "감성적이고 깊은 교류가 이루어지는 시기입니다...", icon: "🌊" },
      { title: "건강", teaser: "신장과 방광에 水 기운이 집중됩니다...", icon: "🌊" },
      { title: "가족/대인", teaser: "소통과 이해가 관계를 깊게 만드는 시기입니다...", icon: "🌊" },
      { title: "월별 운세", teaser: "겨울철 운기가 가장 강하게 작용합니다...", icon: "🌊" },
      { title: "대운 타임라인", teaser: "내면의 성장이 외적 변화로 이어지는 시기입니다...", icon: "🌊" },
    ],
  },
};

function ResultContent() {
  const params = useSearchParams();
  const name = params.get("name") ?? "사용자";
  const birthDate = params.get("birthDate") ?? "1995-01-01";
  const birthTime = params.get("birthTime");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    track("report_view");
    setTimeout(() => setVisible(true), 100);
  }, []);

  const analysis = useMemo(() => {
    const [y, m, d] = birthDate.split("-").map(Number);
    const hour = birthTime ? parseInt(birthTime.split(":")[0]) : 12;
    const minute = birthTime ? parseInt(birthTime.split(":")[1]) : 0;
    const result = calculateFourPillars({ year: y, month: m, day: d, hour, minute });
    return { pillars: result.pillars, elements: result.elements };
  }, [birthDate, birthTime]);

  const { elements } = analysis;
  const dayEl = elements.dayMaster;
  const teasers = BLUR_TEASERS[dayEl];

  const ELEMENTS: Element[] = ["wood", "fire", "earth", "metal", "water"];

  return (
    <main className="page">
      <div className="container">
        {/* 무료 파트 1: 일간 카드 */}
        <section className="glassCard dayMasterCard">
          <div className="dayMasterEmoji">{ELEMENT_EMOJI[dayEl]}</div>
          <h2 className="dayMasterTitle">당신은 {ELEMENT_KR[dayEl]}의 사람입니다</h2>
          <p className="dayMasterSub">{name}님의 일간(日干)은 {elements.dayMasterHanja}입니다</p>
        </section>

        {/* 무료 파트 2: 오행 바 차트 */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3>오행 밸런스</h3>
          <div className="elementBars">
            {ELEMENTS.map((el) => (
              <div key={el} className={`elementBarRow ${el === elements.dominant ? "dominant" : ""}`}>
                <span className="elementBarLabel">
                  {ELEMENT_EMOJI[el]} {ELEMENT_KR[el]} ({ELEMENT_KR_NATIVE[el]})
                </span>
                <div className="elementBarTrack">
                  <div
                    className={`elementBarFill ${el}`}
                    style={{ width: visible ? `${elements.balance[el]}%` : "0%" }}
                  />
                </div>
                <span className="elementBarValue">{elements.balance[el]}%</span>
              </div>
            ))}
          </div>

          {/* 과다/부족 */}
          <p style={{ marginTop: 12, fontSize: "0.9rem" }}>
            <span style={{ color: `var(--element-${elements.dominant})` }}>
              {ELEMENT_EMOJI[elements.dominant]} {ELEMENT_KR[elements.dominant]} 에너지가 강합니다
            </span>
            {" · "}
            <span style={{ color: `var(--element-${elements.weakest})` }}>
              {ELEMENT_EMOJI[elements.weakest]} {ELEMENT_KR[elements.weakest]} 에너지가 부족합니다
            </span>
          </p>

          {/* 음양 밸런스 */}
          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: "0.9rem", color: "var(--t2)" }}>음양 밸런스</h4>
            <div className="yinYangBar">
              <div className="yinYangYang" style={{ width: visible ? `${elements.yinYang.yang}%` : "0%" }} />
              <div className="yinYangYin" style={{ width: visible ? `${elements.yinYang.yin}%` : "0%" }} />
            </div>
            <div className="yinYangLabels">
              <span>양(陽) {elements.yinYang.yang}%</span>
              <span>음(陰) {elements.yinYang.yin}%</span>
            </div>
          </div>
        </section>

        {/* CTA #1 */}
        <section className="ctaPanel" style={{ marginTop: 16 }}>
          <h3>7개 섹션의 상세 분석이 준비되어 있습니다</h3>
          <p className="muted">올해 총운부터 대운 타임라인까지, AI가 당신만의 사주를 해석합니다.</p>
          <div className="buttonRow">
            <Link href={`/paywall?birthDate=${birthDate}&birthTime=${birthTime ?? ""}&name=${name}`} className="btn btn-primary btn-lg btn-full">
              ₩5,900으로 전체 분석 보기
            </Link>
          </div>
        </section>

        {/* 블러 7파트 */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>
            <span className="badge badge-premium">프리미엄 분석</span>
          </h3>
          {teasers.sections.map((sec, i) => (
            <div key={i} className={`blurSection ${dayEl}`}>
              <h4 style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--t1)" }}>
                {sec.icon} {sec.title}
              </h4>
              <p className="blurTeaser">{sec.teaser}</p>
              <div className="blurContent">
                이 섹션에서는 당신의 사주를 기반으로 한 상세한 분석이 포함되어 있습니다.
                오행의 흐름과 십성의 배치를 고려한 전문적인 해석을 확인해보세요.
                과거의 패턴과 현재의 기운, 그리고 미래의 흐름을 연결하여 분석합니다.
              </div>
              <div className="blurOverlay" />
            </div>
          ))}
        </section>

        {/* CTA #2 */}
        <section className="ctaPanel" style={{ marginTop: 16 }}>
          <h3>더 깊이 알아볼까요?</h3>
          <p className="muted">위 7개 섹션의 블러를 해제하고 전체 분석을 확인하세요.</p>
          <div className="buttonRow">
            <Link href={`/paywall?birthDate=${birthDate}&birthTime=${birthTime ?? ""}&name=${name}`} className="btn btn-primary btn-lg btn-full">
              ₩5,900으로 전체 분석 보기
            </Link>
          </div>
        </section>

        {/* 미니 궁합 */}
        <section className="glassCard" style={{ marginTop: 16, textAlign: "center" }}>
          <h3>궁합도 궁금하다면?</h3>
          <p className="muted" style={{ marginTop: 8 }}>상대방 생년월일만 입력하면 무료 궁합을 볼 수 있어요.</p>
          <div className="buttonRow" style={{ justifyContent: "center" }}>
            <Link href="/?tab=compat" className="btn btn-secondary btn-lg">
              궁합 보러 가기 💕
            </Link>
          </div>
        </section>

        {/* 모바일 스티키 CTA #3 */}
        <div className="stickyCta">
          <div className="stickyCtaInner">
            <Link href={`/paywall?birthDate=${birthDate}&birthTime=${birthTime ?? ""}&name=${name}`} className="btn btn-primary btn-lg btn-full">
              ₩5,900 · 전체 분석 열기
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="loadingScreen"><p className="muted">분석 결과를 불러오는 중...</p></div>}>
      <ResultContent />
    </Suspense>
  );
}
