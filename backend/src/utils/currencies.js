export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'SAR', 'CNY', 'JPY', 'CAD', 'AUD', 'CHF', 'TRY', 'ZAR',
  'NGN', 'BDT', 'IDR', 'MYR', 'SGD', 'KRW', 'RUB', 'BRL', 'MXN', 'EGP', 'KES', 'QAR', 'KWD',
];

const SUPPORTED = new Set(SUPPORTED_CURRENCIES);

export const isSupportedCurrency = (value) => typeof value === 'string' && SUPPORTED.has(value);
