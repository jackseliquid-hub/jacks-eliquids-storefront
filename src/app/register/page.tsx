import Link from 'next/link';
import { signup } from '@/app/login/actions';
import styles from '@/app/login/auth.module.css';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>;
}) {
  const resolvedParams = await searchParams;

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>Create an Account</h1>
        <p className={styles.subtitle}>Join Jack's E-Liquid today</p>

        <form className={styles.form}>
          <div className={styles.nameRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="firstName">First Name</label>
              <input 
                id="firstName" 
                name="firstName" 
                type="text" 
                placeholder="John"
                required 
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="lastName">Last Name</label>
              <input 
                id="lastName" 
                name="lastName" 
                type="text" 
                placeholder="Doe"
                required 
              />
            </div>
          </div>

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
              placeholder="Min. 8 characters"
              required 
              minLength={8}
            />
          </div>

          <button formAction={signup} className={styles.submitBtn}>
            Create Account
          </button>
          
          {resolvedParams?.message && (
            <p className={styles.errorMessage}>{resolvedParams.message}</p>
          )}

          <p className={styles.switchPrompt}>
            Already have an account? <Link href="/login">Log in.</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
