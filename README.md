# Portfolio

Personal portfolio — Next.js (App Router) + React + TypeScript, styled with CSS Modules and design tokens exported from the Figma design system.

## Run it

```bash
npm install      # once, installs dependencies
npm run dev      # dev server on http://localhost:3000 (hot reload)
npm run lint     # code checks
npm run build    # production build — run before pushing
```

## Where things live

```
src/
  app/                    routes (each folder = a URL)
    layout.tsx            <html>, fonts (Inter Tight, JetBrains Mono), global CSS
    page.tsx              Home  →  /
    process/page.tsx      /process            (placeholder)
    projects/[slug]/      /projects/<slug>    (placeholder per project)
  components/
    ui/                   design-system components — 1:1 with Figma
      Button, IconButton, Chip, Tag, NavLink, MenuItem, SearchField, ProjectCard, Icon
    site/                 page-level pieces built from ui/
      SiteHeader, ContactMenu, ProjectsModal, MobileMenu, SelectedWork, SiteFooter
  data/                   content: site.ts (name, email, links), projects.ts, ascii.ts
  styles/
    tokens.css            design tokens (primitive → semantic → component)
    typography.css        text styles (.heading-h2, .mono-label …)
public/images/            project covers
```

## Design tokens (how styling works)

Three tiers, same names as the Figma variables (Code syntax → Web):

1. **primitive** — raw values: `--stone-950`, `--blue-600`, `--space-16`
2. **semantic** — roles: `--color-bg-page`, `--color-text-secondary`
3. **component** — per component: `--component-button-primary-bg-default`

Components use **only** tier 3. To restyle a button, change its component token (or the role it points to), not the component CSS.

Example — the Primary button in `Button.module.css`:

```css
.primary { background: var(--component-button-primary-bg-default); }
.primary:hover { background: var(--component-button-primary-bg-hover); }
```

## Figma → code mapping

| Figma | Code |
|---|---|
| `Button` · Type / Size | `<Button variant="ghost" size="s">` |
| `_button` (private primitive) | `.base`, `.m`, `.s` classes in `Button.module.css` |
| `_button` → Show icon / Icon | `icon="arrow-right"` prop |
| `Chip` · State=Selected | `<Chip selected>` |
| `MenuItem` · State=Selected | `<MenuItem selected>` |
| Text style `Heading/H2` | `className="heading-h2"` |

## To do

- Replace `[NAME]`, `[EMAIL]`, `[handle]` in `src/data/site.ts`
- Add `public/cv.pdf`
- Build the Case, All projects and My design process pages from the Figma designs
