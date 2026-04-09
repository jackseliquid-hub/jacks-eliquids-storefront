import Link from 'next/link';
import { login } from './actions';
import styles from './auth.module.css';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>;
}) {
  const resolvedParams = await searchParams;

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        <form className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="you@example.com"
              required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              placeholder="••••••••"
              required 
            />
          </div>

          <button formAction={login} className={styles.submitBtn}>
            Log In
          </button>
          
          {resolvedParams?.message && (
            <p className={styles.errorMessage}>{resolvedParams.message}</p>
          )}

          <p className={styles.switchPrompt}>
            Don't have an account? <Link href="/register">Sign Up here.</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
