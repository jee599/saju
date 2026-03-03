"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Types ── */
interface KPI {
  totalRequests: number;
  totalOrders: number;
  confirmedOrders: number;
  revenue: Record<string, number>;
  llmCostUsd: number;
  llmTokens: number;
}
interface DailyRow {
  date: string;
  requests: number;
  orders: number;
  confirmed: number;
  revenue: number;
}
interface OrderRow {
  id: string;
  name: string;
  birthDate: string;
  gender: string;
  email: string | null;
  amount: number;
  currency: string;
  countryCode: string;
  paymentProvider: string | null;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  refundable: boolean;
}
interface LogRow {
  id: string;
  ip?: string;
  endpoint?: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  costUsd?: number;
  userName?: string | null;
  createdAt: string;
}

/* ── Helpers ── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function formatCurrency(amount: number, currency: string) {
  if (currency === "KRW") return `${amount.toLocaleString()}원`;
  if (currency === "USD") return `$${(amount / 100).toFixed(2)}`;
  if (currency === "JPY") return `¥${amount.toLocaleString()}`;
  return `${amount.toLocaleString()} ${currency}`;
}

const STATUS_COLORS: Record<string, string> = {
  created: "#f59e0b",
  confirmed: "#10b981",
  refunded: "#ef4444",
};

/* ── Styles (inline for standalone admin page) ── */
const S = {
  page: { background: "#0f0a1a", color: "#e8e0f0", minHeight: "100vh", padding: "24px" } as const,
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 } as const,
  title: { fontSize: "1.5rem", fontWeight: 700, margin: 0 } as const,
  tabs: { display: "flex", gap: 8, marginBottom: 24 } as const,
  tab: (active: boolean) => ({
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)",
    background: active ? "rgba(196,139,159,0.2)" : "rgba(255,255,255,0.05)",
    color: active ? "#fff" : "#a89bb8",
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
    fontSize: "0.9rem",
  }) as const,
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 } as const,
  kpiCard: { background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" } as const,
  kpiLabel: { fontSize: "0.78rem", color: "#a89bb8", marginBottom: 4 } as const,
  kpiValue: { fontSize: "1.5rem", fontWeight: 700 } as const,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.8rem" },
  th: { textAlign: "left" as const, padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#a89bb8", fontWeight: 500, fontSize: "0.78rem" },
  td: { padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  badge: (color: string) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: "0.75rem",
    fontWeight: 600,
    background: color + "22",
    color,
  }),
  loginBox: {
    maxWidth: "min(360px, calc(100vw - 32px))",
    margin: "120px auto",
    background: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: "clamp(20px, 4vw, 32px)",
    border: "1px solid rgba(255,255,255,0.08)",
  } as const,
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    color: "#e8e0f0",
    fontSize: "0.95rem",
    outline: "none",
    marginBottom: 12,
    boxSizing: "border-box" as const,
  },
  btn: {
    width: "100%",
    padding: "10px 0",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #C48B9F, #D4AF37)",
    color: "#1A0A2E",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
  } as const,
  chartBar: (pct: number, color: string) => ({
    height: 4,
    borderRadius: 2,
    background: color,
    width: `${Math.max(2, pct)}%`,
    transition: "width 0.3s",
  }),
  pagination: { display: "flex", gap: 8, justifyContent: "center", marginTop: 16, alignItems: "center" } as const,
  pageBtn: (active: boolean) => ({
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.1)",
    background: active ? "rgba(196,139,159,0.3)" : "rgba(255,255,255,0.05)",
    color: "#e8e0f0",
    cursor: "pointer",
    fontSize: "0.85rem",
  }),
  filterRow: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" as const, alignItems: "center" },
  select: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    color: "#e8e0f0",
    fontSize: "0.85rem",
    outline: "none",
  },
  dateInput: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    color: "#e8e0f0",
    fontSize: "0.85rem",
    outline: "none",
    colorScheme: "dark",
  } as const,
};

/* ── API helper ── */
function adminFetch(path: string) {
  return fetch(path, { credentials: "same-origin" }).then((r) => r.json());
}

