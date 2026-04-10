import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAdminStats, getAdminUsers, updateUserRole, deleteUser,
  getSpecies, createSpecies, updateSpecies, deleteSpecies,
  getCampaigns, createCampaign, updateCampaign, deleteCampaign,
  getEvents, createEvent, updateEvent, deleteEvent,
  getSightings, updateSightingStatus, uploadImage,
} from '../services/api';

// ── tiny helpers ──────────────────────────────────────────────────────────────
const ROLES = ['registered_user', 'donor', 'volunteer', 'researcher', 'admin'];
const CONSERVATION_STATUSES = ['critically_endangered', 'endangered', 'vulnerable'];
const CAMPAIGN_STATUSES = ['active', 'completed', 'cancelled'];
const EVENT_STATUSES = ['upcoming', 'ongoing', 'completed', 'cancelled'];

const fmtMoney = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const blank = (obj) => Object.fromEntries(Object.keys(obj).map((k) => [k, '']));

// ── reusable toast ────────────────────────────────────────────────────────────
const useToast = () => {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, show };
};

// ── inline modal-style form ───────────────────────────────────────────────────
const FormRow = ({ label, children }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>{label}</label>
    {children}
  </div>
);

const iStyle = {
  width: '100%', padding: '7px 10px', borderRadius: 6,
  border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box',
};

