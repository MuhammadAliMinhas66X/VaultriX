export class ApiError extends Error {
  constructor(message, { status = 0, isNetwork = false, fallbackKey = 'errors.somethingWrong', data = null, retryAfter = 0 } = {}) {
    super(message || '');
    this.name = 'ApiError';
    this.status = status;
    this.isNetwork = isNetwork;
    this.fallbackKey = fallbackKey;
    this.data = data;
    this.retryAfter = retryAfter;
  }
}

export const toApiError = (error, fallbackKey) =>
  new ApiError(error.response?.data?.message || '', {
    status: error.response?.status || 0,
    isNetwork: !error.response,
    fallbackKey,
    data: error.response?.data || null,
    retryAfter: (() => {
      const headers = error.response?.headers || {};
      const value = Number(headers['retry-after'] ?? headers['ratelimit-reset']);
      return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 0;
    })(),
  });
