"use client";

import { useState, useCallback } from "react";

const FAQ_ITEMS = [
  {
    q: "사주 분석은 정확한가요?",
    a: "사주는 518,400가지 조합을 기반으로 한 전통 명리 체계입니다. 본 서비스는 AI가 만세력 데이터를 분석하여 경향과 가능성을 제시합니다. 절대적 예언이 아닌 참고 정보로 활용해 주세요.",
  },
  {
    q: "무료 분석과 유료 분석의 차이는?",
    a: "무료 분석에서는 사주 팔자 카드와 오행 밸런스 2개 섹션을 제공합니다. 유료 분석(₩5,900)에서는 올해 총운, 직업/재물, 연애/결혼, 건강, 대인관계, 학업/자기계발, 월별 운세까지 총 9개 파트를 상세히 분석합니다.",
  },
  {
    q: "태어난 시간을 모르면 어떻게 하나요?",
    a: "태어난 시간을 모르는 경우 정오(12시)를 기본값으로 사용합니다. 시주를 제외한 년주, 월주, 일주의 3주 분석으로도 충분히 의미 있는 결과를 얻을 수 있습니다.",
  },
  {
    q: "궁합 분석은 어떻게 이루어지나요?",
    a: "두 사람의 일주(日柱) 오행을 비교하여 상생/상극 관계를 분석합니다. 오행 밸런스의 코사인 유사도와 음양 조화도를 종합하여 궁합 점수를 산출합니다.",
  },
  {
    q: "개인정보는 어떻게 처리되나요?",
    a: "생년월일 데이터는 분석 목적으로만 사용되며, 서버에 영구 저장되지 않습니다. 자세한 내용은 개인정보처리방침을 참고해 주세요.",
  },
] as const;

function FAQItem({
  q,
  a,
  isOpen,
  onToggle,
}: {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-glass-border bg-bg-card/80 overflow-hidden transition-colors">
      <button
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-t1 transition-colors hover:text-accent"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>{q}</span>
        <span
          className={`shrink-0 text-t3 transition-transform duration-200 ${
            isOpen ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      <div
        className={`grid transition-all duration-200 ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm leading-relaxed text-t2">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = useCallback((idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  }, []);

  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item, idx) => (
        <FAQItem
          key={idx}
          q={item.q}
          a={item.a}
          isOpen={openIndex === idx}
          onToggle={() => toggle(idx)}
        />
      ))}
    </div>
  );
}
