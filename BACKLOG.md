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

- [ ] `feat` (G) **Usuário no Cadastro (precisa de spec):** seção expansível "Usuário" em Configurações › Cadastro com nome e telefone de quem usa o app. Futuro: orçamento guarda o vendedor na emissão e o PDF mostra nome e telefone dele (loja com vários vendedores). Decidir: perfil por usuário (Supabase `user_metadata` ou tabela `profiles` + RLS; IndexedDB no modo local), vendedor hoje não abre Configurações (tela própria "Meu perfil" ou aba liberada), snapshot no `Quote` ao emitir, linha no PDF
- [ ] `feat` (G) **SaaS para vidraçarias (precisa de spec):** decidido 2026-10-09: o app vira SaaS, priorizando simplicidade e experiência para um público pouco adepto de tecnologia. Spec própria: cadastro de loja e conta (sem atrito), várias lojas isoladas (dados, catálogo, logo por loja), planos (ex.: mensal/anual) e cobrança, período de teste, catálogo inicial por loja, migração da Forte Vidros como primeira loja, suporte. Liga com **Login, contas e autorização** e com o banner "plano anual" do Início
- [ ] `feat` (G) **Login, contas e autorização (precisa de spec):** refinar o módulo inteiro: entrar com Google e Facebook além de email/senha, criação e convite de contas (hoje sem cadastro público), papéis admin/vendedor e o que cada um vê, recuperar senha, sessão no celular, trava real no Supabase (RLS). Liga com **Usuário no Cadastro** (perfil de quem usa o app). Decidido 2026-10-09: papel Vendedor desativado até haver demanda (usuários iniciais são autônomos, todos com acesso a Catálogo e Configurações); a spec define como desativar (UI, RLS, contas vendedor existentes)
- [ ] `data` (M) **Backup/restauração de orçamentos** (export IndexedDB/JSON). Prioridade baixa: produção usa Supabase

## Blocked

- [ ] `feat` (M) **Porta de Correr 1 Folha:** novo cálculo em `priceItem` + teste de paridade. Aguardando o dono refinar o cálculo (planilha/orçamento real, BOM, medidas exemplo)

## Later

- [ ] `feat` (G) **Frete por km:** origem fixa (config) + destino (CEP/endereço cliente) → distância de rota → R$/km (API a decidir: Google / OpenRouteService / OSRM). Hoje: Frete digitado como custo adicional comum
- [ ] `ui` (M) **Responsividade fina (~390px):** reavaliar; boa parte resolvida em 2026-10-06
- [ ] `feat` (G) **PWA:** install, cache, uso offline
- [ ] `feat` (P) **Web Share / atalhos mobile** (base Web Share já no PDF desktop/mobile quando o browser permitir)
- [ ] `data` (M) **Botão admin "enviar dados deste navegador"** (IndexedDB local → Supabase)
- [ ] `feat` (M) **Banners do Início: modelos e gatilhos:** depois da Página inicial; novos modelos visuais de banner e regras de quando mostrar (ex.: por data, por uso, por versão). Hoje banners fixos do app
- [ ] `feat` (M) **Início: rodapé institucional ao rolar (junto com a spec SaaS):** abaixo dos blocos, sem barra fixa, lista simples de links em tom discreto. Proposta: Fale com o suporte (WhatsApp/SAC, e-mail, horário), Novidades da versão, Termos de uso, Política de privacidade (LGPD), Excluir minha conta e dados, dados do fornecedor (razão social, CNPJ, endereço; exigência para quem vende plano online), versão do app. Blocos e carrossel continuam cabendo sem rolar em 360 × 640
- [ ] `feat` (M) **Tela de novidades do app:** destino do banner "Confira os detalhes das últimas atualizações"; lista do que mudou em cada versão
- [ ] `ui` (P) **Voltar no Android: CloseWatcher:** quando o Chrome estável suportar sem ativação do usuário, trocar as entradas de histórico das janelas por `CloseWatcher` (fica mais simples que contar entradas em `src/nav/navigator.ts`)
- [ ] `ui` (P) **Confirmação de sair sem salvar com visual do app:** hoje Catálogo/Configurações usam `window.confirm` (`useLeaveGuard`); trocar por um diálogo próprio
- [ ] `ui` (P) **Textos dos banners do Início:** os 3 banners em `src/data/banners.ts` são provisórios ("Em breve…", "plano anual…", "novidades"); o dono revisa os textos e os destinos
- [ ] `ui` (M) **Movimento extra:** entrada/saída de cada item na lista, arrastar para fechar janela no celular, animação dos totais. Fora do escopo da spec 004; usar os tokens de movimento

## Fora (por enquanto)

- Sync Google Sheets em runtime
- App nativo (iOS/Android). Ganho conhecido: só app nativo (ex.: Android empacotado com Capacitor) manda o PDF direto ao WhatsApp, sem a folha de compartilhar do sistema; pelo navegador, arquivo só sai por essa folha. A tela de legenda do WhatsApp continua de qualquer jeito

## Done

### 2026-10-10

