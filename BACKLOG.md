# Backlog — AppVidros

Arquivo vivo: features, correções e mudanças de implementação (refactor, testes, performance). Specs de features grandes entram em `specs/`.

**Estratégia:** web desktop primeiro (fluxo completo, catálogo, PDF, qualidade). Responsividade fina + PWA/offline depois.

## Convenções

- **Seções por status:** Now (em andamento) → Next (pronto pra puxar, prioridade de cima pra baixo) → Blocked (aguardando decisão ou insumo) → Later (sem prioridade) → Fora → Done.
- **Linha:** `- [ ] \`tipo\` (P|M|G) **Título:** descrição`. Tipos iguais aos commits: `feat`, `fix`, `ui`, `refactor`, `test`, `perf`, `data`, `docs`. Tamanho: P (horas), M (1–2 dias), G (vários dias, exige spec antes de codar).
- **Puxar:** mover de Next para Now. **Fechar:** remover de Now e adicionar `- [x]` com o resultado visível no topo de Done, sob o cabeçalho da data (`### AAAA-MM-DD`, mais recente primeiro).
- Ideias novas entram em Next/Later, nunca em comentário de código.

---

## Now

- [ ] `docs` (P) **Convite fechado + domínio canônico:** SMTP Resend, `otp_expiry` 86400, templates Invite/Reset e push em `main` (2026-11-03) ok — aguardar build do Pages. Sem migration nova. Próximo: Site URL/Redirect = URL do app (`appvidros.app` se custom domain Active; senão `pages.dev`); Invite `tiagosilva050707@gmail.com`. Bulk Redirect `pages.dev` → canônico opcional. Cadastro público continua desligado. Decisão 2026-10-29 / 2026-11-03
- [ ] `ui` (P) **Textos dos banners do Início:** os 2 banners em `src/data/banners.ts` são provisórios ("Fale com a gente", "Novidades" → `/novidades`; "plano anual" saiu até a fase 2); o dono revisa os textos e os destinos. "Fale com a gente" ganha destino com `/ajuda` (spec 007, T054)

## Next

