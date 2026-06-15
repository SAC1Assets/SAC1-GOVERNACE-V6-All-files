// ─────────────────────────────────────────────────────────────────────────────
// LanguageSelector v2.0 — Global Language Switcher for SableAssent Ecosystem
//
// Covers: SACPay · SableAssent.com · SAC1Gov.com · OurFrontDeskAI.com
// 50 languages · 170+ countries · RTL support · Search · Region filter
//
// Usage variants:
//   <LanguageSelector variant="hero"    />  ← Big CTA button for hero sections
//   <LanguageSelector variant="navbar"  />  ← Compact nav button (default)
//   <LanguageSelector variant="banner"  />  ← Full-width top bar
//   <LanguageSelector variant="compact" />  ← Flag + code only (minimal)
//   <GlobalLanguageBanner />               ← Sticky top bar (add once per page)
// ─────────────────────────────────────────────────────────────────────────────

'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from './useTranslation';
import { LANGUAGES } from './translations';

// ── Brand tokens ─────────────────────────────────────────────────────────────
const C = {
  navy:   '#1e3a5f',
  navyD:  '#152b45',
  gold:   '#d4a017',
  goldL:  '#f0c040',
  white:  '#ffffff',
  bg:     '#f0f4f8',
  border: '#e2e8f0',
  text:   '#1e293b',
  muted:  '#64748b',
  green:  '#10b981',
};

// ── Region groups for filter tabs ────────────────────────────────────────────
const REGIONS = [
  'All Regions',
  'Global',
  'Africa',
  'Latin America',
  'Asia / Pacific',
  'Middle East',
  'Europe',
  'Caribbean',
];

function langMatchesRegion(lang, region) {
  if (region === 'All Regions') return true;
  const r = lang.region?.toLowerCase() || '';
  if (region === 'Africa')        return r.includes('africa') || r.includes('nigeria') || r.includes('kenya') || r.includes('ethiopia') || r.includes('ghana') || r.includes('rwanda') || r.includes('zimbabwe') || r.includes('somalia') || r.includes('madagascar') || r.includes('congo');
  if (region === 'Latin America') return r.includes('latin') || r.includes('brazil') || r.includes('spain') || r.includes('mexico');
  if (region === 'Asia / Pacific')return r.includes('asia') || r.includes('india') || r.includes('china') || r.includes('japan') || r.includes('korea') || r.includes('indonesia') || r.includes('philippines') || r.includes('vietnam') || r.includes('thailand') || r.includes('malaysia') || r.includes('bangladesh') || r.includes('pakistan') || r.includes('nepal') || r.includes('sri') || r.includes('myanmar') || r.includes('cambodia') || r.includes('singapore');
  if (region === 'Middle East')   return r.includes('middle') || r.includes('arab') || r.includes('iran') || r.includes('afghanistan');
  if (region === 'Europe')        return r.includes('europe') || r.includes('russia') || r.includes('ukraine') || r.includes('poland') || r.includes('czech') || r.includes('hungary') || r.includes('scandin') || r.includes('netherlands') || r.includes('italy') || r.includes('germany') || r.includes('france') || r.includes('greece') || r.includes('romania') || r.includes('moldova') || r.includes('turkey') || r.includes('cis') || r.includes('belgium');
  if (region === 'Caribbean')     return r.includes('caribbean') || r.includes('haiti') || r.includes('jamaica');
  if (region === 'Global')        return r.includes('global');
  return false;
}

