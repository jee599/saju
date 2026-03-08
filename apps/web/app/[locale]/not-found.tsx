import { GlassCard, PageContainer, ButtonLink } from "./components/ui";

export default function NotFoundPage() {
  return (
    <PageContainer>
      <div style={{ paddingTop: 80, paddingBottom: 80, textAlign: "center" }}>
        <GlassCard>
          <p style={{ fontSize: "3rem", fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>
            404
          </p>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: 12, color: "var(--t1)" }}>
            페이지를 찾을 수 없습니다
          </h1>
          <p style={{ color: "var(--t2)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: 28 }}>
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ButtonLink href="/" variant="primary" size="md">
              홈으로 돌아가기
            </ButtonLink>
          </div>
        </GlassCard>
      </div>
    </PageContainer>
  );
}
