import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../../api/client';
import type { AdminOrderNote } from '../../api/types';
import { ErrorMessage } from '../../components/PageHeader';
import { formatDateTime } from '../../lib/format';
import { useApi } from '../../lib/useApi';

interface OrderNotesProps {
  orderId: number;
  onAdded: () => void;
}

export function OrderNotes({ orderId, onAdded }: OrderNotesProps) {
  const { data, error, loading, reload } = useApi<{ notes: AdminOrderNote[] }>(
    `/admin/orders/${orderId}/notes`,
  );
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSending(true);
    try {
      await api.post(`/admin/orders/${orderId}/notes`, { body });
      setBody('');
      reload();
      onAdded();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="stack">
      <ErrorMessage error={error ?? formError} />
      {loading && !data && <p className="muted">Loading notes…</p>}
      {data && data.notes.length === 0 && <p className="muted">No notes yet.</p>}
      {data && data.notes.length > 0 && (
        <ul className="note-list">
          {data.notes.map((note) => (
            <li key={note.id}>
              <p>{note.body}</p>
              <p className="muted">
                {note.authorName} · {formatDateTime(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form className="stack" onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor={`order-note-${orderId}`}>
            Add a note
          </label>
          <textarea
            id={`order-note-${orderId}`}
            className="textarea"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="button button-small" disabled={sending}>
            {sending ? 'Saving…' : 'Add note'}
          </button>
        </div>
      </form>
    </div>
  );
}
