# Architecture Decision Records (ADR)

> Архітектурні рішення Sergeant. Кожен ADR — одне рішення, одна сторінка, з контекстом, обраним варіантом і альтернативами.

## Що таке ADR

ADR (Architecture Decision Record) — короткий документ, який фіксує **архітектурне рішення з контекстом і альтернативами**, щоб через рік не довелось гадати «чому ми тут зробили так, а не інакше».

Кожен ADR має:

- **Status** — `proposed` / `accepted` / `superseded by ADR-NNNN` / `deprecated`.
- **Context** — що ми вирішуємо і чому це питання взагалі виникло.
- **Decision** — який варіант ми обрали.
- **Consequences** — що з цього випливає (як добрі, так і погані).
- **Alternatives considered** — інші варіанти, чому не вони.

## Конвенції файлів

```
docs/adr/
├── README.md                    ← ви тут
├── 0001-monetization-architecture.md
├── 0002-...
└── NNNN-<short-kebab-title>.md
```

- Номери послідовні, без пропусків (`0001`, `0002`, ...).
- Якщо ADR замінює попередній — старий помічається `superseded by ADR-NNNN`, новий лінкує `supersedes ADR-MMMM`.
- ADR ніколи не видаляються — лише `deprecated`.

## Як створити новий ADR

1. Скопіюй останній ADR як шаблон, інкрементуй номер.
2. Заповни секції Status / Context / Decision / Consequences / Alternatives.
3. Status = `proposed` поки PR не змерджений.
4. При мерджі — `accepted` + дата.
5. Лінкуй ADR з відповідних дизайн-документів (`docs/launch/06-*`, `docs/audits/*`).

## Поточні ADR

| #    | Назва                     | Статус   | Створено   | Контекст                                                                            |
| ---- | ------------------------- | -------- | ---------- | ----------------------------------------------------------------------------------- |
| 0001 | Monetization architecture | proposed | 2026-04-27 | 10 рішень перед стартом monetization-MVP (provider, cache, grandfather, trial, ...) |
