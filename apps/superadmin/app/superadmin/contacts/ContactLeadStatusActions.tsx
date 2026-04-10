import {
  CONTACT_LEAD_STATUS_LABELS,
  CONTACT_LEAD_STATUS_VALUES,
  type ContactLeadStatus,
} from './constants';
import { updateContactLeadStatusFormAction } from './actions';

interface ContactLeadStatusActionsProps {
  leadId: string;
  currentStatus: ContactLeadStatus;
}

export function ContactLeadStatusActions({
  leadId,
  currentStatus,
}: ContactLeadStatusActionsProps) {
  return (
    <form action={updateContactLeadStatusFormAction} className="flex flex-wrap gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      {CONTACT_LEAD_STATUS_VALUES.map((statusValue) => (
        <button
          key={statusValue}
          type="submit"
          name="status"
          value={statusValue}
          disabled={currentStatus === statusValue}
          className="rounded-md border border-border-default px-2.5 py-1 text-xs font-medium text-text-secondary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {CONTACT_LEAD_STATUS_LABELS[statusValue]}
        </button>
      ))}
    </form>
  );
}
