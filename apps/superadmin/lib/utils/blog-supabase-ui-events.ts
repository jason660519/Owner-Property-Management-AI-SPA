/** Superadmin: scroll BlogSupabasePanel into edit mode from the quick actions toolbar. */
export const BLOG_SUPABASE_OPEN_EDIT_EVENT = 'blog-supabase-open-edit';

export type BlogSupabaseOpenEditDetail = {
  propertyId: string;
  stylePreset: 'luxury_dark' | 'bright_clean' | 'corporate' | 'warm_japanese';
};

export function dispatchBlogSupabaseOpenEdit(
  propertyId: string,
  stylePreset: 'luxury_dark' | 'bright_clean' | 'corporate' | 'warm_japanese',
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<BlogSupabaseOpenEditDetail>(BLOG_SUPABASE_OPEN_EDIT_EVENT, {
      detail: { propertyId, stylePreset },
    }),
  );
}
