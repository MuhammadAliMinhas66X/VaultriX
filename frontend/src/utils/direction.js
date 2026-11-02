export const readDirection = () => {
  if (typeof document === 'undefined') return 'ltr';
  const value = document.documentElement.dir || window.getComputedStyle(document.documentElement).direction;
  return value === 'rtl' ? 'rtl' : 'ltr';
};
