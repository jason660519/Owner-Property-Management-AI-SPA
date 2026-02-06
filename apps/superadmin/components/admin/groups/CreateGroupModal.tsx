'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { createGroup } from '@/app/superadmin/groups/actions';

export function CreateGroupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
    }
  }, [isOpen]);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await createGroup(formData);
      if (result?.error) setError(result.error);
      else setIsOpen(false);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[#7C3AED] text-white px-4 py-2 rounded-lg hover:bg-[#6D28D9] transition-colors text-sm font-medium flex items-center gap-2"
      >
        <Plus size={16} />
        Create New Group
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#333333]">
          <h3 className="font-semibold text-white">Create New Permission Group</h3>
          <button onClick={() => setIsOpen(false)} className="text-[#999999] hover:text-white">
            <X size={20} />
          </button>
        </div>
        <form action={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/20 text-red-400 text-sm p-3 rounded-md border border-red-500/30">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#999999] mb-1">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maintenance Manager"
              className="w-full px-3 py-2 border border-[#333333] rounded-md bg-[#1A1A1A] text-white placeholder-[#666666] focus:ring-2 focus:ring-[#7C3AED]"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[#999999] mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this group..."
              className="w-full px-3 py-2 border border-[#333333] rounded-md bg-[#1A1A1A] text-white placeholder-[#666666] resize-none focus:ring-2 focus:ring-[#7C3AED]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm font-medium text-[#999999] border border-[#333333] rounded-md hover:bg-[#333333]"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] rounded-md hover:bg-[#6D28D9] flex items-center gap-2 disabled:opacity-70"
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {isLoading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
