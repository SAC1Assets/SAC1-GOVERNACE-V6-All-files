// ─────────────────────────────────────────────────────────────────────────────
// useTranslation — Lightweight i18n hook for SableAssent / SACPay
//
// Usage:
//   import { useTranslation } from './i18n/useTranslation';
//   const { t, lang, setLang, dir } = useTranslation();
//   <h1>{t('wallet.title')}</h1>
//
// Features:
//   - Persists language to localStorage (survives page reload)
//   - Auto-detects browser language on first visit
//   - Falls back to English for any missing key
//   - Returns RTL direction for Arabic/Urdu
//   - Supports variable interpolation: t('key', { name: 'John' })
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import { TRANSLATIONS, LANGUAGES } from './translations';

const STORAGE_KEY = 'sableassent_lang';
const DEFAULT_LANG = 'en';

// Detect browser language and map to supported lang code
function detectBrowserLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  const browser = navigator.language?.split('-')[0]?.toLowerCase();
  return TRANSLATIONS[browser] ? browser : DEFAULT_LANG;
}

// Global singleton so all components share the same language state
let _globalLang = null;
let _listeners   = new Set();

function getInitialLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  return localStorage.getItem(STORAGE_KEY) || detectBrowserLang();
}

function setGlobalLang(code) {
  _globalLang = code;
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, code);
  _listeners.forEach(fn => fn(code));
}

export function useTranslation() {
  const [lang, setLangState] = useState(() => {
    if (_globalLang) return _globalLang;
    const initial = getInitialLang();
    _globalLang = initial;
    return initial;
  });

  useEffect(() => {
    const listener = code => setLangState(code);
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  }, []);

  const setLang = useCallback(code => {
    if (TRANSLATIONS[code]) setGlobalLang(code);
  }, []);

  // Translation function with fallback + interpolation
  const t = useCallback((key, vars = {}) => {
    const strings = TRANSLATIONS[lang] || {};
    const fallback = TRANSLATIONS[DEFAULT_LANG] || {};
    let str = strings[key] ?? fallback[key] ?? key;

    // Variable interpolation: t('hello', { name: 'John' }) → "Hello John"
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    });

    return str;
  }, [lang]);

  const langMeta = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const dir = langMeta?.rtl ? 'rtl' : 'ltr';

  return { t, lang, setLang, dir, langMeta, LANGUAGES };
}
