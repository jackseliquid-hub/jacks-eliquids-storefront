import Link from 'next/link';
import { requestPasswordReset } from './actions';
import styles from '../login/auth.module.css';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string; success: string }>;
}) {
  const resolvedParams = await searchParams;

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <button formAction={requestPasswordReset} className={styles.submitBtn}>
            Send Reset Link
          </button>

          {resolvedParams?.message && (
            <p className={styles.errorMessage}>{resolvedParams.message}</p>
          )}

          {resolvedParams?.success && (
            <p className={styles.successMessage}>{resolvedParams.success}</p>
          )}

          <p className={styles.switchPrompt}>
            Remembered it? <Link href="/login">Back to Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
