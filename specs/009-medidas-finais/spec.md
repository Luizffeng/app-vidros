# Feature Specification: Medidas finais e fotos do orçamento

**Feature Branch**: `009-medidas-finais`

**Created**: 2026-10-22

**Status**: Draft (clarificado 2026-10-22)

**Input**: Dono, 2026-10-22: medidas finais por item (campos por tipo ou livres); foto como evidência; dúvida bucket vs agente. Clarificação no mesmo dia: digitar medidas também em rascunho (não só após emitir); ao criar cópia/revisão, medidas e fotos vão junto — fotos podem reutilizar o mesmo endereço (sem nova cópia no armazenamento); várias fotos por revisão (quase repositório de insumos do orçamento: local, caderno, prints); limite de **10 fotos por revisão** e retenção de **6 meses**. Medidas finais e esse acervo **nunca** saem no orçamento/PDF/WhatsApp ao cliente (risco de o cliente mandar para outro vidraceiro). Módulo de produção (plano de corte, insumos de instalação) fica para o futuro.

## Clarifications

### Session 2026-10-22

- Q: Só após emitir? → A: Não; permitir inserir medidas finais também em rascunho.
- Q: Na cópia/revisão? → A: Medidas finais e fotos acompanham; fotos compartilham o mesmo endereço (sem duplicar arquivo no armazenamento).
- Q: Quantas fotos? → A: Até **10 fotos por revisão** (repositório do orçamento).
- Q: Retenção? → A: **6 meses** de guarda (MVP / Free); reavaliar 1 ano se a org estiver em Pro.
- Q: Aparece na proposta ao cliente? → A: **Nunca** — nem medidas finais nem essas fotos no PDF/WhatsApp/proposta. Só visão interna do usuário da loja.
- Q: Agente OCR no MVP? → A: Fora; digitação + fotos. OCR pode ser evolução.
- Q: Produção (plano de corte etc.)? → A: Spec/módulo futuro; não bloqueia este.
- Q: Valor inicial das medidas finais? → A: Pré-preencher com as medidas do orçamento (vão/largura/altura etc. do item); o usuário edita por cima se a medida final for outra.
- Q: Texto na área de fotos? → A: Legenda/hint: “Adicione fotos da obra, projetos, medidas ou anotações.”

## Contexto

O item já tem medidas de **orçamento** (preço). A loja também precisa guardar **medidas finais** (conferidas / produção) e **fotos de apoio** (vão, caderno, local), sem entregar isso ao cliente na proposta.

Objetivo: no orçamento (rascunho ou emitido), registrar medidas finais por item e um conjunto de fotos daquela revisão; ao copiar/revisar, levar medidas e referências às mesmas fotos; nunca incluir isso na saída ao cliente. Produção avançada (corte, lista de instalação) é outra feature depois.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Digitar medidas finais no item (Priority: P1)

Em rascunho ou emitido, o usuário abre um item e preenche medidas finais pedidas para o tipo (ex.: box: largura; avulso: campos livres A/B/C/D, largura, altura). Na primeira vez (ainda sem medidas finais salvas), os campos vêm **pré-preenchidos com as medidas do orçamento** daquele item; o usuário edita só o que mudou. Salva. Outro usuário da loja vê os mesmos valores. Isso **não** altera o preço do item.

**Why this priority**: núcleo do pedido — número interno por item.

**Independent Test**: preencher em rascunho e em emitido; reabrir; conferir; mudar medida de orçamento e ver que medidas finais não misturam.

**Acceptance Scenarios**:

1. **Given** rascunho com um box (vão/largura de orçamento já preenchida) e sem medidas finais salvas, **When** abre medidas finais, **Then** o campo de largura (ou equivalente) já vem com o valor do orçamento, editável.
2. **Given** usuário altera a medida final e salva, **When** reabre, **Then** vê o valor editado (não volta sozinho para o do orçamento).
3. **Given** item avulso, **When** abre medidas finais, **Then** permite campos livres (rótulos/valores conforme regra do tipo), pré-preenchidos quando houver equivalente no orçamento.
4. **Given** medidas finais salvas, **When** gera PDF ou WhatsApp da proposta, **Then** medidas finais **não** aparecem em lugar nenhum da saída ao cliente.
5. **Given** medidas finais salvas, **When** altera só a medida de orçamento (preço), **Then** as medidas finais já salvas não mudam sozinhas e o preço não usa as finais.

