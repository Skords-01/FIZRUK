# Playbook: Add n8n Workflow

**Trigger:** «Автоматизувати задачу X» / новий n8n workflow / інтеграція зовнішнього сервісу через n8n.

---

## Контекст

Sergeant використовує self-hosted **n8n** для ops-автоматизації (billing, alerts, backups, Renovate). n8n запускається через `ops/docker-compose.ops.yml`. Workflows зберігаються як JSON у `ops/n8n-workflows/` і версіонуються у git.

Документація: `ops/README.md` | Compose stack: `ops/docker-compose.ops.yml`.

---

## Steps

### 1. Запусти ops stack

```bash
cp ops/.env.ops.example ops/.env.ops   # якщо ще не зроблено
# Заповни N8N_PASSWORD, N8N_ENCRYPTION_KEY, N8N_DB_PASSWORD
docker compose -f ops/docker-compose.ops.yml --env-file ops/.env.ops up -d
open http://localhost:5678
```

### 2. Створи workflow у n8n UI

1. **Workflows → New Workflow**
2. Додай тригер (Webhook / Schedule / другий workflow)
3. Додай вузли обробки
4. Налаштуй **Credentials** через n8n UI → Credentials (не хардкодь у workflow JSON)
5. Протестуй через **Test workflow**

### 3. Додай Credentials до таблиці

Якщо workflow потребує нових credentials — додай рядок у таблицю `ops/README.md` § «Credentials у n8n».

### 4. Експортуй workflow у JSON

```
n8n UI → Workflow → ⋮ → Export → Download
```

Збережи файл як `ops/n8n-workflows/<NN>-<slug>.json`, де `<NN>` — наступний порядковий номер.

### 5. Активуй workflow

Toggle → **Active** у верхньому правому куті редактора.

### 6. Додай рядок у `ops/README.md`

У таблицю «n8n Workflows»:

```md
| `07-new-workflow.json` | Опис що робить workflow |
```

### 7. Commit

```bash
git add ops/n8n-workflows/<NN>-<slug>.json ops/README.md
git commit -m "ci(root): add n8n workflow <slug>"
```

---

## Verification

- [ ] Workflow є в `ops/n8n-workflows/` і закомічений у git.
- [ ] Workflow активний у n8n UI.
- [ ] Credentials налаштовані через n8n UI (не хардкодяться у JSON).
- [ ] `ops/README.md` оновлений (таблиця workflows + credentials).
- [ ] Тест-виконання пройшло без помилок.

## Notes

- **Secrets у workflow JSON**: n8n замінює credentials на `<credential_id>` при експорті — безпечно комітити. Але перевіряй що жодних токенів / паролів у JSON немає.
- **Версіонування**: кожне суттєве оновлення workflow — перезберегти JSON і закомітити.
- **Webhook URL**: локально `http://localhost:5678/webhook/<path>`, у prod — публічний URL з `WEBHOOK_URL` env var.

## See also

- [`ops/README.md`](../../ops/README.md) — загальна документація ops stack
- [`ops/docker-compose.ops.yml`](../../ops/docker-compose.ops.yml) — compose конфіг
- [`docs/playbooks/hotfix-prod-regression.md`](hotfix-prod-regression.md) — якщо workflow спричинив проблему у prod
