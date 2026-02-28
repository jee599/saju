"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { calculateFourPillars, calculateCompatibility, ELEMENT_KR, ELEMENT_EMOJI } from "@saju/engine-saju";
import { track } from "../../lib/analytics";

function CompatContent() {
  const params = useSearchParams();
  const myDate = params.get("my") ?? "2000-01-01";
  const partnerDate = params.get("partner") ?? "2000-06-15";

  const result = useMemo(() => {
    const [my, mm, md] = myDate.split("-").map(Number);
    const [py, pm, pd] = partnerDate.split("-").map(Number);

    const myResult = calculateFourPillars({ year: my, month: mm, day: md, hour: 12, minute: 0 });
    const partnerResult = calculateFourPillars({ year: py, month: pm, day: pd, hour: 12, minute: 0 });

    track("compatibility_result");
    return calculateCompatibility(myResult.pillars, partnerResult.pillars);
  }, [myDate, partnerDate]);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?tab=compat`
    : "";

  const handleShare = () => {
    const text = `우리 궁합 ${result.score}점! 너도 해볼래?\n${shareUrl}`;
    if (navigator.share) {
      navigator.share({ title: "복연구소 궁합", text });
    } else {
      navigator.clipboard.writeText(text);
    }
    track("share_click", { channel: "copy", content_type: "compatibility" });
  };

  return (
    <main className="page">
      <div className="container">
        <section className="glassCard compatResult">
          <h2>{ELEMENT_EMOJI[result.myElement]} {ELEMENT_KR[result.myElement]} × {ELEMENT_EMOJI[result.partnerElement]} {ELEMENT_KR[result.partnerElement]}</h2>

          <div className="compatElements">
            <div className="compatPerson">
              <span className="compatEmoji">{ELEMENT_EMOJI[result.myElement]}</span>
              <span className="compatLabel">나</span>
              <span className="compatElement">{ELEMENT_KR[result.myElement]}</span>
            </div>
            <span className="compatConnector">←→</span>
            <div className="compatPerson">
              <span className="compatEmoji">{ELEMENT_EMOJI[result.partnerElement]}</span>
              <span className="compatLabel">상대</span>
              <span className="compatElement">{ELEMENT_KR[result.partnerElement]}</span>
            </div>
          </div>

          <div className="compatScore">{result.score}점</div>
          <p className="compatRelation">{result.relationship}</p>
          <p className="compatDesc">{result.description}</p>

          <div className="buttonRow" style={{ justifyContent: "center", marginTop: 24 }}>
            <button className="btn btn-primary btn-lg" onClick={handleShare}>
              상대방에게 공유하기
            </button>
            <Link href="/#hero" className="btn btn-ghost btn-lg">
              내 사주 상세 보기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function CompatibilityPage() {
  return (
    <Suspense fallback={<div className="loadingScreen"><p className="muted">궁합 분석 중...</p></div>}>
      <CompatContent />
    </Suspense>
  );
}