---

### User Story 2 - Fotos do orçamento (repositório da revisão) (Priority: P1)

Na revisão do orçamento, o usuário anexa várias fotos (local, caderno, print). A área de adição mostra a legenda: “Adicione fotos da obra, projetos, medidas ou anotações.” Vê a lista, abre e remove. Ao atingir **10 fotos** na revisão, o app impede novo anexo com mensagem clara. Fotos são só da loja — não vão na proposta ao cliente.

**Why this priority**: evidência e insumos; pedido explícito de várias fotos.

**Independent Test**: anexar N fotos abaixo do teto; tentar passar do teto; remover uma; conferir que PDF/WhatsApp não incluem as imagens.

**Acceptance Scenarios**:

1. **Given** tela de fotos do orçamento, **When** olha a área de adicionar, **Then** lê a legenda “Adicione fotos da obra, projetos, medidas ou anotações.”
2. **Given** orçamento com espaço no limite, **When** anexa foto, **Then** ela aparece na lista daquela revisão.
3. **Given** revisão já com 10 fotos, **When** tenta outra, **Then** não anexa e explica o limite de 10.
4. **Given** fotos anexadas, **When** gera proposta ao cliente (PDF/WhatsApp), **Then** nenhuma dessas fotos entra na saída.
5. **Given** foto anexada, **When** remove, **Then** some da lista da revisão (política de apagar o arquivo no armazenamento: se nenhuma outra revisão aponta para ela, pode limpar; se compartilhada, mantém o arquivo).

---

### User Story 3 - Cópia / revisão leva medidas e fotos (Priority: P1)

Ao criar revisão (ou cópia que preserve itens), as medidas finais dos itens e as fotos da revisão de origem vão para a nova. As fotos **reutilizam o mesmo endereço** no armazenamento (sem upload duplicado).

**Why this priority**: evita retrabalho e custo de armazenamento.

**Independent Test**: orçamento com medidas + 2 fotos; criar revisão; ver medidas e as mesmas 2 fotos; confirmar que não há segundo upload.

**Acceptance Scenarios**:

1. **Given** emitido com medidas finais e fotos, **When** cria revisão, **Then** a revisão nova tem as mesmas medidas finais nos itens correspondentes.
2. **Given** o mesmo caso, **When** cria revisão, **Then** as fotos aparecem na nova revisão apontando para os mesmos arquivos (mesmo endereço).
3. **Given** revisão nova, **When** remove uma foto só nela, **Then** a revisão antiga pode continuar vendo a foto se ainda referenciar o mesmo arquivo (comportamento de referência compartilhada).

---

### User Story 4 - Retenção das imagens (Priority: P2)

Imagens do orçamento têm prazo de guarda de **6 meses** (a partir do anexo ou da última revisão que as referencia — detalhe fino no plano). Após o prazo, deixam de ficar disponíveis; o app não quebra a tela de orçamento (mostra “indisponível” ou omite).

**Why this priority**: controla custo e risco; pedido do dono.

**Independent Test**: com relógio/teste de data, imagem além do prazo não abre; orçamento ainda abre.

**Acceptance Scenarios**:

1. **Given** foto com menos de 6 meses (regra de contagem do plano), **When** abre, **Then** a imagem carrega.
2. **Given** foto além de 6 meses, **When** abre a lista, **Then** a entrada não mostra a imagem (ou indica expirada) e o resto do orçamento funciona.
3. **Given** texto de privacidade/ajuda, **When** fala de fotos do orçamento, **Then** menciona guarda por 6 meses.

---

### Edge Cases

