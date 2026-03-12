import { updateProperty } from './properties';
import { createAdminClient } from '@/utils/supabase/admin';

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  unstable_noStore: jest.fn(),
}));

describe('updateProperty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates core columns (layout/area/building_type/has_parking) in addition to details', async () => {
    const updatePayloads: Array<Record<string, unknown>> = [];

    const mockAdminClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { details: { existing: true } },
              error: null,
            }),
          })),
        })),
        update: jest.fn((payload: Record<string, unknown>) => {
          updatePayloads.push(payload);
          return {
            eq: jest.fn(() => ({
              select: jest.fn().mockResolvedValue({
                data: [{ id: 'p-1' }],
                error: null,
              }),
            })),
          };
        }),
      })),
    };

    (createAdminClient as jest.Mock).mockReturnValue(mockAdminClient);

    const result = await updateProperty('p-1', 'sale', {
      title: '新標題',
      status: 'for_sale',
      propertyType: '公寓',
      area: 12.5,
      bedrooms: 3,
      livingRooms: 2,
      bathrooms: 2,
      parkingSpaces: 1,
    });

    expect(result.success).toBe(true);
    expect(mockAdminClient.from).toHaveBeenCalledWith('property_sales');
    expect(updatePayloads).toHaveLength(1);

    const payload = updatePayloads[0];
    expect(payload).toMatchObject({
      title: '新標題',
      status: 'for_sale',
      building_type: '公寓',
      area_registered: 12.5,
      layout_rooms: 3,
      layout_living_rooms: 2,
      layout_bathrooms: 2,
      has_parking: true,
    });

    expect(payload.details).toMatchObject({
      existing: true,
      title: '新標題',
      type: '公寓',
      area: 12.5,
      bedrooms: 3,
      livingRooms: 2,
      bathrooms: 2,
      parkingSpaces: 1,
    });
  });

  it('sets has_parking=false when parkingSpaces is 0', async () => {
    const updatePayloads: Array<Record<string, unknown>> = [];

    const mockAdminClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { details: {} },
              error: null,
            }),
          })),
        })),
        update: jest.fn((payload: Record<string, unknown>) => {
          updatePayloads.push(payload);
          return {
            eq: jest.fn(() => ({
              select: jest.fn().mockResolvedValue({
                data: [{ id: 'p-1' }],
                error: null,
              }),
            })),
          };
        }),
      })),
    };

    (createAdminClient as jest.Mock).mockReturnValue(mockAdminClient);

    const result = await updateProperty('p-1', 'sale', {
      status: 'for_sale',
      parkingSpaces: 0,
    });

    expect(result.success).toBe(true);
    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0]).toMatchObject({ has_parking: false });
  });
});
