import { Link } from 'react-router-dom';
import type { Plan, PlanId, PlanOrder } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { ErrorMessage, PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDate, formatMoney } from '../../lib/format';
import { useApi } from '../../lib/useApi';
import styles from './BillingPage.module.css';

export function BillingPage() {
  const { user } = useAuth();
  const plans = useApi<{ currentPlan: PlanId | null; plans: Plan[] }>('/billing/plans');
  const orders = useApi<{ orders: PlanOrder[] }>('/billing/orders');
  const currentPlan = plans.data?.currentPlan ?? null;
  const planName = plans.data?.plans.find((plan) => plan.id === currentPlan)?.name;

  return (
    <>
      <PageHeader
        title="Plan & billing"
        description={
          planName
            ? `Your clinic is on the ${planName} plan.`
            : 'Your clinic is on a free trial. Pick a plan to keep taking bookings.'
        }
      />
      <ErrorMessage error={plans.error ?? orders.error} />

      {plans.data && (
        <section className={styles.plans} aria-label="Plans">
          {plans.data.plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <article
                key={plan.id}
                className={isCurrent ? `card ${styles.plan} ${styles.current}` : `card ${styles.plan}`}
              >
                <h2>{plan.name}</h2>
                <p className={styles.price}>
                  {formatMoney(plan.priceCents)}
                  <span className="muted"> / month</span>
                </p>
                <p className="muted">{plan.description}</p>
                <ul className={styles.features}>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {isCurrent ? (
                  <span className={styles.currentLabel}>Current plan</span>
                ) : user?.role === 'owner' ? (
                  <Link to={`/billing/checkout?plan=${plan.id}`} className="button">
                    Choose {plan.name}
                  </Link>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
      <p className={`muted ${styles.vatNote}`}>Prices exclude VAT.</p>

      <section className="stack">
        <h2>Order history</h2>
        {orders.data?.orders.length === 0 && <p className="muted">No orders yet.</p>}
        {orders.data && orders.data.orders.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Plan</th>
                  <th scope="col" className="numeric">
                    Amount
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.orders.map((order) => (
                  <tr key={order.id}>
                    <td>{formatDate(order.createdAt)}</td>
                    <td className={styles.planCell}>{order.plan}</td>
                    <td className="numeric">{formatMoney(order.amountCents, order.currency)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
