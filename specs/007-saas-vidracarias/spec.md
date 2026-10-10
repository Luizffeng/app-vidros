# Feature Specification: App Vidros como SaaS para vidraçarias (fase 1: conta própria e teste grátis)

**Feature Branch**: `007-saas-vidracarias`

**Created**: 2026-10-10

**Status**: Draft (clarificado 2026-10-10)

**Input**: Backlog, decidido pelo dono em 2026-10-09: "o app vira SaaS, priorizando simplicidade e experiência para um público pouco adepto de tecnologia. Spec própria: cadastro de loja e conta (sem atrito), várias lojas isoladas (dados, catálogo, logo por loja), planos (ex.: mensal/anual) e cobrança, período de teste, catálogo inicial por loja, migração da Forte Vidros como primeira loja, suporte. Liga com **Login, contas e autorização** e com o banner 'plano anual' do Início."

## Clarifications

### Session 2026-10-10

- Q: Escopo da primeira entrega? → A: Em fases. Fase 1 (esta spec): criar conta e teste grátis. Fase 2 (spec futura): planos e cobrança. Não há "loja com membros": cada conta é a sua própria loja. Quem quiser que outra pessoa use a mesma loja compartilha o login.
- Q: Quantas pessoas por loja? → A: Uma conta = uma loja = um usuário (dono ou autônomo). Vendedores e convites ficam para depois.
- Q: O que a loja vê quando o teste acaba (ou o período contratado vence)? → A: Continua vendo, baixando e reenviando orçamentos antigos. "Novo orçamento" e "Revisar" não criam nada: abrem um aviso com o vencimento e a sugestão de assinar ou renovar. Nem rascunho é criado.
- Q: Catálogo de uma loja nova? → A: Começa com um catálogo de exemplo com preços redondos (ex.: 140,00, 90,00, 230,00, 35,00) e próximos dos preços reais de mercado, para que os primeiros orçamentos façam sentido mesmo se o usuário não ajustar os preços. O app guia o usuário a cadastrar primeiro os itens e preços mais importantes (User Story 2).
- Q: Como a pessoa cria a conta? → A: Oferecer o máximo de opções para facilitar: Google, e-mail e senha, telefone (código por SMS ou WhatsApp), Facebook.
- Q: Duração do teste grátis? → A: 30 dias. Objetivo: o usuário se acostumar com o app e sentir falta dele quando o teste vencer.
- Q: Como é o suporte? → A: Relação próxima e direta com o cliente, pelo app ou pelo WhatsApp, com gente respondendo rápido. Conversa nunca expira nem se perde. Sugestões dos clientes são ouvidas e respondidas.
- Q: Quando avisar do vencimento? → A: A partir de 7 dias antes, e também depois de vencer. Depois do vencimento, o primeiro contato não fala de pagamento: usa gatilhos de valor (ex.: orçamentos do usuário prestes a vencer) para trazê-lo de volta ao app, e só depois volta a oferecer a assinatura.
- Q: E quem não assina depois do teste? → A: Recebe uma oferta de reconquista (ex.: 50% nos 3 primeiros meses, ou primeiro mês por R$ 1,99 com assinatura no cartão), por exemplo pelo WhatsApp. A oferta automática depende da cobrança (fase 2) e do painel do provedor (spec própria); a fase 1 deixa a base pronta (consentimento e lista de contas a contatar).

## Contexto

Hoje o app atende uma só vidraçaria (Forte Vidros). Todos os logins enxergam o mesmo catálogo, as mesmas configurações e os mesmos orçamentos. Contas são criadas à mão, sem cadastro público. Existem papéis admin e vendedor, mas o vendedor já foi desativado por decisão de 2026-10-09.

Objetivo da fase 1: qualquer vidraceiro entra no site, cria a conta em poucos toques, ganha 30 dias de teste, monta o essencial do catálogo com ajuda do app, emite o primeiro orçamento e tem com quem falar sempre que precisar. Cada conta enxerga somente os próprios dados. A Forte Vidros vira a primeira conta, sem perder nada.

Público: vidraceiros e autônomos com pouca intimidade com tecnologia, usando o celular em campo. Cada passo precisa ser óbvio, com texto curto e sem termos técnicos. O atendimento é diferencial do produto: a maioria dos sistemas responde tarde, deixa o chamado expirar ou não responde.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar a conta e começar o teste grátis (Priority: P1)

