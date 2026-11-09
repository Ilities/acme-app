import { Link, useSearchParams } from 'react-router-dom';
import type { PlanOrder } from '../../api/types';
import { ErrorMessage, PageHeader } from '../../components/PageHeader';
import { formatDate, formatMoney } from '../../lib/format';
import { useApi } from '../../lib/useApi';

const PLAN_NAMES = { starter: 'Starter', clinic: 'Clinic', group: 'Group' } as const;

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const { data, error } = useApi<{ order: PlanOrder }>(orderId ? `/billing/orders/${orderId}` : null);
  const order = data?.order;

  return (
    <>
      <PageHeader title="Payment received" />
      <ErrorMessage error={error} />
      {order && (
        <div className="card stack" style={{ maxWidth: 520 }}>
          <p>
            Thank you! Your clinic is now on the <strong>{PLAN_NAMES[order.plan]}</strong> plan.
          </p>
          <dl className="stack" style={{ margin: 0, gap: '0.25rem' }}>
            <div>
              <dt className="muted">Order</dt>
              <dd style={{ margin: 0 }}>#{order.id}</dd>
            </div>
            <div>
              <dt className="muted">Amount paid</dt>
              <dd style={{ margin: 0 }}>{formatMoney(order.amountCents, order.currency)}</dd>
            </div>
            <div>
              <dt className="muted">Date</dt>
              <dd style={{ margin: 0 }}>{formatDate(order.createdAt)}</dd>
            </div>
          </dl>
          <div>
            <Link to="/" className="button">
              Go to dashboard
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
