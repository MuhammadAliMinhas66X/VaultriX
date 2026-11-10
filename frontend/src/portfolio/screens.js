import dashboardPhone from './assets/screens/dashboard-phone.webp';
import dashboardTablet from './assets/screens/dashboard-tablet.webp';
import incomeDesktop from './assets/screens/income-desktop.webp';
import expensesPhone from './assets/screens/expenses-phone.webp';
import expensesDesktop from './assets/screens/expenses-desktop.webp';
import paidByPhone from './assets/screens/paidby-phone.webp';
import loansDesktop from './assets/screens/loans-desktop.webp';
import loansPhone from './assets/screens/loans-phone.webp';
import loansTablet from './assets/screens/loans-tablet.webp';

export const screens = {
  dashboardPhone,
  dashboardTablet,
  incomeDesktop,
  expensesPhone,
  expensesDesktop,
  paidByPhone,
  loansDesktop,
  loansPhone,
  loansTablet,
};

export const ownerPhoto = (() => {
  const found = import.meta.glob('./assets/owner/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}', { eager: true, import: 'default' });
  const first = Object.keys(found).sort()[0];
  return first ? found[first] : null;
})();
