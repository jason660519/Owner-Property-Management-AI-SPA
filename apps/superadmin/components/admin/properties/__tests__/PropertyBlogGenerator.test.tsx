import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PropertyBlogGenerator } from '../PropertyBlogGenerator';
import { getPropertyBlog } from '@/lib/actions/blog';
import { getPlatformPost } from '@/lib/actions/integrations';

jest.mock('@/lib/actions/blog', () => ({
  getPropertyBlog: jest.fn(),
}));

jest.mock('@/lib/actions/integrations', () => ({
  getPlatformPost: jest.fn(),
}));

jest.mock('../BlogSupabasePanel', () => ({
  BlogSupabasePanel: ({ referenceUrl, stylePreset }: { referenceUrl?: string; stylePreset?: string }) => (
    <div data-testid="supabase-panel">supabase:{stylePreset ?? 'none'}:{referenceUrl ?? 'none'}</div>
  ),
}));

jest.mock('../BlogGooglePanel', () => ({
  BlogGooglePanel: ({ referenceUrl, stylePreset }: { referenceUrl?: string; stylePreset?: string }) => (
    <div data-testid="google-panel">google:{stylePreset ?? 'none'}:{referenceUrl ?? 'none'}</div>
  ),
}));

jest.mock('../PropertyBlogStyleRowActionCells', () => ({
  PropertyBlogStyleRowActionCells: () => <td data-testid="row-actions" colSpan={5}>actions</td>,
}));

const mockGetPropertyBlog = getPropertyBlog as jest.MockedFunction<typeof getPropertyBlog>;
const mockGetPlatformPost = getPlatformPost as jest.MockedFunction<typeof getPlatformPost>;

describe('PropertyBlogGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/superadmin/properties/p-1/edit?tab=advertisement_creators');
    mockGetPropertyBlog.mockResolvedValue(null);
    mockGetPlatformPost.mockResolvedValue(null);
  });

  it('restores platform, style, and reference URL from search params', async () => {
    window.history.replaceState(
      {},
      '',
      '/superadmin/properties/p-1/edit?tab=advertisement_creators&blogPlatform=google_blogger&blogStylePreset=corporate&blogReferenceUrl=https%3A%2F%2Fexample.com%2Flisting%3Fb%3D2%26a%3D1',
    );

    render(
      <PropertyBlogGenerator
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
      />,
    );

    await waitFor(() => {
      expect(mockGetPropertyBlog).toHaveBeenCalledWith('property-1', {
        stylePreset: 'corporate',
        targetPlatform: 'google_blogger',
        referenceUrl: 'https://example.com/listing?b=2&a=1',
      });
    });

    expect(screen.getByTestId('google-panel')).toHaveTextContent('google:corporate:https://example.com/listing?b=2&a=1');
    expect(screen.getByDisplayValue('https://example.com/listing?b=2&a=1')).toBeInTheDocument();
  });

  it('syncs and clears blogReferenceUrl in the query string', async () => {
    const user = userEvent.setup();

    render(
      <PropertyBlogGenerator
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
      />,
    );

    const applyButtons = screen.getAllByRole('button', { name: '套用此樣式' });
    await user.click(applyButtons[0]);

    const styleRows = screen.getAllByRole('row');
    const luxuryRow = styleRows.find((row) => within(row).queryByText('豪宅暗色調'));
    expect(luxuryRow).toBeTruthy();

    if (!luxuryRow) {
      throw new Error('Expected luxury style row');
    }

    expect(within(luxuryRow).getByRole('button', { name: '已套用' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /參考網頁風格/ }));

    const input = screen.getByPlaceholderText('https://a0405142777.wixsite.com/108-en-lease1');
    await user.clear(input);
    await user.type(input, 'https://Example.com/showcase/?utm=1');
    await user.click(screen.getByRole('button', { name: '套用' }));

    await waitFor(() => {
      expect(window.location.search).toContain('blogPlatform=supabase');
      expect(window.location.search).toContain('blogStylePreset=luxury_dark');
      expect(window.location.search).toContain('blogReferenceUrl=https%3A%2F%2FExample.com%2Fshowcase%2F%3Futm%3D1');
    });

    expect(screen.getByTestId('supabase-panel')).toHaveTextContent('supabase:luxury_dark:https://Example.com/showcase/?utm=1');

    await user.click(screen.getByRole('button', { name: '' }));

    await waitFor(() => {
      expect(window.location.search).toContain('blogPlatform=supabase');
      expect(window.location.search).toContain('blogStylePreset=luxury_dark');
      expect(window.location.search).not.toContain('blogReferenceUrl=');
    });

    expect(screen.getByTestId('supabase-panel')).toHaveTextContent('supabase:luxury_dark:none');
  });
});