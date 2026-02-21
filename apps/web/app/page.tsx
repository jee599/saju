import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <section className="card">
        <h1>사주 웹 MVP</h1>
        <p>확률 기반 해석과 실행 가이드를 제공하는 웹 중심 MVP입니다.</p>
        <small className="muted">무료 결과 확인 후 표준/심화 리포트로 확장할 수 있습니다.</small>
        <div style={{ marginTop: 16 }}>
          <Link href="/free-fortune">무료 사주 시작</Link>
        </div>
      </section>
    </main>
  );
}