/* ── Login Component ── */
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ password: pw }),
    }).then((r) => r.json());
    setLoading(false);
    if (res.ok) {
      onLogin();
    } else {
      setError("비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <div style={S.page}>
      <form style={S.loginBox} onSubmit={handleSubmit}>
        <h2 style={{ textAlign: "center", marginBottom: 24, fontSize: "1.2rem" }}>관리자 로그인</h2>
        <input
          type="password"
          placeholder="비밀번호를 입력하세요"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={S.input}
          autoFocus
        />
        {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: "0 0 8px" }}>{error}</p>}
        <button type="submit" style={S.btn} disabled={loading}>
          {loading ? "확인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}

/* ── Overview Tab ── */
function OverviewTab({ range, setRange }: { range: string; setRange: (r: string) => void }) {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminFetch(`/api/admin/stats?range=${range}`).then((res) => {
      if (res.ok) {
        setKpi(res.data.kpi);
        setDaily(res.data.daily);
      }
      setLoading(false);
    });
  }, [range]);

  if (loading) return <p style={{ color: "#a89bb8" }}>로딩 중...</p>;
  if (!kpi) return <p style={{ color: "#ef4444" }}>데이터를 불러올 수 없습니다.</p>;

  const maxReq = Math.max(...daily.map((d) => d.requests), 1);
  const revenueStr = Object.entries(kpi.revenue)
    .map(([cur, amt]) => formatCurrency(amt, cur))
    .join(" / ") || "0원";
  const convRate = kpi.totalRequests > 0 ? ((kpi.confirmedOrders / kpi.totalRequests) * 100).toFixed(1) : "0";

  return (
    <>
      <div style={S.filterRow}>
        {["7d", "30d", "90d"].map((r) => (
          <button key={r} style={S.tab(range === r)} onClick={() => setRange(r)}>
            {r === "7d" ? "7일" : r === "30d" ? "30일" : "90일"}
          </button>
        ))}
      </div>

      <div style={S.kpiGrid}>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>총 분석 요청</div>
          <div style={S.kpiValue}>{kpi.totalRequests.toLocaleString()}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>결제 시도</div>
          <div style={S.kpiValue}>{kpi.totalOrders.toLocaleString()}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>결제 완료</div>
          <div style={{ ...S.kpiValue, color: "#10b981" }}>{kpi.confirmedOrders.toLocaleString()}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>전환율</div>
          <div style={S.kpiValue}>{convRate}%</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>매출</div>
          <div style={{ ...S.kpiValue, color: "#D4AF37" }}>{revenueStr}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>LLM 비용 (USD)</div>
          <div style={S.kpiValue}>${kpi.llmCostUsd.toFixed(2)}</div>
        </div>
      </div>

      <h3 style={{ fontSize: "1rem", marginBottom: 12 }}>일별 분석 요청</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 24 }}>
        {daily.slice(-14).map((d) => (
          <div key={d.date} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem" }}>
            <span style={{ width: 70, color: "#a89bb8", flexShrink: 0 }}>{d.date.slice(5)}</span>
            <div style={{ flex: 1, position: "relative", height: 16, display: "flex", alignItems: "center" }}>
              <div style={S.chartBar((d.requests / maxReq) * 100, "#C48B9F")} />
            </div>
            <span style={{ width: 30, textAlign: "right", flexShrink: 0 }}>{d.requests}</span>
            <span style={{ width: 50, textAlign: "right", color: "#10b981", flexShrink: 0, fontSize: "0.75rem" }}>
              {d.confirmed > 0 ? `+${d.confirmed}건` : ""}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Orders Tab ── */
function OrdersTab() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminFetch(`/api/admin/orders?status=${status}&page=${page}&limit=20`).then((res) => {
      if (res.ok) {
        setOrders(res.data.orders);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
      setLoading(false);
    });
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div style={S.filterRow}>
        <span style={{ color: "#a89bb8", fontSize: "0.85rem" }}>상태:</span>
        {["all", "created", "confirmed", "refunded"].map((s) => (
          <button key={s} style={S.tab(status === s)} onClick={() => { setStatus(s); setPage(1); }}>
            {s === "all" ? "전체" : s === "created" ? "생성" : s === "confirmed" ? "완료" : "환불"}
          </button>
        ))}
        <span style={{ marginLeft: "auto", color: "#a89bb8", fontSize: "0.85rem" }}>총 {total}건</span>
      </div>

      {loading ? (
        <p style={{ color: "#a89bb8" }}>로딩 중...</p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>ID</th>
                  <th style={S.th}>이름</th>
                  <th style={S.th}>생년월일</th>
                  <th style={S.th}>이메일</th>
                  <th style={S.th}>금액</th>
                  <th style={S.th}>상태</th>
                  <th style={S.th}>결제수단</th>
                  <th style={S.th}>생성일</th>
                  <th style={S.th}>환불</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={S.td}><code style={{ fontSize: "0.75rem" }}>{o.id.slice(0, 8)}...</code></td>
                    <td style={S.td}>{o.name}</td>
                    <td style={S.td}>{o.birthDate}</td>
                    <td style={S.td}>{o.email ?? "-"}</td>
                    <td style={S.td}>{formatCurrency(o.amount, o.currency)}</td>
                    <td style={S.td}>
                      <span style={S.badge(STATUS_COLORS[o.status] ?? "#888")}>{o.status}</span>
                    </td>
                    <td style={S.td}>{o.paymentProvider ?? "-"}</td>
                    <td style={S.td}>{formatDate(o.createdAt)}</td>
                    <td style={S.td}>
                      {o.refundable ? <span style={S.badge("#f59e0b")}>환불가능</span> : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={S.pagination}>
            <button style={S.pageBtn(false)} onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
              이전
            </button>
            <span style={{ color: "#a89bb8", fontSize: "0.85rem" }}>{page} / {totalPages}</span>
            <button style={S.pageBtn(false)} onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
              다음
            </button>
          </div>
        </>
      )}
    </>
  );
}

/* ── Logs Tab ── */
function LogsTab() {
  const [logType, setLogType] = useState<"activity" | "llm">("activity");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminFetch(`/api/admin/logs?type=${logType}&page=${page}&limit=50`).then((res) => {
      if (res.ok) {
        setLogs(res.data.logs);
        setTotalPages(res.data.totalPages);
      }
      setLoading(false);
    });
  }, [logType, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div style={S.filterRow}>
        <button style={S.tab(logType === "activity")} onClick={() => { setLogType("activity"); setPage(1); }}>
          API 요청 로그
        </button>
        <button style={S.tab(logType === "llm")} onClick={() => { setLogType("llm"); setPage(1); }}>
          LLM 사용량
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#a89bb8" }}>로딩 중...</p>
      ) : logType === "activity" ? (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>시간</th>
                  <th style={S.th}>IP</th>
                  <th style={S.th}>엔드포인트</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={S.td}>{formatDate(l.createdAt)}</td>
                    <td style={S.td}><code style={{ fontSize: "0.8rem" }}>{l.ip}</code></td>
                    <td style={S.td}>{l.endpoint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={S.pagination}>
            <button style={S.pageBtn(false)} onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>이전</button>
            <span style={{ color: "#a89bb8", fontSize: "0.85rem" }}>{page} / {totalPages}</span>
            <button style={S.pageBtn(false)} onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>다음</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>시간</th>
                  <th style={S.th}>모델</th>
                  <th style={S.th}>유저</th>
                  <th style={S.th}>입력</th>
                  <th style={S.th}>출력</th>
                  <th style={S.th}>시간(ms)</th>
                  <th style={S.th}>비용($)</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={S.td}>{formatDate(l.createdAt)}</td>
                    <td style={S.td}><code style={{ fontSize: "0.8rem" }}>{l.model}</code></td>
                    <td style={S.td}>{l.userName ?? "-"}</td>
                    <td style={S.td}>{l.inputTokens?.toLocaleString() ?? "-"}</td>
                    <td style={S.td}>{l.outputTokens?.toLocaleString() ?? "-"}</td>
                    <td style={S.td}>{l.durationMs?.toLocaleString() ?? "-"}</td>
                    <td style={S.td}>{l.costUsd != null ? `$${l.costUsd.toFixed(4)}` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={S.pagination}>
            <button style={S.pageBtn(false)} onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>이전</button>
            <span style={{ color: "#a89bb8", fontSize: "0.85rem" }}>{page} / {totalPages}</span>
            <button style={S.pageBtn(false)} onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>다음</button>
          </div>
        </>
      )}
    </>
  );
}

/* ── Analytics Types ── */
interface FunnelRow { step: string; count: number }
interface TimingRow { name: string; avgMs: number; samples: number }
interface AnalyticsData {
  funnel: FunnelRow[];
  timing: TimingRow[];
  behavior: {
    choices: Record<string, Record<string, number>>;
    hourly: number[];
    device: Record<string, number>;
    locale: Record<string, number>;
  };
  engagement: {
    scroll: Record<string, { avg: number; samples: number }>;
    sections: Record<string, number>;
  };
}

const FUNNEL_LABELS: Record<string, string> = {
  form_start: "폼 시작",
  form_step_birthdate: "생년월일 입력",
  form_step_birthtime: "태어난 시 입력",
  form_step_gender: "성별 선택",
  form_complete: "폼 완료",
  loading_start: "분석 시작",
  loading_complete: "분석 완료",
  result_view: "결과 열람",
  paywall_view: "결제 페이지",
  checkout_attempt: "결제 시도",
  checkout_complete: "결제 완료",
  report_view: "리포트 열람",
};

const TIMING_LABELS: Record<string, string> = {
  home_duration: "홈 체류시간",
  loading_duration: "로딩 대기시간",
  result_duration: "결과 열람시간",
  paywall_duration: "결제 체류시간",
  report_duration: "리포트 열람시간",
};

function formatDuration(ms: number) {
  if (ms === 0) return "-";
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

/* ── Analytics Tab ── */
function AnalyticsTab({ range, setRange }: { range: string; setRange: (r: string) => void }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminFetch(`/api/admin/analytics?range=${range}`).then((res) => {
      if (res.ok) setData(res.data);
      setLoading(false);
    });
  }, [range]);

  if (loading) return <p style={{ color: "#a89bb8" }}>로딩 중...</p>;
  if (!data) return <p style={{ color: "#ef4444" }}>데이터를 불러올 수 없습니다.</p>;

  const maxFunnel = Math.max(...data.funnel.map((f) => f.count), 1);
  const maxHourly = Math.max(...data.behavior.hourly, 1);

  return (
    <>
      <div style={S.filterRow}>
        {["7d", "30d", "90d"].map((r) => (
          <button key={r} style={S.tab(range === r)} onClick={() => setRange(r)}>
            {r === "7d" ? "7일" : r === "30d" ? "30일" : "90일"}
          </button>
        ))}
      </div>

      {/* ── 전환 퍼널 ── */}
      <h3 style={{ fontSize: "1rem", marginBottom: 12 }}>전환 퍼널</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 32 }}>
        {data.funnel.map((f, i) => {
          const prevCount = i > 0 ? data.funnel[i - 1].count : f.count;
          const dropRate = prevCount > 0 && i > 0 ? (((prevCount - f.count) / prevCount) * 100).toFixed(1) : null;
          return (
            <div key={f.step} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem" }}>
              <span style={{ width: 120, color: "#a89bb8", flexShrink: 0, fontSize: "0.78rem" }}>
                {FUNNEL_LABELS[f.step] ?? f.step}
              </span>
              <div style={{ flex: 1, position: "relative", height: 20, display: "flex", alignItems: "center" }}>
                <div style={{
                  ...S.chartBar((f.count / maxFunnel) * 100, i >= 9 ? "#10b981" : "#C48B9F"),
                  height: 16,
                  borderRadius: 4,
                }} />
              </div>
              <span style={{ width: 40, textAlign: "right", flexShrink: 0 }}>{f.count}</span>
              {dropRate !== null && (
                <span style={{ width: 55, textAlign: "right", flexShrink: 0, fontSize: "0.72rem", color: Number(dropRate) > 50 ? "#ef4444" : "#f59e0b" }}>
                  -{dropRate}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 평균 소요시간 ── */}
      <h3 style={{ fontSize: "1rem", marginBottom: 12 }}>평균 소요시간</h3>
      <div style={{ overflowX: "auto", marginBottom: 32 }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>페이지</th>
              <th style={S.th}>평균 시간</th>
              <th style={S.th}>샘플 수</th>
            </tr>
          </thead>
          <tbody>
            {data.timing.map((t) => (
              <tr key={t.name}>
                <td style={S.td}>{TIMING_LABELS[t.name] ?? t.name}</td>
                <td style={S.td}>{formatDuration(t.avgMs)}</td>
                <td style={S.td}>{t.samples.toLocaleString()}건</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 시간대별 방문 ── */}
      <h3 style={{ fontSize: "1rem", marginBottom: 12 }}>시간대별 방문 (KST)</h3>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 100, marginBottom: 32, padding: "0 4px" }}>
        {data.behavior.hourly.map((count, hour) => (
          <div key={hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{
              width: "100%",
              maxWidth: 24,
              height: `${Math.max(2, (count / maxHourly) * 80)}px`,
              background: hour >= 9 && hour <= 23 ? "#C48B9F" : "rgba(196,139,159,0.3)",
              borderRadius: 2,
              transition: "height 0.3s",
            }} />
            {hour % 3 === 0 && (
              <span style={{ fontSize: "0.65rem", color: "#a89bb8" }}>{hour}</span>
            )}
          </div>
        ))}
      </div>

      {/* ── 사용자 행동 분포 ── */}
      <h3 style={{ fontSize: "1rem", marginBottom: 12 }}>사용자 행동</h3>
      <div style={{ ...S.kpiGrid, marginBottom: 32 }}>
        {/* Device */}
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>기기 분포</div>
          {Object.entries(data.behavior.device).map(([d, c]) => (
            <div key={d} style={{ fontSize: "0.85rem", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span>{d === "mobile" ? "모바일" : d === "desktop" ? "데스크톱" : d}</span>
              <span style={{ fontWeight: 600 }}>{c}</span>
            </div>
          ))}
        </div>
        {/* Locale */}
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>언어 분포</div>
          {Object.entries(data.behavior.locale)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([l, c]) => (
              <div key={l} style={{ fontSize: "0.85rem", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span>{l.toUpperCase()}</span>
                <span style={{ fontWeight: 600 }}>{c}</span>
              </div>
            ))}
        </div>
        {/* Choices */}
        {Object.entries(data.behavior.choices).map(([choice, dist]) => (
          <div key={choice} style={S.kpiCard}>
            <div style={S.kpiLabel}>{choice === "gender" ? "성별" : choice === "calendar_type" ? "달력 유형" : choice === "birth_time" ? "태어난 시" : choice}</div>
            {Object.entries(dist)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([val, cnt]) => (
                <div key={val} style={{ fontSize: "0.85rem", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span>{val === "male" ? "남성" : val === "female" ? "여성" : val === "skipped" ? "미입력" : val === "solar" ? "양력" : val === "lunar" ? "음력" : val}</span>
                  <span style={{ fontWeight: 600 }}>{cnt}</span>
                </div>
              ))}
          </div>
        ))}
      </div>

      {/* ── 참여도 ── */}
      <h3 style={{ fontSize: "1rem", marginBottom: 12 }}>참여도</h3>
      <div style={{ ...S.kpiGrid, marginBottom: 32 }}>
        {/* Scroll depth */}
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>평균 스크롤 깊이</div>
          {Object.entries(data.engagement.scroll).length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#a89bb8" }}>데이터 없음</p>
          ) : (
            Object.entries(data.engagement.scroll).map(([page, info]) => (
              <div key={page} style={{ fontSize: "0.85rem", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span>{page}</span>
                <span style={{ fontWeight: 600 }}>{info.avg}% <span style={{ fontSize: "0.72rem", color: "#a89bb8" }}>({info.samples}건)</span></span>
              </div>
            ))
          )}
        </div>
        {/* Section views */}
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>리포트 섹션 조회</div>
          {Object.entries(data.engagement.sections).length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#a89bb8" }}>데이터 없음</p>
          ) : (
            Object.entries(data.engagement.sections)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([section, cnt]) => (
                <div key={section} style={{ fontSize: "0.85rem", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{section}</span>
                  <span style={{ fontWeight: 600 }}>{cnt}</span>
                </div>
              ))
          )}
        </div>
      </div>
    </>
  );
}

/* ── Main ── */
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"overview" | "orders" | "logs" | "analytics">("overview");
  const [range, setRange] = useState("30d");

  useEffect(() => {
    adminFetch('/api/admin/stats?range=7d').then((res) => {
      if (res?.ok) setAuthed(true);
    }).catch(() => {});
  }, []);


  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={S.header}>
          <h1 style={S.title}>복연구소 관리자</h1>
          <button
            style={{ ...S.tab(false), fontSize: "0.8rem" }}
            onClick={async () => { await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" }); setAuthed(false); }}
          >
            로그아웃
          </button>
        </div>

        <div style={S.tabs}>
          <button style={S.tab(tab === "overview")} onClick={() => setTab("overview")}>개요</button>
          <button style={S.tab(tab === "orders")} onClick={() => setTab("orders")}>주문</button>
          <button style={S.tab(tab === "logs")} onClick={() => setTab("logs")}>로그</button>
          <button style={S.tab(tab === "analytics")} onClick={() => setTab("analytics")}>분석</button>
        </div>

        {tab === "overview" && <OverviewTab range={range} setRange={setRange} />}
        {tab === "orders" && <OrdersTab />}
        {tab === "logs" && <LogsTab />}
        {tab === "analytics" && <AnalyticsTab range={range} setRange={setRange} />}
      </div>
    </div>
  );
}
