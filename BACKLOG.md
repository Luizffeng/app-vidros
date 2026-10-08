# Backlog — App Vidros

Arquivo vivo: features, correções e mudanças de implementação (refactor, testes, performance). Specs de features grandes entram em `specs/`.

**Estratégia:** web desktop primeiro (fluxo completo, catálogo, PDF, qualidade). Responsividade fina + PWA/offline depois.

## Convenções

- **Seções por status:** Now (em andamento) → Next (pronto pra puxar, prioridade de cima pra baixo) → Blocked (aguardando decisão ou insumo) → Later (sem prioridade) → Fora → Done.
- **Linha:** `- [ ] \`tipo\` (P|M|G) **Título:** descrição`. Tipos iguais aos commits: `feat`, `fix`, `ui`, `refactor`, `test`, `perf`, `data`, `docs`. Tamanho: P (horas), M (1–2 dias), G (vários dias, exige spec antes de codar).
- **Puxar:** mover de Next para Now. **Fechar:** remover de Now e adicionar `- [x]` com o resultado visível no topo de Done, sob o cabeçalho da data (`### AAAA-MM-DD`, mais recente primeiro).
- Ideias novas entram em Next/Later, nunca em comentário de código.

---

## Now

## Next

- [ ] `refactor` (M) **Unificar componentes parecidos:** inventário de componentes e classes CSS que fazem a mesma coisa de jeitos diferentes; para cada grupo, decidir um só (ou um componente misto com variantes) e migrar. Objetivo: menos componentes, desenvolvimento mais rápido, agentes entendem mais fácil. Candidatos já vistos: popovers de confirmação (`.remove-pop`, `.emit-pop`, `.save-pop`), avisos (`.banner` ok/error/warn, `outdated-banner`), seção fixa vs expansível (`.section` + `h2` vs `CollapsibleSection`), `.grid` vs `.field-pair`, `Dropdown` vs `select` nativo (decidido: padrão é o `Dropdown` customizado, migrar os `<select>` nativos que restam; linhas da lista mais baixas que hoje, `.dropdown__option` com `min-height: 2.75rem`, alvo ~2.25rem; conferir em 360 px e com fonte grande do sistema), botões de ação (`IconAction`, `ActionButton`, `.btn-icon`). Resultado vira tabela em `src/components/AGENTS.md`. Fazer junto ou logo antes da revisão de espaço vertical
- [ ] `ui` (M) **Revisão de espaço vertical no app todo:** aplicar as regras de `.agents/skills/ui-change/SKILL.md` (passo 5: dica sob o título da seção, campos relacionados na mesma linha, campos curtos inline, controle à direita, mídia + ações em colunas) em editor, cliente, custos, catálogo e modais; medir altura antes/depois em 360/390 px
- [ ] `feat` (G) **Usuário no Cadastro (precisa de spec):** seção expansível "Usuário" em Configurações › Cadastro com nome e telefone de quem usa o app. Futuro: orçamento guarda o vendedor na emissão e o PDF mostra nome e telefone dele (loja com vários vendedores). Decidir: perfil por usuário (Supabase `user_metadata` ou tabela `profiles` + RLS; IndexedDB no modo local), vendedor hoje não abre Configurações (tela própria "Meu perfil" ou aba liberada), snapshot no `Quote` ao emitir, linha no PDF
- [ ] `feat` (G) **URLs por tela (precisa de spec):** hoje sem router, telas em `useState` no `App`; voltar do navegador/celular sai do app e recarregar volta pra lista. Decidir antes de codar: quais telas ganham path (ex.: `/orcamentos`, `/orcamentos/:id`, `/catalogo/:tabela`, `/configuracoes/:aba`), o que vira só estado (modal de item, prévia, envio), o que persiste entre sessões (último orçamento aberto, aba/filtro do catálogo), deep link de orçamento compartilhável internamente, gate de vendedor em rota admin. Router próprio (History API) vs lib; Cloudflare `_redirects` já faz fallback SPA
- [ ] `feat` (G) **Página inicial (precisa de spec):** tela de entrada do app, antes da lista de orçamentos. Definir o formato na spec (`speckit-specify`): o que mostra (atalhos para novo orçamento, rascunhos recentes, resumo de emitidos, atalhos de admin para catálogo/configurações), diferença entre vendedor e admin, se substitui a lista como tela inicial, como se liga a **URLs por tela** (path `/`). Puxar na próxima fase, depois de reavaliar o backlog
- [ ] `data` (M) **Backup/restauração de orçamentos** (export IndexedDB/JSON). Prioridade baixa: produção usa Supabase

## Blocked

- [ ] `feat` (M) **Porta de Correr 1 Folha:** novo cálculo em `priceItem` + teste de paridade. Aguardando o dono refinar o cálculo (planilha/orçamento real, BOM, medidas exemplo)