- [x] `ui` **Mostrar senha no login:** botão de olho dentro do campo Senha alterna mostrar/ocultar sem tirar o foco (o teclado do celular não fecha)
- [x] `ui` **Revisão de espaço vertical:** modal do item com campos curtos lado a lado no celular (Vão + Cor do vidro, Cor do perfil + Margem, Acabamento + Margem, Descrição + Valor), Margem do vidro fixo em linha, "Incluir trinco" numa linha só com a caixa à direita, dica da Observação no rótulo. Catálogo › Mão de obra/margem em 2 colunas no celular. Altura em 360 px: Box 848→676, Correr 923→826, Pivotante 923→805, Maxim-ar/Espelho 848→751, Vidro fixo 773→730, Avulso 419→322, Catálogo config 1489→1113. Editor, Detalhes do custo e Configurações já estavam dentro das regras
- [x] `refactor` **Unificar componentes parecidos:** um jeito por tarefa, tabela "Shared patterns" em `src/components/AGENTS.md`. `ConfirmPop` para todas as confirmações em linha; `IconButton` para botões só de ícone e `.btn.with-icon` para ícone + texto; `Banner` para avisos (botões passam para baixo do texto em tela estreita); `Section` para cartões fixos com título, contador, dica e ações; `DropdownField` no lugar dos `<select>` nativos do item (opções de 2.25rem, lista abre para cima quando não cabe). `.grid` e `.field-pair` ficam (papéis diferentes), `--city` virou `--half`

### 2026-10-09

- [x] `feat` **Botão voltar + URLs por tela:** voltar do celular fecha a janela aberta (item, tipo, menus, confirmações, prévia), depois volta uma tela; sai do app só no Início. Cada tela tem endereço (`/orcamentos/…`, `/catalogo/aluminios`, `/configuracoes/logo`), recarregar mantém o lugar, link direto monta o caminho de volta, aba e filtro da lista ficam no endereço. Catálogo/Configurações com alteração não salva perguntam antes de sair. Item digitado e fechado sem salvar vira "Item não terminado" com Continuar/Descartar. Spec `specs/005-voltar-e-urls/`
- [x] `feat` **Página inicial (Início):** carrossel de banners (troca a cada 5 s, pausa ao tocar, arrasto, sem animação com "reduzir movimento") e blocos Orçamentos (vencendo em 7 dias / rascunhos), Catálogo (atualizado em), Configurações ("!" com cadastro incompleto, abre Cadastro), Ajuda (em breve). Cabe em 360 × 640 sem rolar. +6,4 KB gzip com a spec 005. Spec `specs/006-pagina-inicial/`
- [x] `ui` **Enviar volta ao ícone de compartilhar:** o PDF passa pela folha do sistema (não vai direto ao WhatsApp), então o botão Enviar (barra e prévia) volta ao ícone de compartilhar; o logo do WhatsApp fica só em "Enviar no WhatsApp" do texto
- [x] `fix` **Miniatura do PDF no WhatsApp (testado, sem solução pela web):** PDF enviado pelo Chrome no Android chega sem miniatura; o mesmo arquivo anexado dentro do WhatsApp tem. Mandar só o arquivo (sem título/mensagem) não mudou nada e foi desfeito

### 2026-10-08

- [x] `fix` **Abrir orçamento sem pulo no Android:** a entrada da tela (deslize da direita) alargava a página por um instante; o Chrome mostrava barra de rolagem horizontal e reajustava o zoom. Agora o deslize fica cortado na borda da tela
- [x] `ui` **Toque sem destaque azul:** botões não mostram mais o realce azul do toque nem selecionam o texto ao segurar
- [x] `feat` **Enviar texto direto no WhatsApp:** abre o app do WhatsApp sem a folha de compartilhar do sistema (computador: WhatsApp Web). Sem WhatsApp no celular: cai na folha nativa; sem ela, aviso "Não foi possível compartilhar no momento. Faça o download do orçamento para realizar o envio."
- [x] `ui` **Botão Enviar com logo do WhatsApp:** botão amarelo com logo verde do WhatsApp (barra, prévia do PDF, janela de texto); no menu, ícone de PDF (amarelo) e de texto. Botões amarelos do app mais claros
- [x] `ui` **Lista: Novo orçamento na barra inferior:** botão com ícone "+" na barra de baixo, como as ações do editor; busca e filtro sobem para o topo; sai o cabeçalho "Recentes (N)" e o cartão em volta da lista; contagem vai para o filtro (Todos/Emitidos/Rascunhos, segue a busca)
- [x] `ui` **Cabeçalho e barra inferior com a mesma borda:** cabeçalho fica na cor da página (não escurece ao rolar), barra inferior segue escura e agora opaca; os dois têm linha fina de ponta a ponta e o conteúdo some num esmaecido junto da linha (estilo "scroll edge" do iOS), com leve sombra. Linha e sombra do cabeçalho só aparecem fora do topo; esmaecido e sombra do rodapé somem no fim da página (linha e cor escura do rodapé ficam sempre). Fundo da página passou a uma camada fixa, que também funciona no iPhone
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
