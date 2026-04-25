# BaanTask Design System v1.0

## Brand Voice & Personality

BaanTask is **friendly, warm, trustworthy**. We serve household staff (cleaners, cooks, drivers, nannies) and their employers (villa/home owners) across Thailand and Southeast Asia.

- **Tone**: Encouraging, never condescending. Many users are non-native English speakers.
- **Language**: Simple, clear, short sentences. Avoid jargon.
- **Emojis**: Use sparingly for warmth, not for decoration.
- **Multilingual**: All text must work in Thai, English, Russian, Filipino, Burmese, and 10+ other languages.

## Color Usage

| Color | Variable | When to Use |
|-------|----------|-------------|
| Primary 500 `#00897B` | `--color-primary-500` | Navigation, headers, confirmations, links |
| Primary 900 `#004D40` | `--color-primary-900` | Dark headers, own chat bubbles |
| Accent 500 `#E65100` | `--color-accent-500` | CTAs, worker-facing elements, check-in button |
| Success `#10B981` | `--color-success` | Checked in, task done, approval |
| Warning `#F59E0B` | `--color-warning` | Late, pending, attention needed |
| Danger `#EF4444` | `--color-danger` | Absent, error, delete, logout |
| Gray 500 `#6B7280` | `--color-gray-500` | Muted text, captions, placeholders |

**Rules:**
- Never use red for non-destructive actions
- Orange = worker, Teal = owner (role-based coloring)
- Backgrounds: white or gray-50, never pure gray

## Typography Rules

- **Font**: Inter (Latin), Noto Sans Thai (Thai script)
- **Body text**: Always 16px minimum on mobile
- **Headings**: Use extrabold (800) weight
- **Labels**: Semibold (600), 14px, gray-700
- **Captions**: Medium (500), 12px, gray-500

## Component Usage

### Buttons
- `btn-primary`: Main positive action per screen (1 per screen max)
- `btn-accent`: Secondary CTA, worker check-in, orange actions
- `btn-secondary`: Cancel, back, alternative options
- `btn-ghost`: Subtle links, "skip", "later"
- `btn-danger`: Delete, remove, logout only
- Always full-width on mobile (`btn-block`)

### Inputs
- Always pair with `input-label`
- Required fields: add `*` to label text
- Show `input-error-msg` below field, not as alert
- Use `input-helper` for optional guidance
- Minimum height: 48px (touch-friendly)

### Cards
- Use `card-with-border` for contained lists
- Use `card-clickable` for tappable items
- Shadow: `shadow-sm` default, `shadow-md` on hover

### Navigation
- `bottom-nav`: Always 5 items, active item highlighted
- `top-bar`: Back button + title + optional action
- `tabs`: Horizontal scroll, active tab filled

### Modals
- `modal`: Centered, for confirmations and alerts
- `bottom-sheet`: Slides up, for action menus on mobile
- `toast`: Auto-dismissing notifications (2.5s default)

## Accessibility

- **Contrast**: 4.5:1 minimum (WCAG AA) for all text
- **Touch targets**: 44x44px minimum (Apple HIG standard)
- **Focus states**: Visible outline on all interactive elements
- **Screen readers**: Use semantic HTML, alt text on images
- **RTL support**: Arabic interface must work right-to-left
- **Reduced motion**: Respect `prefers-reduced-motion`

## File Structure

```
public/
  css/
    design-system.css    ← Core CSS (import everywhere)
  design-system.html     ← Live documentation page
docs/
  DESIGN-SYSTEM.md       ← This file
```

## How to Use

1. Import the CSS in any HTML page:
   ```html
   <link rel="stylesheet" href="/css/design-system.css">
   ```

2. Use CSS classes on elements:
   ```html
   <button class="btn btn-primary btn-lg">Save Changes</button>
   <input class="input-text" placeholder="Enter name">
   <span class="badge badge-success">Active</span>
   ```

3. Use CSS variables for custom elements:
   ```css
   .my-element {
     color: var(--color-primary-500);
     padding: var(--space-4);
     border-radius: var(--radius-md);
   }
   ```

## Version History

- **v1.0** (2026-04-25): Initial release with full component library
