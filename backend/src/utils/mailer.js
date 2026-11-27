// Email sending. Two providers, tried in this order:
//
//   1. Resend (HTTPS API)  - used when RESEND_API_KEY is set.
//        RESEND_API_KEY  API key from the Resend dashboard (starts with "re_")
//        MAIL_FROM       Sender on a domain verified in Resend,
//                        e.g. "Vaultrix <noreply@vaultrix.org>"
//   2. SMTP (e.g. Gmail)   - used when Resend is not set, or when a Resend send fails.
//        SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
//        SMTP_FROM       optional; defaults to "Vaultrix <SMTP_USER>"
//
// With neither configured, development prints a mail preview to the console and
// production refuses to start (see config/env.js).
import nodemailer from 'nodemailer';

const RESEND_URL = 'https://api.resend.com/emails';
const MAX_ATTEMPTS = 3;

let transporter = null;

export const resendConfigured = () => Boolean(process.env.RESEND_API_KEY);
export const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendViaResend = async ({ to, subject, text, html }) => {
  const from = (process.env.MAIL_FROM || '').trim();
  if (!from) throw new Error('MAIL_FROM must be set to a sender on a domain verified in Resend');

  const payload = { from, to: [to], subject };
  if (html) payload.html = html;
  if (text) payload.text = text;
  if (!html && !text) payload.text = subject;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'vaultrix-backend/0.1',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) return;

    // Resend limits requests per second (429) and can have brief server errors
    // (5xx). Those are worth a short retry; anything else (bad key, unverified
    // domain, invalid address) will not fix itself, so fail right away.
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 5) * 1000 : 500 * attempt);
      continue;
    }

    const detail = await res.text().catch(() => '');
    throw new Error(`Resend error ${res.status}: ${detail.slice(0, 300)}`);
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

const sendViaSmtp = async ({ to, subject, text, html }) => {
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || `Vaultrix <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
};

export const sendMail = async ({ to, subject, text, html }) => {
  if (resendConfigured()) {
    try {
      await sendViaResend({ to, subject, text, html });
      return;
    } catch (error) {
      // Resend failed (for example the domain is not verified yet). If SMTP is
      // set up, deliver through it instead of losing the email.
      if (!smtpConfigured()) throw error;
      console.warn(`[mail] ${error.message} - falling back to SMTP`);
    }
  }

  if (smtpConfigured()) {
    await sendViaSmtp({ to, subject, text, html });
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Email is not configured (set RESEND_API_KEY + MAIL_FROM, or SMTP_HOST + SMTP_USER + SMTP_PASS)');
  }
  console.log(`\n[mail preview] to: ${to}\nsubject: ${subject}\n${text}\n`);
};
