# Sergeant Documentation

> **Last reviewed:** 2026-04-27 by @Skords-01.

Документація Sergeant згрупована за призначенням. Цей індекс — точка входу для
нових учасників і швидкої навігації.

## Структура

| Розділ                                | Призначення                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| [`adr/`](./adr/README.md)             | Architecture Decision Records — `чому` обрано конкретні архітектурні рішення. |
| [`architecture/`](./architecture)     | Огляд системи: статус-матриця, фронтенд-overview, API-контракт, платформи.    |
| [`audits/`](./audits)                 | Періодичні аудити коду / архітектури.                                         |
| [`design/`](./design)                 | Брендбук, дизайн-токени, UX-аудит, palette / WCAG.                            |
| [`governance/`](./governance)         | Cadence policies (freshness, policy review).                                  |
| [`integrations/`](./integrations)     | Сторонні сервіси: Railway+Vercel, Renovate, Monobank.                         |
| [`launch/`](./launch/README.md)       | Запуск продукту: монетизація, GTM, операції.                                  |
| [`mobile/`](./mobile)                 | Мобільні додатки: Expo overview, Capacitor shell, deep-links, RN-міграція.    |
| [`observability/`](./observability)   | SLO, runbook, dashboards, prometheus rules, on-call.                          |
| [`planning/`](./planning)             | Roadmap-и: dev-stack, AI-coding, structure-refactor.                          |
| [`playbooks/`](./playbooks/README.md) | Покрокові how-to для типових змін у репо.                                     |
| [`postmortems/`](./postmortems)       | Постмортеми інцидентів.                                                       |
| [`security/`](./security)             | Аудит-винятки, vulnerability SLA, нічний скан.                                |
| [`superpowers/`](./superpowers)       | Specs та hotfix-нотатки для Devin Superpowers.                                |
| [`tech-debt/`](./tech-debt)           | Frontend / Backend tech-debt registries.                                      |

## Швидкі лінки

- [`AGENTS.md`](../AGENTS.md) — головний контракт для розробників та AI-агентів.
- [`README.md`](../README.md) — overview репо.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — як комітити, конвенції commit-ів, PR-флоу.

## Як додати документ

1. Обери розділ за призначенням з таблиці вище.
2. Якщо документ не вписується у жоден з розділів — додай новий підкаталог
   та оновлюй цей індекс **в одному PR** з самим документом.
3. Для ADR використовуй [`adr/TEMPLATE.md`](./adr/TEMPLATE.md).
4. Для playbook — [`playbooks/_TEMPLATE-decision-tree.md`](./playbooks/_TEMPLATE-decision-tree.md).
5. Якщо документ потребує періодичного огляду, додай його у
   [`scripts/docs/freshness-allowlist.json`](../scripts/docs/freshness-allowlist.json).
