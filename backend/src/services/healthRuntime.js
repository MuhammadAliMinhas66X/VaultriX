// One monitor and one set of request counters per server process.
import { createHealthMonitor, createRequestMetrics } from './healthMonitor.js';
import { buildProbes } from './healthProbes.js';

export const requestMetrics = createRequestMetrics();

export const healthMonitor = createHealthMonitor({
  probes: buildProbes(),
  metrics: requestMetrics,
});
