import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api/client';
import type { Customer } from '../api/types';
import { FormField } from '../components/FormField';
import { EmptyState, ErrorMessage, PageHeader } from '../components/PageHeader';
import { formatDate } from '../lib/format';
import { useApi, useDebouncedValue } from '../lib/useApi';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const path = debouncedSearch ? `/customers?q=${encodeURIComponent(debouncedSearch)}` : '/customers';
  const { data, error, reload } = useApi<{ customers: Customer[] }>(path);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setName('');
    setEmail('');
    setPhone('');
    setFormError(null);
    setShowForm(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    try {
      await api.post('/customers', { name, email, phone: phone || null });
      resetForm();
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Customers"
        actions={
          !showForm && (
            <button type="button" className="button" onClick={() => setShowForm(true)}>
              Add customer
            </button>
          )
        }
      />
      <div className="stack">
        <ErrorMessage error={error ?? formError} />

        {showForm && (
          <form className="card form-grid" onSubmit={handleSubmit}>
            <FormField label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
            <FormField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <FormField
              label="Phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <div className="form-actions full">
              <button type="button" className="button button-secondary" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="button">
                Save
              </button>
            </div>
          </form>
        )}

        <div>
          <label htmlFor="customer-search" className="visually-hidden">
            Search customers
          </label>
          <input
            id="customer-search"
            type="search"
            className="input"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ maxWidth: 320 }}
          />
        </div>

        {data?.customers.length === 0 && (
          <EmptyState title="No customers found">
            {search ? 'Try a different search.' : 'Customers are added automatically when they book.'}
          </EmptyState>
        )}

        {data && data.customers.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Customer since</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.email}</td>
                    <td>{customer.phone ?? <span className="muted">—</span>}</td>
                    <td>{formatDate(customer.createdAt)}</td>
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