// ── The dropdown panel (shared across all variants) ──────────────────────────
function DropdownPanel({ lang, setLang, onClose, accentColor = C.gold }) {
  const [search, setSearch]   = useState('');
  const [region, setRegion]   = useState('All Regions');
  const inputRef              = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = LANGUAGES.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.region.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q);
    return matchSearch && langMatchesRegion(l, region);
  });

  const handleSelect = (code) => { setLang(code); onClose(); };

  return (
    <div style={{
      position: 'absolute',
      top: '110%', left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99999,
      background: C.white,
      borderRadius: 20,
      boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
      border: `1px solid ${C.border}`,
      width: 340,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      maxHeight: '80vh',
    }}>
      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #2d5a8e 100%)`,
        padding: '16px 18px 12px',
        flexShrink: 0,
      }}>
        <div style={{ color: accentColor, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 4 }}>
          SABLEASSENT · SACPAY · SAC1GOV
        </div>
        <div style={{ color: C.white, fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
          🌍 Choose Your Language
        </div>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.6 }}>🔍</span>
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search languages or regions…"
            style={{
              width: '100%',
              padding: '9px 12px 9px 34px',
              borderRadius: 10,
              border: 'none',
              fontSize: 13,
              background: 'rgba(255,255,255,0.15)',
              color: C.white,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* ── Region filter tabs ── */}
      <div style={{
        display: 'flex', overflowX: 'auto', gap: 6,
        padding: '10px 12px 8px',
        background: '#f8fafc',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
        scrollbarWidth: 'none',
      }}>
        {REGIONS.map(r => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              background: region === r ? C.navy : '#e2e8f0',
              color: region === r ? C.white : C.muted,
              transition: 'all 0.15s',
            }}
          >{r}</button>
        ))}
      </div>

      {/* ── Language list ── */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '24px 18px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
            No languages found
          </div>
        ) : filtered.map(l => (
          <button
            key={l.code}
            onClick={() => handleSelect(l.code)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: 10, padding: '10px 16px',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              background: l.code === lang ? '#f0f6ff' : C.white,
              borderLeft: l.code === lang ? `3px solid ${C.navy}` : '3px solid transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (l.code !== lang) e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { if (l.code !== lang) e.currentTarget.style.background = C.white; }}
          >
            <span style={{ fontSize: 22, flexShrink: 0 }}>{l.flag}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{l.nativeName}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{l.name} · {l.region}</div>
            </div>
            {l.rtl && (
              <span style={{ fontSize: 9, background: '#fef3c7', color: '#92400e', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>RTL</span>
            )}
            {l.code === lang && (
              <span style={{ color: C.green, fontSize: 16 }}>✓</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '10px 16px',
        background: '#f8fafc',
        borderTop: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: C.muted }}>
          {filtered.length} of {LANGUAGES.length} languages · 170+ countries
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 13 }}
        >✕ Close</button>
      </div>
    </div>
  );
}

// ── Main LanguageSelector component ──────────────────────────────────────────
export default function LanguageSelector({
  variant = 'navbar',
  accentColor = C.gold,
  style = {},
}) {
  const { lang, setLang, langMeta } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── HERO variant — large gold button for above-the-fold sections ──────────
  if (variant === 'hero') {
    return (
      <div ref={ref} style={{ position: 'relative', display: 'inline-block', ...style }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 28px',
            background: `linear-gradient(135deg, ${accentColor}, #b8860b)`,
            color: C.navy,
            border: 'none', borderRadius: 50,
            cursor: 'pointer',
            fontWeight: 800, fontSize: 16,
            boxShadow: `0 8px 30px rgba(212,160,23,0.4)`,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 40px rgba(212,160,23,0.5)`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 8px 30px rgba(212,160,23,0.4)`; }}
        >
          <span style={{ fontSize: 22 }}>{langMeta?.flag || '🌍'}</span>
          <span>🌐 Choose Your Language</span>
          <span style={{ opacity: 0.7, fontSize: 12 }}>{open ? '▲' : '▼'}</span>
        </button>
        {open && <DropdownPanel lang={lang} setLang={setLang} onClose={() => setOpen(false)} accentColor={accentColor} />}
      </div>
    );
  }

  // ── BANNER variant — full-width top bar ───────────────────────────────────
  if (variant === 'banner') {
    return (
      <div ref={ref} style={{ position: 'relative', ...style }}>
        <div style={{
          background: C.navy,
          padding: '8px 20px',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12,
        }}>
          <span style={{ color: C.gold, fontSize: 12, fontWeight: 700 }}>🌍 GLOBAL PLATFORM — 170+ COUNTRIES</span>
          <button
            onClick={() => setOpen(!open)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 14px',
              background: 'rgba(255,255,255,0.12)',
              color: C.white,
              border: `1px solid rgba(255,255,255,0.25)`,
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: 700, fontSize: 12,
            }}
          >
            <span>{langMeta?.flag || '🌐'}</span>
            <span>{langMeta?.nativeName || 'English'}</span>
            <span style={{ opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
          </button>
        </div>
        {open && (
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 99999 }}>
            <DropdownPanel lang={lang} setLang={setLang} onClose={() => setOpen(false)} accentColor={accentColor} />
          </div>
        )}
      </div>
    );
  }

  // ── COMPACT variant — flag + code only ────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div ref={ref} style={{ position: 'relative', ...style }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px',
            background: 'rgba(255,255,255,0.1)',
            color: C.white,
            border: `1px solid rgba(255,255,255,0.2)`,
            borderRadius: 12,
            cursor: 'pointer', fontSize: 12, fontWeight: 700,
          }}
        >
          <span>{langMeta?.flag || '🌐'}</span>
          <span style={{ textTransform: 'uppercase' }}>{lang}</span>
        </button>
        {open && <DropdownPanel lang={lang} setLang={setLang} onClose={() => setOpen(false)} accentColor={accentColor} />}
      </div>
    );
  }

  // ── NAVBAR variant (default) — compact button for navigation bars ─────────
  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 14px',
          background: open ? `rgba(212,160,23,0.15)` : 'rgba(255,255,255,0.08)',
          color: C.white,
          border: `1px solid ${open ? accentColor : 'rgba(255,255,255,0.2)'}`,
          borderRadius: 22,
          cursor: 'pointer',
          fontWeight: 700, fontSize: 13,
          transition: 'all 0.15s',
        }}
      >
        <span style={{ fontSize: 18 }}>{langMeta?.flag || '🌐'}</span>
        <span>{langMeta?.nativeName || 'English'}</span>
        <span style={{ opacity: 0.6, fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <DropdownPanel lang={lang} setLang={setLang} onClose={() => setOpen(false)} accentColor={accentColor} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GlobalLanguageBanner — sticky top bar that sets html[dir] for RTL languages
// Add ONCE at the root of each site/page
// ─────────────────────────────────────────────────────────────────────────────
export function GlobalLanguageBanner({ site = 'SACPay' }) {
  const { lang, setLang, langMeta } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Set html dir for RTL support
  useEffect(() => {
    const dir = langMeta?.rtl ? 'rtl' : 'ltr';
    document.documentElement.dir  = dir;
    document.documentElement.lang = lang;
  }, [lang, langMeta]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const siteLabel = {
    'SACPay':       '💸 SACPay',
    'SableAssent':  '🪙 SableAssent',
    'SAC1Gov':      '🏛️ SAC1Gov',
    'FrontDeskAI':  '🤖 FrontDeskAI',
  }[site] || '🌍 SableAssent';

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 10000 }}>
      <div style={{
        background: C.navyD,
        borderBottom: `2px solid ${C.gold}`,
        padding: '7px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        {/* Left: site label + country count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: C.gold, fontWeight: 800, fontSize: 12, letterSpacing: '0.05em' }}>{siteLabel}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>|</span>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>🌍 170+ Countries · 50 Languages</span>
        </div>

        {/* Right: language selector button */}
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 16px',
            background: open ? C.gold : 'rgba(255,255,255,0.1)',
            color: open ? C.navy : C.white,
            border: `1px solid ${open ? C.gold : 'rgba(255,255,255,0.2)'}`,
            borderRadius: 20,
            cursor: 'pointer',
            fontWeight: 700, fontSize: 12,
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 16 }}>{langMeta?.flag || '🌐'}</span>
          <span>🌐 Choose Your Language</span>
          <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 11 }}>
            — {langMeta?.nativeName || 'English'} {open ? '▲' : '▼'}
          </span>
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{ position: 'absolute', right: 20, top: '100%' }}>
          <DropdownPanel lang={lang} setLang={setLang} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HeroLanguageButton — standalone CTA for hero/landing sections
// ─────────────────────────────────────────────────────────────────────────────
export function HeroLanguageButton({ accentColor = C.gold, style = {} }) {
  return <LanguageSelector variant="hero" accentColor={accentColor} style={style} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// NavbarLanguageButton — for top navigation bars
// ─────────────────────────────────────────────────────────────────────────────
export function NavbarLanguageButton({ style = {} }) {
  return <LanguageSelector variant="navbar" style={style} />;
}
