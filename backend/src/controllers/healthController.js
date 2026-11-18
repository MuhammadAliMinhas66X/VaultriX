import { healthMonitor } from '../services/healthRuntime.js';

// Both handlers sit behind authenticate + requireAdmin (adminRoutes.js), so
// only the operator account reaches them. They take no input that selects a
// target, and the response holds fixed fields only.

// Cached snapshot. Cheap: probes re-run only when their own interval is due.
export const getHealth = async (req, res, next) => {
  try {
    res.json({ success: true, ...(await healthMonitor.snapshot()) });
  } catch (error) {
    next(error);
  }
};

// "Check now". Still throttled inside the monitor.
export const runHealthCheck = async (req, res, next) => {
  try {
    res.json({ success: true, ...(await healthMonitor.snapshot({ force: true })) });
  } catch (error) {
    next(error);
  }
};
