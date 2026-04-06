'use client';

import { useState, useEffect, useCallback } from 'react';
import { getGlobalSeo, setGlobalSeo, GlobalSeo } from '@/lib/data';
import styles from '../admin.module.css';

export default function AdminSeoPage() {
  const [seoConfig, setSeoConfig] = useState<GlobalSeo>({
    siteName: 'Jacks E-Liquid',
    defaultTitle: 'Jacks E-Liquid UK | Premium Vape Juice',
    defaultDescription: 'Shop the best premium e-liquids and vape juices at Jacks E-Liquid.',
    defaultKeywords: 'vape juice, e-liquid, nic salts, eliquid, vape store uk',
    defaultOgImage: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getGlobalSeo();
      if (data) {
        setSeoConfig({
          ...seoConfig,
          ...data
        });
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const update = (field: keyof GlobalSeo, val: string) => {
    setSeoConfig(prev => ({ ...prev, [field]: val }));
  };

  async function handleSave() {
    setSaving(true);
    try {
      await setGlobalSeo(seoConfig);
      showToast('Global SEO Settings Saved!');
    } catch (e) {
      console.error(e);
      showToast('Error saving SEO settings', true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingWrap} style={{ height: '100vh' }}>
        <div className={styles.spinner} />
        Loading SEO config…
      </div>
    );
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Global SEO Settings</h1>
          <p className={styles.pageSubtitle}>Fallback metadata for pages without their own SEO data</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      <div className={styles.sections}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>Default Metadata</div>
          <div className={styles.cardBody}>
            <div className={styles.formGrid}>
            
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Site Name</label>
                <input
                  className={styles.input}
                  value={seoConfig.siteName}
                  onChange={e => update('siteName', e.target.value)}
                  placeholder="e.g. Jacks E-Liquid"
                />
                <div style={{ fontSize: '0.8rem', color: '#86868b', marginTop: 4 }}>
                  This will be appended to specific page titles if configured in code.
                </div>
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Default Home/Fallback Title</label>
                <input
                  className={styles.input}
                  value={seoConfig.defaultTitle}
                  onChange={e => update('defaultTitle', e.target.value)}
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Default Meta Description</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  value={seoConfig.defaultDescription}
                  onChange={e => update('defaultDescription', e.target.value)}
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Default Focus Keywords</label>
                <input
                  className={styles.input}
                  value={seoConfig.defaultKeywords}
                  onChange={e => update('defaultKeywords', e.target.value)}
                  placeholder="Comma separated keywords"
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Default OpenGraph Image URL</label>
                <input
                  className={styles.input}
                  value={seoConfig.defaultOgImage || ''}
                  onChange={e => update('defaultOgImage', e.target.value)}
                  placeholder="URL for the default sharing image"
                />
              </div>

            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.err ? styles.toastError : ''}`}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
