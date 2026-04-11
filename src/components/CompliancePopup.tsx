'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './CompliancePopup.module.css';
import cookieStyles from './CookieConsent.module.css';

// ─── Keys ─────────────────────────────────────────────────────────────────────
const AGE_KEY     = 'jacks_age_verified';
const CONSENT_KEY = 'jacks_cookie_consent';
const EXPIRY_DAYS = 365;

export type CookieConsent = {
  necessary: true;      // always true — can't be turned off
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
};

function saveConsent(consent: CookieConsent) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  const expires = new Date();
  expires.setDate(expires.getDate() + EXPIRY_DAYS);
  document.cookie = `${CONSENT_KEY}=${JSON.stringify({ analytics: consent.analytics, marketing: consent.marketing })}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

function getSavedConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Treat as stale after 365 days
    const saved = new Date(parsed.timestamp).getTime();
    const daysPassed = (Date.now() - saved) / (1000 * 60 * 60 * 24);
    if (daysPassed > EXPIRY_DAYS) return null;
    return parsed as CookieConsent;
  } catch {
    return null;
  }
}

// ─── Cookie Category Info ─────────────────────────────────────────────────────
const categories = [
  {
    id: 'necessary' as const,
    label: 'Strictly Necessary',
    icon: '🔒',
    required: true,
    description: 'Essential for the website to function. These cannot be disabled. They include your session, shopping cart, and security cookies.',
  },
  {
    id: 'analytics' as const,
    label: 'Analytics & Performance',
    icon: '📊',
    required: false,
    description: 'Help us understand how visitors interact with our website. All data is anonymous. Used to improve page performance and user experience.',
  },
  {
    id: 'marketing' as const,
    label: 'Marketing & Preferences',
    icon: '🎯',
    required: false,
    description: 'Used to remember your preferences and show you relevant content. May be used to personalise offers and communications.',
  },
];

// ─── Preferences Modal ────────────────────────────────────────────────────────
function PreferencesModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Omit<CookieConsent, 'necessary' | 'timestamp'>;
  onSave: (analytics: boolean, marketing: boolean) => void;
  onClose: () => void;
}) {
  const [analytics, setAnalytics] = useState(initial.analytics);
  const [marketing, setMarketing] = useState(initial.marketing);

  return (
    <div className={cookieStyles.prefOverlay} role="dialog" aria-modal="true" aria-label="Cookie Preferences">
      <div className={cookieStyles.prefModal}>
        <div className={cookieStyles.prefHeader}>
          <h2 className={cookieStyles.prefTitle}>🍪 Cookie Preferences</h2>
          <p className={cookieStyles.prefSubtitle}>
            Choose which cookies you allow. Strictly necessary cookies cannot be disabled as they are required for the site to work.
          </p>
        </div>

        <div className={cookieStyles.categoryList}>
          {categories.map(cat => {
            const isOn = cat.id === 'necessary' ? true : cat.id === 'analytics' ? analytics : marketing;
            const toggle = cat.id === 'analytics' ? () => setAnalytics(v => !v) : cat.id === 'marketing' ? () => setMarketing(v => !v) : undefined;

            return (
              <div key={cat.id} className={cookieStyles.categoryRow}>
                <div className={cookieStyles.categoryInfo}>
                  <div className={cookieStyles.categoryLabel}>
                    <span>{cat.icon}</span>
                    <strong>{cat.label}</strong>
                    {cat.required && <span className={cookieStyles.requiredBadge}>Always On</span>}
                  </div>
                  <p className={cookieStyles.categoryDesc}>{cat.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  aria-label={`Toggle ${cat.label}`}
                  disabled={cat.required}
                  className={`${cookieStyles.toggle} ${isOn ? cookieStyles.toggleOn : ''} ${cat.required ? cookieStyles.toggleDisabled : ''}`}
                  onClick={toggle}
                />
              </div>
            );
          })}
        </div>

        <div className={cookieStyles.prefActions}>
          <button className={cookieStyles.btnOutline} onClick={onClose}>Cancel</button>
          <button className={cookieStyles.btnPrimary} onClick={() => onSave(analytics, marketing)}>
            Save My Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CompliancePopup() {
  const [ageVerified, setAgeVerified] = useState(false);
  const [showAgeBanner, setShowAgeBanner] = useState(false);
  const [ageDenied, setAgeDenied] = useState(false);

  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    // Check age
    const ageOk = localStorage.getItem(AGE_KEY) === 'true';
    setAgeVerified(ageOk);
    if (!ageOk) {
      setShowAgeBanner(true);
      return;
    }

    // Check cookie consent
    const saved = getSavedConsent();
    setConsent(saved);
    if (!saved) setShowCookieBanner(true);
  }, []);

  // Age verification handlers
  function handleAgeAccept() {
    localStorage.setItem(AGE_KEY, 'true');
    setShowAgeBanner(false);
    setAgeVerified(true);
    const saved = getSavedConsent();
    setConsent(saved);
    if (!saved) setTimeout(() => setShowCookieBanner(true), 400); // slight delay — feels polished
  }

  function handleAgeDeny() {
    setAgeDenied(true);
  }

  // Cookie consent handlers
  const acceptAll = useCallback(() => {
    const c: CookieConsent = { necessary: true, analytics: true, marketing: true, timestamp: new Date().toISOString() };
    saveConsent(c);
    setConsent(c);
    setShowCookieBanner(false);
  }, []);

  const rejectAll = useCallback(() => {
    const c: CookieConsent = { necessary: true, analytics: false, marketing: false, timestamp: new Date().toISOString() };
    saveConsent(c);
    setConsent(c);
    setShowCookieBanner(false);
  }, []);

  const savePreferences = useCallback((analytics: boolean, marketing: boolean) => {
    const c: CookieConsent = { necessary: true, analytics, marketing, timestamp: new Date().toISOString() };
    saveConsent(c);
    setConsent(c);
    setShowCookieBanner(false);
    setShowPreferences(false);
  }, []);

  // Expose openPreferences to window so footer "Cookie Settings" link can call it
  useEffect(() => {
    (window as any).__openCookiePreferences = () => setShowPreferences(true);
    return () => { delete (window as any).__openCookiePreferences; };
  }, []);

  return (
    <>
      {/* ── Age Verification Modal ─────────────────────────────────────────── */}
      {showAgeBanner && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            {!ageDenied ? (
              <>
                <div className={styles.header}>
                  <div className={styles.iconWrapper}>
                    <span className={styles.icon}>18+</span>
                  </div>
                  <h2 className={styles.title}>Age Verification</h2>
                </div>
                <div className={styles.content}>
                  <p className={styles.text}>
                    Welcome to Jack&apos;s E-Liquid! Our products are intended for adults of legal smoking age.
                    By entering this site, you confirm that you are <strong>18 years of age or older</strong>.
                  </p>
                </div>
                <div className={styles.actions}>
                  <button className={styles.denyBtn} onClick={handleAgeDeny}>
                    I am under 18
                  </button>
                  <button className={styles.acceptBtn} onClick={handleAgeAccept}>
                    I am 18+ — Enter Site
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.deniedState}>
                <div className={styles.iconWrapperFailed}>
                  <span className={styles.icon}>✕</span>
                </div>
                <h2 className={styles.title}>Access Denied</h2>
                <p className={styles.text}>
                  You must be 18 years of age or older to purchase or view vaping products.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cookie Consent Banner ──────────────────────────────────────────── */}
      {ageVerified && showCookieBanner && !showPreferences && (
        <div className={cookieStyles.banner} role="region" aria-label="Cookie consent">
          <div className={cookieStyles.bannerInner}>
            <div className={cookieStyles.bannerText}>
              <p className={cookieStyles.bannerTitle}>🍪 We use cookies</p>
              <p className={cookieStyles.bannerDesc}>
                We use cookies to improve your experience, analyse site performance, and personalise content.
                You can choose which cookies to allow.{' '}
                <a href="/p/cookie-policy" className={cookieStyles.learnMore}>Learn more</a>
              </p>
            </div>
            <div className={cookieStyles.bannerActions}>
              <button className={cookieStyles.btnReject} onClick={rejectAll}>Reject All</button>
              <button className={cookieStyles.btnManage} onClick={() => setShowPreferences(true)}>
                Manage Preferences
              </button>
              <button className={cookieStyles.btnAccept} onClick={acceptAll}>Accept All</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preferences Modal ──────────────────────────────────────────────── */}
      {showPreferences && (
        <PreferencesModal
          initial={{ analytics: consent?.analytics ?? false, marketing: consent?.marketing ?? false }}
          onSave={savePreferences}
          onClose={() => setShowPreferences(false)}
        />
      )}
    </>
  );
}
