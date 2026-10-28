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

- [ ] `feat` (G) **SaaS para vidraçarias, fase 1:** spec [specs/007-saas-vidracarias](specs/007-saas-vidracarias/spec.md) (2026-10-10). Conta = loja = um usuário, cadastro aberto (Google, e-mail; telefone e Facebook depois), teste grátis de 30 dias com modo consulta ao vencer ("Novo orçamento"/"Revisar" abrem aviso de vencimento, sem rascunho), aviso a partir de 7 dias antes e lembretes de valor depois, catálogo de exemplo com preços redondos próximos do mercado + "Primeiros passos" no Início, "Fale com a gente" (WhatsApp humano e sugestões que não expiram), isolamento por conta, migração da Forte Vidros, rodapé institucional e excluir conta. Fase 2 (planos e cobrança) e painel do provedor em specs próprias. Plano em 5 entregas ([plan.md](specs/007-saas-vidracarias/plan.md)): contas e isolamento + virada da Forte Vidros; cadastro e teste; catálogo de exemplo e Primeiros passos; Fale com a gente e rodapé; telefone e Facebook. Antes de abrir cadastro: projeto Supabase de staging, textos legais, WhatsApp/horário do suporte, faixa de preço plausível (box e correr). Tarefas em [tasks.md](specs/007-saas-vidracarias/tasks.md) (66). Na branch `007-saas-vidracarias`: entregas 1 (contas e isolamento) e 2 (cadastro, teste de 30 dias, modo consulta, termos/privacidade/novidades) prontas e testadas no Supabase local; virada da produção pendente (T019 com export real, depois checklist do quickstart). Próxima: entrega 3 (catálogo de exemplo e Primeiros passos)

## Next

- [ ] `feat` (G) **Usuário no Cadastro (precisa de spec):** seção expansível "Usuário" em Configurações › Conta com nome e telefone de quem usa o app. Futuro: orçamento guarda o vendedor na emissão e o PDF mostra nome e telefone dele (loja com vários vendedores). Decidir: perfil por usuário (Supabase `user_metadata` ou tabela `profiles` + RLS; IndexedDB no modo local), vendedor hoje não abre Configurações (tela própria "Meu perfil" ou aba liberada), snapshot no `Quote` ao emitir, linha no PDF
- [ ] `feat` (G) **SaaS fase 2: planos e cobrança (precisa de spec):** planos (ex.: mensal/anual), preços, cobrança no app (Pix, cartão, boleto), nota fiscal, régua de atraso. Fim do pagamento cai no mesmo modo consulta da fase 1 ([spec 007](specs/007-saas-vidracarias/spec.md)). Liga com o banner "plano anual" do Início
- [ ] `feat` (G) **Painel do provedor (precisa de spec):** front-end/plataforma do dono do SaaS para operar as contas: suporte (responder sugestões, conversa pelo app), assinaturas (liberar até uma data, renovar, cancelar), mais dias de teste, descontos e cupons, banners do Início, versões publicadas (deploys) e outras ferramentas de operação. Substitui a ferramenta interna da fase 1 (FR-018, FR-026, FR-028 da [spec 007](specs/007-saas-vidracarias/spec.md))
- [ ] `feat` (M) **Reconquista após o teste:** quem não assina depois dos 30 dias e consentiu recebe oferta pelo WhatsApp (ex.: 50% nos 3 primeiros meses, ou primeiro mês por R$ 1,99 com assinatura no cartão). Depende da fase 2 (cartão) e do painel do provedor. Ordem dos contatos: primeiro um lembrete de valor sem falar de pagamento (ex.: orçamentos prestes a vencer), depois a assinatura, por fim o desconto. A longo prazo, CRM com régua de contato (ativação no teste, vencimento, reconquista)
- [ ] `feat` (G) **Vários usuários por loja (precisa de spec):** convites, papéis admin/vendedor e o que cada um vê, vincular métodos de entrada a uma conta. Pedido do dono 2026-10-15: revisar os papéis (hoje `admin` e `vendedor`; na prática a loja usa um gerente) e liberar Configurações para todos, com o que cada papel pode mudar (ex.: vendedor ajusta a validade da proposta; cadastro da loja, margem e excluir conta só admin). Hoje o vendedor não abre Catálogo nem Configurações; Suporte (fale com a gente, dicas, novidades) já aparece para todos. Mudar o que cada papel grava exige RLS. Entrada (Google, e-mail, telefone, Facebook), recuperar senha, sessão, isolamento por conta (RLS) e desativação do Vendedor já estão na [spec 007](specs/007-saas-vidracarias/spec.md). Liga com **Usuário no Cadastro**. Só quando houver demanda
- [ ] `feat` (G) **Frete automático por km (precisa de spec):** pedido do dono 2026-10-10. Calcula o frete a partir do CEP da loja (Cadastro) e do CEP do cliente, × custo por km configurável (padrão R$ 2,00/km), e entra no orçamento como custo adicional editável. Decidir: ida ou ida e volta, valor mínimo, arredondamento, distância de rota vs linha reta, serviço de CEP → coordenadas e de rota (BrasilAPI/ViaCEP + OSRM/OpenRouteService/Google; custo e limite de uso), sem CEP do cliente (fica manual). Hoje: Frete digitado como custo adicional comum
- [ ] `data` (M) **Backup/restauração de orçamentos** (export IndexedDB/JSON). Prioridade baixa: produção usa Supabase

