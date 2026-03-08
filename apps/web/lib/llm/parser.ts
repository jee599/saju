/**
 * JSON parsing, response extraction, and fallback logic for LLM responses
 */

export const safeJsonParse = (text: string): any => {
  // 1차: 그대로 파싱
  try {
    return JSON.parse(text);
  } catch { /* fall through */ }

  const trimmed = text.trim();

  // 2차: ```json ... ``` 펜스 제거 (전체 매칭)
  const fenceMatchFull = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatchFull?.[1]) {
    try { return JSON.parse(fenceMatchFull[1]); } catch { /* fall through */ }
  }

  // 2.5차: 텍스트 중간에 있는 ```json 펜스 추출 (Haiku 등 펜스 앞뒤에 텍스트 있을 때)
  const fenceMatchMid = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatchMid?.[1]) {
    try { return JSON.parse(fenceMatchMid[1]); } catch {
      // 펜스 내용에서 { ~ } 추출
      const inner = fenceMatchMid[1];
      const fb = inner.indexOf("{");
      const lb = inner.lastIndexOf("}");
      if (fb !== -1 && lb > fb) {
        try { return JSON.parse(inner.slice(fb, lb + 1)); } catch { /* fall through */ }
      }
    }
  }

  // 2.7차: 잘린 ```json 펜스 (닫는 ``` 없이 잘린 경우)
  const fenceOpen = trimmed.match(/```(?:json)?\s*([\s\S]+)/i);
  if (fenceOpen?.[1] && !fenceOpen[1].includes("```")) {
    const inner = fenceOpen[1].trim();
    const fb = inner.indexOf("{");
    const lb = inner.lastIndexOf("}");
    if (fb !== -1 && lb > fb) {
      try { return JSON.parse(inner.slice(fb, lb + 1)); } catch { /* fall through */ }
    }
  }

  // 3차: 텍스트 중간에 있는 JSON 객체 추출 (첫 { ~ 마지막 })
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try { return JSON.parse(candidate); } catch { /* fall through */ }
  }

  // 4차: 줄바꿈/제어문자 정리 후 재시도
  const cleaned = trimmed
    .replace(/[\x00-\x1f]/g, (ch) => ch === "\n" || ch === "\r" || ch === "\t" ? ch : "")
    .replace(/,\s*([\]}])/g, "$1"); // trailing comma 제거
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  // 5차: 잘린 JSON 복구 시도 (maxTokens 초과로 잘린 경우)
  const jsonCandidate = (() => {
    const start = cleaned.indexOf("{");
    if (start === -1) return null;
    let s = cleaned.slice(start);
    let braces = 0, brackets = 0, inStr = false, escape = false;
    for (const ch of s) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") braces++;
      if (ch === "}") braces--;
      if (ch === "[") brackets++;
      if (ch === "]") brackets--;
    }
    if (inStr) s += '"';
    while (brackets > 0) { s += "]"; brackets--; }
    while (braces > 0) { s += "}"; braces--; }
    return s;
  })();
  if (jsonCandidate) {
    try { return JSON.parse(jsonCandidate); } catch { /* fall through */ }
    try { return JSON.parse(jsonCandidate.replace(/,\s*([\]}])/g, "$1")); } catch { /* fall through */ }
  }

  throw new Error("JSON_PARSE_FAILED: " + trimmed.slice(0, 200));
};
