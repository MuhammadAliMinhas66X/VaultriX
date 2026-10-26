export const TAX_YEAR = 2027;

const SLABS = [
  { from: 7000000, base: 1424000, rate: 0.35 },
  { from: 5600000, base: 976000, rate: 0.32 },
  { from: 4100000, base: 541000, rate: 0.29 },
  { from: 3200000, base: 316000, rate: 0.25 },
  { from: 2200000, base: 116000, rate: 0.2 },
  { from: 1200000, base: 6000, rate: 0.11 },
  { from: 600000, base: 0, rate: 0.01 },
];

export const annualTax = (annualIncome) => {
  const slab = SLABS.find((item) => annualIncome > item.from);
  return slab ? slab.base + (annualIncome - slab.from) * slab.rate : 0;
};
