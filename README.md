# App Vidros

App web para vidraçaria montar, emitir e enviar orçamentos. Hoje atende uma loja, a Forte Vidros, cadastrada como estabelecimento dentro do app (Configurações). O motor de cálculo espelha as regras da planilha de referência (BOX, Correr, Pivotante, Maxim-ar, Vidro fixo, Espelho), sem usar Google Sheets como banco de dados.

Poucos acessos por instalação. Não é SaaS: sem cadastro público, sem multi-empresa.

**Produção:** https://app-vidros.pages.dev

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

Login por e-mail e senha (Supabase Auth). Cadastro público desligado; usuários são criados no dashboard.

| Papel | Pode |
| --- | --- |
| `admin` | Orçamentos, catálogo, configurações e logo |
| `vendedor` | Orçamentos; lê catálogo e configurações |

A trava real é o RLS no Postgres (`supabase/migrations/20260924120000_init.sql`). A UI só esconde Catálogo e Configurações de quem é vendedor.

## Desenvolvimento

```bash
npm install
cp .env.example .env   # opcional: preencher para usar o Supabase
npm run dev
npm test
npm run lint
npm run build
```

Sem `.env`, o app roda 100% local (IndexedDB) e não pede login.

## Deploy

### Supabase (uma vez)

1. Criar projeto e rodar `supabase/migrations/20260924120000_init.sql` no SQL Editor.
2. Authentication → Providers → Email → desligar "Enable sign ups".
3. Criar usuários em Authentication → Users. O trigger grava cada um como `vendedor`; promover quem administra:
   ```sql
   update public.profiles set role = 'admin' where id = '<uuid>';
   ```
4. Copiar Project URL e a chave **publishable/anon** para o `.env`. Nunca usar a `service_role` no front.

O plano free do Supabase pausa o projeto após 7 dias sem uso. Uso semanal mantém acordado.

### Cloudflare Pages

- Projeto ligado ao GitHub, branch `main`
- Build command: `npm run build`
- Output: `dist`
- Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (e `NODE_VERSION=22`)
- `public/_redirects` faz o fallback da SPA para `index.html`

Cada push na `main` gera deploy novo.

## Dados

Catálogo inicial em `src/data/seed/` (exportado da planilha de exemplo). No Supabase, a primeira leitura grava o seed na tabela `catalog`; depois, edições pela tela Catálogo. Orçamentos locais (IndexedDB) não migram sozinhos para o remoto.

## Backlog e specs

- Prioridades vivas em [`BACKLOG.md`](./BACKLOG.md)
- Projeto com [GitHub Spec Kit](https://github.com/github/spec-kit); constitution em `.specify/memory/constitution.md`, specs em `specs/`
