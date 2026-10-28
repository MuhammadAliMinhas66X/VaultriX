export const todayInput = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

export const toInputDate = (value) => (value ? String(value).slice(0, 10) : todayInput());

export const dateOptions = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
