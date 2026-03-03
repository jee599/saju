import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saju/api/db";
import { checkAdminAuth } from "../_auth";

export async function GET(req: NextRequest) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;

  const range = req.nextUrl.searchParams.get("range") || "30d";
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const since = new Date(Date.now() - days * 86400000);

  // ── Funnel: count distinct sessions per step ──
  const funnelSteps = [
    "form_start",
    "form_step_birthdate",
    "form_step_birthtime",
    "form_step_gender",
    "form_complete",
    "loading_start",
    "loading_complete",
    "result_view",
    "paywall_view",
    "checkout_attempt",
    "checkout_complete",
    "report_view",
  ];

  const funnelCounts = await Promise.all(
    funnelSteps.map(async (step) => {
      const rows = await prisma.eventLog.groupBy({
        by: ["sessionId"],
        where: { eventName: step, createdAt: { gte: since } },
      });
      return { step, count: rows.length };
    }),
  );

  // ── Timing: average duration for key pages ──
  const timingNames = [
    "home_duration",
    "loading_duration",
    "result_duration",
    "paywall_duration",
    "report_duration",
  ];

  const timingData = await Promise.all(
    timingNames.map(async (name) => {
      const events = await prisma.eventLog.findMany({
        where: { eventName: name, eventType: "timing", createdAt: { gte: since } },
        select: { properties: true },
      });
      const durations = events
        .map((e) => {
          try {
            return (JSON.parse(e.properties) as Record<string, unknown>).durationMs as number;
          } catch {
            return null;
          }
        })
        .filter((d): d is number => d != null && d > 0);
      return {
        name,
        avgMs: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
        samples: durations.length,
      };
    }),
  );

  // ── Behavior: choice distribution ──
  const choiceEvents = await prisma.eventLog.findMany({
    where: { eventType: "choice", createdAt: { gte: since } },
    select: { eventName: true, properties: true },
  });

  const choiceDist: Record<string, Record<string, number>> = {};
  for (const ev of choiceEvents) {
    try {
      const props = JSON.parse(ev.properties) as Record<string, unknown>;
      const key = ev.eventName;
      const val = String(props.value);
      if (!choiceDist[key]) choiceDist[key] = {};
      choiceDist[key]![val] = (choiceDist[key]![val] || 0) + 1;
    } catch {
      /* ignore */
    }
  }

  // ── Hourly visit distribution ──
  const allPageViews = await prisma.eventLog.findMany({
    where: { eventType: "page_view", createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const hourly = Array.from({ length: 24 }, () => 0);
  for (const pv of allPageViews) {
    // KST hours
    const kst = new Date(pv.createdAt.getTime() + 9 * 3600000);
    hourly[kst.getUTCHours()]++;
  }

  // ── Device & locale distribution ──
  const deviceDist: Record<string, number> = {};
  const localeDist: Record<string, number> = {};
  const sessionEvents = await prisma.eventLog.findMany({
    where: { eventType: "page_view", createdAt: { gte: since } },
    select: { device: true, locale: true, sessionId: true },
    distinct: ["sessionId"],
  });
  for (const se of sessionEvents) {
    const d = se.device || "unknown";
    const l = se.locale || "unknown";
    deviceDist[d] = (deviceDist[d] || 0) + 1;
    localeDist[l] = (localeDist[l] || 0) + 1;
  }

  // ── Engagement: scroll depths ──
  const scrollEvents = await prisma.eventLog.findMany({
    where: { eventName: "scroll_depth", createdAt: { gte: since } },
    select: { properties: true },
  });
  const scrollByPage: Record<string, number[]> = {};
  for (const se of scrollEvents) {
    try {
      const props = JSON.parse(se.properties) as Record<string, unknown>;
      const page = String(props.page ?? "unknown");
      const depth = Number(props.depth);
      if (!scrollByPage[page]) scrollByPage[page] = [];
      scrollByPage[page]!.push(depth);
    } catch {
      /* ignore */
    }
  }
  const scrollAvg: Record<string, { avg: number; samples: number }> = {};
  for (const [page, depths] of Object.entries(scrollByPage)) {
    scrollAvg[page] = {
      avg: Math.round(depths.reduce((a, b) => a + b, 0) / depths.length),
      samples: depths.length,
    };
  }

  // ── Section views for report ──
  const sectionViews = await prisma.eventLog.findMany({
    where: { eventName: "section_view", createdAt: { gte: since } },
    select: { properties: true },
  });
  const sectionCounts: Record<string, number> = {};
  for (const sv of sectionViews) {
    try {
      const props = JSON.parse(sv.properties) as Record<string, unknown>;
      const section = String(props.section ?? "unknown");
      sectionCounts[section] = (sectionCounts[section] || 0) + 1;
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      funnel: funnelCounts,
      timing: timingData,
      behavior: { choices: choiceDist, hourly, device: deviceDist, locale: localeDist },
      engagement: { scroll: scrollAvg, sections: sectionCounts },
    },
  });
}
