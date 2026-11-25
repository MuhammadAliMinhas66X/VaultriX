import nodemailer from 'nodemailer';

// Email goes out over HTTPS through Brevo when BREVO_API_KEY is set (works on
// Railway Hobby, which blocks outbound SMTP). If it is not set, the old SMTP
// path is used, so local development and paid plans keep working.

let transporter = null;

export const brevoConfigured = () => Boolean(process.env.BREVO_API_KEY);
const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

// MAIL_FROM can be "Vaultrix <me@example.com>" or just "me@example.com".
const parseFrom = () => {
  const raw = (process.env.MAIL_FROM || '').trim();
  if (!raw) return null;
  const match = raw.match(/^"?([^"<]*?)"?\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim() || 'Vaultrix', email: match[2].trim() };
  return { name: 'Vaultrix', email: raw };
};

const sendViaBrevo = async ({ to, subject, text, html }) => {
  const sender = parseFrom();
  if (!sender) throw new Error('MAIL_FROM must be set to a sender verified in Brevo');

  const payload = { sender, to: [{ email: to }], subject };
  if (html) payload.htmlContent = html;
  if (text) payload.textContent = text;
  if (!html && !text) payload.textContent = subject;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Brevo error ${res.status}: ${detail.slice(0, 300)}`);
  }
};

const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

export const sendMail = async ({ to, subject, text, html }) => {
  if (brevoConfigured()) {
    await sendViaBrevo({ to, subject, text, html });
    return;
  }

  if (!smtpConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email is not configured (set BREVO_API_KEY or SMTP_*)');
    }
    console.log(`\n[mail preview] to: ${to}\nsubject: ${subject}\n${text}\n`);
    return;
  }

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || `Vaultrix <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
};
