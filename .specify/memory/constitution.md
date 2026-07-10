<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Modified principles: placeholders → Forte Vidros principles
- Added sections: Persistence Strategy, Product Constraints
- Removed sections: none
- Templates: ⚠ pending alignment during plan/spec
- Follow-up: none
-->

# Forte Vidros — Constitution

## Core Principles

### I. Pricing Engine Fidelity
The spreadsheet (`Orçamentos Forte Vidros`) is the **reference example** for calculation rules only — never a runtime database or live dependency. Catalog prices and config live in the application store. Calculator outputs for BOX, CORRER, PIVOTANTE, MAXIAR, VIDRO FIXO, and ESPELHO must match the documented formulas (ceiling rules, BOM quantities, labor, color surcharges, markup). Changes to pricing logic require parity tests against known examples.

### II. Mobile-First Field Quoting
The primary user is a glazier on-site after measuring. The first path must allow creating a quote with large numeric inputs, add/remove items quickly, optional customer fields, and shareable PDF — usable on a smartphone viewport without a desktop layout.

### III. Quote Immutability & Revisions
An emitted quote is immutable (inputs, breakdown, totals, pricing version). Any change creates a new revision linked to the parent quote. Historical PDFs remain valid for the revision they were generated from.

### IV. Storage Abstraction (Local Now, Remote Later)
Persist through a repository interface. Default adapter: local (IndexedDB / local files). Future adapter: remote database/API. Domain code must not couple to a specific storage backend. Seed/catalog data is application-owned, not Google Sheets.

### V. Simplicity & Determinism
Prefer deterministic pure functions for pricing. Avoid unnecessary abstractions. Every quote total must be reproducible from stored inputs + pricing catalog version.

## Product Constraints

- Required to emit a quote: ≥1 item (catalog calculator or free-text with value) and support for additional costs (may be empty list).
- Customer fields (name, address, phone, notes) are optional.
- Free-text items cover non-engine work (film, maintenance, etc.).
- PDF generation is part of the emit pipeline.

## Development Workflow

1. Spec Kit artifacts (`constitution` → `specify` → `plan` → `tasks`) guide meaningful features.
2. Pricing changes ship with unit tests for parity examples.
3. UI changes must remain usable at ~390px width.

## Governance

Constitution supersedes ad-hoc decisions. Amendments bump semver here and note rationale. PRs touching pricing must include or update parity tests.

**Version**: 1.0.0 | **Ratified**: 2026-07-10 | **Last Amended**: 2026-07-10
