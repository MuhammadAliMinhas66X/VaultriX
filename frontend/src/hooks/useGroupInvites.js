import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { listMyInvites } from '../services/groupService.js';

const EVERY = 60000;

// Group invitations waiting for the signed-in person. Feeds the bell, the Groups
// card on the Dashboard and the join page. Failures stay quiet: no invites shown.
export function useGroupInvites() {
  const { isAuthenticated } = useAuth();
  const [invites, setInvites] = useState([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await listMyInvites();
      setInvites(data.invites || []);
    } catch {
      setInvites([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    refresh();
    const timer = setInterval(refresh, EVERY);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthenticated, refresh]);

  return { invites, ready, refresh };
}
