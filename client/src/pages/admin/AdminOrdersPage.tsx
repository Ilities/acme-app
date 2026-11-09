import { useState } from 'react';
import type { AdminOrder, OrderStatus } from '../../api/types';
import { EmptyState, ErrorMessage, PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDate, formatMoney } from '../../lib/format';
import { useApi } from '../../lib/useApi';

const PLAN_NAMES = { starter: 'Starter', clinic: 'Clinic', group: 'Group' } as const;

export function AdminOrdersPage() {
  const [status, setStatus] = useState<'' | OrderStatus>('');
  const { data, error, loading } = useApi<{ orders: AdminOrder[]; paidThisMonthCents: number }>(
    status ? `/admin/orders?status=${status}` : '/admin/orders',
  );

  return (
    <>
      <PageHeader
        title="Plan orders"
        description="Plan purchases and upgrades across all clinics."
        actions={
          <div className="field">
            <label className="label" htmlFor="order-status">
              Status
            </label>
            <select
              id="order-status"
              className="select"
              value={status}
              onChange={(event) => setStatus(event.target.value as '' | OrderStatus)}
            >
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        }
      />
      <div className="stack">
        <ErrorMessage error={error} />
        {data && (
          <p className="muted">
            Paid this month: <strong>{formatMoney(data.paidThisMonthCents)}</strong>
          </p>
        )}
        {loading && !data && <p className="muted">Loading…</p>}
        {data?.orders.length === 0 && <EmptyState title="No orders match this filter" />}
        {data && data.orders.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Clinic</th>
                  <th scope="col">Plan</th>
                  <th scope="col" className="numeric">
                    Amount
                  </th>
                  <th scope="col">Date</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.clinicName}</td>
                    <td>{PLAN_NAMES[order.plan]}</td>
                    <td className="numeric">{formatMoney(order.amountCents, order.currency)}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
