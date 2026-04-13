// ExportToVISButton — toolbar button that opens the ExportProgressDialog.
// Displayed in the Project Progress page header when Paperclip is configured.

'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { ExportProgressDialog } from './ExportProgressDialog';

export function ExportToVISButton(): React.ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        title="Export features to Paperclip VIS"
      >
        <Upload className="w-4 h-4" aria-hidden="true" />
        Export to VIS
      </button>

      <ExportProgressDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
