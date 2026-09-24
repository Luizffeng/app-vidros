---
name: item-diagram-svg
description: Creates standardized product diagram SVGs for App Vidros budget items. Use when generating or editing item icons in assets/item-images/svg/, black vs aluminio variants, fechadura placement, or frame edge coloring rules.
---

You create technical line-art SVG icons for glass/aluminum budget product types in the App Vidros app.

## Output location

- Vectors: `assets/item-images/svg/`
- Naming: `slug.svg` (black) and `slug-aluminio.svg` (aluminum profile/ferragem)
- Parent README: `assets/item-images/README.md`

## Glass fill (Incolor)

- **Active:** `glass-fill-incolor-gradient.svg` — gradient `#C8EBFA`→`#A8D8F0` + `glass-incolor-stripes` pattern
- **Fallback:** `glass-fill-incolor.svg` — flat tile `#glass-incolor-tile` (84×56)
- In `-aluminio` diagrams: copy stripes pattern + per-pane `linearGradient`; clipPath with two rects (gradient, then stripes)
- Do **not** use external `href` to pattern files
- Stripes: `#F0FAFE`, 4px + 18px bands, `patternTransform="rotate(32 42 28)"`

## Canvas

- `width="320" height="240" viewBox="0 0 320 240"`
- Glass fill (black variant): `#fff`
- Glass fill (Incolor in `-aluminio` items): gradient + stripes inside clipPath
- Stroke width: `2.5`, `stroke-linecap="square"` on frame lines
- Black ferragem/frame variant: `#000`
- Aluminum ferragem/frame variant: `#9AA0A6`

## Fechadura symbol (reuse in every file)

```svg
<symbol id="fechadura" viewBox="0 0 18 40">
  <rect x="1" y="1" width="16" height="38" rx="3" fill="currentColor"/>
  <circle cx="9" cy="11" r="4" fill="#fff"/>
  <circle cx="9" cy="28" r="2.2" fill="#fff"/>
  <path d="M9 30.2 L6.2 36 L11.8 36 Z" fill="#fff"/>
</symbol>
```

- Display size: **15×34** px
- Fully inside the active panel; right edge flush with panel inner right (e.g. panel right x=156 → lock x=141)
- Vertically centered: `y = panelTop + (panelHeight - 34) / 2`

## Frame edge rules (aluminio variant)

Draw glass as filled rects **without stroke**. Frame as separate `<line>` groups:

**Aluminum (`#9AA0A6`):** outer left edge of left glass, outer right edge of right glass, top edges, bottom of right panel (when applicable).

**Black (`#000`):** internal meeting lines between panels, bottom of left panel in PPV+Fixo, bottom of single-panel items (glass sill).

**Black variant:** single `<rect stroke="#000">` per panel is acceptable.

## Panel layout

- Adjacent panels **flush** (no gap). Example PPV+Fixo: left `x=48 w=108`, right `x=156 w=104`.
- Single panel PPV: centered `x=106 w=108 h=176 y=32`.

## Hardware (ferragem)

- Pivot hinges: `18×8` rects at top-left and bottom-left corners of pivot panel
- Bottom pivot: `10×8` rect at bottom-right of pivot panel
- Use `fill="currentColor"` inside `<g color="...">` for ferragem color

## Item catalog

All 9 items created (black + aluminio). Review with user before app integration.

1. porta-pivotante-fixo
2. porta-pivotante
3. porta-correr-1f
4. porta-correr-4f
5. porta-correr-2f
6. maxim-ar
7. janela-4f
8. janela-2f
9. bascula
