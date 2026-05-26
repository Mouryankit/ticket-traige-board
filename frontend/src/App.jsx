import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createTicket, deleteTicket, getStats, listTickets, updateTicket } from './api.js';
import { PRIORITIES, STATUSES, STATUS_INDEX } from './constants.js';
import { formatAge, readableStatus } from './utils.js';

const emptyForm = {
  subject: '',
  description: '',
  customerEmail: '',
  priority: 'medium'
};

function normalizeApiErrors(error) {
  return error?.data?.errors || { form: error.message || 'Something went wrong' };
}

function moveOptions(status) {
  const index = STATUS_INDEX[status];
  return STATUSES.filter((_, nextIndex) => Math.abs(nextIndex - index) === 1);
}

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ priority: '', breachedOnly: false });
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cardError, setCardError] = useState('');
  const [movingId, setMovingId] = useState('');

  async function refresh(nextFilters = filters) {
    setError('');
    const [ticketData, statsData] = await Promise.all([listTickets(nextFilters), getStats()]);
    setTickets(ticketData);
    setStats(statsData);
  }

  useEffect(() => {
    let active = true;

    setLoading(true);
    refresh()
      .catch((err) => {
        if (active) setError(err.message || 'Could not load tickets');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function updateFilters(nextFilters) {
    setFilters(nextFilters);
    setLoading(true);
    try {
      await refresh(nextFilters);
    } catch (err) {
      setError(err.message || 'Could not apply filters');
    } finally {
      setLoading(false);
    }
  }

  const groupedTickets = useMemo(() => {
    return STATUSES.reduce((acc, status) => {
      acc[status.key] = tickets.filter((ticket) => ticket.status === status.key);
      return acc;
    }, {});
  }, [tickets]);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setFormErrors({});

    try {
      await createTicket(form);
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setFormErrors(normalizeApiErrors(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleMove(ticket, nextStatus) {
    setMovingId(ticket._id);
    setCardError('');

    try {
      const updated = await updateTicket(ticket._id, { status: nextStatus });
      setTickets((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      const statsData = await getStats();
      setStats(statsData);
    } catch (err) {
      setCardError(err.message || 'Could not move ticket');
    } finally {
      setMovingId('');
    }
  }

  async function handleDelete(ticketId) {
    setMovingId(ticketId);
    setCardError('');

    try {
      await deleteTicket(ticketId);
      setTickets((current) => current.filter((ticket) => ticket._id !== ticketId));
      const statsData = await getStats();
      setStats(statsData);
    } catch (err) {
      setCardError(err.message || 'Could not delete ticket');
    } finally {
      setMovingId('');
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Support Triage</p>
          <h1>DeskFlow</h1>
        </div>
        <div className="api-pill">
          <CheckCircle2 size={16} />
          SLA-aware board
        </div>
      </header>

      <section className="stats-strip" aria-label="Ticket stats">
        {STATUSES.map((status) => (
          <div className="stat-item" key={status.key}>
            <span>{status.label}</span>
            <strong>{stats?.byStatus?.[status.key] ?? 0}</strong>
          </div>
        ))}
        <div className="stat-item breached-stat">
          <span>Breached Now</span>
          <strong>{stats?.currentlyBreached ?? 0}</strong>
        </div>
      </section>

      <section className="controls-row" aria-label="Ticket filters">
        <label>
          Priority
          <select
            value={filters.priority}
            onChange={(event) => updateFilters({ ...filters, priority: event.target.value })}
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((priority) => (
              <option value={priority.key} key={priority.key}>
                {priority.label}
              </option>
            ))}
          </select>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={filters.breachedOnly}
            onChange={(event) => updateFilters({ ...filters, breachedOnly: event.target.checked })}
          />
          SLA breached only
        </label>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
      {cardError ? <div className="error-banner compact">{cardError}</div> : null}

      <section className="board-layout">
        <div className="board" aria-busy={loading}>
          {STATUSES.map((status) => (
            <section className="column" key={status.key}>
              <header className="column-header">
                <h2>{status.label}</h2>
                <span>{groupedTickets[status.key]?.length ?? 0}</span>
              </header>

              <div className="ticket-list">
                {loading ? (
                  <div className="loading-card">
                    <Loader2 className="spin" size={18} />
                    Loading
                  </div>
                ) : null}

                {!loading && groupedTickets[status.key]?.length === 0 ? (
                  <div className="empty-state">No tickets</div>
                ) : null}

                {!loading &&
                  groupedTickets[status.key]?.map((ticket) => (
                    <article className={`ticket-card ${ticket.slaBreached ? 'is-breached' : ''}`} key={ticket._id}>
                      <div className="card-title-row">
                        <h3>{ticket.subject}</h3>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label="Delete ticket"
                          title="Delete ticket"
                          onClick={() => handleDelete(ticket._id)}
                          disabled={movingId === ticket._id}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="meta-row">
                        <span className={`priority-badge priority-${ticket.priority}`}>{ticket.priority}</span>
                        <span>{formatAge(ticket.ageMinutes)}</span>
                      </div>

                      {ticket.slaBreached ? (
                        <div className="sla-flag">
                          <AlertTriangle size={15} />
                          SLA breached
                        </div>
                      ) : null}

                      <div className="move-row">
                        {moveOptions(ticket.status).map((option) => {
                          const goesBack = STATUS_INDEX[option.key] < STATUS_INDEX[ticket.status];
                          return (
                            <button
                              className="move-button"
                              type="button"
                              key={option.key}
                              onClick={() => handleMove(ticket, option.key)}
                              disabled={movingId === ticket._id}
                              title={`Move to ${readableStatus(option.key)}`}
                            >
                              {goesBack ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="create-panel">
          <div className="panel-heading">
            <Plus size={18} />
            <h2>Create Ticket</h2>
          </div>

          <form onSubmit={handleCreate} noValidate>
            {formErrors.form ? <div className="form-error">{formErrors.form}</div> : null}

            <label>
              Subject
              <input
                value={form.subject}
                onChange={(event) => setForm({ ...form, subject: event.target.value })}
                placeholder="Cannot log in"
              />
              {formErrors.subject ? <span className="field-error">{formErrors.subject}</span> : null}
            </label>

            <label>
              Description
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Customer sees an error after entering credentials."
                rows="5"
              />
              {formErrors.description ? <span className="field-error">{formErrors.description}</span> : null}
            </label>

            <label>
              Customer Email
              <input
                type="email"
                value={form.customerEmail}
                onChange={(event) => setForm({ ...form, customerEmail: event.target.value })}
                placeholder="customer@example.com"
              />
              {formErrors.customerEmail ? <span className="field-error">{formErrors.customerEmail}</span> : null}
            </label>

            <label>
              Priority
              <select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
              >
                {PRIORITIES.map((priority) => (
                  <option value={priority.key} key={priority.key}>
                    {priority.label}
                  </option>
                ))}
              </select>
              {formErrors.priority ? <span className="field-error">{formErrors.priority}</span> : null}
            </label>

            <button className="submit-button" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
              Create ticket
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}

export default App;
