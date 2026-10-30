# LicitaBOT

Sistema de lances automáticos para licitações eletrônicas. Portal inicial: Portal de Compras Públicas (portaldecompraspublicas.com.br).

## Visão
Bot híbrido que monitora editais, gerencia disputas e executa lances automáticos com estratégias configuráveis por item, supervisão em dashboard ao vivo e suporte multi-CNPJ.

## Stack
Node/TS + Playwright (persistentContext) + NestJS + Prisma/Postgres + Redis/BullMQ + Next.js + Socket.IO. npm workspaces.

## Requisitos centrais
- Auth: login/senha via Keycloak (aspclient, /18/), storageState por CNPJ, refresh token
- Modos disputa: ABERTO, ABERTO_FECHADO, FECHADO (todos no MVP)
- Por item/lote: piso + decremento mínimo (intervaloMinimo), validação antes de enviar
- Estratégias por item: cobrir_minimo, agressivo, conservador, sniper
- Concorrência: até 5 pregões simultâneos isolados por CNPJ/lote
- Híbrido: intercept WS/API + fallback DOM (fill+click), fila <800ms + jitter 800-1500ms
- Dashboard: tempo real (cronômetro servidor), pausar/assumir/retomar, chat pregoeiro, histórico + logs auditáveis
- Anti-detecção: stealth, delays humanos, rate-limit handling (429)

## Arquitetura
Playwright persistentContext -> route intercept (/api/**/lances, /api/**/lotes) + websocket parser -> Engine BullMQ -> envio dual (DOM/fetch replay)

## Restrições
Portal sem API pública documentada; exige engenharia reversa manual com conta paga (HAR/WS/DOM mapping na Fase 1).
