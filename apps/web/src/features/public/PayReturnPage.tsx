import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './pay-return.css';

/**
 * Landing page after a card/web payment redirects back from Paynow. We don't trust the redirect
 * for status — the backend polls Paynow authoritatively — so this simply reassures the payer and
 * sends them back to where the live gate status is shown.
 */
export function PayReturnPage() {
  const { user } = useAuth();
  const backTo = user ? '/permits' : '/login';

  return (
    <main className="vk-pay-return">
      <div className="vk-pay-return__card">
        <p className="vk-pay-return__mark" aria-hidden="true">
          ✓
        </p>
        <h1 className="vk-pay-return__title">Confirming your payment</h1>
        <p className="vk-pay-return__body">
          Paynow is processing your transaction. As soon as it settles, the inspection stage updates
          automatically — no need to refresh. Head back to track its status.
        </p>
        <Link to={backTo} className="vk-pay-return__cta">
          {user ? 'Back to my permits' : 'Sign in to continue'}
        </Link>
      </div>
    </main>
  );
}
