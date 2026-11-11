import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api/client';
import type { StaffMember } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { FormField } from '../components/FormField';
import { EmptyState, ErrorMessage, PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useApi } from '../lib/useApi';

export function StaffPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const { data, error, reload } = useApi<{ staff: StaffMember[] }>('/staff');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setName('');
    setTitle('');
    setEmail('');
    setFormError(null);
    setShowForm(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    try {
      await api.post('/staff', { name, title, email: email || null });
      resetForm();
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  async function toggleActive(member: StaffMember) {
    try {
      await api.patch(`/staff/${member.id}`, { active: !member.active });
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Staff"
        description="People customers can book appointments with."
        actions={
          isOwner &&
          !showForm && (
            <button type="button" className="button" onClick={() => setShowForm(true)}>
              Add staff member
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
              label="Job title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
            <FormField
              label="Email"
              type="email"
              hint="Optional. Used for their own sign-in later."
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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

        {data?.staff.length === 0 && (
          <EmptyState title="No staff yet">Add the people who see customers at your clinic.</EmptyState>
        )}

        {data && data.staff.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Title</th>
                  <th scope="col">Email</th>
                  <th scope="col">Status</th>
                  {isOwner && (
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.staff.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.title}</td>
                    <td>{member.email ?? <span className="muted">—</span>}</td>
                    <td>
                      <StatusBadge status={member.active ? 'active' : 'inactive'} />
                    </td>
                    {isOwner && (
                      <td className="numeric">
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => toggleActive(member)}
                        >
                          {member.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
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