Um vidraceiro abre o app pela primeira vez (link, anúncio, indicação). A tela inicial explica em uma frase o que o app faz e oferece "Criar conta grátis" e "Já tenho conta". Ele escolhe como entrar (Google, e-mail e senha, telefone ou Facebook), informa o nome da vidraçaria e o WhatsApp da loja, aceita os termos com um toque e cai direto no app, com os 30 dias de teste já valendo.

**Why this priority**: sem cadastro aberto não existe SaaS. É a porta de entrada de toda loja nova.

**Independent Test**: em um aparelho sem sessão, criar uma conta por cada método disponível e conferir que cada uma entra no app com teste ativo e dados vazios (só o catálogo de exemplo).

**Acceptance Scenarios**:

1. **Given** visitante sem conta, **When** toca "Criar conta grátis" e escolhe Google, **Then** depois de autorizar no Google pede só nome da vidraçaria e WhatsApp, e abre o Início com o teste ativo.
2. **Given** visitante sem conta, **When** escolhe e-mail e senha, **Then** pede e-mail, senha (com opção de mostrar), nome da vidraçaria e WhatsApp, e abre o Início sem exigir confirmação de e-mail antes de usar.
3. **Given** visitante sem conta, **When** escolhe telefone, **Then** recebe um código por SMS ou WhatsApp, digita o código e segue para nome da vidraçaria.
4. **Given** pessoa que já tem conta com um e-mail, **When** tenta criar outra conta com o mesmo e-mail por outro método (ex.: Google), **Then** o app entra na conta existente em vez de criar uma segunda.
5. **Given** cadastro concluído, **When** abre o Início, **Then** vê quantos dias de teste restam, de forma discreta.
6. **Given** pessoa que esqueceu a senha, **When** toca "Esqueci a senha", **Then** recebe um link ou código para criar senha nova e volta ao app já logada.
7. **Given** tela de cadastro, **When** o usuário vê a opção "Quero receber novidades e ofertas pelo WhatsApp", **Then** ela vem explicada em uma linha e o cadastro funciona marcando ou não.

---

### User Story 2 - Primeiros passos: deixar o catálogo pronto para orçar (Priority: P1)

Uma conta nova começa com um catálogo de exemplo (vidros, ferragens, perfis e mão de obra) para o app funcionar de imediato. Os preços são redondos (ex.: 140,00, 90,00, 230,00, 35,00) e próximos dos preços reais de mercado, para que um orçamento feito sem ajustar nada já traga valores que fazem sentido. No Início, um cartão "Primeiros passos" mostra uma lista curta de tarefas, com progresso (ex.: "2 de 5"). Cada tarefa abre uma tela focada só nos campos daquela tarefa, em linguagem simples, e volta para a lista ao salvar:

1. **Sua loja**: nome, WhatsApp, endereço e logo (logo opcional).
2. **Seus vidros**: colocar o preço do m² dos vidros que mais vende.
3. **Suas ferragens e perfis**: colocar o preço dos kits mais usados (box, janela de correr).
4. **Mão de obra e margem**: confirmar ou ajustar.
5. **Seu primeiro orçamento**: criar um orçamento de teste e ver o PDF.

Preço de exemplo ainda não confirmado aparece marcado como "exemplo" no catálogo. O cartão some quando todas as tarefas estão feitas ou quando o usuário toca "Dispensar".

**Why this priority**: preço errado no orçamento é o pior primeiro contato possível. O usuário precisa sentir que o app já é "dele" antes de mandar orçamento para cliente.

**Independent Test**: em conta nova, seguir o cartão do início ao fim e conferir que cada tarefa marca concluída, que os preços confirmados perdem a marca "exemplo" e que o cartão some no fim.

**Acceptance Scenarios**:

