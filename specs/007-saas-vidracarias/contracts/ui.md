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

## Primeiros passos tasks

No task screens (research R9, revised 2026-10-14). Each row opens the screen that already edits it: Cadastro, a Catálogo tab, or a new quote. Row: check (done) or empty circle, label, one-line hint ("Feito" when done), chevron. After "Dispensar", Configurações › Cadastro lists the open tasks in a "Primeiros passos" `Section`. Hidden when the account cannot write, for `vendedor`, and in local mode.

## Catalog

Example prices have a dashed field and the title "Preço de exemplo" (a pill does not fit the 360 px table). Editing the price clears the flag on save. While a tab still has priced example rows, a warn `Banner` above the table says "{n} preços ainda são de exemplo (borda tracejada). Ajuste os da sua loja e confirme o resto." with "Confirmar preços" (clears the tab's flags and saves). Mão de obra / margem: "Mão de obra e margem ainda são de exemplo. Ajuste para a sua loja ou confirme."

## Emit warning

When the quote uses example prices: `ConfirmPop` on Emitir: "Este orçamento usa preços de exemplo (vidros, kits de box, acessórios, perfis e mão de obra, only those used). Revisar antes de emitir?" → "Revisar" (opens Catálogo on the first affected tab) / "Emitir assim". `vendedor`: "… Avise quem cuida do catálogo." → "Emitir assim" / "Cancelar".

## Fale com a gente (`/ajuda`)

- `Section` "Fale com a gente": hours and typical reply ("Seg. a sex., 10h às 16h. Respondemos em até 1 hora nesse horário. Fora dele, no próximo dia útil."). Primary "Conversar no WhatsApp" → `wa.me/{suporte}?text=Olá! Sou da {nome} ({shortId}).`
- `Section` "Sugestões" with `count`: textarea "O que faria o app melhor para você?" + "Enviar". List newest first: date, text, status pill (Recebida / Respondida / Feita na versão X), reply below in a quoted block.
- Works when expired.

## Configurações › Cadastro additions

- Checkbox row "Quero receber novidades e ofertas pelo WhatsApp".
- "Primeiros passos" link list when the card was dismissed with pending tasks.

## Excluir conta

From the footer: `ConfirmPop` with text field "Digite EXCLUIR para confirmar" → "Excluir tudo" (danger). Then sign out and entry screen.
