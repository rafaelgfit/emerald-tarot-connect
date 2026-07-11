const RESEND_API_URL = "https://api.resend.com/emails";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  userEmail?: string;
  userName?: string;
}

export async function sendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "SysOracle <onboarding@resend.dev>";
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurado");
  }
  const replyTo =
    input.replyTo ??
    (input.userEmail
      ? input.userName
        ? `${input.userName} <${input.userEmail}>`
        : input.userEmail
      : undefined);
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: replyTo,
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("Resend error", res.status, body);
    throw new Error(
      `Resend API ${res.status}: ${body ? JSON.stringify(body) : "erro desconhecido"}`,
    );
  }
  return body as { id?: string };
}

export function renderBrandedEmail(opts: {
  title: string;
  intro: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}) {
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<p style="margin:32px 0;text-align:center"><a href="${opts.ctaUrl}" style="background:#b8860b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">${opts.ctaLabel}</a></p>`
      : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f7f5f0;font-family:Georgia,serif;color:#2b2b2b">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
      <h1 style="font-size:22px;margin:0 0 8px;color:#1a1a1a">SysOracle</h1>
      <h2 style="font-size:18px;margin:24px 0 8px;color:#1a1a1a">${opts.title}</h2>
      <p style="font-size:15px;line-height:1.55;margin:0 0 16px">${opts.intro}</p>
      <div style="font-size:15px;line-height:1.55">${opts.bodyHtml}</div>
      ${cta}
      <hr style="border:none;border-top:1px solid #e5e0d6;margin:32px 0"/>
      <p style="font-size:12px;color:#888;margin:0">${opts.footer ?? "Você está recebendo este e-mail porque possui uma conta no SysOracle."}</p>
    </div>
  </body></html>`;
}