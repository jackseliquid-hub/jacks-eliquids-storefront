'use client';

import { useActionState, useEffect, useRef } from 'react';
import { submitContactForm, type ContactFormState } from './actions';
import styles from './contact.module.css';

const initialState: ContactFormState = {};

export default function ContactPage() {
  const [state, formAction, isPending] = useActionState(submitContactForm, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>Get In Touch</span>
          <h1 className={styles.title}>Contact Us</h1>
          <p className={styles.subtitle}>
            Got a question about an order, a product, or just want to say hello?
            We&apos;d love to hear from you. We aim to respond within 2 working days.
          </p>
        </div>
      </div>

      <div className={styles.wrapper}>
        <div className={styles.grid}>

          {/* ── Contact Info ─────────────────────────────────────────────── */}
          <aside className={styles.info}>
            <div className={styles.infoCard}>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>✉️</span>
                <div>
                  <p className={styles.infoLabel}>Email</p>
                  <a href="mailto:sales@jackseliquid.co.uk" className={styles.infoValue}>
                    sales@jackseliquid.co.uk
                  </a>
                </div>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>📦</span>
                <div>
                  <p className={styles.infoLabel}>Orders & Returns</p>
                  <p className={styles.infoValue}>Use subject line: Order #[number]</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>🕐</span>
                <div>
                  <p className={styles.infoLabel}>Response Time</p>
                  <p className={styles.infoValue}>Within 2 working days</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>📍</span>
                <div>
                  <p className={styles.infoLabel}>Based in</p>
                  <p className={styles.infoValue}>Lancashire, United Kingdom</p>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Form ─────────────────────────────────────────────────────── */}
          <section className={styles.formSection}>
            {state.success ? (
              <div className={styles.successBox}>
                <div className={styles.successIcon}>✓</div>
                <h2 className={styles.successTitle}>Message Sent!</h2>
                <p className={styles.successText}>
                  Thanks for getting in touch. We&apos;ll get back to you within 2 working days.
                </p>
                <button
                  className={styles.resetBtn}
                  onClick={() => window.location.reload()}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form ref={formRef} action={formAction} className={styles.form} noValidate>
                <h2 className={styles.formTitle}>Send Us a Message</h2>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="contact-name" className={styles.label}>
                      Full Name <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      className={styles.input}
                      placeholder="Your name"
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="contact-email" className={styles.label}>
                      Email Address <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      className={styles.input}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="contact-phone" className={styles.label}>
                      Phone Number <span className={styles.optional}>(optional)</span>
                    </label>
                    <input
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      className={styles.input}
                      placeholder="+44 7xxx xxxxxx"
                      autoComplete="tel"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="contact-subject" className={styles.label}>
                      Subject <span className={styles.required}>*</span>
                    </label>
                    <select id="contact-subject" name="subject" className={styles.select} required>
                      <option value="">— Select a subject —</option>
                      <option value="General Enquiry">General Enquiry</option>
                      <option value="Order Query">Order Query</option>
                      <option value="Returns & Refunds">Returns &amp; Refunds</option>
                      <option value="Product Question">Product Question</option>
                      <option value="Wholesale / Trade">Wholesale / Trade</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="contact-message" className={styles.label}>
                    Message <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    className={styles.textarea}
                    rows={6}
                    placeholder="Tell us how we can help…"
                    required
                  />
                </div>

                {state.error && (
                  <div className={styles.errorBox} role="alert">
                    ⚠️ {state.error}
                  </div>
                )}

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isPending}
                >
                  {isPending ? (
                    <><span className={styles.spinner} /> Sending…</>
                  ) : (
                    '📬 Send Message'
                  )}
                </button>

                <p className={styles.privacy}>
                  Your details will only be used to respond to your enquiry.
                  See our <a href="/p/privacy-policy" className={styles.privacyLink}>Privacy Policy</a>.
                </p>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
