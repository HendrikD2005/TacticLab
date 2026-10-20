# TacticLab Swiss design system

The interface follows the grid, typographic hierarchy and restrained palette of
[Minimalism Swiss Style](https://www.uistyleguide.com/style/minimalism-swiss-style).
It is implemented locally in React and CSS, with native HTML controls.

## Visual rules

- Use an editorial grid with a horizontal numbered navigation, a prominent match
  heading and a pitch/report split. Avoid shadows, gradients and rounded cards.
- Use thin rules and whitespace to separate content. Reserve solid ink fills for
  primary actions. Active navigation and segmented controls use an underline.
- Use warm paper, ink and muted neutral surfaces. Brown indicates editorial
  numbering; green and blue retain their football/team meaning. Colour is always
  accompanied by text, a number, an underline or another visible state.
- Keep evidence, provenance and synthetic-data limits beside the report.
- Use a light theme for a fresh visit; retain the user's saved light/dark choice.
  Both themes derive from the same semantic tokens through `light-dark()`.

## Typography and tokens

Inter 4.1 is self-hosted from `src/assets/fonts/InterVariable.woff2`. Vite emits a
hashed asset served with the application; there is no runtime font CDN request.
Weights 450, 550 and 650 provide the primary hierarchy. Tabular numerals keep
times and metrics stable; optical sizing and the alternative single-storey
“a” are enabled through the font settings.

The font comes from the [Inter project](https://rsms.me/inter/download/). Its SIL
Open Font License is included at `public/assets/Inter-LICENSE.txt` and shipped in
the production build.

`src/swiss.css` is the single stylesheet. Main tokens:

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--paper` | `#faf9f6` | `#191a18` | Page |
| `--surface` | `#ffffff` | `#222320` | Inputs and detail surfaces |
| `--text` | `#191a18` | `#f5f3ed` | Primary text |
| `--muted` | `#666861` | `#b2b4a9` | Secondary text |
| `--line` | `#dedfd8` | `#3b3d36` | Structural rules |
| `--accent` | `#72543a` | `#d5b795` | Editorial accents |
| `--green` | `#315d46` | `#9fc5ad` | Team/status meaning |

The spacing scale centres on 4/8/12/16/20/24/32 pixels. The page gutter scales
between 16 and 44 pixels; the desktop report column is 340 pixels (310 on smaller
desktop widths). At 780 pixels, the layout becomes one column with the brief
first. Pitch height adapts to desktop viewport height so replay controls remain
visible. Touch devices have larger controls; forms use 16-pixel text.

## Owned components

All primitives live in `src/components/ui/`; they do not require a component
framework or Tailwind.

| Component | Contract |
| --- | --- |
| `Button` | Native button, default/primary/ghost variants, optional icon size; defaults to `type="button"` |
| `Select` | Native labelled select in a styled wrapper; retains browser keyboard and mobile picker behaviour |
| `Input`, `Textarea` | Native inputs; pass through labels, limits, disabled state and refs |
| `Slider` | Native range input; used for the replay timeline |
| `SegmentedControl` | Labelled group of native toggle buttons with `aria-pressed`; Tab, Space and Enter work natively |
| `SectionHeading` | Heading, decorative section number, description and optional actions |
| `Stat` | Prominent metric with a persistent explanatory label |
| `StatusLabel` | Text status accompanied by a decorative square |

Keep visible text and accessibility labels in the existing English/German
catalogue. Icon-only actions need an accessible name. Focus indicators are
visible in both themes. Reduced-motion preference disables UI transitions.
The Canvas pitch remains a dedicated interactive renderer and redraws after the
local font becomes available without resetting the camera.

## Verification

`npm run check` verifies TypeScript and the production build. The Playwright
suite covers replay, live simulation, evidence, notes, exports, languages and
preferences. `tests/swiss-ui.spec.ts` additionally checks font delivery, theme
persistence, keyboard use and narrow touch layouts.

`BASE_URL=http://127.0.0.1:8002 node scripts/swiss-check.mjs` captures desktop,
dark and mobile previews and a playback frame sample. In PowerShell set
`$env:BASE_URL` before invoking Node. The default URL is the Vite development
server at port 5173. Artifacts are local and ignored by Git.
