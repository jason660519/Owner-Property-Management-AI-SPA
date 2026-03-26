// Template notes:
// - This string is injected into AI prompt context for Google Blogger output.
// - Keep section headers stable so future prompt tuning is predictable.
// - Update tokens and component rules in-place; avoid removing section markers.
export const luxuryDarkBloggerTemplate = `
DESIGN SYSTEM: Luxury Dark (Google Blogger)

[STYLE IDENTITY]
- Visual intent: Premium cinematic luxury with bold contrast and gold highlights.
- Brand mood words: prestige, dramatic, confident, high-value.

[DESIGN TOKENS]
- Color Palette: Background #0f111a (near-black), Surface #181b29, Primary Accent #d4af37, Text #f8f9fa
- Contrast target: Maintain strong foreground/background contrast in all sections.

[LAYOUT RULES]
- Hero section: Full-width visual impact, dark gradient overlay, strong title hierarchy.
- Details grid: 2-3 columns with clear spacing and high-contrast cards.
- Gallery: CSS Grid with stable image ratio, include object-fit: cover on all images.

[TYPOGRAPHY RULES]
- Heading style: Elegant serif for titles and section headers.
- Body style: Clean sans-serif for paragraphs and metadata.
- Rhythm: Generous line-height and clear section spacing.

[COMPONENT RULES]
- Dividers: Use subtle gold separators between major sections.
- Badges: Pill badges for key tags (price, location, highlight labels).
- CTA: Prominent, high-contrast contact section near page end.

[LINK BEHAVIOR]
- Links must be visually obvious and clickable in Blogger.
- Use clear hover/focus feedback with high contrast.
`;