import { ButtonLink, GlassCard, PageContainer, SectionTitle } from "../components/ui";

const variants = [
  { key: "a", title: "A (GPT 개선본)", desc: "실용 구현/전환 흐름 중심", href: "/free-fortune?variant=a" },
  { key: "b", title: "B (Claude 개선본)", desc: "서사형 문체/디자인 완성도 중심", href: "/free-fortune?variant=b" },
  { key: "a1", title: "A1 (Claude가 GPT 개선)", desc: "GPT 베이스 + Claude 리뷰 반영", href: "/free-fortune?variant=a1" },
  { key: "b1", title: "B1 (GPT가 Claude 개선)", desc: "Claude 베이스 + GPT 리뷰 반영", href: "/free-fortune?variant=b1" }
] as const;

export default function VariantsPage() {
  return (
    <PageContainer>
      <GlassCard>
        <SectionTitle title="버전 선택 (즉시 접속 가능)" subtitle="외부 배포 보호설정 이슈를 우회해, 현재 메인 사이트 내부에서 바로 비교 가능합니다." />
        <div className="pricingGrid">
          {variants.map((v) => (
            <article key={v.key} className="pricingCard">
              <h3>{v.title}</h3>
              <p className="muted" style={{ marginTop: 8 }}>{v.desc}</p>
              <div className="buttonRow" style={{ marginTop: 12 }}>
                <ButtonLink href={v.href} full>이 버전으로 시작</ButtonLink>
              </div>
            </article>
          ))}
        </div>
      </GlassCard>
    </PageContainer>
  );
}
