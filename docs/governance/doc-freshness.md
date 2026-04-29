# Відстеження свіжості документації

> **Last validated:** 2026-04-27 by @Skords-01. **Next review:** 2026-07-26.
> **Status:** Active

Ця система гарантує, що критична документація лишається актуальною — у документах вшиваються freshness-заголовки, а нічний джоб відкриває GitHub-issue для протермінованих файлів.

---

## Як це працює

1. **Freshness-заголовок** — у кожному відстежуваному документі біля початку є blockquote:

   ```markdown
   > **Last validated:** 2026-04-27 by @Skords-01. **Next review:** 2026-07-26.
   ```

2. **Allowlist** — `scripts/docs/freshness-allowlist.json` перелічує всі відстежувані файли разом із cadence-ом рев'ю (у днях):

   ```json
   [
     { "path": "README.md", "cadenceDays": 90 },
     { "path": "docs/observability/runbook.md", "cadenceDays": 60 }
   ]
   ```

3. **Нічний workflow** — `.github/workflows/docs-freshness.yml` запускає `scripts/docs/check-freshness.mjs` щодня о 07:00 UTC. Для кожного файлу, у якого минула дата **Next review**, скрипт відкриває GitHub-issue з лейблами `documentation` і `freshness-overdue`.

4. **Ідемпотентність** — скрипт вшиває коментар-маркер (`<!-- doc-freshness:<path> -->`) у тіло issue. Перед створенням нової issue він шукає вже відкриту з таким маркером і пропускає, якщо знайшов.

---

## Підтримувані формати заголовка

| Формат     | Приклад                                                                   | Нотатки                                               |
| ---------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| Канонічний | `> **Last validated:** 2026-04-27 by @user. **Next review:** 2026-07-26.` | Бажаний. Містить явну дату наступного рев'ю.          |
| Legacy     | `> Last reviewed: 2026-04-27. Reviewer: @user`                            | Стиль AGENTS.md до PR-11.A. Без явної наступної дати. |

Коли знайдено legacy-заголовок, скрипт обчислює дату наступного рев'ю як `lastValidated + cadenceDays` з allowlist-а.

---

## Як додати документ у freshness-список

1. Додайте freshness-заголовок до документа (одразу після title):

   ```markdown
   # Мій документ

   > **Last validated:** YYYY-MM-DD by @yourhandle. **Next review:** YYYY-MM-DD.
   ```

   Дата наступного рев'ю — `today + cadenceDays`.

2. Додайте запис у `scripts/docs/freshness-allowlist.json`:

   ```json
   { "path": "docs/my-document.md", "cadenceDays": 90 }
   ```

3. Закомітьте обидві зміни в одному PR.

---

## Зміна cadence-у

Поправте поле `cadenceDays` у `scripts/docs/freshness-allowlist.json`. Оновіть дату **Next review** у заголовку документа, щоб вона збігалася. Рекомендовані cadence-и:

| Cadence | Для чого                                                        |
| ------- | --------------------------------------------------------------- |
| 60 днів | Високо-критичні ops-доки (runbook, hotfix, ротація секретів)    |
| 90 днів | Стандартні доки (README, CONTRIBUTING, SLO, індекс playbook-ів) |

---

## Свідомо виключено: Architecture Decision Records (`docs/adr/**`)

ADR-и **навмисно виключені** з freshness-allowlist-а. ADR фіксує контекст, альтернативи та обґрунтування рішення **на момент його прийняття**. Це історичний запис, а не «живий» документ — щойно ADR прийнято, він іммутабельний.

Коли базове рішення змінюється, workflow такий:

1. Написати новий ADR, який описує нове рішення з актуальним контекстом.
2. Виставити `Status: Accepted` на новому ADR і `Status: Superseded by ADR-NNNN` на старому.
3. Додати рядок `Supersedes: ADR-MMMM` у заголовок нового ADR.

Це стандартний патерн із [оригінальної пропозиції Майкла Найгарда](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) та спільноти [adr.github.io](https://adr.github.io/).

Перегляд кожного ADR за 90-денним cadence-ом або (а) генеруватиме тривіальні «все ще актуально»-апдейти, які ховають справжні зміни, або (б) спокушатиме редакторів тихо переписувати історію. Обидва результати знищують сенс ADR.

Рядок `Last reviewed:` у деяких ADR (legacy-компаньйон до `Date:` у заголовку) — суто інформаційний; freshness-чек не сканує ADR-файли, і нічний workflow не відкриватиме issue проти них.

Якщо ADR коли-небудь потребує операційних метаданих, які треба перевалідовувати за cadence-ом (наприклад, таблиця квот, прайс-лист), винесіть ці дані в окремий док під `docs/integrations/`, `docs/launch/` або `docs/observability/` і додайте **його** в allowlist — а сам ADR не чіпайте.

---

## Локальний запуск

```bash
# Dry-run (issue не створюються)
DRY_RUN=1 node scripts/docs/check-freshness.mjs

# Реальний запуск (потрібен GITHUB_TOKEN з issues:write)
GITHUB_TOKEN=ghp_... node scripts/docs/check-freshness.mjs
```

---

## Тести

```bash
node --test scripts/docs/__tests__/check-freshness.test.mjs
```