// ── Image upload + URL input component ───────────────────────────────────────
const ImageInput = ({ value, onChange }) => {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadImage(file);
      onChange(res.data.url);
    } catch (err) {
      setError('Upload failed. Try pasting a URL instead.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      {/* Preview */}
      {value && (
        <img
          src={value}
          alt="preview"
          style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 6, marginBottom: 6, border: '1px solid #d1d5db' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}
      {/* File picker row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <button
          type="button"
          onClick={() => fileRef.current.click()}
          disabled={uploading}
          style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #166534', background: '#f0fdf4', color: '#166534', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
        >
          {uploading ? 'Uploading…' : 'Upload Image'}
        </button>
        <span style={{ fontSize: 12, color: '#6b7280' }}>or paste a URL below</span>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </div>
      {/* URL fallback */}
      <input style={iStyle} value={value} placeholder="https://…" onChange={(e) => onChange(e.target.value)} />
      {error && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
};

// =============================================================================
const AdminDashboard = () => {
  const [tab, setTab] = useState('overview');
  const { toast, show: showToast } = useToast();

  const tabs = [
    { id: 'overview',   label: 'Overview' },
    { id: 'users',      label: 'Users' },
    { id: 'species',    label: 'Species' },
    { id: 'campaigns',  label: 'Campaigns' },
    { id: 'events',     label: 'Events' },
    { id: 'sightings',  label: 'Sightings' },
  ];

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
      <div className="page-header"><h1>Admin Dashboard</h1></div>

      {/* Tab bar */}
      <div style={{ background: '#fff', borderBottom: '2px solid #e5e7eb', padding: '0 24px', display: 'flex', gap: 4 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '12px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t.id ? 700 : 400,
              borderBottom: tab === t.id ? '3px solid #166534' : '3px solid transparent',
              color: tab === t.id ? '#166534' : '#374151',
              fontSize: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="container" style={{ paddingTop: 24 }}>
        {tab === 'overview'  && <OverviewTab showToast={showToast} />}
        {tab === 'users'     && <UsersTab    showToast={showToast} />}
        {tab === 'species'   && <SpeciesTab  showToast={showToast} />}
        {tab === 'campaigns' && <CampaignsTab showToast={showToast} />}
        {tab === 'events'    && <EventsTab   showToast={showToast} />}
        {tab === 'sightings' && <SightingsTab showToast={showToast} />}
      </div>
    </div>
  );
};

// =============================================================================
// TAB: Overview
// =============================================================================
const OverviewTab = ({ showToast }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats()
      .then((r) => setStats(r.data || r))
      .catch(() => showToast('Failed to load stats', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  if (loading) return <p>Loading statistics…</p>;
  if (!stats)  return <p>Failed to load statistics.</p>;

  const cards = [
    { label: 'Total Users',       value: stats.totalUsers      ?? 0 },
    { label: 'Total Species',     value: stats.totalSpecies    ?? 0 },
    { label: 'Total Sightings',   value: stats.totalSightings  ?? 0 },
    { label: 'Active Campaigns',  value: stats.activeCampaigns ?? 0 },
    { label: 'Total Donations',   value: fmtMoney(stats.totalDonations) },
    { label: 'Upcoming Events',   value: stats.upcomingEvents  ?? 0 },
    { label: 'Pending Sightings', value: stats.pendingSightings ?? 0 },
  ];

  return (
    <>
      <h2>Platform Statistics</h2>
      <div className="stats-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="stat-number">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>
    </>
  );
};

// =============================================================================
// TAB: Users
// =============================================================================
const UsersTab = ({ showToast }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminUsers()
      .then((r) => setUsers(r.data || r))
      .catch(() => showToast('Failed to load users', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      showToast('Role updated');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update role', 'error');
    }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast('User deleted');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  if (loading) return <p>Loading users…</p>;

  return (
    <>
      <h2>User Management</h2>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} style={{ fontSize: 13, padding: '4px 6px' }}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td>{fmtDate(u.created_at)}</td>
                <td>
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(u.id, u.name)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p>No users found.</p>}
      </div>
    </>
  );
};

// =============================================================================
// TAB: Species
// =============================================================================
const SPECIES_BLANK = { name: '', scientific_name: '', conservation_status: 'endangered', description: '', habitat: '', location: '', population: '', image_url: '', threats: '' };

const SpeciesTab = ({ showToast }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);   // null = closed, {} = new, {id,...} = edit
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getSpecies()
      .then((r) => setItems(r.data || r))
      .catch(() => showToast('Failed to load species', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => setForm({ ...SPECIES_BLANK });
  const openEdit = (s) => setForm({ ...s, population: s.population_estimate || '', threats: Array.isArray(s.threats) ? s.threats.join(', ') : (s.threats || '') });
  const closeForm = () => setForm(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name || null,
        scientific_name: form.scientific_name || null,
        conservation_status: form.conservation_status || null,
        population_estimate: form.population ? Number(form.population) : null,
        habitat: form.habitat || null,
        description: form.description || null,
        threats: form.threats || null,
        image_url: form.image_url || null,
        location: form.location || null,
      };
      if (form.id) {
        await updateSpecies(form.id, payload);
        showToast('Species updated');
      } else {
        await createSpecies(payload);
        showToast('Species created');
      }
      closeForm();
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete species "${name}"?`)) return;
    try {
      await deleteSpecies(id);
      setItems((prev) => prev.filter((s) => s.id !== id));
      showToast('Species deleted');
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    }
  };

  if (loading) return <p>Loading species…</p>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Species Management</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Species</button>
      </div>

      {form && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>{form.id ? 'Edit Species' : 'Add New Species'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <FormRow label="Common Name *"><input style={iStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormRow>
            <FormRow label="Scientific Name"><input style={iStyle} value={form.scientific_name} onChange={(e) => setForm({ ...form, scientific_name: e.target.value })} /></FormRow>
            <FormRow label="Conservation Status">
              <select style={iStyle} value={form.conservation_status} onChange={(e) => setForm({ ...form, conservation_status: e.target.value })}>
                {CONSERVATION_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </FormRow>
            <FormRow label="Population Estimate"><input style={iStyle} value={form.population} onChange={(e) => setForm({ ...form, population: e.target.value })} /></FormRow>
            <FormRow label="Habitat"><input style={iStyle} value={form.habitat} onChange={(e) => setForm({ ...form, habitat: e.target.value })} /></FormRow>
            <FormRow label="Location"><input style={iStyle} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></FormRow>
            <FormRow label="Threats (comma-separated)"><input style={iStyle} value={form.threats} onChange={(e) => setForm({ ...form, threats: e.target.value })} /></FormRow>
          </div>
          <FormRow label="Description">
            <textarea style={{ ...iStyle, height: 80, resize: 'vertical' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormRow>
          <FormRow label="Image">
            <ImageInput value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
          </FormRow>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="btn" onClick={closeForm}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Scientific Name</th><th>Status</th><th>Population</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td><em>{s.scientific_name}</em></td>
                <td><span className="badge badge-danger" style={{ fontSize: 11 }}>{s.conservation_status?.replace(/_/g, ' ')}</span></td>
                <td>{s.population || '—'}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-sm" style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }} onClick={() => openEdit(s)}>Edit</button>
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(s.id, s.name)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p>No species found.</p>}
      </div>
    </>
  );
};

// =============================================================================
// TAB: Campaigns
// =============================================================================
const CAMPAIGN_BLANK = { title: '', description: '', goal_amount: '', image_url: '', start_date: '', end_date: '', status: 'active' };

const CampaignsTab = ({ showToast }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getCampaigns()
      .then((r) => setItems(r.data || r))
      .catch(() => showToast('Failed to load campaigns', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => setForm({ ...CAMPAIGN_BLANK });
  const openEdit = (c) => setForm({ ...c, start_date: c.start_date ? c.start_date.slice(0, 10) : '', end_date: c.end_date ? c.end_date.slice(0, 10) : '' });
  const closeForm = () => setForm(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (form.id) {
        await updateCampaign(form.id, form);
        showToast('Campaign updated');
      } else {
        await createCampaign(form);
        showToast('Campaign created');
      }
      closeForm();
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete campaign "${title}"? All donations will also be deleted.`)) return;
    try {
      await deleteCampaign(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
      showToast('Campaign deleted');
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    }
  };

  if (loading) return <p>Loading campaigns…</p>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Campaigns Management</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Campaign</button>
      </div>

      {form && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>{form.id ? 'Edit Campaign' : 'Add New Campaign'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <FormRow label="Title *"><input style={iStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormRow>
            <FormRow label="Goal Amount ($) *"><input type="number" style={iStyle} value={form.goal_amount} onChange={(e) => setForm({ ...form, goal_amount: e.target.value })} /></FormRow>
            <FormRow label="Start Date"><input type="date" style={iStyle} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></FormRow>
            <FormRow label="End Date"><input type="date" style={iStyle} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></FormRow>
            <FormRow label="Status">
              <select style={iStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormRow>
          </div>
          <FormRow label="Description">
            <textarea style={{ ...iStyle, height: 80, resize: 'vertical' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormRow>
          <FormRow label="Image">
            <ImageInput value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
          </FormRow>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="btn" onClick={closeForm}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Title</th><th>Goal</th><th>Raised</th><th>Status</th><th>End Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td>{fmtMoney(c.goal_amount)}</td>
                <td>{fmtMoney(c.raised_amount)}</td>
                <td><span className={c.status === 'active' ? 'badge-success' : 'badge'} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{c.status}</span></td>
                <td>{fmtDate(c.end_date)}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-sm" style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }} onClick={() => openEdit(c)}>Edit</button>
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(c.id, c.title)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p>No campaigns found.</p>}
      </div>
    </>
  );
};

// =============================================================================
// TAB: Events
// =============================================================================
const EVENT_BLANK = { title: '', description: '', location: '', event_date: '', start_time: '', end_time: '', capacity: '', image_url: '', status: 'upcoming' };

const EventsTab = ({ showToast }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getEvents()
      .then((r) => setItems(r.data || r))
      .catch(() => showToast('Failed to load events', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => setForm({ ...EVENT_BLANK });
  const openEdit = (e) => setForm({ ...e, event_date: e.event_date ? e.event_date.slice(0, 10) : '' });
  const closeForm = () => setForm(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (form.id) {
        await updateEvent(form.id, form);
        showToast('Event updated');
      } else {
        await createEvent(form);
        showToast('Event created');
      }
      closeForm();
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete event "${title}"?`)) return;
    try {
      await deleteEvent(id);
      setItems((prev) => prev.filter((e) => e.id !== id));
      showToast('Event deleted');
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    }
  };

  if (loading) return <p>Loading events…</p>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Events Management</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Event</button>
      </div>

      {form && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>{form.id ? 'Edit Event' : 'Add New Event'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <FormRow label="Title *"><input style={iStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormRow>
            <FormRow label="Location *"><input style={iStyle} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></FormRow>
            <FormRow label="Event Date *"><input type="date" style={iStyle} value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></FormRow>
            <FormRow label="Capacity (blank = unlimited)"><input type="number" style={iStyle} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></FormRow>
            <FormRow label="Start Time"><input type="time" style={iStyle} value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></FormRow>
            <FormRow label="End Time"><input type="time" style={iStyle} value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></FormRow>
            <FormRow label="Status">
              <select style={iStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormRow>
          </div>
          <FormRow label="Description">
            <textarea style={{ ...iStyle, height: 80, resize: 'vertical' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormRow>
          <FormRow label="Image">
            <ImageInput value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
          </FormRow>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="btn" onClick={closeForm}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Title</th><th>Location</th><th>Date</th><th>Capacity</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id}>
                <td>{e.title}</td>
                <td>{e.location}</td>
                <td>{fmtDate(e.event_date)}</td>
                <td>{e.capacity ? `${e.registered_count || 0}/${e.capacity}` : 'Open'}</td>
                <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: e.status === 'upcoming' ? '#dbeafe' : '#f3f4f6', color: '#374151' }}>{e.status}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-sm" style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }} onClick={() => openEdit(e)}>Edit</button>
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(e.id, e.title)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p>No events found.</p>}
      </div>
    </>
  );
};

// =============================================================================
// TAB: Sightings Verification
// =============================================================================
const SightingsTab = ({ showToast }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const load = useCallback(() => {
    setLoading(true);
    getSightings()
      .then((r) => setItems(r.data || r))
      .catch(() => showToast('Failed to load sightings', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id, status) => {
    try {
      await updateSightingStatus(id, status);
      setItems((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      showToast(`Sighting ${status}`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Update failed', 'error');
    }
  };

  const filtered = filter === 'all' ? items : items.filter((s) => s.status === filter);

  const statusColor = { pending: '#fef3c7', verified: '#d1fae5', rejected: '#fee2e2' };
  const statusText  = { pending: '#92400e', verified: '#065f46', rejected: '#991b1b' };

  if (loading) return <p>Loading sightings…</p>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Sightings Verification</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['pending', 'verified', 'rejected', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid #d1d5db', cursor: 'pointer',
                background: filter === f ? '#166534' : '#fff',
                color: filter === f ? '#fff' : '#374151',
                fontSize: 13, fontWeight: filter === f ? 700 : 400,
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && ` (${items.filter((s) => s.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Species</th><th>Reporter</th><th>Location</th><th>Date</th><th>Description</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>{s.species_name || '—'}</td>
                <td>{s.reporter_name || '—'}</td>
                <td>{s.location}</td>
                <td>{fmtDate(s.sighting_date)}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description || '—'}</td>
                <td>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: statusColor[s.status] || '#f3f4f6', color: statusText[s.status] || '#374151', fontWeight: 600 }}>
                    {s.status}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  {s.status !== 'verified' && (
                    <button
                      onClick={() => handleStatus(s.id, 'verified')}
                      style={{ background: '#065f46', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                    >
                      Verify
                    </button>
                  )}
                  {s.status !== 'rejected' && (
                    <button
                      onClick={() => handleStatus(s.id, 'rejected')}
                      style={{ background: '#991b1b', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                    >
                      Reject
                    </button>
                  )}
                  {s.status !== 'pending' && (
                    <button
                      onClick={() => handleStatus(s.id, 'pending')}
                      style={{ background: '#92400e', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                    >
                      Reset
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p>No {filter === 'all' ? '' : filter} sightings found.</p>}
      </div>
    </>
  );
};

export default AdminDashboard;
