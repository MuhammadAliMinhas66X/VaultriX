export const links = {
  join: '/signup',
  login: '/login',
  app: '/dashboard',
};

export const owner = {
  name: 'Muhammad Ali Minhas',
  role: 'Founder and owner',
  email: '',
  lines: [
    'Vaultrix is owned and led by Muhammad Ali Minhas.',
    'It is an independent product with one goal: to give people a clear, private picture of their own money, without selling them anything else.',
  ],
};

export const nav = [
  { id: 'product', label: 'Product' },
  { id: 'flow', label: 'How it connects' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'security', label: 'Security' },
  { id: 'founder', label: 'Founder' },
];

export const features = [
  {
    id: 'dashboard',
    index: '01',
    name: 'Dashboard',
    title: 'One balance you can trust.',
    body: 'Your income after tax and deductions, minus what you actually spent. The number on the card is the number in your pocket.',
    points: ['Income after tax and deductions', 'Any currency, converted at live rates', 'Hide the balance in one tap'],
  },
  {
    id: 'income',
    index: '02',
    name: 'Income',
    title: 'Every source, with its own story.',
    body: 'Salary, a side business, a bonus. Each stream knows how often it pays, where it lands and what is taken out before it reaches you.',
    points: ['Tax and deductions per stream', 'Bank, wallet or cash destination', 'Weekly, monthly or one-off'],
  },
  {
    id: 'expenses',
    index: '03',
    name: 'Expenses',
    title: 'Spending you can read at a glance.',
    body: 'A month in one chart. See the heavy days, the running total, and how this month compares with the last one.',
    points: ['Daily and running views', 'Categories you can shape', 'Add an expense in seconds'],
  },
  {
    id: 'loans',
    index: '04',
    name: 'Loans',
    title: 'Borrowed, lent, settled.',
    body: 'Track both directions. Pay back in parts, watch the balance step down on a graph, and see what is due soon before it becomes late.',
    points: ['Part payments with dates', 'Due dates and a critical filter', 'Private photo proof, optional'],
  },
];

export const security = [
  { title: 'Two-step verification', body: 'Add a second step to sign-in, so a password alone is never enough.' },
  { title: 'Session control', body: 'See where you are signed in and end any session whenever you want.' },
  { title: 'Device limits', body: 'Decide how many devices can hold a session at the same time.' },
  { title: 'Private proof photos', body: 'Receipts and loan photos open only through signed links, never public pages.' },
  { title: 'Guarded sign-in', body: 'Rate limits slow down guessing and abuse before they get anywhere.' },
  { title: 'Encrypted in transit', body: 'Everything between your device and Vaultrix travels over HTTPS.' },
];

export const privacy = [
  { index: '01', title: 'Sealed by design', body: 'Every request is checked against your organization on the server, not just hidden on screen.' },
  { index: '02', title: 'You choose who joins', body: 'Owners, admins, members and viewers each get only the access their role needs.' },
  { index: '03', title: 'Delete means delete', body: 'When the last member leaves an organization, its data goes with it.' },
];

export const languages = ['English', 'Français', 'Español', 'العربية', 'हिन्दी', 'اردو'];
