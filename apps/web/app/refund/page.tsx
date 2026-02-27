export default function RefundPage() {
  return (
    <main className="page">
      <div className="container">
        <section className="glassCard">
          <h1>환불 정책</h1>
          <div className="legal">
            <div className="legalSection">
              <h3>1. 환불 원칙</h3>
              <p>FateSaju의 유료 사주 분석 리포트는 디지털 콘텐츠로, 결제 즉시 AI 분석이 실행되어 리포트가 생성됩니다.</p>
            </div>
            <div className="legalSection">
              <h3>2. 환불 가능한 경우</h3>
              <p>- 결제 후 리포트가 정상적으로 생성되지 않은 경우{"\n"}- 시스템 오류로 중복 결제된 경우{"\n"}- 결제 후 24시간 이내 리포트 미열람 시</p>
            </div>
            <div className="legalSection">
              <h3>3. 환불 불가한 경우</h3>
              <p>- 리포트 열람 후 내용 불만족 (디지털 콘텐츠 특성상){"\n"}- 단순 변심{"\n"}- 결제 후 24시간 경과 및 리포트 열람 완료</p>
            </div>
            <div className="legalSection">
              <h3>4. 환불 절차</h3>
              <p>환불 요청은 결제 시 입력한 이메일로 contact@fatesaju.com에 문의해주세요. 영업일 기준 3일 이내 처리됩니다.</p>
            </div>
            <div className="legalSection">
              <h3>5. 시행일</h3>
              <p>이 환불 정책은 2026년 3월 1일부터 시행됩니다.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