## Later

- [ ] `feat` (G) **Frete por km:** origem fixa (config) + destino (CEP/endereço cliente) → distância de rota → R$/km (API a decidir: Google / OpenRouteService / OSRM). Hoje: Frete digitado como custo adicional comum
- [ ] `ui` (M) **Responsividade fina (~390px):** reavaliar; boa parte resolvida em 2026-10-06
- [ ] `feat` (G) **PWA:** install, cache, uso offline
- [ ] `feat` (P) **Web Share / atalhos mobile** (base Web Share já no PDF desktop/mobile quando o browser permitir)
- [ ] `data` (M) **Botão admin "enviar dados deste navegador"** (IndexedDB local → Supabase)
- [ ] `ui` (M) **Movimento extra:** entrada/saída de cada item na lista, arrastar para fechar janela no celular, animação dos totais. Fora do escopo da spec 004; usar os tokens de movimento

## Fora (por enquanto)

- Sync Google Sheets em runtime
- App nativo (iOS/Android)

## Done

### 2026-10-08

- [x] `ui` **Cabeçalho fixo na cor da página:** não escurece mais ao rolar; o conteúdo some num esmaecido suave sob o cabeçalho, com leve sombra na borda só depois de rolar (estilo "scroll edge" do iOS). Fundo da página passou a uma camada fixa, que também funciona no iPhone
- [x] `ui` **Transições leves:** janelas escurecem o fundo e sobem (celular) ou crescem (computador), saem mais rápido; seletor, menu, Enviar e confirmações abrem a partir do botão e fecham suave; seções expandem sem salto; abas de Configurações com marcador deslizante; lista → orçamento entra pela direita, voltar pela esquerda na mesma rolagem; menu troca com esmaecer. Uma tabela de durações (100–250 ms), respeita "reduzir movimento", sem biblioteca, +1,4 KB. Sem desfoque nas seções e na barra inferior. Spec `specs/004-transicoes/`
- [x] `test` `scripts/motion-perf-browser.mjs` (CPU 4×, mediana de 3, compara com baseline) e `scripts/validate-catalog-browser.mjs` atualizado para a tela atual do catálogo; scripts de navegador rodam com animação reduzida
- [x] `feat` Envio do emitido: barra com Prévia, Baixar e **Enviar**; Enviar abre popup com "Enviar PDF" (arquivo + mensagem "Olá, {nome}! Segue o orçamento {código} da {loja}." + texto final, também copiada) e "Enviar texto" (prévia com "Copiar"). Texto final padrão: "Gostaria de efetuar o pedido?".
- [x] `feat` Mão de obra editável por item (taxa só neste item ou no catálogo) e "!" amarelo nas linhas do custo cujo preço mudou no catálogo, com "Atualizar item".
- [x] `feat` Itens antigos recebem o detalhamento de linhas em silêncio quando o preço não muda.
- [x] `ui` Cabeçalhos fixos no topo (lista, orçamento, catálogo, configurações com abas) e tamanho de texto estável no Android.
- [x] `ui` Rodapé do orçamento cabe R$ 999.999,99 em 360 px (total 1,1rem, centavos menores, Enviar mais estreito); valores com algarismos de largura igual.
- [x] `ui` Detalhes do custo: cabeçalho fixo, unidade no unitário, campo de preço menor, rolagem até o editor; Cor do vidro antes da Espessura; Configurações sem subtítulo e logo "aparece no PDF".
- [x] `fix` PDF e WhatsApp usam nome fantasia e caem para nome/razão social.

### 2026-10-07

- [x] `feat` **Janela "Detalhes do custo":** modal por item com resumo e linhas por grupo (quantidade, unidade, unitário, subtotal, "+N% cor"). Admin no rascunho edita o preço de uma linha: "Só neste orçamento" (preço próprio, vale para os itens do orçamento com o mesmo código) ou "Atualizar no catálogo" (confirmação, recalcula este rascunho, outros mostram o aviso). Vendedor e emitido só visualizam. Spec `specs/003-composicao-do-item/`
- [x] `fix` Aviso do rascunho só aparece se atualizar mudaria o preço de algum item (catálogo mudou em algo que o rascunho usa, ou cálculo de margem diferente)
- [x] `ui` Configurações mais compactas: caixa do cálculo de margem à direita e centralizada; Validade com dica sob o título e campo "Dias" curto na mesma linha; **Texto final no WhatsApp** (era Chamada no WhatsApp) com dica sob o título; Logo com botão ao lado da imagem. Regras de espaço vertical na skill de UI
- [x] `ui` Modal do item mais curto no celular: Largura + Altura e Espessura + Cor do vidro (no espelho, Cor + Espessura) na mesma linha
- [x] `ui` Configurações: aba Estabelecimento vira **Cadastro** (Estabelecimento expansível); cada bloco é um cartão com título (Cálculo de margem, Validade padrão, Chamada no WhatsApp, Logo). Aviso de rascunho amarelo e compacto, com data; após atualizar, aviso menor "Valores atualizados"
- [x] `feat` **Cálculo de margem** em Configurações › Orçamento: Empresa (margem sobre tudo, = antes), Vendedor (mão de obra sem margem), Autônomo (sem margem). Frete e desconto nunca têm margem. Confirmação ao salvar; rascunho desatualizado (catálogo ou cálculo) mostra aviso com "Atualizar valores"; emitidos não mudam. Spec `specs/002-modelos-de-calculo/`

