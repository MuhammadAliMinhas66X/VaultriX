// Remembers where a person was heading before they had to sign in or create an
// account (for example the join-group page opened from an email), so login,
// signup and onboarding can all end there instead of on the dashboard.
const KEY = 'vx.next';

export const isSafePath = (value) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/login') && !value.startsWith('/signup');

export const readNext = (location) => {
  const fromState = location?.state?.from;
  const stateTarget = fromState ? `${fromState.pathname || ''}${fromState.search || ''}` : '';
  let queryTarget = '';
  try {
    queryTarget = new URLSearchParams(location?.search || '').get('next') || '';
  } catch {
    queryTarget = '';
  }
  const found = [stateTarget, queryTarget].find(isSafePath);
  if (found) {
    try { sessionStorage.setItem(KEY, found); } catch { /* storage unavailable */ }
    return found;
  }
  try {
    const saved = sessionStorage.getItem(KEY);
    return isSafePath(saved) ? saved : null;
  } catch {
    return null;
  }
};

export const takeNext = () => {
  try {
    const saved = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return isSafePath(saved) ? saved : null;
  } catch {
    return null;
  }
};