1. **Given** conta nova, **When** abre o Início, **Then** o cartão "Primeiros passos" aparece acima dos módulos com "0 de 5".
2. **Given** conta nova, **When** abre o catálogo, **Then** todos os preços são valores redondos marcados "exemplo".
3. **Given** conta nova sem nenhum preço ajustado, **When** orça um box padrão e uma janela de correr comuns, **Then** os totais ficam dentro da faixa de preço real de mercado definida pelo dono.
4. **Given** tarefa "Seus vidros" aberta, **When** confirma os preços sem mudar nada, **Then** a tarefa fica concluída e os preços deixam de ser "exemplo".
5. **Given** orçamento com item que usa preço ainda "exemplo", **When** vai emitir, **Then** o app avisa que há preço de exemplo e oferece revisar antes, sem bloquear.
6. **Given** usuário tocou "Dispensar", **When** volta ao Início, **Then** o cartão não aparece mais; as tarefas pendentes continuam acessíveis em Configurações.
7. **Given** todas as tarefas concluídas, **When** abre o Início, **Then** o cartão some.

---

### User Story 3 - Cada conta vê somente os seus dados (Priority: P1)

Duas vidraçarias usam o app ao mesmo tempo. Cada uma tem o próprio catálogo, configurações, logo, orçamentos e numeração de orçamentos. Nenhuma ação de uma afeta ou revela dados da outra.

**Why this priority**: vazar orçamento ou preço de uma loja para outra destrói a confiança no produto e fere a LGPD.

**Independent Test**: com duas contas, editar catálogo, logo e configurações e emitir orçamentos em cada uma; conferir que nada aparece na outra, inclusive tentando acessar endereço de orçamento da outra conta.

**Acceptance Scenarios**:

1. **Given** contas A e B, **When** A muda o preço de um vidro, **Then** o catálogo de B não muda.
2. **Given** contas A e B, **When** cada uma emite o primeiro orçamento, **Then** cada uma recebe o próprio primeiro número da sua sequência.
3. **Given** link de um orçamento da conta A, **When** a conta B abre esse link, **Then** vê "Orçamento não encontrado", sem nenhum dado de A.
4. **Given** contas A e B, **When** A troca o logo, **Then** o PDF de B continua com o logo de B.

---

### User Story 4 - Forte Vidros vira a primeira conta, sem perder nada (Priority: P1)

Na virada para o SaaS, todos os dados atuais (orçamentos, catálogo e versões de preço, configurações, logo e sequência de números) passam a pertencer à conta da Forte Vidros. O dono entra com o mesmo login de hoje e encontra tudo igual.

**Why this priority**: a Forte Vidros usa o app em produção; perder ou embaralhar orçamentos é inaceitável.

**Independent Test**: comparar antes e depois da virada: mesma quantidade de orçamentos, mesmos totais e números, mesmo catálogo, mesmo logo; o próximo orçamento continua a sequência.

**Acceptance Scenarios**:

1. **Given** dados de produção antes da virada, **When** o dono entra depois da virada, **Then** vê os mesmos orçamentos, com os mesmos números e totais.
2. **Given** último número emitido N, **When** emite o próximo após a virada, **Then** recebe o número seguinte da sequência atual.
3. **Given** conta da Forte Vidros, **When** a virada termina, **Then** ela não passa por teste nem por "Primeiros passos" e fica ativa sem prazo até a fase 2.

---

### User Story 5 - Fale com a gente: atendimento próximo, sem chamado que expira (Priority: P1)

De qualquer tela, o usuário chega a "Fale com a gente" em no máximo dois toques (menu, rodapé do Início, aviso de vencimento). Lá escolhe:

- **Conversar no WhatsApp**: abre conversa direta com o suporte, com mensagem inicial que já identifica a conta. Quem responde é uma pessoa. A conversa fica no WhatsApp do usuário e nunca expira.
- **Mandar uma sugestão**: campo de texto curto ("O que faria o app melhor para você?"), enviado com a conta identificada. O usuário vê suas sugestões enviadas e a resposta de quem atende, no próprio app.

Quando uma sugestão vira melhoria, o usuário fica sabendo ("Você pediu, a gente fez") nas Novidades da versão e na própria sugestão.

**Why this priority**: o público é pouco técnico e trava fácil; um atendimento rápido e humano é o que segura o cliente no teste e é diferencial contra sistemas que demoram, deixam o chamado expirar ou não respondem.

**Independent Test**: de três telas diferentes, chegar a "Fale com a gente" em até dois toques; abrir o WhatsApp e conferir a mensagem inicial; enviar uma sugestão, responder pelo lado do suporte e conferir a resposta no app dias depois.

**Acceptance Scenarios**:

