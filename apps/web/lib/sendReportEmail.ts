import { Resend } from "resend";

interface ReportSection {
  key: string;
  title: string;
  text: string;
}

interface SendReportEmailParams {
  to: string;
  userName: string;
  headline: string;
  summary: string;
  sections: ReportSection[];
  recommendations: string[];
  disclaimer: string;
  reportUrl: string; // 웹에서 보기 링크
}

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const BRAND_COLOR = "#c48b9f";
const BG_COLOR = "#0e0b1a";
const CARD_BG = "#1a1528";
const TEXT_PRIMARY = "#f0e6d3";
const TEXT_SECONDARY = "#a89b8c";

function buildHtml(params: SendReportEmailParams): string {
  const { userName, headline, summary, sections, recommendations, disclaimer, reportUrl } = params;

  const sectionIcons: Record<string, string> = {
    "성격": "🧬", "직업": "💼", "연애": "💕", "금전": "💰",
    "건강": "🏥", "가족·배우자": "👨‍👩‍👧‍👦", "과거": "⏪",
    "현재": "📍", "미래": "🔮", "대운 타임라인": "📅",
  };

  const sectionsHtml = sections
    .map(
      (s) => `
      <tr><td style="padding: 0 0 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${CARD_BG};border-radius:12px;border:1px solid rgba(196,139,159,0.15);">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:${BRAND_COLOR};">
              ${sectionIcons[s.title] ?? "📋"} ${s.title}
            </p>
            <p style="margin:0;font-size:14px;line-height:1.8;color:${TEXT_PRIMARY};white-space:pre-wrap;">${escapeHtml(s.text)}</p>
          </td></tr>
        </table>
      </td></tr>`
    )
    .join("\n");

  const recsHtml =
    recommendations.length > 0
      ? `<tr><td style="padding:0 0 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${CARD_BG};border-radius:12px;border:1px solid rgba(196,139,159,0.15);">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:${BRAND_COLOR};">💡 추천 행동</p>
              ${recommendations.map((r) => `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${TEXT_PRIMARY};">• ${escapeHtml(r)}</p>`).join("\n")}
            </td></tr>
          </table>
        </td></tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_COLOR};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="text-align:center;padding:0 0 32px;">
          <p style="margin:0;font-size:28px;font-weight:800;color:${BRAND_COLOR};">FortuneLab</p>
          <p style="margin:8px 0 0;font-size:13px;color:${TEXT_SECONDARY};">AI 사주 분석 리포트</p>
        </td></tr>

        <!-- Headline -->
        <tr><td style="padding:0 0 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,${CARD_BG},#251e38);border-radius:16px;border:1px solid rgba(196,139,159,0.25);">
            <tr><td style="padding:28px 24px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:${TEXT_PRIMARY};">${escapeHtml(headline)}</p>
              ${summary ? `<p style="margin:12px 0 0;font-size:14px;color:${TEXT_SECONDARY};line-height:1.6;">${escapeHtml(summary)}</p>` : ""}
            </td></tr>
          </table>
        </td></tr>

        <!-- Sections -->
        ${sectionsHtml}

        <!-- Recommendations -->
        ${recsHtml}

        <!-- CTA Button -->
        <tr><td style="padding:0 0 24px;text-align:center;">
          <a href="${reportUrl}" style="display:inline-block;padding:14px 40px;background:${BRAND_COLOR};color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">
            웹에서 전체 리포트 보기
          </a>
        </td></tr>

        <!-- Disclaimer -->
        <tr><td style="padding:24px 0 0;border-top:1px solid rgba(196,139,159,0.15);text-align:center;">
          <p style="margin:0;font-size:12px;color:${TEXT_SECONDARY};line-height:1.6;">${escapeHtml(disclaimer)}</p>
          <p style="margin:12px 0 0;font-size:11px;color:${TEXT_SECONDARY};">
            &copy; ${new Date().getFullYear()} FortuneLab &mdash; fortunelab.store
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendReportEmail(params: SendReportEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set, skipping email");
    return { success: false, error: "RESEND_API_KEY not set" };
  }

  try {
    const html = buildHtml(params);

    const { error } = await getResend().emails.send({
      from: "FortuneLab <noreply@fortunelab.store>",
      to: params.to,
      subject: `${params.userName}님의 사주 분석 리포트가 완성되었습니다`,
      html,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[email] Report sent to ${params.to}`);
    return { success: true };
  } catch (err) {
    console.error("[email] Failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
