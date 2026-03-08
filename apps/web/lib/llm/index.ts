/**
 * Re-exports everything from LLM sub-modules for backward compatibility.
 */

// client
export {
  callLlm,
  estimateCostUsd,
  logLlmUsage,
  hasLlmKeys,
  hasGeminiKey,
  withRetry,
  sleep,
} from "./client";
export type { LlmUsage, LlmResult } from "./client";

// parser
export { safeJsonParse } from "./parser";

// prompts
export {
  convertLunarInputToSolar,
  sanitizeName,
  sanitizeInputForPrompt,
  FIXED_JASI_NOTICE_KO,
  getPersonalityDef,
  getSectionChunks,
  getSectionPromptsForLocale,
  getI18nSystemPrompt,
  getReportTexts,
  buildPaidReportPrompt,
  LANGUAGE_NAMES,
} from "./prompts";

// reportBuilder
export {
  normalizeToReportDetail,
  generateFreePersonality,
  generateChunkedReport,
} from "./reportBuilder";
