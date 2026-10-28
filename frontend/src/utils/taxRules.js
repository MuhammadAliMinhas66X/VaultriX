const zeroTax = (code, currency) => ({ code, currency, year: '2026', brackets: [] });

export const TAX_RULES = [
  {
    code: 'PK',
    currency: 'PKR',
    year: '2027',
    brackets: [
      { from: 0, rate: 0 },
      { from: 600000, rate: 0.01 },
      { from: 1200000, rate: 0.11 },
      { from: 2200000, rate: 0.2 },
      { from: 3200000, rate: 0.25 },
      { from: 4100000, rate: 0.29 },
      { from: 5600000, rate: 0.32 },
      { from: 7000000, rate: 0.35 },
    ],
  },
  {
    code: 'GB',
    currency: 'GBP',
    year: '2026/27',
    allowance: { amount: 12570, taperFrom: 100000, taperRate: 0.5 },
    brackets: [
      { from: 0, rate: 0.2 },
      { from: 37700, rate: 0.4 },
      { from: 125140, rate: 0.45 },
    ],
    contributions: [
      {
        name: 'National Insurance',
        bands: [
          { from: 12570, to: 50270, rate: 0.08 },
          { from: 50270, rate: 0.02 },
        ],
      },
    ],
  },
  {
    code: 'US',
    currency: 'USD',
    year: '2026',
    allowance: { amount: 16100 },
    brackets: [
      { from: 0, rate: 0.1 },
      { from: 12400, rate: 0.12 },
      { from: 50400, rate: 0.22 },
      { from: 105700, rate: 0.24 },
      { from: 201775, rate: 0.32 },
      { from: 256225, rate: 0.35 },
      { from: 640600, rate: 0.37 },
    ],
    contributions: [
      { name: 'Social Security', bands: [{ from: 0, to: 184500, rate: 0.062 }] },
      {
        name: 'Medicare',
        bands: [
          { from: 0, to: 200000, rate: 0.0145 },
          { from: 200000, rate: 0.0235 },
        ],
      },
    ],
  },
  {
    code: 'CA',
    currency: 'CAD',
    year: '2026',
    credit: { amount: 16452, rate: 0.14 },
    brackets: [
      { from: 0, rate: 0.14 },
      { from: 58523, rate: 0.205 },
      { from: 117045, rate: 0.26 },
      { from: 181440, rate: 0.29 },
      { from: 258482, rate: 0.33 },
    ],
  },
  {
    code: 'AU',
    currency: 'AUD',
    year: '2026/27',
    brackets: [
      { from: 0, rate: 0 },
      { from: 18200, rate: 0.15 },
      { from: 45000, rate: 0.3 },
      { from: 135000, rate: 0.37 },
      { from: 190000, rate: 0.45 },
    ],
    contributions: [{ name: 'Medicare levy', bands: [{ from: 0, rate: 0.02 }] }],
  },
  {
    code: 'IN',
    currency: 'INR',
    year: '2026/27',
    allowance: { amount: 75000 },
    rebateUpTo: 1200000,
    cess: 0.04,
    brackets: [
      { from: 0, rate: 0 },
      { from: 400000, rate: 0.05 },
      { from: 800000, rate: 0.1 },
      { from: 1200000, rate: 0.15 },
      { from: 1600000, rate: 0.2 },
      { from: 2000000, rate: 0.25 },
      { from: 2400000, rate: 0.3 },
    ],
  },
  zeroTax('AE', 'AED'),
  zeroTax('SA', 'SAR'),
  zeroTax('QA', 'QAR'),
  zeroTax('KW', 'KWD'),
  zeroTax('BH', 'BHD'),
  zeroTax('OM', 'OMR'),
];

export const taxRuleForCurrency = (currency) => TAX_RULES.find((rule) => rule.currency === currency) || null;

const bracketTax = (taxable, brackets) =>
  brackets.reduce((sum, bracket, index) => {
    const upper = index + 1 < brackets.length ? brackets[index + 1].from : Infinity;
    return taxable > bracket.from ? sum + (Math.min(taxable, upper) - bracket.from) * bracket.rate : sum;
  }, 0);

const bandTax = (income, bands) =>
  bands.reduce((sum, band) => {
    const upper = band.to === undefined ? Infinity : band.to;
    return income > band.from ? sum + (Math.min(income, upper) - band.from) * band.rate : sum;
  }, 0);

export const estimateTax = (rule, annualGross) => {
  let allowance = rule.allowance ? rule.allowance.amount : 0;
  if (rule.allowance && rule.allowance.taperFrom && annualGross > rule.allowance.taperFrom) {
    allowance = Math.max(0, allowance - (annualGross - rule.allowance.taperFrom) * rule.allowance.taperRate);
  }
  const taxable = Math.max(0, annualGross - allowance);

  let tax = bracketTax(taxable, rule.brackets);
  if (rule.credit) tax = Math.max(0, tax - rule.credit.amount * rule.credit.rate);
  if (rule.rebateUpTo && taxable <= rule.rebateUpTo) tax = 0;
  if (rule.cess) tax *= 1 + rule.cess;

  const contributions = (rule.contributions || []).map((item) => ({ name: item.name, amount: bandTax(annualGross, item.bands) }));
  return { tax, contributions };
};

export const countryName = (code, locale) => {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) || code;
  } catch (error) {
    return code;
  }
};
