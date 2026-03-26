import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  getContactLeadById,
  updateContactLeadStatus,
  updateContactLeadStatuses,
} from '@/app/superadmin/contacts/actions';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

describe('updateContactLeadStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates lead status and revalidates contacts page', async () => {
    const mockServerClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'super-admin-id' } },
        }),
      },
    };

    const mockAdminClient = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { id: 'lead-1' },
                error: null,
              }),
            })),
          })),
        })),
      })),
    };

    (createClient as jest.Mock).mockResolvedValue(mockServerClient);
    (createAdminClient as jest.Mock).mockReturnValue(mockAdminClient);

    const formData = new FormData();
    formData.append('leadId', 'lead-1');
    formData.append('status', 'read');

    const result = await updateContactLeadStatus(formData);

    expect(result).toEqual({ success: true });
    expect(mockAdminClient.from).toHaveBeenCalledWith('contact_messages');
    expect(revalidatePath).toHaveBeenCalledWith('/superadmin/contacts');
  });

  it('rejects invalid status values', async () => {
    const formData = new FormData();
    formData.append('leadId', 'lead-1');
    formData.append('status', 'closed');

    const result = await updateContactLeadStatus(formData);

    expect(result).toEqual({ error: 'Invalid lead status' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('requires an authenticated user', async () => {
    const mockServerClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockServerClient);

    const formData = new FormData();
    formData.append('leadId', 'lead-1');
    formData.append('status', 'read');

    const result = await updateContactLeadStatus(formData);

    expect(result).toEqual({ error: 'Unauthorized' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});

describe('updateContactLeadStatuses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates selected leads and revalidates contacts pages', async () => {
    const mockServerClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'super-admin-id' } },
        }),
      },
    };

    const mockAdminClient = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          in: jest.fn(() => ({
            select: jest.fn().mockResolvedValue({
              data: [{ id: 'lead-1' }, { id: 'lead-2' }],
              error: null,
            }),
          })),
        })),
      })),
    };

    (createClient as jest.Mock).mockResolvedValue(mockServerClient);
    (createAdminClient as jest.Mock).mockReturnValue(mockAdminClient);

    const formData = new FormData();
    formData.append('leadIds', 'lead-1');
    formData.append('leadIds', 'lead-2');
    formData.append('status', 'archived');

    const result = await updateContactLeadStatuses(formData);

    expect(result).toEqual({ success: true, updatedCount: 2 });
    expect(revalidatePath).toHaveBeenCalledWith('/superadmin/contacts');
    expect(revalidatePath).toHaveBeenCalledWith('/superadmin/contacts/lead-1');
    expect(revalidatePath).toHaveBeenCalledWith('/superadmin/contacts/lead-2');
  });

  it('rejects empty selections', async () => {
    const formData = new FormData();
    formData.append('status', 'archived');

    const result = await updateContactLeadStatuses(formData);

    expect(result).toEqual({ error: 'At least one lead must be selected' });
  });
});

describe('getContactLeadById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a mapped lead when record exists', async () => {
    const mockAdminClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'lead-1',
                name: '王小明',
                email: 'lead-1@example.com',
                phone: '0912345678',
                inquiry_type: '法律諮詢',
                message: '我想詢問簽約支援流程。',
                status: 'new',
                created_at: '2026-03-22T08:30:00.000Z',
                source_path: '/properties/sale-2',
                source_context: {
                  entryPoint: 'property-detail-legal',
                  propertyId: 'sale-2',
                  propertyTitle: '台北大安整合案件',
                },
                assignee_id: null,
                assignee_name: null,
              },
              error: null,
            }),
          })),
        })),
      })),
    };

    (createAdminClient as jest.Mock).mockReturnValue(mockAdminClient);

    const result = await getContactLeadById('lead-1');

    expect(result).toMatchObject({
      id: 'lead-1',
      leadReference: 'LEAD-LEAD-1',
      inquiryType: '法律諮詢',
      sourcePath: '/properties/sale-2',
    });
    expect(mockAdminClient.from).toHaveBeenCalledWith('contact_messages');
  });

  it('returns null when record is not found', async () => {
    const mockAdminClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          })),
        })),
      })),
    };

    (createAdminClient as jest.Mock).mockReturnValue(mockAdminClient);

    const result = await getContactLeadById('missing-lead');

    expect(result).toBeNull();
  });
});