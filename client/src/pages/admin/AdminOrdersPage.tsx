import { Fragment, useState } from 'react';
import type { AdminOrder, OrderStatus } from '../../api/types';
import { EmptyState, ErrorMessage, PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDate, formatMoney } from '../../lib/format';
import { useApi } from '../../lib/useApi';
import { OrderNotes } from './OrderNotes';

const PLAN_NAMES = { starter: 'Starter', clinic: 'Clinic', group: 'Group' } as const;

export function AdminOrdersPage() {
  const [status, setStatus] = useState<'' | OrderStatus>('');
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  const { data, error, loading, reload } = useApi<{
    orders: AdminOrder[];
    paidThisMonthCents: number;
  }>(status ? `/admin/orders?status=${status}` : '/admin/orders');

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
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => {
                  const isOpen = openOrderId === order.id;
                  return (
                    <Fragment key={order.id}>
                      <tr>
                        <td>#{order.id}</td>
                        <td>{order.clinicName}</td>
                        <td>{PLAN_NAMES[order.plan]}</td>
                        <td className="numeric">
                          {formatMoney(order.amountCents, order.currency)}
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>
                          <StatusBadge status={order.status} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            aria-expanded={isOpen}
                            aria-controls={`order-notes-${order.id}`}
                            onClick={() => setOpenOrderId(isOpen ? null : order.id)}
                          >
                            {order.noteCount > 0 ? `Notes (${order.noteCount})` : 'Notes'}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr id={`order-notes-${order.id}`}>
                          <td colSpan={7}>
                            <OrderNotes orderId={order.id} onAdded={reload} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
