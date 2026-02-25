import { GlassCard, PageContainer } from "../components/ui";

export default function DisclaimerPage() {
  return (
    <PageContainer>
      <GlassCard className="legal">
        <p className="heroEyebrow">Disclaimer</p>
        <h1>면책 고지</h1>
        <p className="muted">시행일: 2026-02-22</p>

        <section className="legalSection">
          <h2>해석 원칙</h2>
          <p>본 서비스는 가능성·경향 중심 문장을 사용하며, 단정적 예언 표현을 지양합니다.</p>
        </section>
        <section className="legalSection">
          <h2>중요 고지</h2>
          <p>의료·법률·투자·채무 등 고위험 판단은 반드시 자격 있는 전문가 자문을 병행해야 합니다.</p>
        </section>
        <section className="legalSection">
          <h2>사용자 책임</h2>
          <p>최종 판단과 실행 책임은 사용자에게 있으며, 본 서비스는 참고 정보 제공 범위에서 운영됩니다.</p>
        </section>
      </GlassCard>
    </PageContainer>
  );
}
