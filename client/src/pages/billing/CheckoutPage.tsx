import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import type { PlanOrder, PlanQuote } from '../../api/types';
import { FormField } from '../../components/FormField';
import { ErrorMessage } from '../../components/PageHeader';
import { formatMoney } from '../../lib/format';
import { useApi } from '../../lib/useApi';
import styles from './CheckoutPage.module.css';

function parseExpiry(value: string): { expMonth: number; expYear: number } | null {
  const match = value.trim().match(/^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/);
  if (!match) return null;
  const expMonth = Number(match[1]);
  const year = Number(match[2]);
  if (expMonth < 1 || expMonth > 12) return null;
  return { expMonth, expYear: year < 100 ? 2000 + year : year };
}

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan') ?? '';
  const { data, error } = useApi<{ quote: PlanQuote }>(
    planId ? `/billing/quote?plan=${encodeURIComponent(planId)}` : null,
  );

  const [billingName, setBillingName] = useState('');
  const [vatId, setVatId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentError(null);

    const parsedExpiry = parseExpiry(expiry);
    if (!parsedExpiry) {
      setPaymentError('Enter the expiry date as MM/YY.');
      return;
    }

    setPaying(true);
    try {
      const response = await api.post<{ order: PlanOrder }>('/billing/checkout', {
        plan: planId,
        billingName,
        vatId: vatId || null,
        card: { number: cardNumber.replace(/\s/g, ''), cvc, ...parsedExpiry },
      });
      navigate(`/billing/success?order=${response.order.id}`);
    } catch (err) {
      setPaymentError(errorMessage(err));
      setPaying(false);
    }
  }

  if (!planId) {
    return (
      <p>
        No plan selected. <Link to="/billing">Choose a plan</Link>.
      </p>
    );
  }

  const quote = data?.quote;

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <Link to="/billing" className={styles.back}>
          ← Back to plans
        </Link>
        <h1>Checkout</h1>
        <ErrorMessage error={error ?? paymentError} />

        <form id="checkout-form" className="stack" onSubmit={handleSubmit}>
          <section className="card stack">
            <h2>Billing details</h2>
            <FormField
              label="Name on invoice"
              autoComplete="organization"
              value={billingName}
              onChange={(event) => setBillingName(event.target.value)}
              required
            />
            <input
              className="input"
              placeholder="VAT ID (optional)"
              value={vatId}
              onChange={(event) => setVatId(event.target.value)}
            />
          </section>

          <section className="card stack">
            <h2>Payment</h2>
            <FormField
              label="Card number"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
              required
            />
            <div className={styles.cardRow}>
              <FormField
                label="Expiry"
                placeholder="MM/YY"
                autoComplete="cc-exp"
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
                required
              />
              <FormField
                label="CVC"
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={4}
                value={cvc}
                onChange={(event) => setCvc(event.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
          </section>
        </form>
      </div>

      <aside className={`card ${styles.summary}`} aria-label="Order summary">
        <h2>Order summary</h2>
        <p className="muted">Billed monthly. Cancel any time.</p>
        {quote ? (
          <dl className={styles.lines}>
            <div className={styles.line}>
              <dt>{quote.plan.name} plan</dt>
              <dd>{formatMoney(quote.subtotalCents, quote.currency)}</dd>
            </div>
            <div className={styles.line}>
              <dt>VAT {(quote.vatRate * 100).toLocaleString('en-GB')}%</dt>
              <dd>{formatMoney(quote.vatCents, quote.currency)}</dd>
            </div>
            <div className={`${styles.line} ${styles.total}`}>
              <dt>Total due today</dt>
              <dd>{formatMoney(quote.totalCents, quote.currency)}</dd>
            </div>
          </dl>
        ) : (
          <p className="muted">Loading…</p>
        )}
      </aside>

      <div className={styles.payBar}>
        <p className={styles.secure}>Payments are encrypted and processed securely.</p>
        <button type="submit" form="checkout-form" className="button" disabled={paying || !quote}>
          {paying ? 'Processing…' : 'Pay now'}
        </button>
      </div>
    </div>
  );
}
