// apps/superadmin/app/superadmin/engineers/page.tsx
// Engineer Profiles management — Row 137 (VIS sync infrastructure)
// Supports CRUD for engineer_profiles: display_name, preferred_ide,
// default_role, hourly_rate, max_concurrent_tasks, is_active toggle.

'use client';

import { useState, useEffect, useTransition } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import {
  createEngineerProfile,
  updateEngineerProfile,
  toggleEngineerActive,
  listEngineers,
} from './actions';

// ── Types ──────────────────────────────────────────────────────────────────────

interface EngineerProfile {
  id: string;
  user_id: string;
  display_name: string;
  preferred_ide: string;
  default_role: string;
  hourly_rate: number | null;
  max_concurrent_tasks: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  user_id: '',
  display_name: '',
  preferred_ide: '',
  default_role: '',
  hourly_rate: '',
  max_concurrent_tasks: '2',
};

// ── Page component ─────────────────────────────────────────────────────────────

export default function EngineersPage() {
  const [engineers, setEngineers] = useState<EngineerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EngineerProfile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');

  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // Load engineers
  const load = () => {
    setLoading(true);
    listEngineers()
      .then(setEngineers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Filtered list
  const displayed = engineers.filter((e) => {
    if (filterActive === 'active') return e.is_active;
    if (filterActive === 'inactive') return !e.is_active;
    return true;
  });

  // Open create form
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  // Open edit form
  const openEdit = (eng: EngineerProfile) => {
    setEditing(eng);
    setForm({
      user_id: eng.user_id,
      display_name: eng.display_name,
      preferred_ide: eng.preferred_ide ?? '',
      default_role: eng.default_role ?? '',
      hourly_rate: eng.hourly_rate != null ? String(eng.hourly_rate) : '',
      max_concurrent_tasks: String(eng.max_concurrent_tasks),
    });
    setFormError(null);
    setShowForm(true);
  };

  // Submit create / update
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      user_id: form.user_id.trim(),
      display_name: form.display_name.trim(),
      preferred_ide: form.preferred_ide.trim(),
      default_role: form.default_role.trim(),
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      max_concurrent_tasks: parseInt(form.max_concurrent_tasks, 10) || 2,
    };

    if (!payload.display_name) {
      setFormError('Display name is required.');
      return;
    }

    startTransition(async () => {
      try {
        if (editing) {
          await updateEngineerProfile(editing.id, payload);
        } else {
          if (!payload.user_id) {
            setFormError('User ID is required for new profiles.');
            return;
          }
          await createEngineerProfile(payload as typeof payload & { user_id: string });
        }
        setShowForm(false);
        load();
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : 'An error occurred.');
      }
    });
  };

  // Toggle active / inactive
  const handleToggleActive = (eng: EngineerProfile) => {
    startTransition(async () => {
      try {
        await toggleEngineerActive(eng.id, !eng.is_active);
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Toggle failed.');
      }
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Engineer Profiles</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage engineers for task assignment and VIS sync (Row 137+).
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + Add Engineer
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(['active', 'inactive', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                filterActive === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No engineers found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">IDE</th>
                  <th className="px-4 py-3 text-right font-medium">Rate (USD/hr)</th>
                  <th className="px-4 py-3 text-right font-medium">Max Tasks</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map((eng) => (
                  <tr key={eng.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{eng.display_name}</td>
                    <td className="px-4 py-3 text-gray-600">{eng.default_role || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{eng.preferred_ide || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {eng.hourly_rate != null ? `$${Number(eng.hourly_rate).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">{eng.max_concurrent_tasks}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          eng.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {eng.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openEdit(eng)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(eng)}
                        disabled={isPending}
                        className="text-gray-500 hover:underline text-xs"
                      >
                        {eng.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create / Edit modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">
                {editing ? 'Edit Engineer' : 'Add Engineer'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editing && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      User ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.user_id}
                      onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                      placeholder="auth.users UUID"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.display_name}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Preferred IDE</label>
                  <input
                    type="text"
                    value={form.preferred_ide}
                    onChange={(e) => setForm({ ...form, preferred_ide: e.target.value })}
                    placeholder="e.g. VS Code, Cursor"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Default Role</label>
                  <input
                    type="text"
                    value={form.default_role}
                    onChange={(e) => setForm({ ...form, default_role: e.target.value })}
                    placeholder="e.g. frontend, backend, fullstack"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Hourly Rate (USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.hourly_rate}
                      onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                      placeholder="0.00"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Max Concurrent Tasks</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={form.max_concurrent_tasks}
                      onChange={(e) => setForm({ ...form, max_concurrent_tasks: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {formError && (
                  <p className="text-sm text-red-600">{formError}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:underline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
