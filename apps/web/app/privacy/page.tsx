export default function PrivacyPage() {
  return (
    <main className="shell pageMain">
      <section className="card legal">
        <h1>개인정보처리방침</h1>
        <p>시행일: 2026-02-22</p>
        <h2>1. 수집 항목</h2>
        <p>이름, 생년월일, 출생시간(선택), 성별, 달력 유형을 리포트 생성 목적에 한해 처리합니다.</p>
        <h2>2. 이용 목적</h2>
        <p>맞춤형 사주 해석 생성, 서비스 품질 점검, 오류 대응을 위해 사용합니다.</p>
        <h2>3. 보관 및 파기</h2>
        <p>V1에서는 모의결제/리포트 데이터가 메모리에 임시 저장되며 서버 재시작 시 초기화됩니다.</p>
      </section>
    </main>
  );
}
