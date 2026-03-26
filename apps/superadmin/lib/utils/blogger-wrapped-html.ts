/**
 * Wraps property listing HTML for Google Blogger (same markup as API publish).
 * Client-safe — used for clipboard "paste into Blogger" and server publish.
 */
export function wrapForBlogger(_title: string, contentHtml: string): string {
  void _title; // Post title is set in Blogger UI; kept for call-site parity with API
  return `<div class="property-listing-post">
<style>
.property-listing-post { 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
  max-width: 1000px; 
  margin: 0 auto; 
  position: relative;
  z-index: 10; /* Ensure content is clickable and not covered by Blogger's layout */
}
.property-listing-post img { 
  max-width: 100%; 
  height: auto; 
  display: block;
}
.property-listing-post a {
  color: #1a73e8;
  text-decoration: none;
  cursor: pointer;
  position: relative;
  z-index: 20; /* Elevate links above Blogger's overlay elements */
  pointer-events: auto !important;
}
.property-listing-post a:hover {
  text-decoration: underline;
  opacity: 0.85;
}
/* Force hide Blogger's default preview ribbons or absolute overlays that block clicks */
.preview, .preview-ribbon, [class*="preview"] { 
  display: none !important; 
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>
${contentHtml}
</div>`;
}
