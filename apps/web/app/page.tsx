import { ButtonLink, GlassCard, PageContainer, SectionTitle } from "./components/ui";

const pricing = [
  {
    code: "standard",
    title: "표준 리포트",
    price: "₩4,900",
    desc: "핵심 흐름 + 분야별(일/재정/관계/생활) 가이드",
    badge: "가장 많이 선택"
  },
  {
    code: "deep",
    title: "심화 리포트",
    price: "₩12,900",
    desc: "표준 포함 + 3개월 시나리오 + 90일 실행 가이드",
    badge: "전문 해석 확장"
  }
] as const;

const faqs = [
  {
    q: "결과는 얼마나 정확한가요?",
    a: "개인 맞춤 입력값 기준의 확률적 해석입니다. 절대적 단정이 아닌 참고 정보로 활용해 주세요."
  },
  {
    q: "왜 '빅데이터'인가요?",
    a: "전통 해석 문법과 패턴 기반 문장 엔진을 결합해 재현 가능한 결과를 제공합니다."
  },
  {
    q: "결제가 실제로 청구되나요?",
    a: "V1에서는 모의결제 시뮬레이션으로 동작하며 실제 청구는 발생하지 않습니다."
  }
] as const;

export default function HomePage() {
  return (
    <PageContainer>
      <GlassCard className="hero">
        <div>
          <p className="heroEyebrow">Korean-First Probability Insight</p>
          <h1>전통 사주 해석의 신뢰를 유지하면서, 데이터 언어로 더 명확하게</h1>
          <p className="lead">
            과장된 운세 문구 대신, 입력값 패턴을 바탕으로 실행 가능한 해석과 체크포인트를 제시합니다. 먼저 무료
            미리보기를 확인한 뒤 필요한 깊이만 선택하세요.
          </p>
          <div className="buttonRow">
            <ButtonLink href="/free-fortune" size="lg">
              무료 사주 시작
            </ButtonLink>
            <ButtonLink href="/disclaimer" variant="ghost" size="lg">
              해석 기준 보기
            </ButtonLink>
          </div>
        </div>
        <div className="sectionBlock">
          <h3>신뢰 기준</h3>
          <ul className="flatList">
            <li>입력값 해시 기반의 재현 가능한 결과 생성</li>
            <li>확률·가능성 중심 표현, 과도한 확신 문구 제한</li>
            <li>중요 의사결정 단독 근거 사용 금지 고지</li>
          </ul>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="요금제" subtitle="무료 미리보기 이후, 필요한 해석 범위를 선택하세요." />
        <div className="pricingGrid">
          {pricing.map((item) => (
            <article key={item.code} className="pricingCard">
              <span className="badge badge-neutral">{item.badge}</span>
              <h3 className="mt-xs">{item.title}</h3>
              <p className="price">{item.price}</p>
              <p className="muted">{item.desc}</p>
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
        <SectionTitle title="자주 묻는 질문" subtitle="서비스 방식과 책임 범위를 투명하게 안내합니다." />
        {faqs.map((item) => (
          <article key={item.q} className="faqItem sectionBlock">
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </article>
        ))}
      </GlassCard>
    </PageContainer>
  );
}
