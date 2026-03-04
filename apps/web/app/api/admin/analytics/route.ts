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

  // ── Country analytics (from Orders) ──
  const countryOrders = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    select: { countryCode: true, status: true, amountKrw: true, amount: true, currency: true },
  });

  const countryStats: Record<string, { orders: number; confirmed: number; revenue: number }> = {};
  for (const o of countryOrders) {
    const cc = (o.countryCode || "kr").toUpperCase();
    if (!countryStats[cc]) countryStats[cc] = { orders: 0, confirmed: 0, revenue: 0 };
    countryStats[cc]!.orders += 1;
    if (o.status === "confirmed") {
      countryStats[cc]!.confirmed += 1;
      // Normalize revenue to USD estimate for comparison
      const cur = o.currency ?? "KRW";
      const amt = cur === "KRW" ? (o.amountKrw ?? 0) : (o.amount ?? 0);
      countryStats[cc]!.revenue += amt;
    }
  }

  // Country visits from EventLog (sessions by locale → country mapping)
  const countryVisits: Record<string, number> = {};
  for (const se of sessionEvents) {
    const l = (se.locale || "ko").toLowerCase();
    // Map locale to country code
    const cc = l === "ko" ? "KR" : l === "en" ? "US" : l === "ja" ? "JP" : l === "zh" ? "CN" : l.toUpperCase();
    countryVisits[cc] = (countryVisits[cc] || 0) + 1;
  }

  // ── LLM cost summary by model ──
  let llmByModel: Record<string, { count: number; totalCost: number; avgDurationMs: number }> = {};
  try {
    const llmRows = await prisma.llmUsage.findMany({
      where: { createdAt: { gte: since } },
      select: { model: true, estimatedCostUsd: true, durationMs: true },
    });
    for (const row of llmRows) {
      const m = row.model || "unknown";
      if (!llmByModel[m]) llmByModel[m] = { count: 0, totalCost: 0, avgDurationMs: 0 };
      llmByModel[m]!.count += 1;
      llmByModel[m]!.totalCost += row.estimatedCostUsd ?? 0;
      llmByModel[m]!.avgDurationMs += row.durationMs ?? 0;
    }
    for (const m of Object.keys(llmByModel)) {
      if (llmByModel[m]!.count > 0) {
        llmByModel[m]!.avgDurationMs = Math.round(llmByModel[m]!.avgDurationMs / llmByModel[m]!.count);
        llmByModel[m]!.totalCost = Math.round(llmByModel[m]!.totalCost * 10000) / 10000;
      }
    }
  } catch {
    /* ignore if llm_usage unavailable */
  }

  // ── Referrer distribution ──
  const referrerEvents = await prisma.eventLog.findMany({
    where: { eventType: "page_view", createdAt: { gte: since }, referrer: { not: null } },
    select: { referrer: true, sessionId: true },
    distinct: ["sessionId"],
  });
  const referrerDist: Record<string, number> = {};
  for (const re of referrerEvents) {
    if (!re.referrer) continue;
    try {
      const host = new URL(re.referrer).hostname.replace(/^www\./, "");
      referrerDist[host] = (referrerDist[host] || 0) + 1;
    } catch {
      const key = re.referrer.slice(0, 50);
      referrerDist[key] = (referrerDist[key] || 0) + 1;
    }
  }

  // ── Payment provider distribution ──
  const paymentOrders = await prisma.order.findMany({
    where: { status: "confirmed", createdAt: { gte: since } },
    select: { paymentProvider: true },
  });
  const paymentDist: Record<string, number> = {};
  for (const po of paymentOrders) {
    const p = po.paymentProvider || "unknown";
    paymentDist[p] = (paymentDist[p] || 0) + 1;
  }

  // ── UTM / Campaign analytics (from session_start events) ──
  const sessionStartEvents = await prisma.eventLog.findMany({
    where: { eventName: "session_start", createdAt: { gte: since } },
    select: { sessionId: true, properties: true },
  });

  const utmSourceDist: Record<string, number> = {};
  const utmMediumDist: Record<string, number> = {};
  const utmCampaignDist: Record<string, number> = {};
  const landingPageDist: Record<string, number> = {};
  const referrerDomainDist: Record<string, number> = {};
  let newUsers = 0;
  let returningUsers = 0;
  const utmSessionMap = new Map<string, Record<string, string>>(); // sessionId → utm params

  for (const ev of sessionStartEvents) {
    try {
      const props = JSON.parse(ev.properties) as Record<string, unknown>;
      const source = String(props.utm_source ?? "(organic)");
      const medium = String(props.utm_medium ?? "(none)");
      const campaign = String(props.utm_campaign ?? "(none)");
      const landing = String(props.landingPage ?? "/");
      const refDomain = String(props.referrerDomain ?? "(direct)");

      utmSourceDist[source] = (utmSourceDist[source] || 0) + 1;
      if (medium !== "(none)") utmMediumDist[medium] = (utmMediumDist[medium] || 0) + 1;
      if (campaign !== "(none)") utmCampaignDist[campaign] = (utmCampaignDist[campaign] || 0) + 1;
      landingPageDist[landing] = (landingPageDist[landing] || 0) + 1;
      referrerDomainDist[refDomain] = (referrerDomainDist[refDomain] || 0) + 1;

      if (props.isNewUser === true) newUsers++;
      else returningUsers++;

      // Store UTM params for conversion attribution
      if (props.utm_source) {
        utmSessionMap.set(ev.sessionId, {
          source: String(props.utm_source),
          medium: String(props.utm_medium ?? ""),
          campaign: String(props.utm_campaign ?? ""),
        });
      }
    } catch { /* ignore */ }
  }

  // ── Conversion by source (which UTM sources lead to checkouts) ──
  const checkoutSessions = await prisma.eventLog.findMany({
    where: { eventName: "checkout_complete", createdAt: { gte: since } },
    select: { sessionId: true },
    distinct: ["sessionId"],
  });

  const conversionBySource: Record<string, { sessions: number; conversions: number }> = {};
  // Count all sessions by source
  for (const [, utm] of utmSessionMap) {
    const src = utm.source || "(organic)";
    if (!conversionBySource[src]) conversionBySource[src] = { sessions: 0, conversions: 0 };
    conversionBySource[src]!.sessions += 1;
  }
  // Count conversions by source
  for (const checkout of checkoutSessions) {
    const utm = utmSessionMap.get(checkout.sessionId);
    const src = utm?.source || "(organic)";
    if (!conversionBySource[src]) conversionBySource[src] = { sessions: 0, conversions: 0 };
    conversionBySource[src]!.conversions += 1;
  }

  // ── Error summary ──
  const errorEvents = await prisma.eventLog.findMany({
    where: { eventType: "error", createdAt: { gte: since } },
    select: { eventName: true },
  });
  const errorDist: Record<string, number> = {};
  for (const e of errorEvents) {
    errorDist[e.eventName] = (errorDist[e.eventName] || 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    data: {
      funnel: funnelCounts,
      timing: timingData,
      behavior: { choices: choiceDist, hourly, device: deviceDist, locale: localeDist },
      engagement: { scroll: scrollAvg, sections: sectionCounts },
      country: { visits: countryVisits, stats: countryStats },
      llmByModel,
      referrers: referrerDist,
      payments: paymentDist,
      marketing: {
        utmSource: utmSourceDist,
        utmMedium: utmMediumDist,
        utmCampaign: utmCampaignDist,
        landingPages: landingPageDist,
        referrerDomains: referrerDomainDist,
        newUsers,
        returningUsers,
        conversionBySource,
      },
      errors: errorDist,
    },
  });
}
