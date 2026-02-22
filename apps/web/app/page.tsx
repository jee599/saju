import { ButtonLink, GlassCard, PageContainer, SectionTitle } from "./components/ui";

const pricing = [
  {
    code: "standard",
    title: "표준 리포트",
    price: "₩4,900",
    desc: "3,000~6,000자 수준의 정밀 해석",
    points: ["7개 구조 장문 해설", "분야별 실행 전략", "용어 해설과 쉬운 설명"]
  },
  {
    code: "deep",
    title: "심화 리포트",
    price: "₩12,900",
    desc: "8,000~15,000자 수준의 심층 분석",
    points: ["목표 9,000~11,000자 장문", "20개 이상 용어 맥락 해설", "리스크·90일 실행 가이드"]
  }
] as const;

const trustItems = [
  "입력값 해시 기반의 결정론적(seed) 생성으로 재현성 확보",
  "확정 예언형 문구 대신 가능성·경향 중심 표현 적용",
  "중요 의사결정 단독 근거 사용 금지 원칙을 전면 고지"
] as const;

export default function HomePage() {
  return (
    <PageContainer>
      <GlassCard className="heroCard">
        <div className="heroMain">
          <p className="heroEyebrow">Professional Myeongri Report</p>
          <h1>명리 해석의 깊이는 유지하고, 문장은 더 명확하게</h1>
          <p className="lead">
            과장된 운세 톤이 아닌 전문 해설체로, 원국부터 실행 가이드까지 긴 호흡의 리포트를 제공합니다.
            무료 리포트로 먼저 확인하고 필요 깊이에 맞춰 확장하세요.
          </p>
          <div className="buttonRow">
            <ButtonLink href="/free-fortune" size="lg">무료 리포트 시작</ButtonLink>
            <ButtonLink href="/disclaimer" size="lg" variant="ghost">해석 원칙 보기</ButtonLink>
          </div>
        </div>
        <div className="heroAside">
          <h3>핵심 품질 기준</h3>
          <ul className="flatList">
            <li>무료 600~1200자</li>
            <li>표준 3000~6000자</li>
            <li>심화 8000~15000자</li>
          </ul>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="요금제" subtitle="필요한 분석 깊이만 선택할 수 있도록 구성했습니다." />
        <div className="pricingGrid">
          {pricing.map((item) => (
            <article key={item.code} className="pricingCard">
              <p className="badge badge-neutral">{item.desc}</p>
              <h3>{item.title}</h3>
              <p className="price">{item.price}</p>
              <ul className="flatList compactList">
                {item.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
              <div className="buttonRow">
                <ButtonLink href="/free-fortune" variant={item.code === "deep" ? "secondary" : "primary"} full>
                  무료 결과 후 선택
                </ButtonLink>
              </div>
            </article>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="신뢰/책임 안내" subtitle="의사결정 보조 도구로 안전하게 사용할 수 있도록 설계했습니다." />
        <ul className="flatList">
          {trustItems.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </GlassCard>
    </PageContainer>
  );
}
