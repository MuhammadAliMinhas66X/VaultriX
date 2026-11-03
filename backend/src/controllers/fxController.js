import { getRates, ExchangeRateError } from '../services/exchangeRateService.js';
import { isCurrencyCode } from '../utils/validators.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const RATES_UNAVAILABLE = 'Live exchange rates are not available right now. Try again in a moment.';

export const getExchangeRates = async (req, res, next) => {
  try {
    const base = (req.query.base || req.user.currency || 'USD').toUpperCase();
    if (!isCurrencyCode(base)) {
      return res.status(400).json({ success: false, message: GENERIC_INVALID });
    }

    const symbols = String(req.query.symbols || '')
      .split(',')
      .map((code) => code.trim().toUpperCase())
      .filter((code) => isCurrencyCode(code))
      .slice(0, 40);

    const data = await getRates(base, symbols);
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, ...data });
  } catch (error) {
    if (error instanceof ExchangeRateError) {
      return res.status(502).json({ success: false, message: RATES_UNAVAILABLE });
    }
    next(error);
  }
};
