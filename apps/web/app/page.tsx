import Link from "next/link";

const pricing = [
  {
    code: "standard",
    title: "표준 리포트",
    price: "₩4,900",
    desc: "핵심 흐름 + 분야별(일/재정/관계/생활) 가이드"
  },
  {
    code: "deep",
    title: "심화 리포트",
    price: "₩12,900",
    desc: "표준 포함 + 3개월 시나리오 + 90일 실행 가이드"
  }
];

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
];

export default function HomePage() {
  return (
    <main className="shell pageMain">
      <section className="card heroCard">
        <p className="eyebrow">사주는 빅데이터</p>
        <h1>전통 해석과 데이터 패턴을 결합한 확률 기반 사주 리포트</h1>
        <p>
          과장된 단정 대신, 관찰 가능한 패턴과 실행 가능한 제안을 제공합니다. 무료 미리보기 후 필요한 깊이만 선택하세요.
        </p>
        <div className="buttonRow">
          <Link href="/free-fortune" className="primaryLink">
            무료 사주 시작
          </Link>
          <Link href="/disclaimer" className="subtleLink">
            서비스 해석 기준 보기
          </Link>
        </div>
      </section>

      <section className="card sectionGap">
        <h2>요금제</h2>
        <div className="pricingGrid">
          {pricing.map((item) => (
            <article key={item.code} className="pricingCard">
              <h3>{item.title}</h3>
              <p className="price">{item.price}</p>
              <p className="muted">{item.desc}</p>
              <Link href="/free-fortune" className="primaryLink small">
                무료 결과 후 선택
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="card sectionGap">
        <h2>신뢰 기준</h2>
        <ul className="flatList">
          <li>입력값 해시 기반의 재현 가능한 결과 생성</li>
          <li>확률·가능성 언어 사용, 과도한 확신 표현 제한</li>
          <li>중요 의사결정(의료/법률/투자) 단독 근거 사용 금지 고지</li>
        </ul>
      </section>

      <section className="card sectionGap">
        <h2>자주 묻는 질문</h2>
        {faqs.map((item) => (
          <article key={item.q} className="faqItem">
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