1. **Given** qualquer tela do app, **When** o usuário procura ajuda, **Then** chega a "Fale com a gente" em até dois toques.
2. **Given** "Fale com a gente" aberto, **When** toca "Conversar no WhatsApp", **Then** abre o WhatsApp com mensagem que inclui o nome da loja e o identificador da conta.
3. **Given** sugestão enviada, **When** o suporte responde, **Then** o usuário vê a resposta no app, mesmo semanas depois, sem precisar reabrir nada.
4. **Given** sugestão marcada como feita pelo suporte, **When** sai a versão com a melhoria, **Then** a sugestão mostra "Feito" e as Novidades citam a melhoria.
5. **Given** fora do horário de atendimento, **When** abre "Fale com a gente", **Then** vê o horário e quando costuma receber resposta, sem promessa irreal.

---

### User Story 6 - Teste ou período vencido: consultar à vontade, assinar para orçar (Priority: P2)

Quando o teste de 30 dias acaba, ou o período contratado vence (na fase 1 o pagamento é combinado pelo WhatsApp e o operador libera a conta até uma data), a conta entra em modo consulta: lista, abertura, PDF e reenvio de orçamentos antigos continuam funcionando. Tocar "Novo orçamento" ou "Revisar" não cria nada, nem rascunho: abre um aviso com a data do vencimento ("Seu teste grátis terminou em 12/11" ou "Sua assinatura venceu em 12/11") e o convite para assinar ou renovar, com o botão principal "Quero assinar" (ou "Renovar") e "Falar com a gente".

**Why this priority**: necessário para o teste ter fim, mas só pesa depois que as primeiras contas completam os 30 dias.

**Independent Test**: com uma conta de teste vencido e outra de assinatura vencida, conferir o que funciona, que nenhum rascunho nasce, o texto de cada aviso e para onde vão os botões; depois liberar as contas e conferir que tudo volta.

**Acceptance Scenarios**:

1. **Given** faltam 7 dias ou menos de teste, **When** abre o Início, **Then** vê aviso com os dias restantes e "Quero assinar".
2. **Given** teste vencido, **When** toca "Novo orçamento", **Then** abre o aviso "Seu teste grátis terminou em {data}" com "Quero assinar" e "Falar com a gente"; nenhum rascunho é criado e a lista não muda.
3. **Given** assinatura manual vencida, **When** toca "Revisar" em um emitido, **Then** abre o aviso "Sua assinatura venceu em {data}" com "Renovar"; nenhuma revisão é criada.
4. **Given** conta vencida, **When** fecha o aviso, **Then** volta para onde estava, sem nenhuma mudança.
5. **Given** teste vencido, **When** abre um orçamento emitido, **Then** consegue baixar o PDF e enviar pelo WhatsApp.
6. **Given** teste vencido com rascunhos, **When** abre um rascunho, **Then** vê o conteúdo, sem editar nem emitir.
7. **Given** conta liberada pelo operador até uma nova data, **When** o usuário reabre o app, **Then** volta a criar e emitir normalmente.
8. **Given** conta vencida há alguns dias, com emitidos que vencem nos próximos 7 dias, **When** o operador consulta a lista de contas a contatar, **Then** vê essa conta com a quantidade de orçamentos vencendo, para um primeiro contato do tipo "3 orçamentos seus vencem esta semana", sem falar de pagamento.

Depois do vencimento, os contatos seguem uma ordem: primeiro um lembrete de valor que traz a pessoa de volta ao app (orçamentos prestes a vencer, clientes esperando resposta), e só num contato seguinte a oferta de assinatura (e, quando existir, a de reconquista com desconto). Na fase 1 esses contatos são manuais, a partir da lista do FR-028.

---

### User Story 7 - Termos, privacidade e excluir conta (Priority: P2)

Abaixo dos blocos do Início, ao rolar, um rodapé discreto com: Fale com a gente, Novidades da versão, Termos de uso, Política de privacidade, Excluir minha conta e dados, dados do fornecedor (razão social, CNPJ, endereço) e versão do app.

**Why this priority**: termos e privacidade são exigência para cadastro aberto.

**Independent Test**: no Início, rolar até o rodapé e abrir cada link; excluir uma conta de teste e conferir que os dados somem e o login deixa de funcionar.

**Acceptance Scenarios**:

