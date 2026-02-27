# 엔진 출력 스키마 확인 문서

> **Phase A-6 결과물**
> **작성일:** 2026-02-27
> **엔진:** @saju/engine-saju v0.1.0

---

## 1. 현재 SajuResult 타입

```typescript
// packages/engine/saju/src/index.ts

export interface SajuResult {
  input: SajuInput;
  pillars: FourPillars;
}

export interface SajuInput {
  year: number;    // 1900-2100
  month: number;   // 1-12
  day: number;     // 1-31
  hour: number;    // 0-23
  minute: number;  // 0-59
}

export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
}

export interface Pillar {
  stem: StemHanja;      // 甲 乙 丙 丁 戊 己 庚 辛 壬 癸
  branch: BranchHanja;  // 子 丑 寅 卯 辰 巳 午 未 申 酉 戌 亥
  full: string;         // "甲子"
  stemKr: Stem;         // 갑 을 병 정 무 기 경 신 임 계
  branchKr: Branch;     // 자 축 인 묘 진 사 오 미 신 유 술 해
  fullKr: string;       // "갑자"
}
```

---

## 2. B1-2에서 필요한 필드 vs 현재 상태

| 필요 필드 | 용도 | 현재 존재 | 추가 구현 방식 |
|---------|------|---------|-------------|
| 오행 비율 (木火土金水) | 5개 수평 바 차트 | ❌ | 8글자(천간4+지지4) 오행 카운트 → 비율 |
| 일간(日干) 오행 | "당신은 [木]의 사람" | ❌ | `pillars.day.stem` → 오행 매핑 |
| 음양 비율 | 음양 밸런스 바 | ❌ | 8글자 음양 카운트 |
| 과다/부족 판정 | "火 에너지 부족" | ❌ | 비율 비교 (20% 기준) |

---

## 3. 오행 매핑 (천간 → 오행)

```
甲(갑), 乙(을) → 木 (Wood)   양, 음
丙(병), 丁(정) → 火 (Fire)   양, 음
戊(무), 己(기) → 土 (Earth)  양, 음
庚(경), 辛(신) → 金 (Metal)  양, 음
壬(임), 癸(계) → 水 (Water)  양, 음
```

규칙: `Math.floor(stemIndex / 2)` → 오행 인덱스

## 4. 오행 매핑 (지지 → 오행)

```
子(자) → 水    丑(축) → 土    寅(인) → 木    卯(묘) → 木
辰(진) → 土    巳(사) → 火    午(오) → 火    未(미) → 土
申(신) → 金    酉(유) → 金    戌(술) → 土    亥(해) → 水
```

## 5. 음양 판정

```
양간: 甲 丙 戊 庚 壬 (짝수 인덱스)
음간: 乙 丁 己 辛 癸 (홀수 인덱스)
양지: 子 寅 辰 午 申 戌 (짝수 인덱스)
음지: 丑 卯 巳 未 酉 亥 (홀수 인덱스)
```

---

## 6. B1-2 구현 계획

### 엔진에 추가할 함수/타입 (packages/engine/saju/src/index.ts)

```typescript
// 추가 타입
export type FiveElement = "木" | "火" | "土" | "金" | "水";
export type FiveElementKr = "목" | "화" | "토" | "금" | "수";
export type FiveElementEn = "Wood" | "Fire" | "Earth" | "Metal" | "Water";

export interface ElementAnalysis {
  elements: {
    wood: number;   // 0~100 (%)
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  dayMaster: {
    stem: StemHanja;
    element: FiveElement;
    elementKr: FiveElementKr;
    elementEn: FiveElementEn;
    isYang: boolean;
  };
  yinYang: {
    yang: number;   // 0~100 (%)
    yin: number;
  };
  excess: FiveElement[];    // 과다 오행 (25% 초과)
  deficient: FiveElement[]; // 부족 오행 (10% 미만)
}

// 추가 함수
export function analyzeElements(pillars: FourPillars): ElementAnalysis;
```

### 구현 로직

1. **오행 비율 계산**: 사주 8글자(천간4 + 지지4)에서 각 글자의 오행을 추출, 8개 중 비율 계산
2. **일간 오행**: `pillars.day.stem`의 오행 = 일간 오행
3. **음양 비율**: 8글자 각각의 음/양 판정 후 비율 계산
4. **과다/부족**: 균등 분포(20%) 대비 5% 이상 차이나면 과다/부족 판정

### 예상 추가 공수

- 엔진 함수 추가: **0.5일**
- 테스트 작성: **0.5일**
- 합계: **1일** (B1-2의 4일에 포함)

---

## 7. 테스트 현황

- 골든 케이스: 42개
- 전체 테스트: 99개 (97 passed, 2 skipped — PostgreSQL 없을 때)
- 커버리지: 사주 계산 정확도 100% (입춘/절기/야자시 경계 포함)

---

## 8. 결론

현재 엔진은 **사주 계산(四柱)만 구현**되어 있고, B1-2에서 필요한 **오행 분석은 전부 새로 구현** 필요.
다만 필요한 모든 원시 데이터(8글자의 천간/지지)는 이미 `SajuResult.pillars`에 있으므로,
매핑 테이블만 추가하면 약 1일 공수로 구현 가능.