- [ ] `fix` (G) **Vidro de 10 mm troca o alumínio (precisa de spec):** hoje a espessura não muda o perfil. Na porta de correr, AL 66 e AL 67 entram pelo subtipo (P1F usa AL 67 na altura; 2 folhas usam AL 66). Com vidro de 10 mm, onde entra AL 66 passa a AL 67, e onde entra AL 67 entra um alumínio mais grosso, que recebe esse vidro. A spec lista cada item e cada código (o dono passa na hora). Catálogo novo ganha o perfil; catálogo já gravado não muda sozinho. Rascunho com 10 mm mostra "Atualizar valores"; emitido não muda. Pedido 2026-11-06
- [ ] `feat` (G) **Tipo e subtipo antes do formulário (precisa de spec):** o modal "Tipo do item" deixa de ser fileira de chips. Cada família é uma faixa larga (nome + desenho); toque abre os subtipos embaixo, no mesmo gesto do card de orçamento ("N revisões"): no celular empurra a lista, no computador abre por cima. A escolha cai direto nas medidas. Tipo e subtipo saem do formulário. Correr já tem J2F, J4F, P1F, P2F e P4F. Box abre Box padrão (o de hoje), Box até o teto e Box de canto quando esses dois existirem. Desenho vem do item de imagens. Pedido 2026-11-06
- [ ] `feat` (G) **Box até o teto e box de canto (precisa de spec):** dois itens novos, além do box atual (passa a "Box padrão" no seletor). Fórmulas, materiais e medidas o dono fecha na spec. Entram no seletor de tipo. Pedido 2026-11-06
- [ ] `feat` (G) **Teto mensal de orçamentos por plano (precisa de spec):** separa quem trabalha sozinho de vidraçaria. Inicial: 60 orçamentos no mês (cerca de 3 por dia útil; 4 por dia dariam ~70, o teto fica em 60). Pró: 150 (vidraçaria pequena). Ultra / corporativo: 500. A spec estuda o custo antes de cravar os números: criar, emitir, PDF e cada requisição, para ver até onde o preço do plano cobre. Em aberto: revisão entra no teto ou não. Liga com **SaaS fase 2**. Pedido 2026-11-06
- [ ] `docs` (M) **Benchmark VidroGestor:** [vidrogestor.com.br/#planos](https://vidrogestor.com.br/#planos). Mapa do que agregar, sem copiar texto, imagem ou layout. Forte deles: orçamento por m² ou por material; desenho do vão; corte do vidro com folga e furo para têmpera; perfil com medida, ângulo e barras de 6 m; PDF com logo em três modelos; contrato, recibo e ordem de serviço; pedido de vidro e lista de compra; plano de corte; linhas Suprema, Gold, Gold Slim, Inova, 20 e 30; agenda, financeiro e clientes; R$ 59,90/mês ou R$ 497/ano, orçamentos ilimitados, Pix ou cartão, sem fidelidade. A FAQ responde e em seguida vende o diferencial. A gente já calcula por material com margem e manda PDF no WhatsApp; eles cobrem a obra depois do orçamento e vendem ilimitado barato. Pedido 2026-11-06
- [ ] `feat` (G) **Três modelos de PDF (precisa de spec):** o VidroGestor imprime o orçamento em três formatos; um chamou mais atenção (marcar qual na spec, com print). Adaptar a ideia ao PDF atual (logo da loja, sem custo nem margem para o cliente). Depende do benchmark. Pedido 2026-11-06
- [ ] `data` (M) **Desenhos dos itens, referência VidroGestor:** redesenhar os SVGs em `assets/item-images` olhando os desenhos deles como referência de construção. Arte nossa, não o arquivo deles. O seletor de tipo mostra esses desenhos. Pedido 2026-11-06
- [ ] `feat` (G) **Landing de oferta (precisa de spec):** página pública de venda, no espírito da página deles (promessa, para quem é, planos, FAQ). Textos nossos. Depende do benchmark e dos planos (teto mensal e fase 2). Pedido 2026-11-06
- [ ] `feat` (M) **Perguntas frequentes de venda:** respostas curtas que tiram a dúvida e mostram o que o AppVidros faz bem (celular na obra, PDF no WhatsApp, preços da própria loja). Na landing e, se couber, em Suporte. Perguntas nossas, não as deles. Pedido 2026-11-06
- [ ] `feat` (G) **Usuário no Cadastro (precisa de spec):** seção expansível "Usuário" em Configurações › Conta com nome e telefone de quem usa o app. Futuro: orçamento guarda o vendedor na emissão e o PDF mostra nome e telefone dele (loja com vários vendedores). Decidir: perfil por usuário (Supabase `user_metadata` ou tabela `profiles` + RLS; IndexedDB no modo local), vendedor hoje não abre Configurações (tela própria "Meu perfil" ou aba liberada), snapshot no `Quote` ao emitir, linha no PDF
- [ ] `feat` (G) **SaaS fase 2: planos e cobrança (precisa de spec):** planos (ex.: mensal/anual), preços, cobrança no app (Pix, cartão, boleto), nota fiscal, régua de atraso. Fim do pagamento cai no mesmo modo consulta da fase 1 ([spec 007](specs/007-saas-vidracarias/spec.md)). Liga com o banner "plano anual" do Início. Tetos 60 / 150 / 500 estão em **Teto mensal de orçamentos por plano**
- [ ] `feat` (G) **Painel do provedor (precisa de spec):** front-end/plataforma do dono do SaaS para operar as contas: suporte (responder sugestões, conversa pelo app), assinaturas (liberar até uma data, renovar, cancelar), mais dias de teste, descontos e cupons, banners do Início, versões publicadas (deploys) e outras ferramentas de operação. Substitui a ferramenta interna da fase 1 (FR-018, FR-026, FR-028 da [spec 007](specs/007-saas-vidracarias/spec.md))
- [ ] `feat` (M) **Reconquista após o teste:** quem não assina depois dos 30 dias e consentiu recebe oferta pelo WhatsApp (ex.: 50% nos 3 primeiros meses, ou primeiro mês por R$ 1,99 com assinatura no cartão). Depende da fase 2 (cartão) e do painel do provedor. Ordem dos contatos: primeiro um lembrete de valor sem falar de pagamento (ex.: orçamentos prestes a vencer), depois a assinatura, por fim o desconto. A longo prazo, CRM com régua de contato (ativação no teste, vencimento, reconquista)
- [ ] `feat` (P) **Alterar senha em Configurações › Conta:** quem entrou com e-mail/senha troca a senha logado (`updateUser`), sem o link de "Esqueci a senha". Fora do escopo do convite; entra depois do SMTP/convite do tester. Pedido 2026-10-29
- [ ] `feat` (M) **Autônomo: nome da pessoa, não "loja" (precisa de spec curta):** no cadastro/"Sua vidraçaria" e nos Primeiros passos, quem trabalha sozinho informa o próprio nome (e WhatsApp); PDF, WhatsApp e textos do app usam esse nome no lugar de "vidraçaria/loja". Hoje `marginMode: autonomo` só muda preço (sem margem); o rótulo e o `establishment.name` ainda falam loja. Decidir: escolha explícita no setup (loja vs autônomo) vs inferir do modo de margem; se logo/endereço ficam opcionais. Pedido 2026-11-03
- [ ] `feat` (M) **Atalho na tela do celular (sem loja):** passo no app (Primeiros passos ou Suporte › Dicas) ensina a abrir o AppVidros direto, sem a barra do navegador e sem Play Store nem App Store. Android, no Chrome: "Instalar app" ou "Adicionar à tela inicial". iPhone: também dá, só pelo Safari (Compartilhar → Adicionar à Tela de Início); o Chrome do iPhone não instala. Manifest mínimo (`name`, ícone, `display: standalone`, `start_url`) para o atalho abrir em tela cheia. Offline continua na task **PWA** (Later). Ícone: quadrado verde-escuro com AV dourado, o mesmo do favicon. Pedido 2026-11-03 e 2026-11-06
- [ ] `docs` (P) **E-mails de segurança (Supabase Auth):** ligar e brandear as notificações Security (hoje todas off): senha alterada, e-mail alterado, telefone alterado, método de entrada ligado/removido, MFA adicionado/removido. Templates no painel Auth, cara AppVidros. Pedido 2026-11-03
- [ ] `docs` (P) **Outros templates de Auth:** além de Invite e Reset, brandear Confirm sign up, Magic link/OTP, Change email, Reauthentication (lista Authentication → Emails → Templates). Confirm sign up só importa se "Confirm email" ligar. Pedido 2026-11-03
- [ ] `docs` (M) **Caixas corporativas AppVidros:** endereços no domínio `appvidros.app` (ex.: `suporte@`, `financeiro@`, `novidades@`, `noreply@` já via Resend em `mail.appvidros.app`, interno). Decidir provedor (Google Workspace, Cloudflare Email Routing + caixa, etc.), quem lê cada uma, e o que vai no rodapé/legal/CNPJ. Pedido 2026-11-03; liga com Abrir cadastro / CNPJ
- [ ] `feat` (P) **Novidades no WhatsApp, uma vez por mês:** no primeiro dia útil do mês, quem marcou "Quero receber novidades e ofertas" recebe as novidades do mês anterior, ou o link de Suporte › Novidades. A caixa nasce desmarcada (FR-005, termos 7.2). Disparo manual até o painel do provedor. Decisão 2026-10-29
- [ ] `feat` (G) **Membros da org (precisa de spec):** convite para entrar numa org que já existe, papéis Admin e Standard, e gestão (listar, mudar papel, remover). Standard é o papel restrito (hoje `vendedor`, dormente): orça; catálogo, margem, cadastro da loja e excluir conta ficam com o Admin. Org nova continua sendo "Sua vidraçaria" ou o convite do operador, fora desta spec. A virada da Forte não espera isto: os dois donos já nascem Admin. Mudar o que cada papel grava exige RLS. Liga com **Usuário no Cadastro**. Decisão 2026-10-29; pedido de papéis 2026-10-15
- [ ] `feat` (G) **Frete automático por km (precisa de spec):** pedido do dono 2026-10-10. Calcula o frete a partir do CEP da loja (Cadastro) e do CEP do cliente, × custo por km configurável (padrão R$ 2,00/km), e entra no orçamento como custo adicional editável. Decidir: ida ou ida e volta, valor mínimo, arredondamento, distância de rota vs linha reta, serviço de CEP → coordenadas e de rota (BrasilAPI/ViaCEP + OSRM/OpenRouteService/Google; custo e limite de uso), sem CEP do cliente (fica manual). Hoje: Frete digitado como custo adicional comum
- [ ] `data` (M) **Backup/restauração de orçamentos** (export IndexedDB/JSON). Prioridade baixa: produção usa Supabase

## Blocked

- [ ] `docs` (P) **Abrir cadastro em produção (spec 007):** aguarda CNPJ (razão social, endereço), número de WhatsApp da empresa e revisão jurídica dos rascunhos em [src/content/legal/](src/content/legal/). Dono também vai registrar a marca AppVidros no INPI. O desenvolvimento das entregas 1–4 não depende disso (Supabase local). Ao ligar o cadastro, `otp_expiry` volta para 3600 (1 hora); o convite fechado usa 24 h só enquanto o cadastro estiver desligado. Decisão 2026-10-29

## Later

- [ ] `feat` (M) **Arquivar orçamentos (pausado):** draft em [specs/010-arquivar-orcamentos](specs/010-arquivar-orcamentos/spec.md). Não é necessário agora; revisitar quando a lista pedir. Ideia: filtro Arquivados, grupo inteiro (não revisão isolada), mini botão + long-press
- [ ] `feat` (M) **Cadastro por telefone OTP e Facebook (spec 007 T061/T062):** `signInWithOtp` SMS/WhatsApp + botão Facebook em `EntryScreen`; Twilio/Facebook desligados por padrão no `supabase/config.toml`. Adiado ao fechar a fase 1
- [ ] `feat` **Medidas finais por item (produção):** UI de medidas de produção/conferência por item (seed das medidas do orçamento), junto com plano de corte / módulo de produção. Domínio `finalMeasures` + testes já existem; sem UI até lá (spec 009 US1). Até lá: foto na seção Fotos ou medida correta no item.

- [ ] `ui` (M) **Responsividade fina (~390px):** reavaliar; boa parte resolvida em 2026-10-06
- [ ] `feat` (G) **PWA:** manifest, ícone, install, cache, uso offline. O guia "instalar no celular" nos Primeiros passos (Next) pode usar um PWA mínimo antes do offline completo
- [ ] `feat` (P) **Web Share / atalhos mobile** (base Web Share já no PDF desktop/mobile quando o browser permitir)
- [ ] `data` (M) **Botão admin "enviar dados deste navegador"** (IndexedDB local → Supabase)
- [ ] `feat` (M) **Banners do Início: modelos e gatilhos:** depois da Página inicial; novos modelos visuais de banner e regras de quando mostrar (ex.: por data, por uso, por versão). Hoje banners fixos do app
- [ ] `ui` (P) **Voltar no Android: CloseWatcher:** quando o Chrome estável suportar sem ativação do usuário, trocar as entradas de histórico das janelas por `CloseWatcher` (fica mais simples que contar entradas em `src/nav/navigator.ts`)
- [ ] `ui` (M) **Movimento extra:** entrada/saída de cada item na lista, arrastar para fechar janela no celular, animação dos totais. Fora do escopo da spec 004; usar os tokens de movimento

## Fora (por enquanto)

- Sync Google Sheets em runtime
- App nativo (iOS/Android). Ganho conhecido: só app nativo (ex.: Android empacotado com Capacitor) manda o PDF direto ao WhatsApp, sem a folha de compartilhar do sistema; pelo navegador, arquivo só sai por essa folha. A tela de legenda do WhatsApp continua de qualquer jeito

## Done

### 2026-11-07

- [x] `feat` **Vidro fixo 6 e 8 mm:** AL 66 no perímetro, `teto(2×largura + 2×altura, 500 mm)`. 10 mm segue sem perfil. Orçamento já salvo não recalcula sozinho
- [x] `ui` **Preço faltando:** aviso numa linha, Inserir no pé do card. Lista de custo permanece; a linha sem preço fica vermelha e zerada. Detalhes do custo não abre enquanto faltar preço

### 2026-11-06

- [x] `ui` **Tela Preços:** menu, Início, título e endereço `/precos`. O antigo `/catalogo` ainda abre e a barra troca. Avisos falam "sem preço cadastrado"
- [x] `ui` **Novo orçamento no computador:** à direita do filtro, no topo da lista. No celular segue na barra de baixo
- [x] `ui` **Ícone AV:** a imagem dourada no verde é o favicon da aba e o ícone do atalho no celular
- [x] `docs` **Backlog:** fase 1 do SaaS saiu de Now (entregas e virada já estavam em Done). Tela de novidades saiu de Later (já existe em Suporte › Novidades)

### 2026-11-03

- [x] `ui` **Títulos dos cards do Início na mesma altura:** logo abaixo do ícone, com três linhas de resumo reservadas mesmo vazias. O ! de Configurações continua no canto
- [x] `ui` **AppVidros no cabeçalho volta ao Início**
- [x] `ui` **Suporte › Dicas mostra os primeiros passos de novo:** o card volta no Início; tarefa e preço já feitos ficam. Os cards da aba ficam com o mesmo espaço
- [x] `ui` **Preço faltando no item:** aviso vermelho com tremer; inserir preço (modal) ou ir ao catálogo com busca e linha; espessura/cor sem preço continuam selecionáveis; card verde ao salvar; X nos avisos ok; item novo/duplicado pisca a borda; card emitido igual ao rascunho sem os botões

### 2026-10-29

- [x] `data` **Virada Forte Vidros em produção (spec 007 T019):** a migração já estava aplicada. Conta `5f6f9bd5-6a95-4f18-8552-12d2c48044d5`, Forte Vidros, `active`, sem prazo. 45 orçamentos (37 emitidos, 8 rascunhos), soma `grandTotal` 115685.85, último `ORC-2026-0046`, contador 2026 = 46, catálogo 2026-10-28 sem preço de exemplo. `luiz5001@hotmail.com` e `edvaldo.eng@gmail.com` admin nessa conta. Logo em `{id}/logo.png` no Storage. Dono conferiu o app
- [x] `feat` **Convite fechado abre Nova senha:** link com `type=invite` ou `type=recovery` cai em "Nova senha" e, sem conta, em "Sua vidraçaria" (teste de 30 dias). SMTP e prazo de 24 h ficam no painel
- [x] `ui` **Fechar aviso de sucesso:** X à direita em "Valores atualizados" no orçamento, no preço inserido pelo item, no catálogo salvo, nas configurações salvas, no detalhe do custo e na sugestão enviada. Some só nesta visita; um catálogo novo volta a avisar

### 2026-10-28

- [x] `ui` **Sair sem salvar usa o diálogo do app:** Catálogo, Configurações e a sugestão do Suporte perguntam com Sim/Não. Cancelar fica na tela com a edição
- [x] `feat` **Porta de correr 1 folha:** um vidro móvel, perfis próprios, Tubo 5x5cm opcional (marcado por padrão) e AL 67 nas portas e janelas de 2 folhas. Catálogo novo nasce com o tubo a R$ 210. Catálogo já gravado não muda
- [x] `ui` **Toque no item abre a edição:** o card do item salvo e o do rascunho abrem o formulário. O item não salvo mostra Rascunho, na mesma cor da tag de orçamento
- [x] `feat` **Duplicar item:** cópia logo abaixo, mesmos parâmetros, preço recalculado. O lápis saiu porque o card já abre a edição

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
