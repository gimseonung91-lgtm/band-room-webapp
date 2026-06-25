# Band Room Design System

## 1. Atmosphere & Identity

Band Room is a quiet rehearsal command center for seven band members using phones and tablets on music stands. The signature is practical stage clarity: warm monochrome surfaces, strong attendance color cues, and a score reader that removes every nonessential control when the music is open.

## 2. Color

### Palette

| Role | Token | Light | Usage |
|------|-------|-------|-------|
| Surface/primary | --surface-primary | #FBFBFA | App canvas |
| Surface/secondary | --surface-secondary | #FFFFFF | Panels, toolbars |
| Surface/tertiary | --surface-tertiary | #F5F4F1 | Quiet empty areas |
| Text/primary | --text-primary | #171A1F | Body, headings |
| Text/secondary | --text-secondary | #6D7278 | Captions, hints |
| Text/inverse | --text-inverse | #FFFFFF | Dark buttons, deep cells |
| Border/default | --border-default | #E6E4DF | Panel borders |
| Border/strong | --border-strong | #171A1F | Focus and selected state |
| Accent/primary | --accent-primary | #0B3F91 | Primary action, full attendance |
| Accent/hover | --accent-hover | #123F78 | Hover action |
| Attendance/0 | --attendance-0 | #FFFFFF | 0 available |
| Attendance/1 | --attendance-1 | #EEF4FF | 1 available |
| Attendance/2 | --attendance-2 | #DCEBFF | 2 available |
| Attendance/3 | --attendance-3 | #BFD9FF | 3 available |
| Attendance/4 | --attendance-4 | #8DBEFF | 4 available |
| Attendance/5 | --attendance-5 | #4D96E8 | 5 available |
| Attendance/6 | --attendance-6 | #1B63B7 | 6 available |
| Attendance/7 | --attendance-7 | #0B3F91 | 7 available |
| Status/success | --status-success | #2F6F4E | Saved, available |
| Status/warning | --status-warning | #8A650F | Setup needed |
| Status/error | --status-error | #9F2F2D | Errors |

### Rules

Attendance color is the strongest color in the product. Other UI uses monochrome surfaces and restrained action accents.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | 36px | 800 | 1.12 | 0 | App title |
| H1 | 28px | 800 | 1.2 | 0 | Primary section |
| H2 | 22px | 800 | 1.28 | 0 | Panel title |
| H3 | 18px | 750 | 1.35 | 0 | Card title |
| Body/lg | 17px | 500 | 1.55 | 0 | Lead text |
| Body | 15px | 450 | 1.55 | 0 | Default UI |
| Body/sm | 13px | 550 | 1.45 | 0 | Secondary UI |
| Caption | 12px | 700 | 1.35 | 0.02em | Labels |

### Font Stack

- Primary: "SF Pro Display", "Helvetica Neue", Arial, system-ui, sans-serif
- Mono: "SF Mono", Consolas, "Liberation Mono", monospace

### Rules

Text inside dense controls stays at 12px or larger. Score-reader controls use bold compact labels.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Tight inline spacing |
| --space-2 | 8px | Compact groups |
| --space-3 | 12px | Button and field padding |
| --space-4 | 16px | Panel padding |
| --space-5 | 20px | Section header padding |
| --space-6 | 24px | Comfortable card padding |
| --space-8 | 32px | View gaps |
| --space-10 | 40px | Desktop section separation |

### Grid

- Max content width: 1240px
- Main desktop grid: schedule uses 1fr + 360px, scores uses 340px + 1fr
- Breakpoints: mobile 640px, tablet 900px, desktop 1180px

### Rules

Touch targets are at least 44px high. Fixed-format grids define stable cell dimensions so attendance changes do not shift layout.

## 5. Components

### App Shell
- **Structure**: sticky topbar, segmented view tabs, single main region.
- **Variants**: normal, reader focus.
- **Spacing**: --space-3, --space-4.
- **States**: active tab, loading status, setup warning.
- **Accessibility**: nav label, visible focus.
- **Motion**: transform-only button press.

### Month Calendar
- **Structure**: weekday row plus 7-column day buttons.
- **Variants**: empty, today, selected, attendance 0 through 7.
- **Spacing**: --space-2, --space-3.
- **States**: hover, active, focus, selected.
- **Accessibility**: buttons expose date and attendance count.
- **Motion**: none beyond button press.

### Reader Viewer
- **Structure**: file rail, title bar, iframe preview area.
- **Variants**: empty, selected, full-screen reader mode.
- **Spacing**: --space-3, --space-4.
- **States**: selected file, unavailable file.
- **Accessibility**: iframe title matches score name.
- **Motion**: reader mode toggles instantly for rehearsal reliability.

### Editable Checkboard
- **Structure**: song cards with progress range, notice cards with checkbox.
- **Variants**: saved, done, editing.
- **Spacing**: --space-3, --space-4.
- **States**: focus, active, disabled while saving.
- **Accessibility**: labels attached to inputs.
- **Motion**: subtle transform on buttons.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 120ms | ease-out | Button press |
| Standard | 220ms | ease-in-out | Tab opacity |
| Emphasis | 420ms | cubic-bezier(0.16, 1, 0.3, 1) | Initial content reveal |

### Rules

Motion uses transform and opacity only. Reduced-motion users receive static transitions.

## 7. Depth & Surface

### Strategy

Borders-only.

| Type | Value | Usage |
|------|-------|-------|
| Default | 1px solid var(--border-default) | Cards, panels, dividers |
| Strong | 2px solid var(--border-strong) | Selected/focus state |

