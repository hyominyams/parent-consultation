# Design System Strategy: The Editorial Academic

## 1. Overview & Creative North Star
This design system is built upon the Creative North Star of **"The Mindful Concierge."** In the context of parent-teacher consultations, the interface must transcend the "administrative form" look and feel like a high-end, supportive service. 

We break the standard academic template by using **intentional asymmetry** and **tonal depth**. Instead of a rigid grid of boxes, we use expansive white space and overlapping layers to create a sense of calm and competence. The layout should feel like a premium educational journal—structured, authoritative, yet deeply approachable. By prioritizing "Breathing Room" over "Information Density," we ensure that parents feel a sense of clarity rather than anxiety when scheduling their time.

## 2. Colors
Our palette is a sophisticated range of oceanic blues and soft architectural greys, designed to instill trust through restraint.

*   **Primary & Secondary Roles:** Use `primary` (#246681) for high-intent actions and `secondary` (#386577) for supportive navigation. Avoid using these at 100% opacity for large blocks; instead, lean into the `container` tokens to keep the UI light.
*   **The "No-Line" Rule:** We explicitly prohibit 1px solid borders for sectioning content. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` (#f0f4f7) sidebar should sit directly against a `surface` (#f7f9fb) main content area. Let the colors do the work, not the lines.
*   **Surface Hierarchy & Nesting:** Treat the UI as physical layers of fine paper. 
    *   **Base:** `background` (#f7f9fb).
    *   **Sectioning:** `surface-container` (#eaeff2).
    *   **Interactive Cards:** `surface-container-lowest` (#ffffff) to provide a "pop" of clean white against the slightly tinted background.
*   **The "Glass & Gradient" Rule:** For floating modals or "Current Selection" highlights in the calendar, use a backdrop-blur (12px–20px) with a semi-transparent `surface-container-lowest`. 
*   **Signature Textures:** Apply a subtle linear gradient from `primary` (#246681) to `primary-dim` (#115a74) on main booking CTAs to give them a tactile, "pressable" depth that flat colors lack.

## 3. Typography
We use a dual-typeface system to balance authority with readability.

*   **Display & Headlines (Manrope):** Our "Editorial" voice. Use `display-lg` and `headline-md` with generous tracking (-0.02em) to create a modern, high-end feel. These should be set in `on-surface` (#2c3437).
*   **Titles & Body (Public Sans):** Our "Functional" voice. Public Sans provides exceptional clarity for form labels and calendar data. 
*   **Hierarchy as Identity:** Use `title-lg` for teacher names and `body-md` for appointment details. The significant jump between `display-sm` (2.25rem) for page titles and `body-lg` (1rem) for content creates the "High-End Editorial" contrast we are aiming for.

## 4. Elevation & Depth
In this design system, depth is earned through tone, not just shadows.

*   **The Layering Principle:** Achieve lift by stacking. A `surface-container-lowest` (#ffffff) card placed on top of a `surface-container-high` (#e3e9ed) section creates a natural focal point without a single drop shadow.
*   **Ambient Shadows:** If an element must float (like a profile popover), use a shadow with a 32px blur, 0px spread, and 6% opacity using a tinted version of `on-surface`. It should feel like an atmospheric glow, not a dark smudge.
*   **The "Ghost Border" Fallback:** For accessibility in form inputs, use a "Ghost Border": the `outline-variant` token at 20% opacity. It provides a hint of structure without cluttering the visual field.
*   **Glassmorphism:** Use `surface-container-lowest` at 80% opacity with a `backdrop-filter: blur(10px)` for the main navigation header. This allows the soft blues of the calendar to bleed through as the user scrolls, maintaining a sense of place.

## 5. Components

### Buttons
*   **Primary:** Uses `primary` (#246681) with `on-primary` (#f3faff) text. Corner radius: `full`.
*   **Secondary:** Uses `secondary-container` (#bce9ff) with `on-secondary-container` (#2a5769). Corner radius: `md` (0.75rem) to differentiate from the "Action" shape.
*   **State:** On hover, shift background to `primary-dim`. No heavy glows.

### Input Fields & Forms
*   **Structure:** No boxes. Use a `surface-container-highest` (#dce4e8) bottom-only border (2px) or a subtle background fill of `surface-container-low`.
*   **Typography:** Labels must be `label-md` in `on-surface-variant`.
*   **Error States:** Use `error` (#a83836) for text and `error-container` for a subtle 4% background tint behind the input field.

### Calendar Views
*   **The "Time Block" Card:** Forbid the use of divider lines between time slots. Use `8` (2rem) of vertical spacing and subtle background shifts (alternating between `surface` and `surface-container-low`) to define the timeline.
*   **Availability Chips:** Use `lg` (1rem) roundedness. Available slots use `primary-container`; booked slots use `surface-dim` with 50% opacity.

### Navigation & Chips
*   **Selection Chips:** Use `secondary-fixed` for the active state. The shape should be `xl` (1.5rem) to feel like a soft pebble.

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical margins. For example, a wider left margin for page titles (`24` / 6rem) than the right margin to create an editorial layout.
*   **Do** use `surface-container-lowest` for the most important interactive elements (the "Hero" card of the booking process).
*   **Do** lean into the `xl` (1.5rem) and `full` roundedness for a "soft" and "approachable" psychology.

### Don't:
*   **Don't** use 1px black or grey dividers. Use white space or a subtle color shift (`surface-variant`) instead.
*   **Don't** use standard "drop shadows." If it doesn't look like ambient light, it's too heavy.
*   **Don't** crowd the interface. If a screen feels full, increase the spacing from `4` (1rem) to `8` (2rem). Trust the user to scroll.
*   **Don't** use pure black (#000000) for text. Always use `on-surface` (#2c3437) to maintain the soft professional tone.