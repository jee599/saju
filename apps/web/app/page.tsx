import { ButtonLink, GlassCard, PageContainer, SectionTitle } from "./components/ui";

const pricing = {
  title: "장문 리포트",
  price: "₩12,900",
  desc: "대화형 한국어 장문 해설",
  points: [
    "성격/직업/연애/금전/건강/가족·배우자 6개 도메인",
    "도메인별 과거→현재→미래 흐름 설명",
    "용어 의미를 문장 안에서 풀어주는 확률형 결론",
    "마지막 대운 타임라인 정리"
  ]
} as const;

const trustItems = [
  "입력값 해시 기반의 결정론적(seed) 생성으로 재현성 확보",
  "확정 예언형 문구 대신 가능성·경향 중심 표현 적용",
  "중요 의사결정 단독 근거 사용 금지 원칙을 전면 고지"
] as const;

export default function HomePage() {
  return (
    <PageContainer>
      <GlassCard>
        <SectionTitle title="버전 선택" subtitle="아래에서 GPT 버전 / Claude(Opus) 버전을 바로 비교할 수 있습니다." />
        <div className="buttonRow">
          <ButtonLink href="/free-fortune" size="lg">
            GPT 버전 보기 (현재 사이트)
          </ButtonLink>
          <ButtonLink href="https://opus-only.vercel.app" size="lg" variant="secondary" target="_blank" rel="noreferrer">
            Claude(Opus) 버전 보기
          </ButtonLink>
        </div>
      </GlassCard>

      <GlassCard className="heroCard">
        <div className="heroMain">
          <p className="heroEyebrow">Professional Myeongri Report</p>
          <h1>명리 해석의 깊이는 유지하고, 문장은 더 대화형으로</h1>
          <p className="lead">
            무료 요약으로 현재 흐름을 짧게 확인한 뒤, 단일 장문 리포트에서 성격부터 가족·배우자까지
            과거, 현재, 미래를 연결해 읽을 수 있습니다.
          </p>
          <div className="buttonRow">
            <ButtonLink href="/free-fortune" size="lg">무료 리포트 시작</ButtonLink>
            <ButtonLink href="/disclaimer" size="lg" variant="ghost">해석 원칙 보기</ButtonLink>
          </div>
        </div>
        <div className="heroAside">
          <h3>핵심 품질 기준</h3>
          <ul className="flatList">
            <li>무료 요약 150~620자</li>
            <li>유료 장문 4800~11000자</li>
            <li>6개 도메인 + 대운 타임라인 고정 구조</li>
          </ul>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="요금" subtitle="선택 피로 없이 단일 상품으로 제공됩니다." />
        <div className="pricingGrid">
          <article className="pricingCard">
            <p className="badge badge-neutral">{pricing.desc}</p>
            <h3>{pricing.title}</h3>
            <p className="price">{pricing.price}</p>
            <ul className="flatList compactList">
              {pricing.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
            <div className="buttonRow">
              <ButtonLink href="/free-fortune" variant="primary" full>
                무료 결과 후 결제
              </ButtonLink>
            </div>
          </article>
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
