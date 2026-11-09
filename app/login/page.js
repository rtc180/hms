'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { organization } from '@/config/organization';
import { apiFetch } from '@/lib/clientApi';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');          // Email box
  const [password, setPassword] = useState('');    // Password box
  const [error, setError] = useState('');          // Error message to show
  const [loading, setLoading] = useState(false);   // Disable the button while waiting

  // Runs when the form is submitted
  async function handleSubmit(event) {
    event.preventDefault();                        // Stop the browser reloading the page
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      router.push('/dashboard');                   // Go to the dashboard
      router.refresh();
    } catch (err) {
      setError(err.message);                       // Show the server's message
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      {/* Branding panel */}
      <section className="login-side">
        <Link className="login-back-link" href="/" aria-label="Back to website">
          <span aria-hidden="true">←</span> Back to website
        </Link>
        <Image src={organization.logo} alt={`${organization.name} logo`} width={220} height={220} priority />
        <h1>{organization.name}</h1>
        <p>Patient records, outpatient visits and inpatient admissions in one place.</p>
      </section>

      {/* Sign-in form */}
      <section className="login-form">
        <form onSubmit={handleSubmit} noValidate>
          <h2>Sign in</h2>
          <p className="hint">Use the account given to you by the administrator.</p>

          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email" type="email" autoComplete="username" required
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