1. **Given** Início no celular de 360 × 640, **When** abre, **Then** carrossel e blocos cabem sem rolar e o rodapé fica abaixo, visível ao rolar.
2. **Given** usuário toca "Excluir minha conta e dados", **When** confirma digitando ou tocando em uma confirmação explícita, **Then** a conta e todos os dados dela são apagados, a sessão encerra e o app mostra a tela de entrada.

---

### Edge Cases

- Mesma pessoa entra por métodos diferentes com o mesmo e-mail (Google e e-mail/senha): é a mesma conta. Telefone sem e-mail é uma conta própria; vincular métodos depois fica fora da fase 1.
- Pessoa cria duas contas para a mesma loja por engano: suporte resolve manualmente (fora do app na fase 1).
- Sem internet no momento do cadastro: o app avisa que precisa de conexão para criar a conta; nada fica pela metade.
- Código por SMS/WhatsApp não chega: oferecer reenviar após alguns segundos e trocar para outro método.
- Teste vence com o usuário no meio de um rascunho: o que já foi salvo fica guardado; a próxima ação de salvar mostra o aviso de vencimento sem perder o que estava na tela.
- Orçamento emitido durante o teste continua imutável e acessível depois do teste (regra de imutabilidade).
- Sem internet ao enviar uma sugestão: o texto não se perde; o app avisa e permite tentar de novo.
- Usuário não marcou "receber novidades e ofertas": não recebe oferta de reconquista nem mensagem de marketing; mensagens de serviço (vencimento, resposta a sugestão) continuam no app.
- Logins extras existentes da Forte Vidros (ex.: contas de vendedor criadas antes): passam a apontar para a conta da Forte Vidros ou são desativados, a decidir com o dono na virada.
- Banners do Início que falam de "plano anual" não podem prometer o que ainda não existe: até a fase 2, o texto fala de assinatura pelo suporte ou sai do carrossel.
- Modo local (sem Supabase configurado) continua funcionando para desenvolvimento, como uma conta única sem teste.

## Requirements *(mandatory)*

### Functional Requirements

**Entrada e conta**

- **FR-001**: O app MUST ter cadastro público, acessível sem convite, a partir da tela de entrada.
- **FR-002**: O app MUST permitir criar conta e entrar com Google e com e-mail e senha (fase 1, obrigatório).
- **FR-003**: O app SHOULD permitir criar conta e entrar com telefone (código por SMS ou WhatsApp) e com Facebook; podem chegar depois de FR-002 sem bloquear a fase 1.
- **FR-004**: O cadastro MUST pedir somente: método de entrada, nome da vidraçaria, WhatsApp da loja e aceite dos termos e da política de privacidade. Demais dados ficam para "Primeiros passos".
- **FR-005**: O cadastro MUST oferecer, desmarcado por padrão, "Quero receber novidades e ofertas pelo WhatsApp", e guardar a escolha com data; o usuário MUST poder mudar depois em Configurações.
- **FR-006**: O app MUST permitir recuperar acesso de conta com senha ("Esqueci a senha").
- **FR-007**: Contas com o mesmo e-mail MUST ser a mesma conta, qualquer que seja o método usado.
- **FR-008**: A sessão MUST continuar ativa no celular entre aberturas do app até o usuário sair.

**Conta = loja**

- **FR-009**: Cada conta MUST ter seus próprios orçamentos, catálogo (com versões de preço), configurações, logo e sequência de números de orçamento.
- **FR-010**: Nenhuma conta MUST conseguir ler, alterar ou apagar dados de outra, mesmo acessando endereços ou chamadas diretamente; a trava MUST valer no servidor, não só na tela.
- **FR-011**: Todos os usuários MUST ter acesso completo à própria conta (orçamentos, catálogo, configurações). O papel Vendedor MUST ficar fora da interface e das regras de acesso desta fase.

**Catálogo inicial e primeiros passos**

- **FR-012**: Conta nova MUST começar com um catálogo de exemplo completo o bastante para orçar todos os tipos de item, com preços redondos (ex.: 140,00, 90,00, 230,00, 35,00) próximos dos preços reais de mercado, de modo que orçamentos feitos sem ajuste tragam totais plausíveis.
- **FR-013**: Preços do catálogo de exemplo MUST aparecer marcados como "exemplo" até o usuário confirmá-los ou alterá-los.
- **FR-014**: O Início MUST mostrar o cartão "Primeiros passos" com as tarefas da User Story 2, progresso e opção "Dispensar"; tarefas pendentes MUST continuar acessíveis em Configurações.
- **FR-015**: Ao emitir orçamento com preço ainda "exemplo", o app MUST avisar e oferecer revisar, sem bloquear a emissão.

