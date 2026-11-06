import { forwardRef } from 'react';

// A plain text box for money: no up/down arrows, no scroll-wheel changes, only
// digits and one dot, and at most `decimals` places. Gives back a clean string.
export const cleanMoney = (raw, decimals = 2) => {
  const text = String(raw ?? '').replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = text.indexOf('.');
  if (dot === -1) return text.replace(/^0+(?=\d)/, '').slice(0, 12);
  const whole = text.slice(0, dot).replace(/^0+(?=\d)/, '').slice(0, 12) || '0';
  const fraction = text.slice(dot + 1).replace(/\./g, '').slice(0, decimals);
  return decimals > 0 ? `${whole}.${fraction}` : whole;
};

const MoneyInput = forwardRef(function MoneyInput({ value, onChange, decimals = 2, className = '', ...rest }, ref) {
  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(event) => onChange(cleanMoney(event.target.value, decimals))}
      className={className}
      {...rest}
    />
  );
});

export default MoneyInput;
