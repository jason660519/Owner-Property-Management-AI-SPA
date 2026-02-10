# Design System: Owner Property Management AI SPA

## 1. Visual Theme & Atmosphere
The design language is **Modern Dark UI**, characterized by a professional, high-contrast, and data-centric aesthetic. It uses deep grays for backgrounds to reduce eye strain during long administrative tasks, accented by vivid purples and greens to direct attention to key metrics and actions. The overall feel is "Technical," "Clean," and "Efficient."

## 2. Color Palette & Roles

### Backgrounds
*   **Primary Background**: `grey-08` (#1A1A1A) - Main application background.
*   **Secondary Background**: `grey-10` (#2A2A2A) - Sidebar, Cards, Input fields.
*   **Tertiary Background**: `grey-15` (#333333) - Borders, Dividers, Hover states.

### Text
*   **Primary Text**: `#FFFFFF` - Headings, Main content.
*   **Secondary Text**: `grey-60` (#999999) - Subtitles, Meta information, Placeholders.
*   **Muted Text**: `#666666` - Disabled states, Breadcrumbs.

### Brand & Accents
*   **Brand Primary**: `purple-60` (#7C3AED) - Primary buttons, Active states, Links.
*   **Brand Hover**: `purple-70` (#6D28D9) - Hover states for interactive elements.
*   **Success**: `#10B981` - Positive trends, Completed statuses.
*   **Warning**: `#EF4444` - Alerts, Destructive actions.
*   **Info**: `#64748B` - Neutral system messages.

## 3. Typography Rules
*   **Font Family**: `Urbanist` (Primary) / `Inter` (Fallback).
*   **Scale**:
    *   `Heading XL`: 48px / 700 Bold
    *   `Heading LG`: 36px / 600 SemiBold
    *   `Heading MD`: 24px / 600 SemiBold
    *   `Body LG`: 18px / 400 Regular
    *   `Body MD`: 16px / 400 Regular
    *   `Body SM`: 14px / 400 Regular

## 4. Component Stylings

### Buttons
*   **Primary**: Solid Brand Primary background, White text, `rounded-md`.
*   **Secondary/Outline**: Border `grey-15`, Transparent background, White text.
*   **Ghost**: Transparent background, `grey-60` text, Hover `grey-15`.

### Cards
*   **Container**: `bg-grey-10`, Border `grey-15` (1px solid).
*   **Rounding**: `rounded-lg` (12px) or `rounded-xl` (16px).
*   **Shadow**: Minimal to none (flat design), relies on border contrast.

### Navigation (Sidebar)
*   **Container**: Fixed width (64px collapsed / 256px expanded).
*   **Background**: `bg-grey-10` or `bg-grey-08`.
*   **Item State**:
    *   *Idle*: `text-grey-60`
    *   *Hover*: `bg-grey-15 text-white`
    *   *Active*: `bg-purple-60 text-white`

## 5. Layout Principles
*   **Grid System**: 8px based spacing (`spacing-2` = 8px).
*   **Dashboard Layout**:
    *   **Sidebar**: Fixed Left.
    *   **Header**: Sticky Top.
    *   **Main Content**: Fluid width, max-width constrained for readability (e.g., `max-w-7xl`).
    *   **Padding**: Consistent `p-6` (24px) for main content areas.
