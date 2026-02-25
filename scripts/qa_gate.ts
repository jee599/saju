#!/usr/bin/env node
/**
 * QA Gate 검증 스크립트
 *
 * Usage:
 *   pnpm gate:check 0        # Phase 0 Gate 실행
 *   pnpm gate:status          # 전체 Gate 상태 출력
 *   pnpm gate:next            # 다음 Phase 착수 가능 여부
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Types ──────────────────────────────────────────────

interface GateEntry {
  status: "passed" | "in_progress" | "blocked";
  passedAt: string | null;
  hash: string | null;
  blockedBy?: number;
}

interface GateStatus {
  gates: Record<string, GateEntry>;
  lastChecked: string | null;
}

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

// ── Paths ──────────────────────────────────────────────

const ROOT = resolve(import.meta.dirname ?? __dirname, "..");
const STATUS_PATH = resolve(ROOT, ".qa/gate-status.json");

// ── Helpers ────────────────────────────────────────────

function loadStatus(): GateStatus {
  return JSON.parse(readFileSync(STATUS_PATH, "utf-8"));
}

function saveStatus(status: GateStatus): void {
  writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2) + "\n");
}

function run(cmd: string): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120_000,
    });
    return { ok: true, output: output.trim() };
  } catch (e: any) {
    return { ok: false, output: (e.stderr || e.stdout || e.message).trim() };
  }
}

function getGitHash(): string {
  const { output } = run("git rev-parse --short HEAD");
  return output || "unknown";
}

// ── Phase Check Definitions ────────────────────────────

function checksForPhase(phase: number): Array<() => CheckResult> {
  switch (phase) {
    case 0:
      return [
        () => {
          const r = run("pnpm typecheck");
          return { name: "typecheck", passed: r.ok, detail: r.ok ? "All packages pass" : r.output.slice(-300) };
        },
        () => {
          const r = run("pnpm test");
          return { name: "vitest", passed: r.ok, detail: r.ok ? "All tests pass" : r.output.slice(-300) };
        },
        () => {
          const r = run("pnpm --filter @saju/web exec next build");
          return { name: "build (web)", passed: r.ok, detail: r.ok ? "Build succeeded" : r.output.slice(-300) };
        },
        () => {
          const r = run(
            `pnpm --filter @saju/api exec prisma migrate status`
          );
          const hasPending = r.output.includes("have not yet been applied");
          return {
            name: "prisma migrate",
            passed: r.ok && !hasPending,
            detail: hasPending ? "Pending migrations found" : r.ok ? "All migrations applied" : r.output.slice(-300),
          };
        },
      ];

    case 1:
      return [
        // Phase 1 checks inherit Phase 0
        ...checksForPhase(0),
        () => {
          // Golden test suite — 사주 계산 골든 케이스 100% 통과 필수
          const r = run("pnpm test -- packages/engine/saju/src/__tests__/golden.test.ts");
          const passMatch = r.output.match(/(\d+) passed/);
          const failMatch = r.output.match(/(\d+) failed/);
          const passed = parseInt(passMatch?.[1] ?? "0", 10);
          const failed = parseInt(failMatch?.[1] ?? "0", 10);
          return {
            name: "saju golden tests",
            passed: r.ok && failed === 0 && passed >= 30,
            detail: r.ok
              ? `${passed} golden cases passed, ${failed} failed`
              : r.output.slice(-300),
          };
        },
        () => {
          // Engine typecheck
          const r = run("pnpm --filter @saju/engine-saju typecheck");
          return {
            name: "engine typecheck",
            passed: r.ok,
            detail: r.ok ? "Engine types OK" : r.output.slice(-300),
          };
        },
        () => {
          // Prompt v2 QA tests — 프롬프트 구조 + 금지 패턴 + 스키마 검증
          const r = run("pnpm test -- packages/api/src/__tests__/reportPrompt.test.ts");
          const passMatch = r.output.match(/(\d+) passed/);
          const failMatch = r.output.match(/(\d+) failed/);
          const passed = parseInt(passMatch?.[1] ?? "0", 10);
          const failed = parseInt(failMatch?.[1] ?? "0", 10);
          return {
            name: "prompt v2 QA tests",
            passed: r.ok && failed === 0 && passed >= 20,
            detail: r.ok
              ? `${passed} prompt QA tests passed, ${failed} failed`
              : r.output.slice(-300),
          };
        },
      ];

    case 2:
      return [
        ...checksForPhase(1),
        () => ({
          name: "palmistry engine",
          passed: false,
          detail: "Not yet implemented — Phase 2 손금 엔진",
        }),
      ];

    case 3:
      return [
        ...checksForPhase(2),
        () => ({
          name: "name analysis engine",
          passed: false,
          detail: "Not yet implemented — Phase 3 이름풀이 엔진",
        }),
      ];

    case 4:
      return [
        ...checksForPhase(3),
        () => ({
          name: "face reading engine",
          passed: false,
          detail: "Not yet implemented — Phase 4 관상 엔진",
        }),
      ];

    default:
      return [() => ({ name: "unknown phase", passed: false, detail: `Phase ${phase} is not defined` })];
  }
}

// ── Commands ───────────────────────────────────────────

function cmdStatus(): void {
  const status = loadStatus();
  console.log("\n📋 QA Gate Status\n");
  console.log("Phase  Status        Passed At                 Commit");
  console.log("─────  ────────────  ────────────────────────  ───────");
  for (const [phase, entry] of Object.entries(status.gates)) {
    const icon =
      entry.status === "passed" ? "✅" : entry.status === "in_progress" ? "🔄" : "🔒";
    const passedAt = entry.passedAt ?? "—";
    const hash = entry.hash ?? "—";
    console.log(
      `  ${phase}    ${icon} ${entry.status.padEnd(12)}  ${passedAt.padEnd(24)}  ${hash}`
    );
  }
  if (status.lastChecked) {
    console.log(`\nLast checked: ${status.lastChecked}`);
  }
  console.log();
}

function cmdCheck(phase: number): void {
  const status = loadStatus();
  const entry = status.gates[String(phase)];

  if (!entry) {
    console.error(`❌ Phase ${phase} is not defined in gate-status.json`);
    process.exit(1);
  }

  // Check if previous gate is passed (unless phase 0)
  if (phase > 0) {
    const prev = status.gates[String(phase - 1)];
    if (!prev || prev.status !== "passed") {
      console.error(`🔒 Phase ${phase} is blocked — Gate ${phase - 1} has not passed yet.`);
      console.error(`   Run: pnpm gate:check ${phase - 1}`);
      process.exit(1);
    }
  }

  console.log(`\n🔍 Running Gate ${phase} checks...\n`);

  const checks = checksForPhase(phase);
  const results: CheckResult[] = [];
  let allPassed = true;

  for (const check of checks) {
    process.stdout.write(`  ⏳ ${check.name}...`);
    const result = check();
    results.push(result);
    if (result.passed) {
      console.log(`\r  ✅ ${result.name}: ${result.detail}`);
    } else {
      console.log(`\r  ❌ ${result.name}: ${result.detail}`);
      allPassed = false;
    }
  }

  console.log();

  // Update status
  status.lastChecked = new Date().toISOString();
  if (allPassed) {
    status.gates[String(phase)] = {
      status: "passed",
      passedAt: new Date().toISOString(),
      hash: getGitHash(),
    };
    // Unblock next phase
    const nextPhase = String(phase + 1);
    if (status.gates[nextPhase] && status.gates[nextPhase].status === "blocked") {
      status.gates[nextPhase].status = "in_progress";
    }
    console.log(`🎉 Gate ${phase} PASSED! (commit: ${getGitHash()})`);
    if (status.gates[String(phase + 1)]) {
      console.log(`   Phase ${phase + 1} is now unblocked.\n`);
    }
  } else {
    status.gates[String(phase)].status = "in_progress";
    const failed = results.filter((r) => !r.passed).length;
    console.log(`💥 Gate ${phase} FAILED — ${failed}/${results.length} checks did not pass.\n`);
    console.log("Fix the issues above and run again:");
    console.log(`   pnpm gate:check ${phase}\n`);
  }

  saveStatus(status);
  process.exit(allPassed ? 0 : 1);
}

function cmdNext(): void {
  const status = loadStatus();
  let nextPhase: number | null = null;

  for (const [phase, entry] of Object.entries(status.gates)) {
    if (entry.status === "in_progress") {
      nextPhase = parseInt(phase, 10);
      break;
    }
  }

  if (nextPhase === null) {
    const allPassed = Object.values(status.gates).every((e) => e.status === "passed");
    if (allPassed) {
      console.log("\n🎉 All gates passed! Ready for launch.\n");
    } else {
      console.log("\n🔒 No phase is currently unblocked. Check gate:status for details.\n");
    }
    return;
  }

  console.log(`\n➡️  Next phase to work on: Phase ${nextPhase}`);
  console.log(`   Run: pnpm gate:check ${nextPhase}\n`);
}

// ── CLI ────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--status") || args[0] === "status") {
  cmdStatus();
} else if (args.includes("--next") || args[0] === "next") {
  cmdNext();
} else if (args.includes("--phase") || /^\d+$/.test(args[0] ?? "")) {
  const phaseIdx = args.indexOf("--phase");
  const phase = phaseIdx >= 0 ? parseInt(args[phaseIdx + 1], 10) : parseInt(args[0], 10);
  if (isNaN(phase)) {
    console.error("Usage: qa_gate.ts --phase <N>");
    process.exit(1);
  }
  cmdCheck(phase);
} else {
  console.log(`
QA Gate — Phase 진행 관리 도구

Usage:
  pnpm gate:status          전체 Gate 상태 확인
  pnpm gate:check <N>       Phase N Gate 실행
  pnpm gate:next            다음 Phase 안내
`);
}
