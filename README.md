# App Vidros

App web para vidraçaria montar, emitir e enviar orçamentos. Spec 007: cada loja é uma conta Supabase (`accounts` + RLS por `account_id`); cadastro e teste de 30 dias no app; Forte Vidros é a conta de cutover/seed, não um atalho no código. O motor de cálculo espelha as regras da planilha de referência (BOX, Correr, Pivotante, Maxim-ar, Vidro fixo, Espelho), sem usar Google Sheets como banco de dados.

Modo local (sem `.env`) usa IndexedDB e não pede login. Abrir cadastro em produção ainda depende de CNPJ, WhatsApp de suporte e revisão jurídica (`BACKLOG.md` Blocked). Fase 2 (planos/cobrança) é spec à parte.

**Produção:** https://appvidros.pages.dev

## Funcionalidades (v1)

- Lista de orçamentos em grade, busca e filtro Todos / Emitidos / Rascunhos
- Rascunho com itens calculados (catálogo) ou avulsos, custos adicionais, frete manual e margem
- Cliente com CEP (ViaCEP); nome obrigatório para emitir
- Emitir torna o orçamento imutável; alterações viram revisão (`ORC-2026-0001-2`)
- Rascunho pode ser excluído; emitido não
- PDF para o cliente (sem medidas internas, custo ou margem), com logo e validade
- Envio pelo WhatsApp com prévia editável e botão de copiar
- Catálogo editável (vidros, kit box, acessórios, alumínios, config) com export/import JSON
- Configurações: validade, dados do estabelecimento e logo

## Stack

- React 19 + Vite + TypeScript (SPA)
- Motor de precificação puro em `src/domain/pricing`
- PDF no navegador com jsPDF
- Persistência atrás da interface `QuoteRepository` (`src/domain/types.ts`):
  - **Supabase** (`SupabaseQuoteRepository`) quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` existem
  - **IndexedDB** (`LocalQuoteRepository`) sem essas variáveis — modo local, sem login
- Hospedagem: Cloudflare Pages (estático) + Supabase (Postgres, Auth, Storage)

## Acesso e papéis

Cadastro e login no app (e-mail/senha; Google opcional). Telefone OTP e Facebook ficam para depois. Quem cria conta vira `admin` da própria loja e inicia teste de 30 dias. Conta vencida ou desativada fica em modo consulta (lê e reenvia emitidos; gravações abrem aviso).

| Papel | Pode |
| --- | --- |
| `admin` | Orçamentos, catálogo, configurações, logo, excluir conta |
| `vendedor` | Dormante na fase 1 (spec futura de vários usuários) |

A trava real é o RLS (`account_id` + `account_can_write()` em `supabase/migrations/20261010120000_accounts.sql`). Detalhe operacional: `specs/007-saas-vidracarias/quickstart.md` e `supabase/operator/`.

## Desenvolvimento

```bash
npm install
cp .env.example .env   # opcional: Supabase remoto ou local
npm run dev            # ou npm run dev:staging com .env.staging.local
npm test
npm run lint
npm run build
```

Sem `.env`, o app roda 100% local (IndexedDB) e não pede login. Supabase local + isolamento: ver quickstart da spec 007 (`scripts/tenant-isolation.mjs`, `scripts/signup-browser.mjs`).

## Deploy

### Supabase

1. Rodar as migrations em ordem (`20260924120000_init.sql`, `20261010120000_accounts.sql`, demais em `supabase/migrations/`).
2. Authentication → Providers: e-mail com sign-ups ligados quando for abrir cadastro; Google se for usar.
3. Site URL / Redirect URLs: produção e staging (links de confirmação e troca de senha).
4. Copiar Project URL e chave **publishable/anon** para o `.env` / Cloudflare. Nunca usar a `service_role` no front.
5. Virada da Forte Vidros e checklist de produção: quickstart da spec 007 (T019 / export real ainda pendente do dono).

O plano free do Supabase pausa o projeto após 7 dias sem uso. Uso semanal mantém acordado.

### Cloudflare Pages

- Projeto `appvidros` ligado ao GitHub, branch `main`
- Build command: `npm run build`
- Output: `dist`
- Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (e `NODE_VERSION=22`)
- `public/_redirects` faz o fallback da SPA para `index.html`

Push na `main` que mexe no app gera deploy. Commit só de documento, backlog, spec ou arquivo fora do build não deve gerar. Não há GitHub Actions neste repo: o gatilho é o Cloudflare Pages.

Settings → Build → Build watch paths:

- Include: `*`
- Exclude: `*.md`, `docs/*`, `specs/*`, `.specify/*`, `.cursor/*`, `.agents/*`, `assets/item-images/*`

Exclude vale primeiro. Se sobrar arquivo do app, o build roda. Essa lista fica no projeto Pages, não num workflow do git. Até ela estar salva no dashboard, o prefixo `[CI Skip]` na mensagem do commit pula aquele deploy.

## Dados

Catálogo inicial em `src/data/seed/` (exportado da planilha de exemplo). No Supabase, a primeira leitura grava o seed na tabela `catalog`; depois, edições pela tela Catálogo. Orçamentos locais (IndexedDB) não migram sozinhos para o remoto.

## Backlog e specs

- Prioridades vivas em [`BACKLOG.md`](./BACKLOG.md)
- Projeto com [GitHub Spec Kit](https://github.com/github/spec-kit); constitution em `.specify/memory/constitution.md`. Specs novas entram em `specs/`. A spec antiga do MVP (`001-mvp-orcamentos`) foi removida.
