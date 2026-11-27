// The real probes behind the admin System health screen. Only integrations
// that exist in this codebase are listed (MongoDB, email via Resend or SMTP, Cloudinary and the
// exchange-rate sources). Targets come from the server's own environment,
// never from a request, so there is no SSRF surface.
//
// Not monitored on purpose (see docs/audit/API-HEALTH-MONITORING.md):
// Google sign-in and Cloudflare Turnstile have no side-effect-free check
// that is worth an outbound call, and the unofficial Yahoo live quotes are
// cached per currency pair inside exchangeRateService.
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { FAILURE, ProbeFailure } from './healthMonitor.js';
import { getCloudinary, isImageStorageReady } from '../config/cloudinary.js';
import { getRateTable } from './exchangeRateService.js';

const FIVE_MINUTES = 5 * 60 * 1000;

const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const verifySmtp = async () => {
  const port = Number(process.env.SMTP_PORT) || 587;
  // A throwaway transporter with short socket timeouts, closed afterwards, so
  // a check can never leave a connection open or touch the real mail pool.
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
  try {
    await transporter.verify(); // connects and authenticates; sends no email
  } finally {
    transporter.close();
  }
};

const verifyResend = async () => {
  // Read-only call, so it sends no email. A "Sending access" key is not allowed
  // to list domains: Resend answers 401 restricted_api_key, which still proves
  // the key is valid and the API is reachable, so that counts as healthy.
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'User-Agent': 'vaultrix-backend/0.1' },
    signal: AbortSignal.timeout(5000),
  });
  if (res.ok) return;
  if (res.status === 401) {
    const body = await res.json().catch(() => null);
    if (body?.name === 'restricted_api_key') return;
  }
  throw new Error(`Resend responded ${res.status}`);
};

export const buildProbes = () => [
  {
    id: 'backend',
    label: 'Backend API',
    kind: 'core',
    timeoutMs: 2000,
    degradedMs: 250,
    // Latency here is event-loop delay: how long a timer waited to run.
    run: () => new Promise((resolve) => setImmediate(resolve)),
  },
  {
    id: 'database',
    label: 'MongoDB',
    kind: 'core',
    timeoutMs: 3000,
    degradedMs: 500,
    run: async () => {
      if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) throw new ProbeFailure(FAILURE.NOT_READY);
      await mongoose.connection.db.command({ ping: 1 });
    },
  },
  {
    id: 'email',
    label: 'Email',
    kind: 'external',
    ttlMs: FIVE_MINUTES,
    timeoutMs: 8000,
    degradedMs: 3000,
    isConfigured: () => Boolean(process.env.RESEND_API_KEY) || smtpConfigured(),
    // Mirrors the mailer: Resend first, SMTP when Resend is not set.
    run: () => (process.env.RESEND_API_KEY ? verifyResend() : verifySmtp()),
  },
  {
    id: 'cloudinary',
    label: 'Image storage (Cloudinary)',
    kind: 'external',
    ttlMs: FIVE_MINUTES,
    timeoutMs: 6000,
    degradedMs: 2500,
    isConfigured: isImageStorageReady,
    run: async () => {
      const result = await getCloudinary().api.ping();
      if (result?.status !== 'OK') throw new ProbeFailure(FAILURE.BAD_RESPONSE);
    },
  },
  {
    id: 'exchangeRates',
    label: 'Exchange-rate tables',
    kind: 'external',
    ttlMs: FIVE_MINUTES,
    timeoutMs: 8000,
    degradedMs: 3000,
    // Uses the service's own 10 minute cache, so most checks make no network
    // call. It proves a rate table can be produced, not that Yahoo live
    // quotes are current.
    run: async () => {
      const table = await getRateTable('USD');
      if (!table?.rates || Object.keys(table.rates).length < 10) throw new ProbeFailure(FAILURE.BAD_RESPONSE);
    },
  },
];
