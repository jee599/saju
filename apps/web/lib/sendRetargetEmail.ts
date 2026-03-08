import { Resend } from "resend";
import { logger } from "./logger";

type Locale = "ko" | "en" | "ja" | "zh" | "th" | "vi" | "id" | "hi";

interface SendRetargetEmailParams {
  to: string;
  userName: string;
  locale: Locale;
  checkoutUrl: string;
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

const i18n: Record<Locale, {
  subject: (name: string) => string;
  subtitle: string;
  greeting: (name: string) => string;
  body: string;
  cta: string;
  footer: string;
}> = {
  ko: {
    subject: (name) => `${name}님, 사주 분석이 기다리고 있어요`,
    subtitle: "AI 사주 분석",
    greeting: (name) => `${name}님, 안녕하세요!`,
    body: "입력하신 정보를 바탕으로 사주 분석을 준비해두었습니다. 지금 결제를 완료하시면 바로 상세 리포트를 받아보실 수 있습니다.",
    cta: "분석 리포트 받기",
    footer: "더 이상 이메일을 받지 않으시려면 이 메일을 무시해주세요.",
  },
  en: {
    subject: (name) => `${name}, your fortune analysis is waiting`,
    subtitle: "AI Fortune Analysis",
    greeting: (name) => `Hi ${name}!`,
    body: "We've prepared a detailed fortune analysis based on your birth information. Complete your purchase now to unlock your full report.",
    cta: "Get Your Report",
    footer: "If you no longer wish to receive these emails, simply ignore this message.",
  },
  ja: {
    subject: (name) => `${name}さん、四柱推命の分析結果をお待ちです`,
    subtitle: "AI四柱推命分析",
    greeting: (name) => `${name}さん、こんにちは！`,
    body: "ご入力いただいた情報をもとに、四柱推命の分析を準備いたしました。今すぐお支払いを完了して、詳細レポートをご覧ください。",
    cta: "レポートを受け取る",
    footer: "今後メールの受信を希望されない場合は、このメールを無視してください。",
  },
  zh: {
    subject: (name) => `${name}，您的命理分析已准备就绪`,
    subtitle: "AI命理分析",
    greeting: (name) => `${name}，您好！`,
    body: "我们已根据您的出生信息准备了详细的命理分析。立即完成付款，即可获取完整报告。",
    cta: "获取报告",
    footer: "如果您不想再收到此类邮件，请忽略此消息。",
  },
  th: {
    subject: (name) => `${name} การวิเคราะห์ดวงชะตาของคุณรอคุณอยู่`,
    subtitle: "การวิเคราะห์ดวงชะตาด้วย AI",
    greeting: (name) => `สวัสดี ${name}!`,
    body: "เราได้เตรียมการวิเคราะห์ดวงชะตาโดยละเอียดจากข้อมูลวันเกิดของคุณแล้ว ชำระเงินตอนนี้เพื่อรับรายงานฉบับเต็ม",
    cta: "รับรายงาน",
    footer: "หากคุณไม่ต้องการรับอีเมลเหล่านี้อีก กรุณาเพิกเฉยข้อความนี้",
  },
  vi: {
    subject: (name) => `${name}, phân tích vận mệnh của bạn đang chờ`,
    subtitle: "Phân tích vận mệnh AI",
    greeting: (name) => `Xin chào ${name}!`,
    body: "Chúng tôi đã chuẩn bị phân tích vận mệnh chi tiết dựa trên thông tin ngày sinh của bạn. Hoàn tất thanh toán ngay để nhận báo cáo đầy đủ.",
    cta: "Nhận báo cáo",
    footer: "Nếu bạn không muốn nhận email này nữa, vui lòng bỏ qua tin nhắn này.",
  },
  id: {
    subject: (name) => `${name}, analisis nasib Anda sudah siap`,
    subtitle: "Analisis Nasib AI",
    greeting: (name) => `Halo ${name}!`,
    body: "Kami telah menyiapkan analisis nasib terperinci berdasarkan informasi kelahiran Anda. Selesaikan pembayaran sekarang untuk mendapatkan laporan lengkap.",
    cta: "Dapatkan Laporan",
    footer: "Jika Anda tidak ingin menerima email ini lagi, abaikan saja pesan ini.",
  },
  hi: {
    subject: (name) => `${name}, आपका भाग्य विश्लेषण आपका इंतज़ार कर रहा है`,
    subtitle: "AI भाग्य विश्लेषण",
    greeting: (name) => `नमस्ते ${name}!`,
    body: "हमने आपकी जन्म जानकारी के आधार पर एक विस्तृत भाग्य विश्लेषण तैयार किया है। अपनी पूरी रिपोर्ट प्राप्त करने के लिए अभी भुगतान पूरा करें।",
    cta: "रिपोर्ट प्राप्त करें",
    footer: "यदि आप ये ईमेल प्राप्त नहीं करना चाहते, तो कृपया इस संदेश को अनदेखा करें।",
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(params: SendRetargetEmailParams): string {
  const { userName, locale, checkoutUrl } = params;
  const t = i18n[locale] ?? i18n.en;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_COLOR};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="text-align:center;padding:0 0 32px;">
          <p style="margin:0;font-size:28px;font-weight:800;color:${BRAND_COLOR};">FortuneLab</p>
          <p style="margin:8px 0 0;font-size:13px;color:${TEXT_SECONDARY};">${escapeHtml(t.subtitle)}</p>
        </td></tr>

        <!-- Main Card -->
        <tr><td style="padding:0 0 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,${CARD_BG},#251e38);border-radius:16px;border:1px solid rgba(196,139,159,0.25);">
            <tr><td style="padding:32px 24px;text-align:center;">
              <p style="margin:0 0 8px;font-size:36px;">&#x1F52E;</p>
              <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:${TEXT_PRIMARY};">${escapeHtml(t.greeting(userName))}</p>
              <p style="margin:0;font-size:15px;color:${TEXT_SECONDARY};line-height:1.7;">${escapeHtml(t.body)}</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- CTA Button -->
        <tr><td style="padding:0 0 32px;text-align:center;">
          <a href="${escapeHtml(checkoutUrl)}" style="display:inline-block;padding:16px 48px;background:${BRAND_COLOR};color:#fff;font-size:16px;font-weight:700;text-decoration:none;border-radius:8px;">
            ${escapeHtml(t.cta)}
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;border-top:1px solid rgba(196,139,159,0.15);text-align:center;">
          <p style="margin:0;font-size:12px;color:${TEXT_SECONDARY};line-height:1.6;">${escapeHtml(t.footer)}</p>
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

export async function sendRetargetEmail(
  params: SendRetargetEmailParams
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[retarget] RESEND_API_KEY not set, skipping email");
    return { success: false, error: "RESEND_API_KEY not set" };
  }

  try {
    const t = i18n[params.locale] ?? i18n.en;
    const html = buildHtml(params);

    const { error } = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "FortuneLab <noreply@fortunelab.store>",
      to: params.to,
      subject: t.subject(params.userName),
      html,
    });

    if (error) {
      logger.error("[retarget] Resend error", { error });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    logger.error("[retarget] Failed", { error: err });
    return { success: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
