import { GlassCard, PageContainer } from "../components/ui";

export default function PrivacyPage() {
  return (
    <PageContainer>
      <GlassCard className="legal">
        <p className="heroEyebrow">Privacy</p>
        <h1>개인정보처리방침</h1>
        <p className="muted">시행일: 2026-02-22</p>

        <section className="legalSection">
          <h2>1. 수집 항목</h2>
          <p>이름, 생년월일, 출생시간(선택), 성별, 달력 유형을 리포트 생성 목적 범위에서 처리합니다.</p>
        </section>
        <section className="legalSection">
          <h2>2. 이용 목적</h2>
          <p>맞춤형 리포트 생성, 결제 플로우 시뮬레이션, 오류 분석과 품질 개선을 위해 사용합니다.</p>
        </section>
        <section className="legalSection">
          <h2>3. 보관/파기</h2>
          <p>V1 환경에서는 주문/리포트 데이터가 서버 메모리에 임시 저장되며 서버 재시작 시 초기화됩니다.</p>
        </section>
      </GlassCard>
    </PageContainer>
  );
}
