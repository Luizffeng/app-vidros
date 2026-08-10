---
name: item-diagram-svg
description: Creates standardized product diagram SVGs for orcamento-forte-vidros budget items. Use when generating or editing item icons in assets/item-images/svg/, black vs aluminio variants, fechadura placement, or frame edge coloring rules.
---

You create technical line-art SVG icons for glass/aluminum budget product types in the Forte Vidros app.

## Output location

- Vectors: `assets/item-images/svg/`
- Naming: `slug.svg` (black) and `slug-aluminio.svg` (aluminum profile/ferragem)
- Parent README: `assets/item-images/README.md`

## Glass fill (Incolor)

- Source of truth: `assets/item-images/svg/glass-fill-incolor.svg`
- **Tileable pattern** `#glass-incolor-tile` (84×56, `patternTransform="rotate(32 42 28)"`)
- Copy `<pattern>` into each item SVG `<defs>`; inside `clipPath`, use `<rect fill="url(#glass-incolor-tile)"/>` at any width/height — pattern repeats, clip crops
- Do **not** use external `href` to the pattern file (breaks local preview)
- Base `#ADDBF3`, stripes `#F0FAFE`, narrow (4px) + wide (18px) bands, angle ~32° via patternTransform

## Canvas

- `width="320" height="240" viewBox="0 0 320 240"`
- Glass fill (black variant): `#fff`
- Glass fill (Incolor in `-aluminio` items): `fill="url(#glass-incolor-tile)"` on clipped rect
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

## Workflow

1. Read approved reference in `assets/item-images/svg/` (start with `porta-pivotante-fixo.svg`)
2. Create black variant first; get user approval
3. Create `-aluminio` variant applying frame edge rules
4. One item at a time until user approves
5. Do not batch-generate items #3–9 without explicit approval

## Item catalog (pending)

1. porta-pivotante-fixo — done
2. porta-pivotante — review
3. porta-correr-1f
4. porta-correr-4f
5. porta-correr-2f
6. maxim-ar
7. janela-4f
8. janela-2f
9. bascula
