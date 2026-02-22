import { GlassCard, PageContainer } from "../components/ui";

export default function TermsPage() {
  return (
    <PageContainer>
      <GlassCard className="legal">
        <p className="heroEyebrow">Terms</p>
        <h1>이용약관</h1>
        <p className="muted">시행일: 2026-02-22</p>

        <section className="legalSection">
          <h2>1. 서비스 성격</h2>
          <p>본 서비스는 명리 해석을 확률 기반 문장으로 재구성한 참고 리포트입니다. 절대적 예언이나 결과 보장을 제공하지 않습니다.</p>
        </section>
        <section className="legalSection">
          <h2>2. 이용자 의무</h2>
          <p>서비스 안정성을 해치는 자동화 남용, 불법 목적 사용, 타인 권리 침해 행위는 금지됩니다.</p>
        </section>
        <section className="legalSection">
          <h2>3. 책임 제한</h2>
          <p>의료·법률·투자·채무·고위험 판단은 반드시 별도 전문가 자문과 함께 진행해야 하며, 본 서비스 단독 근거 사용은 제한됩니다.</p>
        </section>
      </GlassCard>
    </PageContainer>
  );
}
