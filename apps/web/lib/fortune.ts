import type { FortuneInput, ProductCode, ReportPreview } from "./types";

export const toInputQuery = (input: FortuneInput): string => {
  const p = new URLSearchParams();
  p.set("name", input.name);
  p.set("birthDate", input.birthDate);
  if (input.birthTime) p.set("birthTime", input.birthTime);
  p.set("gender", input.gender);
  p.set("calendarType", input.calendarType);
  return p.toString();
};

export const toInputFromParams = (p: URLSearchParams): FortuneInput | null => {
  const name = p.get("name") ?? "";
  const birthDate = p.get("birthDate") ?? "";
  const birthTime = p.get("birthTime") ?? "";
  const gender = (p.get("gender") ?? "male") as FortuneInput["gender"];
  const calendarType = (p.get("calendarType") ?? "solar") as FortuneInput["calendarType"];
  if (!name || !birthDate) return null;
  return { name, birthDate, birthTime, gender, calendarType };
};

export const getPriceLabel = (code: ProductCode): string => (code === "deep" ? "₩12,900" : "₩4,900");

export const buildShareText = (channel: "instagram" | "kakao", preview: ReportPreview): string => {
  const line = preview.free.summary;
  if (channel === "instagram") return `사주는 빅데이터\n${line}\n#사주 #명리 #자기이해`;
  return `사주는 빅데이터 기반 요약\n- ${line}\n자세히 보기`; 
};
