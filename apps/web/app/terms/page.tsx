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
          <p>본 서비스는 전통 사주 해석과 데이터 패턴 기반 문장을 결합한 참고 정보를 제공합니다.</p>
        </section>

        <section className="legalSection">
          <h2>2. 금지 사항</h2>
          <p>자동화 남용, 서비스 안정성 훼손, 제3자 권리 침해 행위를 금지합니다.</p>
        </section>

        <section className="legalSection">
          <h2>3. 책임 제한</h2>
          <p>본 서비스는 판단 보조 목적이며, 중요한 의사결정은 전문 자문과 병행해 주세요.</p>
        </section>
      </GlassCard>
    </PageContainer>
  );
}
