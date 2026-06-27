import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ApiError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { Card } from '../../components/ui/Card';
import './login-page.css';

const DEMO_PASSWORD = 'password123';

type Mode = 'signin' | 'signup';

interface QuickLoginPersona {
  email: string;
  role: string;
  description: string;
}

const QUICK_LOGIN_PERSONAS: QuickLoginPersona[] = [
  { email: 'owner1@demo.vaka', role: 'Applicant', description: 'Builder paying stage fees' },
  { email: 'moyo@bcc.gov.zw', role: 'Inspector', description: 'Signs off site visits' },
  { email: 'clerk@bcc.gov.zw', role: 'Council', description: 'Reconciliation & registry' },
  { email: 'ps@mlgpw.gov.zw', role: 'Ministry', description: 'Read-only super-view' },
];

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  async function performLogin(loginEmail: string, loginPassword: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function performRegister() {
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ name, email, password, phone: phone || undefined });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSignup) {
      void performRegister();
    } else {
      void performLogin(email, password);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <div className="vk-login">
      <div className="vk-login__panel vk-login__panel--brand">
        <div>
          <span className="vk-login__brand-mark">V</span>
          <h1 className="vk-login__headline">Vaka</h1>
          <p className="vk-login__tagline">
            Pay a stage fee, the site visit unlocks. Sign off on site, the next stage unlocks.
            Every dollar is a traceable digital record — no cash ever touches an inspector.
          </p>
        </div>
        <ul className="vk-login__steps">
          <li>Submit a permit and verify your builder instantly</li>
          <li>Pay each inspection stage with EcoCash, OneMoney, or card</li>
          <li>Track every gate live, end to end, with a QR-verifiable certificate</li>
        </ul>
      </div>

      <div className="vk-login__panel vk-login__panel--form">
        <Card elevation="floating" className="vk-login__card">
          <h2 className="vk-login__form-title">{isSignup ? 'Create your account' : 'Sign in'}</h2>
          {isSignup && (
            <p className="vk-login__form-subtitle">
              Self-registration creates a builder / property-owner account. Council and inspector
              access is provisioned by your local authority.
            </p>
          )}
          <form onSubmit={handleSubmit} className="vk-login__form" noValidate>
            {isSignup && (
              <Input
                label="Full name"
                type="text"
                name="name"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            )}
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {isSignup && (
              <Input
                label="Phone (optional)"
                type="tel"
                name="phone"
                autoComplete="tel"
                placeholder="+263 77 123 4567"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            )}
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={isSignup ? 8 : undefined}
              hint={isSignup ? 'At least 8 characters.' : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && (
              <p className="vk-login__error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>
              {isSignup ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="vk-login__switch">
            {isSignup ? (
              <>
                Already have an account?{' '}
                <button type="button" className="vk-login__link" onClick={() => switchMode('signin')}>
                  Sign in
                </button>
              </>
            ) : (
              <>
                New here?{' '}
                <button type="button" className="vk-login__link" onClick={() => switchMode('signup')}>
                  Create an account
                </button>
              </>
            )}
          </p>

          {!isSignup && (
            <>
              <div className="vk-login__divider">
                <span>or jump straight in as</span>
              </div>

              <div className="vk-login__quick-grid">
                {QUICK_LOGIN_PERSONAS.map((persona) => (
                  <button
                    key={persona.email}
                    type="button"
                    className="vk-login__quick-button"
                    onClick={() => void performLogin(persona.email, DEMO_PASSWORD)}
                    disabled={isSubmitting}
                  >
                    <span className="vk-login__quick-role">{persona.role}</span>
                    <span className="vk-login__quick-desc">{persona.description}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