- Orçamento só com fotos e sem medidas finais: válido.
- Orçamento só com medidas e sem fotos: válido.
- Tipo sem regra pronta de campos: formulário livre.
- Falha de upload: mensagem clara; medidas digitadas podem salvar sem a foto.
- Modo local (sem nuvem): fotos só no aparelho ou feature de foto desabilitada com aviso — detalhe de plano.
- Agente/OCR: fora do MVP; se vier depois, nunca grava sem confirmação e nunca manda medida/foto para o cliente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir registrar medidas finais por item em rascunho e em emitido.
- **FR-002**: Campos de medidas finais MUST depender do tipo do item (regras por tipo; avulso/customizável).
- **FR-002b**: Na primeira edição (sem medidas finais salvas), os campos MUST vir pré-preenchidos com as medidas do orçamento do item, editáveis pelo usuário.
- **FR-003**: Medidas finais MUST ser distintas das medidas de orçamento e MUST NÃO alterar o preço ao serem salvas.
- **FR-004**: Medidas finais MUST NÃO aparecer no PDF, no WhatsApp nem em qualquer saída da proposta ao cliente.
- **FR-005**: A revisão do orçamento MUST permitir até **10 fotos** (repositório); ao tentar a 11ª, MUST bloquear com mensagem clara.
- **FR-005b**: A área de adicionar fotos MUST mostrar a legenda “Adicione fotos da obra, projetos, medidas ou anotações.”
- **FR-006**: Fotos do orçamento MUST NÃO aparecer na proposta ao cliente (PDF/WhatsApp).
- **FR-007**: Ao criar revisão/cópia que preserve itens, medidas finais MUST acompanhar os itens e fotos MUST ser referenciadas pelo mesmo endereço (sem duplicar arquivo).
- **FR-008**: Imagens MUST ser retidas por **6 meses** (depois indisponíveis); comprimir no cliente (alvo ~300 KB; teto de upload ~2 MB por arquivo) fica no plano de implementação.
- **FR-009**: Fotos MUST ser acessíveis só à conta da loja (mesmo isolamento dos demais dados).
- **FR-010**: Regras de produto / agentes / skills MUST tratar medidas finais e fotos do orçamento como **internas** — nunca incluir em saída ao cliente.
- **FR-011**: Módulo de produção (plano de corte, insumos de instalação) está **fora** desta spec.

### Key Entities

- **Medidas finais do item**: campos (rótulo + valor + unidade) ligados a um item; internos.
- **Foto do orçamento**: arquivo na conta da loja, referenciado por uma ou mais revisões; metadados (quando anexou); sujeitos a retenção.
- **Regra por tipo de produto**: quais campos de medida final aparecem.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Preencher medidas finais de 3 itens em um orçamento em menos de 5 minutos (sem foto).
- **SC-002**: Anexar até 10 fotos na revisão e reabri-las no mesmo dia com sucesso; a 11ª é recusada.
- **SC-003**: Criar revisão: medidas e fotos presentes sem novo upload das fotos já existentes.
- **SC-004**: Em revisão de saída ao cliente (PDF e WhatsApp), zero ocorrência de medidas finais ou dessas fotos (checklist de aceite obrigatório).
- **SC-005**: Após 6 meses, orçamento continua utilizável mesmo sem as imagens antigas.

## Assumptions

- Armazenamento privado por conta (espaço de arquivos da loja, separado do logo); cópia/revisão só adiciona referência, não clona bytes.
- Decisão fixa do dono (2026-10-22): **10 fotos/revisão** + retenção **6 meses**. Análise de cota gratuita na seção abaixo (contexto; não reabre a decisão).
- Pré-preencher com medida do orçamento só na primeira vez; depois que o usuário salvou medidas finais, esse valor é a fonte da verdade interna (não ressincroniza sozinho se o orçamento mudar).
- “Cópia” e “revisão” no app atual: o comportamento de levar medidas/fotos aplica-se ao fluxo que cria nova revisão a partir de um orçamento (e a qualquer cópia equivalente se existir).
- OCR/agente: evolução opcional; não bloqueia MVP.
- Produção / plano de corte: backlog futuro, não esta feature.
- Texto de privacidade/termos pode precisar mencionar guarda temporária de fotos de orçamento (plano/legal).

## Análise: retenção, limite de fotos e plano gratuito (Supabase)

Números do **Free** (org, somando projetos; fonte: pricing Supabase, 2026):

