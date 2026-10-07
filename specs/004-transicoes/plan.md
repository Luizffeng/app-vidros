# Implementation Plan: Transições leves na interface

**Branch**: `004-transicoes` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-transicoes/spec.md`

## Summary

One motion scale (CSS tokens: 100/150/200/250 ms, Material-3-style decelerate/accelerate curves) drives every transition. Overlays (modal, dropdown, header menu, confirm popovers) get enter + shorter exit through a ~25-line `usePresence` hook and `[data-state]` CSS. Sections expand with native `<details>` height interpolation where supported, plus a body fade everywhere. Settings tabs get a sliding indicator and panel fade. Screens get a direction-aware enter animation (forward/back/fade) and the list keeps its scroll on return. `prefers-reduced-motion` turns offsets and scale off in one block. Heavy `backdrop-filter` blur leaves sections and the action bar. No library, ≤ 2 KB added.

## Technical Context

**Language/Version**: TypeScript 5, React 19, CSS

**Primary Dependencies**: none new

**Storage**: N/A

**Testing**: existing Playwright scripts (run with reduced motion); new `scripts/motion-perf-browser.mjs` (CDP CPU throttling + long tasks); manual phone check

**Target Platform**: current Chrome/Edge, Safari iOS, Firefox; mobile first (~390px)

**Project Type**: Single-page web app

**Performance Goals**: no long task > 50 ms caused by a transition at 4× CPU throttle; ≥ 50 fps; first visual response ≤ 100 ms

**Constraints**: transform/opacity only (except native details height); max 250 ms; interaction never blocked; reduced motion respected; bundle ≤ +2 KB gzip

**Scale/Scope**: ~8 files (CSS, 1 new hook, Modal, Dropdown, AppHeader, App, SettingsEditor, CatalogEditor) + 1 script

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
| --- | --- | --- |
| I. Pricing Engine Fidelity | N/A | No pricing change. |
| II. Mobile-First Field Quoting | Pass | Designed and measured on 390px and throttled CPU; removes blur cost on phones. |
| III. Quote Immutability & Revisions | N/A | No data change. |
| IV. Storage Abstraction | N/A | No storage change. |
| V. Simplicity & Determinism | Pass | No library; one token table; one hook; progressive enhancement. |
| Workflow: UI usable at ~390px | Pass | Quickstart manual steps at 390px. |

Post-design re-check: passes.

## Project Structure

### Documentation (this feature)

```text
specs/004-transicoes/
├── spec.md
├── plan.md
├── research.md
├── quickstart.md
├── contracts/motion.md
├── checklists/requirements.md
└── tasks.md
```

No `data-model.md` (no stored data).

### Source Code (repository root)

```text
src/
├── index.css                    # tokens, keyframes, [data-state] rules, details height, tabs indicator, screen enter, reduced motion, blur removal
└── components/
    ├── usePresence.ts           # new
    ├── Modal.tsx                # presence + requestClose
    ├── Dropdown.tsx             # list presence
    ├── AppHeader.tsx            # HeaderMenu presence
    ├── App.tsx                  # remove-pop presence; data-nav + screen root key; list scroll restore
    ├── SettingsEditor.tsx       # tab indicator + keyed panel
    └── CatalogEditor.tsx        # keyed table panel
scripts/
├── motion-perf-browser.mjs      # new
├── smoke-quote-browser.mjs      # reducedMotion context
└── validate-catalog-browser.mjs # reducedMotion context
```

Docs at implement time: `src/components/AGENTS.md` (motion tokens, `usePresence`, "transform/opacity only"), `.agents/skills/ui-change/SKILL.md` (use tokens), `.agents/skills/browser-check/SKILL.md` (reduced motion in scripts, perf script).

**Structure Decision**: existing layout; CSS-first, one hook.

## Phases

- **Phase 0**: [research.md](research.md) (R1–R10).
- **Phase 1**: [contracts/motion.md](contracts/motion.md), [quickstart.md](quickstart.md).
- **Phase 2**: [tasks.md](tasks.md).

## Risks

- Native details height interpolation is not in every browser yet: fallback is today's instant open + fade (accepted by spec).
- Height animation of a long "Itens" section could cost frames on throttled CPU: measured; per-section opt-out ready (research R5).
- Removing blur slightly changes the look of sections and the action bar: compensated with opacity; screenshot comparison in quickstart.

## Complexity Tracking

None.
