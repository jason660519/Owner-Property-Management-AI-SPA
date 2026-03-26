/** Fired when property blog row is created/updated/deleted so parent UIs can refetch. */
export const PROPERTY_BLOG_UPDATED_EVENT = 'property-blog-updated';

export type PropertyBlogUpdatedDetail = { propertyId: string };

export function dispatchPropertyBlogUpdated(propertyId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<PropertyBlogUpdatedDetail>(PROPERTY_BLOG_UPDATED_EVENT, {
      detail: { propertyId },
    }),
  );
}
