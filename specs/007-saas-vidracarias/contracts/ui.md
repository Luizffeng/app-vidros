# Contract: screens, routes and copy — spec 007

All screens usable at 360 px wide. Shared components first (`src/components/AGENTS.md` "Shared patterns"): `Banner`, `Section`, `ConfirmPop`, `IconButton`, `Modal`.

## Routes (`src/nav/routes.ts`)

| URL | Screen | Session |
| --- | --- | --- |
| `/ajuda` | Fale com a gente | required |
| `/primeiros-passos/:tarefa` (`loja`, `vidros`, `ferragens`, `mao-de-obra`) | focused task screen | required |
| `/novidades` | release notes | public |
| `/termos` | Termos de uso | public |
| `/privacidade` | Política de privacidade | public |

Parents for back: task screens and `/ajuda` → `/`; public pages → `/` (or entry screen without session). "Seu primeiro orçamento" task goes to `/orcamentos` and opens "Novo orçamento".

## Entry (no session) — replaces `LoginScreen`

- Logo + one line: "Orçamentos de vidraçaria prontos no celular, em minutos."
- Primary: "Criar conta grátis" · Secondary: "Já tenho conta".
- Both open the method list: "Continuar com Google", "Continuar com e-mail" (fields e-mail + senha with show/hide, "Esqueci a senha"), later "Continuar com telefone", "Continuar com Facebook".
- Footer links: Termos de uso · Política de privacidade.

## Account setup (session, no account)

Title "Sua vidraçaria". Fields: Nome da vidraçaria, WhatsApp da loja (masked). Checkbox row "Quero receber novidades e ofertas pelo WhatsApp" (unchecked). Text "Ao continuar, você aceita os Termos de uso e a Política de privacidade" (links). Button "Começar teste grátis de 30 dias".

## Início additions

1. **Trial line** (`trial`, not `warn`): muted text under the tiles, "Teste grátis: faltam {n} dias".
2. **Warn banner** (`warn`): `Banner tone="warn"` above the tiles: "Seu teste grátis termina em {n} dias." action "Quero assinar". Subscription: "Sua assinatura vence em {n} dias." action "Renovar".
3. **Expired banner**: `Banner tone="warn"`: "Seu teste grátis terminou em {dd/mm}. Seus orçamentos continuam aqui para consulta." action "Falar com a gente" (no price talk, spec FR-028a spirit). Subscription: "Sua assinatura venceu em {dd/mm}. …".
4. **Primeiros passos card** above the tiles while visible: title "Primeiros passos", pill "{done} de 5", list of 5 rows (check icon when done, chevron otherwise), "Dispensar" link.
5. **Ajuda tile** becomes active: title "Ajuda", summary "Fale com a gente", opens `/ajuda`.
6. **Footer** below the tiles (visible only by scrolling at 360 × 640): Fale com a gente · Novidades · Termos de uso · Política de privacidade · Excluir minha conta e dados · {razão social} · CNPJ {cnpj} · {endereço} · Versão {x}.

## Expired notice (modal)

Opened instead of creating anything by: Novo orçamento, Revisar, Duplicar, Emitir, item add/edit, catalog save, settings save.

- Title: "Seu teste grátis terminou" / "Sua assinatura venceu".
- Body: "Terminou em {dd/mm/aaaa}. Você ainda pode ver, baixar e reenviar seus orçamentos. Para criar novos, assine o App Vidros."
- Primary "Quero assinar" / "Renovar" → `wa.me/{suporte}?text=Olá! Quero assinar o App Vidros. Loja: {nome} ({shortId})`.
- Secondary "Falar com a gente" → `/ajuda`. Close returns to the same place, nothing created.

## Primeiros passos task screens

One `Section` with only the task's fields, a short hint, and two buttons: "Confirmar preços" (clears `exemplo` for the task's tables) / "Salvar" (when edited). "Sua loja" reuses the Cadastro and Logo fields. Rows still `exemplo` show a small "exemplo" pill.

## Catalog

Rows with `exemplo` show the "exemplo" pill next to the price. Editing the price removes it on save.

## Emit warning

When the quote uses example prices: `ConfirmPop` on Emitir: "Este orçamento usa preços de exemplo (vidros, ferragens…). Revisar antes de emitir?" → "Revisar" (opens Catálogo on the first affected tab) / "Emitir assim".

## Fale com a gente (`/ajuda`)

- `Section` "Fale com a gente": hours and typical reply ("Seg. a sex., 10h às 16h. Respondemos em até 1 hora nesse horário. Fora dele, no próximo dia útil."). Primary "Conversar no WhatsApp" → `wa.me/{suporte}?text=Olá! Sou da {nome} ({shortId}).`
- `Section` "Sugestões" with `count`: textarea "O que faria o app melhor para você?" + "Enviar". List newest first: date, text, status pill (Recebida / Respondida / Feita na versão X), reply below in a quoted block.
- Works when expired.

## Configurações › Cadastro additions

- Checkbox row "Quero receber novidades e ofertas pelo WhatsApp".
- "Primeiros passos" link list when the card was dismissed with pending tasks.

## Excluir conta

From the footer: `ConfirmPop` with text field "Digite EXCLUIR para confirmar" → "Excluir tudo" (danger). Then sign out and entry screen.
