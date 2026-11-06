import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { translate, translateError } from './translate.js';

export function useTranslation() {
  const { language } = useAuth();

  const t = useCallback((key, vars) => translate(language, key, vars), [language]);
  const tServer = useCallback((error) => translateError(language, error), [language]);

  return useMemo(() => ({ t, tServer, language }), [t, tServer, language]);
}
