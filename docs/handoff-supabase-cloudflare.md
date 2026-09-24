# Handoff — Supabase + Cloudflare Pages

> **Status: entregue na v1.0.0.** Código integrado na `main`; projeto Supabase `app-vidros` (São Paulo) com schema, RLS, bucket `logos` e usuários admin; deploy no Cloudflare Pages. Documento mantido como histórico de decisões. As restrições de worktree abaixo não valem mais. O app passou a se chamar **App Vidros**; Forte Vidros é o estabelecimento cadastrado.

Contexto para outro agent publicar o **App Vidros** (orçamentos da Forte Vidros) na rede. Não é SaaS. Uma vidraçaria, dois acessos.

Repo local: `/home/luiz/Projects/orcamento-forte-vidros` (pasta com nome antigo)  
GitHub: https://github.com/Luizffeng/app-vidros (`main`)

Este working tree está em uso por outro chat (UI). Não editar `src/components/**` nem `src/index.css`. Abrir **git worktree** separado (ex.: `hosting/supabase-pages`) antes de codar.

## Objetivo

Pai usa o app na vidraçaria (celular ou PC). Luiz administra preços e dados da loja. Os dois enxergam os mesmos orçamentos.

- **Vendedor (pai):** orçamento, cliente, PDF. Lê catálogo e configuração. Não grava.
- **Admin (Luiz):** tudo do vendedor, mais catálogo, margem, validade, dados do estabelecimento e logo.
- Um estabelecimento só. Sem tabela de empresas, sem cadastro público, sem billing.

## Stack atual

- React 19 + Vite + TypeScript. SPA. Build: `npm run build` (`tsc -b && vite build`). Saída em `dist/`.
- Motor de preço puro em `src/domain/pricing`. Não mudar fórmulas neste trabalho.
- PDF no cliente (`jspdf`), `src/pdf/generateQuotePdf.ts`.
- Persistência: IndexedDB (`idb`), classe `LocalQuoteRepository` em `src/data/repository.ts`.
- Troca de backend é um ponto só: `createRepository()` no fim desse arquivo.
- Interface em `src/domain/types.ts` → `QuoteRepository`.

```ts
listQuotes / getQuote / saveQuote / deleteQuote
getCatalog / saveCatalog
getSettings / saveSettings
nextQuoteNumber
```

Domínio e UI falam só com essa interface. Adapter remoto novo. IndexedDB pode ficar como fallback offline depois; nesta entrega o remoto é a fonte quando há sessão.

## O que persistir

| Dado | Forma hoje | Remoto |
| --- | --- | --- |
| Orçamento | `Quote` JSON (itens, cliente, totais, status `draft` \| `emitted`) | tabela `quotes`, linha JSONB ou colunas + `payload` |
| Catálogo | `Catalog`: `config`, `vidros`, `kitBox`, `acessorios`, `aluminios` | uma linha `catalog` (JSONB). Seed em `src/data/seed/` |
| Ajustes | `AppSettings`: validade, `establishment`, `logoDataUrl` | tabela `settings` |
| Sequência | meta IndexedDB `seq-{ano}` → `ORC-2026-0001` | contador atômico no Postgres (`nextQuoteNumber`) |
| Logo | data URL PNG no settings (máx. entrada 5 MB, borda 720 px, `src/data/logo.ts`) | Storage bucket privado; settings guarda path ou URL assinada. PDF hoje exige data URL — manter campo ou converter na leitura |

Orçamento emitido é imutável. Revisão cria outro registro (`parentId`, `revision`). Regra fica no domínio (`emitQuote`, `createRevision`). O banco não recalcula preço.

## Auth e papéis

Supabase Auth, e-mail + senha. Dois usuários criados à mão (sem signup aberto).

Tabela `profiles`:

- `id` = `auth.users.id`
- `role` = `admin` | `vendedor`

RLS, sessão do usuário (anon key no client). **Nunca** `service_role` no browser.

- `quotes`: `authenticated` lê e escreve.
- `catalog`, `settings`, storage da logo: `authenticated` lê; só `admin` escreve.
- UI: esconder Catálogo e Configurações de quem não é admin (`src/components/AppNav.tsx`). RLS é a trava real.

## Hospedagem

**Cloudflare Pages** serve o Vite estático. **Supabase** é banco, auth e storage. Supabase não hospeda o SPA.

- Projeto Pages ligado ao GitHub, build `npm run build`, output `dist`.
- SPA fallback: `/* /index.html 200` (Pages `_redirects` ou config equivalente). Sem isso, refresh em rota funda quebra. O app hoje não usa router de URL (estado interno), mas o fallback evita 404 no refresh.
- Env no Pages (públicas, prefixo Vite): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Plano free do Supabase **pausa o projeto após 7 dias sem uso**. Uso na semana mantém acordado. Avisar o Luiz; não trocar de plano nesta entrega.

## Fora deste trabalho

- Não virar SaaS, não multi-tenant, não convite, não Google Sheets.
- Não alterar motor de preço nem testes de paridade.
- Não refazer a UI de orçamento (modal de item está em outro chat).
- Frete por km, PWA e backup JSON ficam no `BACKLOG.md`.

## Ordem sugerida

1. Worktree + branch. Contas Cloudflare e Supabase (Luiz cria; agent não inventa chaves).
2. Schema, RLS, bucket da logo, dois usuários e papéis.
3. `SupabaseQuoteRepository` implementando `QuoteRepository`. `createRepository()` usa remoto se as env existirem.
4. Tela de login. Sem sessão, não abre orçamento.
5. Guard de admin na nav. Vendedor que chama save de catálogo recebe erro do RLS.
6. `npm run build` e deploy Pages. Smoke: login admin, login vendedor, criar rascunho, ver o mesmo orçamento na outra conta, vendedor não salva catálogo.

Import único do IndexedDB local não é obrigatório. Se couber barato, um botão “enviar dados deste navegador” no admin. Senão, catálogo nasce do seed e orçamentos começam vazios no remoto.

## Arquivos âncora

- `src/data/repository.ts` — adapter local e factory
- `src/domain/types.ts` — `Quote`, `Catalog`, `AppSettings`, `QuoteRepository`
- `src/data/seed/` — catálogo inicial
- `src/data/defaultSettings.ts` — settings vazios
- `src/components/App.tsx` — único consumidor do repositório na UI
- `.specify/memory/constitution.md` — princípio IV: storage atrás da interface; preço determinístico