**Atendimento**

- **FR-016**: "Fale com a gente" MUST estar a no máximo dois toques de qualquer tela, e também no aviso de vencimento e no rodapé do Início.
- **FR-017**: "Conversar no WhatsApp" MUST abrir conversa com o suporte com mensagem inicial que identifica a loja e a conta.
- **FR-018**: O usuário MUST poder enviar sugestões pelo app e ver, no app, a lista do que enviou com a resposta e a situação (recebida, respondida, feita). Sugestões e respostas MUST ficar guardadas sem prazo de expiração.
- **FR-019**: "Fale com a gente" MUST mostrar o horário de atendimento e o tempo típico de resposta.
- **FR-020**: Melhorias que nasceram de sugestões SHOULD aparecer nas Novidades da versão como "Você pediu, a gente fez".

**Teste grátis, vencimento e assinatura manual**

- **FR-021**: Toda conta nova MUST começar com um período de teste grátis de 30 dias, com todos os recursos.
- **FR-022**: O app MUST mostrar os dias restantes de teste de forma discreta, e com destaque a partir de 7 dias antes do vencimento.
- **FR-023**: Com teste ou período contratado vencido, o app MUST permitir listar, abrir, baixar PDF e reenviar orçamentos, e MUST bloquear criar, editar, emitir, revisar, duplicar e alterar catálogo e configurações.
- **FR-024**: Com conta vencida, "Novo orçamento" e "Revisar" MUST abrir um aviso com a data e o motivo do vencimento (teste ou assinatura) e as opções "Quero assinar" (ou "Renovar") e "Falar com a gente", sem criar rascunho nem revisão.
- **FR-025**: Na fase 1, "Quero assinar" e "Renovar" MUST abrir o WhatsApp do suporte com mensagem que identifica a conta e o que a pessoa quer.
- **FR-026**: O operador da plataforma MUST conseguir estender o teste, liberar a conta até uma data (assinatura paga por fora) e desativá-la, sem acessar o aparelho do cliente.
- **FR-027**: O bloqueio do FR-023 MUST valer no servidor, não só na tela.
- **FR-028**: O operador MUST conseguir listar contas com teste vencido e sem assinatura, com WhatsApp, consentimento de ofertas, data do vencimento e quantidade de orçamentos emitidos que vencem nos próximos 7 dias, para os contatos manuais da fase 1.
- **FR-028a**: Depois do vencimento, o primeiro contato com o usuário MUST ser um lembrete de valor (ex.: orçamentos prestes a vencer), sem falar de pagamento; a oferta de assinatura vem só em contato seguinte.

**Migração**

- **FR-029**: Todos os dados atuais MUST passar para a conta da Forte Vidros, preservando orçamentos, números, totais, versões de catálogo, configurações e logo.
- **FR-030**: A conta da Forte Vidros MUST ficar ativa sem prazo de teste e sem "Primeiros passos".

**Institucional e LGPD**

- **FR-031**: O Início MUST ter o rodapé institucional da User Story 7, abaixo dos blocos, sem empurrar carrossel e blocos para fora da tela de 360 × 640.
- **FR-032**: O usuário MUST conseguir excluir a própria conta e todos os dados dela pelo app, com confirmação explícita.
- **FR-033**: Termos de uso e política de privacidade MUST estar acessíveis antes do cadastro e a qualquer momento depois.

### Fora desta fase

