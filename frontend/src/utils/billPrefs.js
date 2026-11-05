// Remembers what you chose last time so entering many bills is quick.
// Everything is optional and lives only in this browser.
const KEY = 'vaultrix.billPrefs.v1';
const MAX_BILLERS = 80;

const read = () => {
  try {
    const data = JSON.parse(window.localStorage.getItem(KEY));
    return data && typeof data === 'object' ? data : {};
  } catch (error) {
    return {};
  }
};

const write = (data) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch (error) {
    return;
  }
};

export const readLastPrefs = () => read().last || {};

export const readBillerPrefs = (billerKey) => (billerKey ? read().billers?.[billerKey] || null : null);

export const rememberBill = (billerKey, values) => {
  const data = read();
  data.last = { currency: values.currency, payKey: values.payKey, payCustom: values.payCustom, frequency: values.frequency };
  if (billerKey) {
    const billers = { ...(data.billers || {}) };
    delete billers[billerKey];
    billers[billerKey] = {
      categoryId: values.categoryId || '',
      amount: values.amount,
      currency: values.currency,
      account: values.account || '',
      frequency: values.frequency,
      payKey: values.payKey,
      payCustom: values.payCustom,
    };
    const keys = Object.keys(billers);
    if (keys.length > MAX_BILLERS) keys.slice(0, keys.length - MAX_BILLERS).forEach((key) => delete billers[key]);
    data.billers = billers;
  }
  write(data);
};