## Blocked

- [ ] `docs` (P) **Abrir cadastro em produção (spec 007):** aguarda CNPJ (razão social, endereço), número de WhatsApp da empresa e revisão jurídica dos rascunhos em [src/content/legal/](src/content/legal/). Dono também vai registrar a marca AppVidros no INPI. O desenvolvimento das entregas 1–4 não depende disso (Supabase local)
- [ ] `data` (M) **Virada Forte Vidros em produção (spec 007 T019):** ensaiar cutover com export real do dono (contagem de orçamentos, números, soma `grandTotal`, contadores, versão do catálogo, logo em `{account_id}/logo.png`, Início sem linha de trial / Primeiros passos completo). Código e SQL de ensaio com dados sintéticos já feitos

## Later

- [ ] `feat` (M) **Arquivar orçamentos (pausado):** draft em [specs/010-arquivar-orcamentos](specs/010-arquivar-orcamentos/spec.md). Não é necessário agora; revisitar quando a lista pedir. Ideia: filtro Arquivados, grupo inteiro (não revisão isolada), mini botão + long-press
- [ ] `feat` (M) **Cadastro por telefone OTP e Facebook (spec 007 T061/T062):** `signInWithOtp` SMS/WhatsApp + botão Facebook em `EntryScreen`; Twilio/Facebook desligados por padrão no `supabase/config.toml`. Adiado ao fechar a fase 1
- [ ] `feat` **Medidas finais por item (produção):** UI de medidas de produção/conferência por item (seed das medidas do orçamento), junto com plano de corte / módulo de produção. Domínio `finalMeasures` + testes já existem; sem UI até lá (spec 009 US1). Até lá: foto na seção Fotos ou medida correta no item.

- [ ] `ui` (M) **Responsividade fina (~390px):** reavaliar; boa parte resolvida em 2026-10-06
- [ ] `feat` (G) **PWA:** install, cache, uso offline
- [ ] `feat` (P) **Web Share / atalhos mobile** (base Web Share já no PDF desktop/mobile quando o browser permitir)
- [ ] `data` (M) **Botão admin "enviar dados deste navegador"** (IndexedDB local → Supabase)
- [ ] `feat` (M) **Banners do Início: modelos e gatilhos:** depois da Página inicial; novos modelos visuais de banner e regras de quando mostrar (ex.: por data, por uso, por versão). Hoje banners fixos do app
- [ ] `feat` (M) **Tela de novidades do app:** destino do banner "Confira os detalhes das últimas atualizações"; lista do que mudou em cada versão
- [ ] `ui` (P) **Voltar no Android: CloseWatcher:** quando o Chrome estável suportar sem ativação do usuário, trocar as entradas de histórico das janelas por `CloseWatcher` (fica mais simples que contar entradas em `src/nav/navigator.ts`)
- [ ] `ui` (P) **Confirmação de sair sem salvar com visual do app:** hoje Catálogo/Configurações usam `window.confirm` (`useLeaveGuard`); trocar por um diálogo próprio
- [ ] `ui` (P) **Textos dos banners do Início:** os 2 banners em `src/data/banners.ts` são provisórios ("Fale com a gente", "Novidades" → `/novidades`; "plano anual" saiu até a fase 2); o dono revisa os textos e os destinos. "Fale com a gente" ganha destino com `/ajuda` (spec 007, T054)
- [ ] `ui` (M) **Movimento extra:** entrada/saída de cada item na lista, arrastar para fechar janela no celular, animação dos totais. Fora do escopo da spec 004; usar os tokens de movimento

## Fora (por enquanto)

- Sync Google Sheets em runtime
- App nativo (iOS/Android). Ganho conhecido: só app nativo (ex.: Android empacotado com Capacitor) manda o PDF direto ao WhatsApp, sem a folha de compartilhar do sistema; pelo navegador, arquivo só sai por essa folha. A tela de legenda do WhatsApp continua de qualquer jeito

## Done

### 2026-10-28