### 2026-10-06

- [x] `feat` Envio do emitido: barra com Prévia + **Enviar**; Enviar abre folha com Compartilhar PDF (quando o aparelho suporta), Texto (prévia, copiar, WhatsApp) e Baixar PDF. Prévia do rascunho sem botões desabilitados; prévia do emitido com um único Enviar
- [x] `perf` jsPDF carregado só ao gerar PDF: bundle principal de 1.079 KB para 680 KB (pdf.js já era sob demanda)
- [x] `test` Smoke E2E `scripts/smoke-quote-browser.mjs`: criar → item → emitir (com e sem nome) → prévia → envio por texto → download do PDF
- [x] `docs` Backlog reorganizado por status (Now / Next / Blocked / Later / Fora / Done por data) com tipo e tamanho
- [x] `ui` Topo do orçamento: status abaixo do número; lixeira/revisão + menu (menu sempre na ponta direita); flags de aviso só em texto vermelho com "!"
- [x] `feat` Custos adicionais sem linha Frete fixa (placeholder `Ex.: Frete`; Frete R$ 0 legado some ao abrir rascunho)
- [x] `ui` Flag "Adicione um item" na seção Itens do rascunho vazio
- [x] `ui` Catálogo › Alumínios sem texto de ajuda
- [x] `ui` Orçamentos / Catálogo / Configurações no menu hambúrguer (sem abas no topo); menu acima dos filtros do catálogo
- [x] `ui` Campos de valor (`inputMode="decimal"`, medidas, validade) selecionam tudo ao focar
- [x] `ui` Seta das seções do editor em SVG (círculo + chevron, gira ao abrir)
- [x] `ui` Catálogo: campo de preço estreito (cabe `9999,99`)
- [x] `ui` Configurações: endereço compacto (CEP+UF, Número+Complemento, Bairro+Cidade)
- [x] `feat` PDF baixado como `<código>-<primeiro nome>.pdf` (ex.: `2026-0001-1-Luiz.pdf`)
- [x] `test` Comparação J4F 2000×1200 com a planilha antiga (orçamento 2026-0016-1): diferenças só de catálogo, acréscimo de cor e arredondamento; motor mantido como está
- [x] `ui` Configurações em abas (Estabelecimento, Orçamento, Logo)
- [x] `feat` WhatsApp: validade da proposta em itálico na última linha; número sem `ORC-` no texto e no PDF (app interno segue com `ORC-`)
- [x] `ui` Sem mensagem "Nenhum item" em orçamento vazio; telefone do cliente cabe inteiro em 360px

### Até 2026-10-05

- [x] **v1.0.0** — Supabase (Postgres + Auth + Storage da logo) atrás de `QuoteRepository`, login e-mail/senha, papéis admin/vendedor com RLS, deploy Cloudflare Pages
- [x] Excluir rascunho (emitido segue imutável); nome do cliente obrigatório para emitir
- [x] Lista em grade com filtro Todos / Emitidos / Rascunhos
- [x] Prévia do WhatsApp com copiar texto
- [x] MVP orçamentos local (IndexedDB) + motor pricing + PDF
- [x] Constitution + Spec Kit 001
- [x] Tela Catálogo (vidros, kit box, acessórios, alumínios, config) + restore seed
- [x] CEP ViaCEP + endereço estruturado; Frete manual nos custos adicionais
- [x] UI % (margem / acréscimo) e labels Margem
- [x] Editar item existente no orçamento
- [x] Busca/filtro na lista de orçamentos
- [x] PDF com cabeçalho de marca + share/download
- [x] PDF cliente sem medidas/custo/margem + validade
- [x] Página Configurações (validade + dados do estabelecimento no PDF)
- [x] Upload de logo nas Configurações + logo no PDF
- [x] Catálogo: criar / desativar itens + export/import JSON
- [x] Ampliar testes de paridade (box/correr/pivot/fixo/espelho/custom + inativos)
- [x] Validar no browser: CRUD catálogo + export/import JSON (`scripts/validate-catalog-browser.mjs`)
- [x] Import/export: descartar linhas seed com `codigo` null/vazio + limpar `acessorios.json`
