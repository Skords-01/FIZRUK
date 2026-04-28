# n8n Backup and Recovery Runbook

> **Last validated:** 2026-04-28 by @Skords-01. **Next review:** 2026-07-27.

## What must be backed up

- The `n8n-db` Postgres database. It contains workflow definitions, credentials metadata, and execution history.
- The `N8N_ENCRYPTION_KEY` secret from `ops/.env.ops` or the production secret store.
- The git copy of `ops/n8n-workflows/*.json` and `ops/n8n-workflows/manifest.json`.

The database backup is not enough without `N8N_ENCRYPTION_KEY`: n8n encrypts credential secrets with that key. Losing it means credentials must be recreated manually even if workflows restore successfully.

## Create a backup

```powershell
powershell -ExecutionPolicy Bypass -File ops/scripts/backup-n8n-db.ps1
```

Store the resulting `.dump` outside the server volume and keep it encrypted at rest.

## Restore smoke test

1. Start a fresh local ops stack with a copied `.env.ops`.
2. Restore a dump:

```powershell
powershell -ExecutionPolicy Bypass -File ops/scripts/restore-n8n-db.ps1 -DumpFile ops/backups/n8n/n8n-db-YYYYMMDD-HHMMSS.dump
```

3. Confirm the script prints non-zero workflow and credential metadata counts.
4. Open n8n, verify workflows are visible, and check that credential names exist.
5. Re-enter any credential secret that fails decryption.

## Encryption-key handling

- Generate once per environment and keep it in the production secret manager.
- Never rotate by replacing the value in place without a tested export/reimport plan.
- Before planned rotation, export workflows to git, create a database dump, and record all credential owners.
- If the key is lost, restore workflows from git/database, recreate all credentials in the UI, and keep workflows inactive until each credential is verified.