- [x] `feat` **Porta de correr 1 folha:** um vidro móvel, perfis próprios, Tubo 5x5cm opcional (marcado por padrão) e AL 67 nas portas e janelas de 2 folhas. O perfil entra no catálogo das lojas que abrem o app e na migração SQL
- [x] `ui` **Toque no item abre a edição:** o card do item salvo e o do rascunho abrem o formulário. O item não salvo mostra Rascunho, na mesma cor da tag de orçamento

### 2026-10-22

- [x] `ui` **Fotos: carrossel, zoom e teclado:** setas e arraste entre fotos; toque/clique duplo liga e desliga zoom; pan limitado à moldura; Salvar do item permanece acima do teclado no celular (`visualViewport`)
- [x] `feat` **SaaS fase 1 (spec 007):** conta = loja, RLS por `account_id`, cadastro e-mail/Google + teste 30 dias e modo consulta, catálogo de exemplo + Primeiros passos, Fale com a gente / sugestões, rodapé e excluir conta. Entregas 1–4 + polish docs/testes. Residuais: telefone/Facebook → Later; virada Forte Vidros (T019) e abrir cadastro em produção → Blocked
- [x] `feat` **Condições de pagamento (texto da loja):** Configurações › Orçamento; sai no PDF e no WhatsApp de todo orçamento quando preenchido (spec 008)
- [x] `feat` **Fotos do orçamento:** internas, draft/emitido; até 10 fotos, retenção 6 meses; nunca na proposta; revisão compartilha path; bucket `quote-photos` (spec 009 US2+). Aplicar migração no Supabase antes de usar fotos na nuvem. Medidas finais (US1) adiadas → Later

### 2026-10-15

- [x] `feat` **Suporte no lugar de Ajuda:** `/suporte/:tab` (antigo `/ajuda` ainda abre) com abas Fale com a gente, Dicas (cada dica expansível) e Novidades (um cartão por mês, últimos 6, o mais recente aberto). Ícone de headset; tile do Início "Fale com a gente / Explore dicas e novidades". Visível para todos os papéis. Skill `news-update` mantém `novidades.md`
- [x] `ui` **Configurações › Conta** (antes Cadastro; `/configuracoes/cadastro` ainda abre): opt-in do WhatsApp em "Novidades e ofertas" com a caixa padrão; "Excluir minha conta e dados" no fim da aba, em vermelho discreto, abrindo modal de perigo (digitar EXCLUIR). Saiu do rodapé do Início
- [x] `ui` **Rodapé do Início:** "Última atualização: dd/mm/aaaa · Veja as novidades", sem hash e sem espaço sobrando
- [x] `ui` **Primeiros passos:** barra de progresso em segmentos fixos (um por etapa), marcas verdes nas etapas feitas, cartão não encolhe ao abrir, X fecha direto quando tudo está pronto; texto do "Dispensar" em dois parágrafos
- [x] `ui` **Botões desabilitados legíveis:** sem opacidade; amarelo vira dourado fraco com texto claro (~7:1). Motivo visível abaixo quando a regra não é óbvia (`.btn-reason`, ex.: Enviar sugestão). "Salvar alterações" do item só libera com alguma mudança
- [x] `feat` **Emitir sempre ativo:** sem nome ou sem item, abre "Antes de emitir" dizendo o que falta, com botão para o primeiro (Preencher nome / Adicionar item)
- [x] `fix` **Um aviso por vez no orçamento:** abrir lixeira, remover item ou Emitir fecha os outros avisos. Antes, excluir o rascunho com o aviso do Emitir aberto não saía da tela

### 2026-10-14

- [x] `ui` **Agrupar revisões na lista:** um cartão por número de orçamento (`groupRevisions`, `QuoteList.tsx`) com a revisão mais recente: código e valor, cliente e data, status (texto colorido) e "N revisões". Toque expande as revisões da mais recente para a mais antiga; com uma só, abre direto. Filtros contam grupos. Desktop: cartões com a mesma altura e revisões abrindo por cima das linhas de baixo (fecha com clique fora/Esc); celular empurra a lista
- [x] `ui` **Detalhes do custo no modal do item:** botão abaixo do resumo ao adicionar/editar item; edita preço (só neste orçamento ou catálogo) e mão de obra antes de salvar. Esc fecha só a janela de cima
- [x] `fix` **Box com 1 silicone:** box passa de 1,5 para 1 `SILICONE ACT` (−R$ 10 de custo, −R$ 13 no preço com margem 30%). `boxSiliconeQty` sai do config; o catálogo já salvo perde a chave ao carregar, sem SQL. Rascunhos com box mostram "Atualizar valores"; emitidos não mudam
- [x] `feat` **Pivotante sem alumínios da porta:** caixa "Incluir alumínios da porta" abaixo de "Incluir trinco"; item novo vem com as duas marcadas (melhor sobrar no preço do que esquecer). Desmarcada tira a cantoneira do custo e do detalhamento. Itens antigos seguem com alumínios

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
