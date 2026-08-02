# Backlog — Forte Vidros

Arquivo vivo. Atualizar ao puxar/fechar item. Specs detalhadas ficam em `specs/`.

**Estratégia:** Web desktop primeiro (fluxo completo, catálogo, PDF, qualidade). Responsividade fina + PWA/offline depois — domínio e UI web já estáveis.

**MVP 001** (`specs/001-mvp-orcamentos/`): entregue — rascunho, itens, custos, emit imutável, revisão, PDF, seed + testes básicos.

---

## Now

- [ ] Validar no browser: CRUD catálogo + export/import JSON

## Next

- [ ] Ampliar testes de paridade com mais exemplos da planilha de referência
- [ ] Spec Kit `tasks.md` ou nova spec só quando item virar feature grande

## Later

- [ ] Frete por km: origem fixa (config) + destino (CEP/endereço cliente) → distância de rota → R$/km (API a decidir: Google / OpenRouteService / OSRM). Hoje: campo Frete manual nos custos adicionais
- [ ] Responsividade fina (~390px) e ajustes de campo
- [ ] PWA: install, cache, uso offline
- [ ] Web Share / atalhos mobile (base Web Share já no PDF desktop/mobile quando o browser permitir)
- [ ] Adapter remoto (`QuoteRepository`) + sync
- [ ] Login / multi-usuário (fora do MVP original)

## Explicitamente fora (por enquanto)

- Sync Google Sheets em runtime
- App nativo (iOS/Android)

## Done

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
