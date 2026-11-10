import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from '../ErrorBoundary.jsx';
import { AppFrame } from './AppShell.jsx';
import useAppNav from './useAppNav.jsx';
import { ShellSlotContext } from './shellSlot.js';

// One shell for every main page, so moving between them only swaps the page.
function MainShell() {
  const { items, activeId } = useAppNav();
  const location = useLocation();
  const [meta, setMeta] = useState({ title: undefined, showLogo: true, pageTitle: '', hideSettingsLink: false });
  return (
    <AppFrame {...meta} items={items} activeId={activeId}>
      <ShellSlotContext.Provider value={setMeta}>
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </ShellSlotContext.Provider>
    </AppFrame>
  );
}

export default MainShell;
