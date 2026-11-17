import { Resend } from "resend";
import { env } from "@/lib/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

async function sendEmail(params: { to: string; subject: string; html: string }) {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY is not set — skipping send. Would have sent "${params.subject}" to ${params.to}.`,
    );
    return;
  }

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

function emailShell(title: string, bodyHtml: string) {
  return `
  <div style="background:#f8fafc;padding:40px 0;font-family:Inter,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:40px;border:1px solid #e2e8f0;">
      <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:24px;">
        <div style="width:32px;height:32px;border-radius:10px;background:#2563eb;"></div>
        <span style="font-weight:700;font-size:18px;color:#0f172a;">Stayly</span>
      </div>
      <h1 style="font-size:20px;color:#0f172a;margin:0 0 16px;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top:32px;font-size:13px;color:#64748b;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  </div>`;
}

function buttonHtml(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2563eb;color:#f8fafc;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">${label}</a>`;
}

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: "Verify your email — Stayly",
    html: emailShell(
      "Confirm your email address",
      `<p style="color:#334155;font-size:14px;line-height:1.6;">
        Welcome to Stayly! Please confirm your email address to activate your account.
      </p>
      ${buttonHtml(link, "Verify email")}
      <p style="font-size:12px;color:#94a3b8;word-break:break-all;">${link}</p>`,
    ),
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: "Reset your password — Stayly",
    html: emailShell(
      "Reset your password",
      `<p style="color:#334155;font-size:14px;line-height:1.6;">
        We received a request to reset your password. This link expires in 1 hour.
      </p>
      ${buttonHtml(link, "Reset password")}
      <p style="font-size:12px;color:#94a3b8;word-break:break-all;">${link}</p>`,
    ),
  });
}
