# Quickstart validation: Medidas finais e fotos (009)

## Prerequisites

- Local mode for measures + local photos; staging + migration for cloud photos.
- `npm test` green.

## Automated

```bash
npx vitest run src/domain/finalMeasures.test.ts src/domain/quotePhotos.test.ts src/domain/quote.test.ts src/domain/quote.test.ts
# plus share/PDF negative cases
npm test && npm run lint && npm run build
```

## Manual

1. **Seed measures**: draft box with vão 120 → Medidas finais → Largura 120 → change to 118 → Salvar → reopen 118.
2. **Emitted**: emit quote → Medidas finais still opens and saves; Editar preço still blocked.
3. **Fotos**: add 2 photos → see hint text → add until 10 → 11th blocked → remove one → add again.
4. **Revision**: with measures + photos → Criar revisão → both present; storage not duplicated (cloud: same path).
5. **Customer firewall**: PDF + WhatsApp show no measures/photos.
6. **Retention** (dev): force `createdAt` 200 days ago → thumbnail “Expirada”.

## Migration

Apply `supabase/migrations/20261022120000_quote_photos.sql` on staging before cloud photo checks.