| Cota | Free | Pro (referência) |
| --- | --- | --- |
| File storage | **1 GB** | 100 GB |
| Egress (tráfego saída) | **5 GB + 5 GB cached ≈ 10 GB/mês** | 250 GB + cached |
| Max upload por arquivo | **50 MB** (global) | bem maior |
| Database | 500 MB | 8 GB disco |

Logo da loja já usa storage; fotos de orçamento competem pelo **mesmo 1 GB** no Free.

### Hipótese de tamanho por foto

Celular comprime JPEG/WebP no app antes do upload (recomendado no plano):

| Qualidade alvo | Tamanho típico / foto |
| --- | --- |
| Miniatura / prova (1280px no maior lado, ~70% JPEG) | **150–400 KB** → usar **300 KB** na conta |
| “Alta” sem comprimir | 2–8 MB → estoura cota rápido; evitar no Free |

### Quantas fotos cabem no 1 GB (só storage)

Com ~300 KB/foto e ~100 MB reservados para logos e folga:

- Útil ≈ **900 MB** → cerca de **3.000 fotos** no projeto inteiro (todas as lojas/orçamentos desse projeto Free).
- Se **não** comprimir (2 MB/foto): ≈ **450 fotos** no projeto — apertado demais para SaaS multi-loja no Free.

Revisões **compartilham URL** (sem clonar bytes): 1 foto em 3 revisões = **1×** no storage. Bom para a cota.

### Egress (muitas vezes o gargalo antes do GB em disco)

Cada vez que alguém **abre** a foto no app, conta egress (salvo cache CDN).

Ex.: 20 lojas × 10 aberturas/mês × 50 fotos × 300 KB ≈ **3 GB/mês** — ainda dentro dos ~10 GB, mas escala com visualização, não só com upload.

### Retenção (6 meses vs 1 ano) no Free

Retenção **não aumenta** o teto de 1 GB; só **recicla** espaço.

| Retenção | Efeito prático no Free |
| --- | --- |
| **6 meses** | Apaga metade do “estoque” histórico mais cedo → mais fotos **ativas** recentes cabem no 1 GB. Melhor para Free. |
| **1 ano** | Mais tempo de prova; no Free, lojas antigas acumulam e o teto chega antes. Melhor quando storage ≥ Pro (100 GB). |

Regra de ouro: no Free, **retenção curta + compressão + teto por revisão** importam mais que “quantas fotos a loja gostaria”.

### Limite por revisão (proposta para o plano)

| Limite / revisão | Uso | Risco no Free |
| --- | --- | --- |
| **10 fotos** | Obra + medidas + anotações, suficiente pro MVP | Baixo, se comprimir |
| **20 fotos** | Obra grande | Médio se muitas lojas ativas no mesmo projeto Free |
| **50+** | Quase álbum | Alto no Free; só com Pro ou retenção agressiva |

**Decisão fixa (MVP):**

1. Comprimir no cliente (alvo ~300 KB, teto duro de upload **~2 MB** por arquivo — bem abaixo dos 50 MB do Free).
2. **Máx. 10 fotos por revisão** (mensagem clara ao estourar).
3. Retenção **6 meses** (reavaliar 1 ano só com Pro / storage maior).
4. Contar storage por **arquivo único** (referências compartilhadas na revisão).
5. Monitorar egress: miniaturas na lista, full só ao tocar.

Com 10 fotos × 300 KB ≈ **3 MB por revisão**. No Free (≈900 MB úteis): ordem de **~300 revisões “cheias”** no projeto inteiro — ok para piloto / poucas lojas; **não** escala SaaS grande sem Pro.

### O que “consigo utilizar nos planos gratuitos”

- **Sim, no Free**, com compressão + 10 fotos/revisão + retenção 6 meses + poucas lojas no mesmo projeto.
- **Não conte com Free** para dezenas/centenas de lojas com fotos pesadas: o teto é **1 GB storage** e **~10 GB egress/mês** por org.
- **Pro ($25/mês)** muda o jogo: 100 GB storage — com as mesmas 10 fotos/revisão comprimidas, espaço deixa de ser o problema cedo; egress 250 GB também.