- Planos (mensal/anual), preços, cobrança no app (cartão, Pix, boleto), nota fiscal e régua de inadimplência: fase 2, em spec própria.
- Oferta automática de reconquista após o teste (ex.: 50% nos 3 primeiros meses, ou primeiro mês por R$ 1,99 com assinatura no cartão) e CRM: dependem da cobrança (fase 2) e do painel do provedor. A fase 1 entrega só o consentimento (FR-005) e a lista para contato manual (FR-028).
- Painel do provedor (suporte, assinaturas, mais dias de teste, descontos, banners, versões publicadas, respostas às sugestões, conversa pelo app): spec própria. Na fase 1, as ações de FR-018, FR-026 e FR-028 do lado do operador podem ser feitas por ferramenta interna simples.
- Conversa em tempo real dentro do app (chat): depende do painel do provedor; na fase 1 a conversa é pelo WhatsApp.
- Vários usuários por loja, convites e papel Vendedor (backlog "Vários usuários por loja").
- Perfil de quem atende e vendedor no PDF (backlog "Usuário no Cadastro"): com conta = loja, nome e WhatsApp da loja bastam por ora.
- Vincular ou trocar método de entrada de uma conta existente.

### Key Entities

- **Conta (loja)**: a vidraçaria ou autônomo. Nome da loja, WhatsApp, situação (em teste, ativa, vencida), fim do teste, ativa até (assinatura manual), data de aceite dos termos, consentimento de ofertas com data. Dona de todos os demais dados.
- **Login**: forma de entrar numa conta (Google, e-mail/senha, telefone, Facebook). Uma conta pode ter mais de um login com o mesmo e-mail.
- **Primeiros passos**: tarefas da conta nova, cada uma concluída ou não, e se o cartão foi dispensado.
- **Sugestão**: texto enviado pela conta, data, situação (recebida, respondida, feita), resposta do suporte e versão em que foi feita.
- **Catálogo, configurações, orçamentos, logo, sequência de números**: já existem; passam a pertencer a uma conta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um visitante cria a conta e chega ao Início em até 2 minutos com Google, e em até 3 minutos por qualquer método.
- **SC-002**: Uma conta nova emite o primeiro orçamento com preços confirmados em até 15 minutos seguindo "Primeiros passos".
- **SC-003**: Em teste automatizado com duas contas, 0 dados de uma conta ficam visíveis ou alteráveis pela outra, inclusive por acesso direto ao servidor.
- **SC-004**: Na virada, 100% dos orçamentos, números e totais da Forte Vidros ficam idênticos antes e depois.
- **SC-005**: Pelo menos 70% das contas novas concluem "Primeiros passos" ou emitem um orçamento dentro do teste.
- **SC-006**: Todo o fluxo de cadastro, "Primeiros passos", "Fale com a gente" e aviso de vencimento funciona em celular de 360 px de largura sem rolagem horizontal.
- **SC-007**: Em horário de atendimento, a primeira resposta humana no WhatsApp chega em até 1 hora; sugestões recebem resposta em até 2 dias úteis; 0 sugestões ficam sem resposta.
- **SC-008**: Em conta vencida, 0 rascunhos ou revisões são criados por "Novo orçamento" ou "Revisar".

## Assumptions

- Teste de 30 dias; ajustável sem nova spec.
- O catálogo de exemplo usa a lista de itens atual (vidros, ferragens, perfis, mão de obra), com preços arredondados a partir dos preços reais (Forte Vidros e referência de mercado), revisados pelo dono, e sem dados da loja. O dono define a faixa de preço plausível para um box padrão e uma janela de correr comuns (cenário 3 da User Story 2).
- Login por telefone envolve custo por mensagem enviada; por isso é SHOULD e pode chegar depois de Google e e-mail.
- O provedor atual de autenticação e banco continua; contas, isolamento e bloqueio de vencimento usam as regras de acesso do servidor.
- Modo local (sem servidor configurado) continua existindo para desenvolvimento, como uma conta única sem teste.
- Atendimento: segunda a sexta, 10h às 16h, primeira resposta em até 1 hora nesse horário (decidido 2026-10-10). WhatsApp e e-mail do suporte dependem do número da empresa.
- Termos de uso e política de privacidade partem dos rascunhos em `legal/`, completados com razão social, CNPJ e endereço (CNPJ em criação) e revisados por advogado antes de abrir o cadastro.
- Faixa de preço plausível do catálogo de exemplo: os mesmos orçamentos calculados com os preços da Forte Vidros, ±10% (decidido 2026-10-10).
- Assinatura da fase 1 é combinada pelo WhatsApp e liberada manualmente pelo operador até uma data.
- Mensagens de oferta pelo WhatsApp seguem as regras do WhatsApp para empresas e só vão para quem consentiu (FR-005).
