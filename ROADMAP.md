# ROADMAP - LicitaBOT

## Fase 1: Fundação + Mapeamento [em andamento]
- Scaffold monorepo npm workspaces (apps/api, apps/web, packages/portal, packages/engine)
- Auth multi-CNPJ: Keycloak login, storageState, refresh, isolamento por contexto
- Intercept/WS parser: route handlers, websocket listener, serverTime
- HAR/DOM mapping docs + POC lance manual
- Critério: login funcional + captura de payload POST /lances + parser WS com conta teste

## Fase 2: Monitor
- Busca pública /processos, detalhe lotes, filtros
- Cadastro disputa: itens + piso/decremento por item, validação intervaloMinimo
- Agendador BullMQ (cron pregões), CRUD multi-CNPJ
- Critério: listar editais, cadastrar disputa completa, agendamento dispara

## Fase 3: Engine Core
- Máquina estados ABERTO / ABERTO_FECHADO / FECHADO + prorrogações
- Fila BullMQ isolada por CNPJ/lote (5 slots), trava piso/decremento
- Leitura menor lance tempo real (WS), envio dual DOM/fetch
- Critério: 5 pregões concorrentes, fila <800ms, nunca abaixo do piso

## Fase 4: Estratégias
- Perfis: cobrir_minimo, agressivo, conservador, sniper (últimos 3-5s)
- Config por item/lote, stop-loss, economia de decremento (fase fechada)
- Critério: cada estratégia testada em mock WS

## Fase 5: Dashboard tempo real
- Next.js + Socket.IO: lista ao vivo, menor lance, cronômetro servidor
- Controles: pausar/assumir manual/retomar, chat pregoeiro (suspenso => pausa)
- Histórico + logs auditáveis, alerta sonoro
- Critério: supervisão híbrida funcional E2E

## Fase 6: Hardening
- Rate-limit 429, retry, refresh token, export logs, testes E2E c/ mock WS
- Critério: suite verde + docs de operação
