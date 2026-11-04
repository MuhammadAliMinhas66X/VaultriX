import api from './api.js';

const lastSent = new Map();
const THROTTLE_MS = 10000;

export const reportSecurityEvent = (type) => {
  const now = Date.now();
  if (now - (lastSent.get(type) || 0) < THROTTLE_MS) return;
  lastSent.set(type, now);
  api.post('/security/events', { type }).catch(() => {});
};
