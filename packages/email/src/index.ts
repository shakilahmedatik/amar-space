import { env } from "@omniheaven/env";
import { createLogger } from "@omniheaven/logger";
import { createTransport, type Transporter } from "nodemailer";

const logger = createLogger("email");

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      ...(env.SMTP_USER && env.SMTP_PASS
        ? {
            auth: {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            },
          }
        : {}),
    });
  }
  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Transports transactional email via Nodemailer.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const transport = getTransporter();
  try {
    const info = await transport.sendMail({
      from: env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.subject,
    });
    logger.info(
      { to: options.to, subject: options.subject, messageId: info.messageId },
      "Email sent successfully",
    );
  } catch (err) {
    logger.error({ err, to: options.to, subject: options.subject }, "Failed to send email");
    // In dev or test environments, do not crash on mail delivery issues
    if (env.NODE_ENV === "production") {
      throw err;
    }
  }
}

/**
 * Responsive HTML template for user email verification.
 */
export function renderEmailVerificationTemplate(props: {
  name?: string | null;
  url: string;
}): string {
  const name = props.name || "Valued User";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify your omniHeaven Account</title>
</head>
<body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #FDFBF7; color: #2A201C; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #EADBCE; border-radius: 12px; padding: 32px;">
    <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #4A3728; margin-top: 0;">Welcome to omniHeaven</h2>
    <p>Dear ${name},</p>
    <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
    <div style="margin: 30px 0; text-align: center;">
      <a href="${props.url}" style="background-color: #C5A880; color: #1F1714; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block;">Verify Email Address</a>
    </div>
    <p style="font-size: 13px; color: #735E54;">If you did not create an omniHeaven account, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #EADBCE; margin: 24px 0;" />
    <p style="font-size: 11px; color: #A8988F; text-align: center;">omniHeaven &bull; Royal Heritage & Commercial Estate Management</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Responsive HTML template for password reset.
 */
export function renderPasswordResetTemplate(props: { name?: string | null; url: string }): string {
  const name = props.name || "Valued User";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your omniHeaven Password</title>
</head>
<body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #FDFBF7; color: #2A201C; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #EADBCE; border-radius: 12px; padding: 32px;">
    <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #4A3728; margin-top: 0;">Password Reset Request</h2>
    <p>Dear ${name},</p>
    <p>We received a request to reset your omniHeaven password. Click the button below to choose a new password. This link is valid for 15 minutes:</p>
    <div style="margin: 30px 0; text-align: center;">
      <a href="${props.url}" style="background-color: #4A3728; color: #FFFFFF; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block;">Reset Password</a>
    </div>
    <p style="font-size: 13px; color: #735E54;">If you did not request a password reset, no further action is required.</p>
    <hr style="border: none; border-top: 1px solid #EADBCE; margin: 24px 0;" />
    <p style="font-size: 11px; color: #A8988F; text-align: center;">omniHeaven Security</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Responsive HTML template for team member invitations.
 */
export function renderInvitationTemplate(props: {
  inviterName: string;
  orgName: string;
  role: string;
  inviteUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invitation to join ${props.orgName}</title>
</head>
<body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #FDFBF7; color: #2A201C; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #EADBCE; border-radius: 12px; padding: 32px;">
    <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #4A3728; margin-top: 0;">Team Invitation</h2>
    <p><strong>${props.inviterName}</strong> has invited you to join <strong>${props.orgName}</strong> as a <strong>${props.role}</strong> on omniHeaven.</p>
    <p>Please click below to accept your invitation and join the organization workspace:</p>
    <div style="margin: 30px 0; text-align: center;">
      <a href="${props.inviteUrl}" style="background-color: #C5A880; color: #1F1714; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block;">Accept Invitation</a>
    </div>
    <p style="font-size: 13px; color: #735E54;">This invitation link will expire in 7 days.</p>
    <hr style="border: none; border-top: 1px solid #EADBCE; margin: 24px 0;" />
    <p style="font-size: 11px; color: #A8988F; text-align: center;">omniHeaven Multi-Tenancy</p>
  </div>
</body>
</html>
  `.trim();
}
