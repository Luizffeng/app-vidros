# Data Model: SaaS fase 1 (spec 007)

SQL shapes are in [contracts/database.md](contracts/database.md). This file covers entities, fields, rules, and state.

## Account (`accounts`, new)

| Field | Type | Rule |
| --- | --- | --- |
| `id` | uuid | primary key |
| `name` | text | nome da vidraçaria, required, 2–80 chars |
| `whatsapp` | text | digits only, 10–13 (with or without 55) |
| `trial_ends_at` | timestamptz | `created_at + 30 days` on creation; operator may extend |
| `active_until` | timestamptz null | set by operator after a manual payment; `null` together with `plan = 'active'` means no end (Forte Vidros) |
| `plan` | text | `'trial' \| 'active'` |
| `disabled_at` | timestamptz null | operator kill switch |
| `terms_accepted_at` | timestamptz | set by `create_account` |
| `marketing_opt_in_at` | timestamptz null | set when the user ticks "Quero receber novidades e ofertas pelo WhatsApp"; cleared when unticked |
| `created_at` | timestamptz | default now() |

Short id shown to support: first 8 chars of `id`.

### Derived state (`accountState(account, now)`, `src/domain/account.ts`)

```text
disabled_at set                                   → disabled  (read-only, banner "Conta suspensa. Fale com a gente.")
plan = 'trial'  and now <  trial_ends_at          → trial     (daysLeft = ceil((trial_ends_at - now)/1 day))
plan = 'trial'  and now >= trial_ends_at          → expired, reason 'trial', endsAt = trial_ends_at
plan = 'active' and (active_until null or now < active_until) → active
plan = 'active' and now >= active_until           → expired, reason 'subscription', endsAt = active_until
warn = (trial or active with end) and daysLeft <= 7
canWrite = kind in (trial, active)
```

SQL `account_can_write()` implements the same table; both are tested (unit + isolation script).

## Profile (`profiles`, changed)

| Field | Change |
| --- | --- |
| `account_id` | new, uuid null → `accounts.id` on delete cascade. Null until `create_account` runs. |
| `role` | default becomes `'admin'`; phase 1 does not read it for access (R14). |

## Quote, Catalog, Settings, QuoteCounter (changed)

| Table | Change |
| --- | --- |
| `quotes` | + `account_id uuid not null`; index `(account_id, updated_at desc)`. `payload` unchanged. |
| `catalog` | primary key `account_id` (drop `id`). `payload` unchanged in shape except the optional flags below. |
| `settings` | primary key `account_id` (drop `id`). `logo_path` = `{account_id}/logo.png`. |
| `quote_counters` | primary key `(account_id, year)`. |

## Catalog flags (TypeScript, optional, no migration)

| Field | Where | Meaning |
| --- | --- | --- |
| `exemplo?: boolean` | `Vidro`, `KitBox`, `Acessorio`, `Aluminio` | price came from the example catalog and was not confirmed or edited. Absent = confirmed. |
| `exemplo?: boolean` | `PricingConfig` | labor and margin still at example values. |

Rules:
- `normalizeCatalog` keeps `exemplo` only when `true`.
- Saving a row whose price changed clears its flag. "Confirmar preços" in a task clears all flags of its tables.
- Rows with `ativo: false` do not count for task completion.

## Settings field (TypeScript, optional)

| Field | Meaning |
| --- | --- |
| `AppSettings.onboardingDismissedAt?: string` | ISO date when "Dispensar" was tapped on the Primeiros passos card. |

## Onboarding task (derived, `src/domain/onboarding.ts`)

`{ id: 'loja' | 'vidros' | 'ferragens' | 'maoDeObra' | 'primeiroOrcamento', done: boolean, route: Route }`. Completion rules: [research.md R9](research.md#r9-primeiros-passos-state-is-mostly-derived). Card visible when `!onboardingDismissedAt && tasks.some(t => !t.done)`.

## Suggestion (`suggestions`, new)

| Field | Type | Rule |
| --- | --- | --- |
| `id` | uuid | primary key |
| `account_id` | uuid | → `accounts.id` on delete cascade |
| `body` | text | 3–2000 chars |
| `status` | text | `'recebida' \| 'respondida' \| 'feita'` (operator changes) |
| `reply` | text null | operator |
| `replied_at` | timestamptz null | operator |
| `shipped_version` | text null | app version where it was done (shown as "Feito na versão X") |
| `created_at` | timestamptz | default now() |

State: `recebida → respondida → feita` (also `recebida → feita`). Never deleted except with the account.

## Local mode

No server: `LocalAccountService` returns a fixed account `{ name: settings name, plan: 'active', active_until: null }`; suggestions are kept in `localStorage` (dev only). No sign-in, no trial.
