import type { Gender } from "./types";

export type CompatibilityPerson = {
  name: string;
  birthDate: string;
  gender: Gender;
};

export type CompatibilityResult = {
  score: number;
  grade: string;
  summary: string;
  strengths: string[];
  challenges: string[];
  advice: string;
};

const hashPair = (a: CompatibilityPerson, b: CompatibilityPerson): number => {
  const sorted = [a, b].sort((x, y) =>
    `${x.name}${x.birthDate}`.localeCompare(`${y.name}${y.birthDate}`)
  );
  const s = sorted
    .map((p) => `${p.name.trim().toLowerCase()}|${p.birthDate}|${p.gender}`)
    .join("||");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return Math.abs(h) >>> 0;
};

const pick = <T>(arr: readonly T[], seed: number, offset: number): T =>
  arr[(seed + offset) % arr.length] as T;

const summaryPool = [
  (a: string, b: string) =>
    `${a}님과 ${b}님은 서로의 약점을 보완하는 조합일 가능성이 높습니다. 특히 결정이 필요한 순간에 상대의 관점이 균형추 역할을 해줄 확률이 큽니다.`,
  (a: string, b: string) =>
    `${a}님과 ${b}님은 비슷한 에너지를 공유하면서도 적절한 긴장감이 있는 관계입니다. 루틴 속에서 자연스러운 역할 분담이 이뤄질 가능성이 높습니다.`,
  (a: string, b: string) =>
    `${a}님과 ${b}님은 일과 감정의 리듬이 잘 맞을 확률이 높은 조합입니다. 같이 있으면 체감 에너지가 올라가는 시간이 많을 수 있습니다.`,
  (a: string, b: string) =>
    `${a}님과 ${b}님은 장기적으로 안정감 있는 관계를 구축할 가능성이 큽니다. 서로의 기준을 존중하면서 공통 목표를 설정할 때 시너지가 극대화됩니다.`,
] as const;

const strengthPool = [
  "대화 리듬이 자연스럽게 맞을 확률이 높습니다",
  "서로의 결정을 신뢰하는 패턴이 강합니다",
  "감정 표현 방식이 비슷해 오해가 적을 수 있습니다",
  "위기 상황에서 서로 보완적인 역할을 할 가능성이 큽니다",
  "취미나 관심사에서 공통점을 쉽게 찾을 수 있습니다",
  "일상적인 루틴에서 자연스럽게 조화를 이룰 확률이 높습니다",
  "서로의 성장을 응원하는 에너지가 강한 조합입니다",
  "갈등 후 회복 속도가 빠를 가능성이 큽니다",
] as const;

const challengePool = [
  "결정 속도 차이로 답답함을 느낄 수 있습니다",
  "에너지 리듬이 엇갈리는 시기가 올 수 있습니다",
  "각자의 공간이 필요한 순간을 이해하는 것이 중요합니다",
  "금전 감각의 차이를 미리 조율하면 좋습니다",
  "표현 방식의 차이를 틀림이 아닌 다름으로 받아들여야 합니다",
  "스트레스 해소 방식이 달라 서로 배려가 필요합니다",
] as const;

const advicePool = [
  "일주일에 한 번, 서로의 한 주를 정리하는 대화 시간을 갖는 것이 관계 안정에 도움이 될 수 있습니다.",
  "큰 결정 전에는 최소 24시간의 냉각 기간을 두는 것이 오해를 줄이는 데 효과적입니다.",
  "서로의 작은 성취를 축하하는 습관이 관계의 긍정 에너지를 높일 가능성이 큽니다.",
  "감정이 격해질 때는 '나는 ~하게 느꼈다'로 시작하는 대화법이 갈등을 줄여줍니다.",
] as const;

export const isValidPerson = (p: CompatibilityPerson): boolean => {
  if (!p?.name?.trim() || p.name.trim().length < 2) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)) return false;
  return ["male", "female", "other"].includes(p.gender);
};

export const generateCompatibility = (
  a: CompatibilityPerson,
  b: CompatibilityPerson
): CompatibilityResult => {
  const seed = hashPair(a, b);

  const score = 55 + (seed % 44);
  const grade =
    score >= 90 ? "S" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D";

  const summaryFn = pick(summaryPool, seed, 2);

  return {
    score,
    grade,
    summary: summaryFn(a.name, b.name),
    strengths: [
      pick(strengthPool, seed, 0),
      pick(strengthPool, seed, 3),
      pick(strengthPool, seed, 5),
    ],
    challenges: [pick(challengePool, seed, 1), pick(challengePool, seed, 4)],
    advice: pick(advicePool, seed, 6),
  };
};

export const toCompatQuery = (
  a: CompatibilityPerson,
  b: CompatibilityPerson
): string => {
  const p = new URLSearchParams();
  p.set("nameA", a.name);
  p.set("birthDateA", a.birthDate);
  p.set("genderA", a.gender);
  p.set("nameB", b.name);
  p.set("birthDateB", b.birthDate);
  p.set("genderB", b.gender);
  return p.toString();
};

export const fromCompatQuery = (
  p: URLSearchParams
): { a: CompatibilityPerson; b: CompatibilityPerson } | null => {
  const nameA = p.get("nameA") ?? "";
  const birthDateA = p.get("birthDateA") ?? "";
  const genderA = (p.get("genderA") ?? "male") as Gender;
  const nameB = p.get("nameB") ?? "";
  const birthDateB = p.get("birthDateB") ?? "";
  const genderB = (p.get("genderB") ?? "female") as Gender;
  if (!nameA || !birthDateA || !nameB || !birthDateB) return null;
  return {
    a: { name: nameA, birthDate: birthDateA, gender: genderA },
    b: { name: nameB, birthDate: birthDateB, gender: genderB },
  };
};
