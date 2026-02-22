import { GlassCard, PageContainer } from "../components/ui";

export default function DisclaimerPage() {
  return (
    <PageContainer>
      <GlassCard className="legal">
        <p className="heroEyebrow">Disclaimer</p>
        <h1>면책 고지</h1>
        <p className="muted">시행일: 2026-02-22</p>

        <section className="legalSection">
          <h2>서비스 해석 원칙</h2>
          <p>
            본 서비스는 "가능성"과 "확률" 중심 언어를 사용하며, 절대적 예언이나 확정적 결과를 보장하지
            않습니다.
          </p>
        </section>

        <section className="legalSection">
          <h2>중요 고지</h2>
          <p>의료·법률·투자·채무·고위험 의사결정은 반드시 자격 있는 전문가의 자문을 병행해야 합니다.</p>
        </section>

        <section className="legalSection">
          <h2>사용자 책임</h2>
          <p>최종 판단과 실행 책임은 사용자에게 있으며, 본 서비스는 참고 정보 제공 범위에서 운영됩니다.</p>
        </section>
      </GlassCard>
    </PageContainer>
  );
}
