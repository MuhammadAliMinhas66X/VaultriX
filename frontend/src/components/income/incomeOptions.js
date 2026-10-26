export const INCOME_TYPES = ['salaried', 'business', 'bonus', 'gift', 'profit', 'sale', 'other'];
export const FREQUENCIES = ['once', 'daily', 'weekly', 'monthly', 'yearly', 'variable'];
export const METHODS = ['cash', 'bank', 'wallet'];
export const OTHER_VALUE = '__other__';

export const typeLabelKey = (type) => `income.type.${type === 'freelance' ? 'freelance' : type}`;
export const frequencyLabelKey = (freq) => `income.frequency.${freq}`;

export const detailKind = (type) => (type === 'salaried' ? 'Job' : type === 'business' || type === 'freelance' ? 'Business' : 'Note');
