import Link from "next/link";
import { GlassCard, PageContainer, SectionTitle } from "../components/ui";

export const metadata = {
  title: "이름풀이 (개발중) | 사주는 빅데이터"
};

export default function NamePage() {
  return (
    <PageContainer>
      <GlassCard>
        <SectionTitle title="이름풀이" subtitle="현재 개발중입니다." />
        <p className="lead">
          이름풀이 엔진/모델 비교 기능은 품질(QA) 게이트 통과 후 순차적으로 공개할 예정입니다.
        </p>
        <div className="buttonRow">
          <Link className="btn btn-primary" href="/free-fortune">사주 무료 리포트로 이동</Link>
          <Link className="btn btn-ghost" href="/">홈으로</Link>
        </div>
      </GlassCard>
    </PageContainer>
  );
}
