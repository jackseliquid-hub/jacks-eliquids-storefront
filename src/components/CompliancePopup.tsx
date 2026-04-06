'use client';

import { useState, useEffect } from 'react';
import styles from './CompliancePopup.module.css';

const COMPLIANCE_KEY = 'jacks_compliance_consent';
const EXPIRY_DAYS = 30;

export default function CompliancePopup() {
  const [show, setShow] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    // Check local storage for consent on mount
    const savedConsent = localStorage.getItem(COMPLIANCE_KEY);
    
    if (savedConsent) {
      const savedDate = new Date(savedConsent).getTime();
      const now = new Date().getTime();
      const daysPassed = (now - savedDate) / (1000 * 60 * 60 * 24);
      
      // If it's been less than 30 days, we don't show the popup
      if (daysPassed < EXPIRY_DAYS) {
        return;
      }
    }
    
    // Default to show if no valid consent
    setShow(true);
  }, []);

  const handleAccept = () => {
    const now = new Date().toISOString();
    localStorage.setItem(COMPLIANCE_KEY, now);
    
    // Also set a document cookie so the server could theoretically read it if needed in the future
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + EXPIRY_DAYS);
    document.cookie = `${COMPLIANCE_KEY}=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
    
    setShow(false);
  };

  const handleDeny = () => {
    setDenied(true);
  };

  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {!denied ? (
          <>
            <div className={styles.header}>
              <div className={styles.iconWrapper}>
                <span className={styles.icon}>18+</span>
              </div>
              <h2 className={styles.title}>Age Verification & Cookies</h2>
            </div>
            
            <div className={styles.content}>
              <p className={styles.text}>
                Welcome to Jack&apos;s E-Liquid! Our products are intended for adults of legal smoking age. 
                By entering this site, you certify that you are <strong>18 years of age or older</strong>.
              </p>
              <p className={styles.text}>
                We also use cookies to ensure you get the best experience, personalize content, and analyze our traffic. 
                By clicking &quot;Accept & Enter&quot;, you consent to our use of cookies and verify your age.
              </p>
            </div>
            
            <div className={styles.actions}>
              <button className={styles.denyBtn} onClick={handleDeny}>
                I am under 18
              </button>
              <button className={styles.acceptBtn} onClick={handleAccept}>
                I am 18+ & Accept Cookies
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
  );
}
