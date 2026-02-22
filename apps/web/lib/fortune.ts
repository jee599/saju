import type { FortuneInput, ProductCode, ReportPreview } from "@saju/shared";

export type ShareChannel = "instagram" | "kakao";

export const toInputFromParams = (searchParams: URLSearchParams): FortuneInput | null => {
  const name = searchParams.get("name")?.trim() ?? "";
  const birthDate = searchParams.get("birthDate") ?? "";
  const birthTime = searchParams.get("birthTime") ?? "";
  const gender = searchParams.get("gender") as FortuneInput["gender"] | null;
  const calendarType = searchParams.get("calendarType") as FortuneInput["calendarType"] | null;

  if (!name || !birthDate || !gender || !calendarType) {
    return null;
  }

  return {
    name,
    birthDate,
    birthTime,
    gender,
    calendarType
  };
};

export const toInputQuery = (input: FortuneInput): string => {
  const params = new URLSearchParams({
    name: input.name.trim(),
    birthDate: input.birthDate,
    gender: input.gender,
    calendarType: input.calendarType,
    ...(input.birthTime ? { birthTime: input.birthTime } : {})
  });

  return params.toString();
};

export const getPriceLabel = (productCode: ProductCode): string => {
  return productCode === "deep" ? "₩12,900" : "₩4,900";
};

export const buildShareText = (channel: ShareChannel, preview: ReportPreview): string => {
  const oneLine = preview.free.summary;
  const detail = preview.free.sections[0]?.text ?? preview.free.summary;

  if (channel === "instagram") {
    return [
      "[사주는 빅데이터 | 오늘의 해석]",
      oneLine,
      detail,
      "#사주 #데이터해석 #확률기반"
    ].join("\n");
  }

  return [
    "[사주 결과 공유]",
    `핵심: ${oneLine}`,
    `메모: ${detail}`,
    "참고용 해석이며 중요한 결정은 추가 검토가 필요합니다."
  ].join("\n");
};
