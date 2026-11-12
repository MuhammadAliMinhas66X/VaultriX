import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from '../ErrorBoundary.jsx';
import { AppFrame } from './AppShell.jsx';
import useAppNav from './useAppNav.jsx';
import { ShellSlotContext } from './shellSlot.js';

// One shell for every main page, so moving between them only swaps the page.
function MainShell() {
  const { items, activeId } = useAppNav();
  const location = useLocation();
  const reduced = useAppReducedMotion();
  const [meta, setMeta] = useState({ title: undefined, showLogo: true, pageTitle: '', hideSettingsLink: false });
  return (
    <AppFrame {...meta} items={items} activeId={activeId}>
      <ShellSlotContext.Provider value={setMeta}>
        <ErrorBoundary resetKey={location.pathname}>
          {/* Same soft fade as the Settings sections; only the page moves, the menu stays. */}
          <motion.div key={location.pathname} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
            <Outlet />
          </motion.div>
        </ErrorBoundary>
      </ShellSlotContext.Provider>
    </AppFrame>
  );
}

export default MainShell;
