# Audit Exceptions

> **Last validated:** 2026-04-28 by @Skords-01. **Next review:** 2026-07-27.

> Tracked vulnerabilities that are temporarily accepted via the `audit-exception` PR label.

## How this file works

When `pnpm audit --audit-level=high` reports a vulnerability that cannot be fixed immediately (e.g. no patch available, upstream issue), document it here so the team has visibility. Add the `audit-exception` label to the PR to bypass the blocking audit step in CI.

Each entry must include:

| Field          | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| **Advisory**   | Link to the npm/GitHub advisory                                 |
| **Package**    | Affected package name and installed version                     |
| **Severity**   | `high` or `critical`                                            |
| **Reason**     | Why it cannot be fixed right now                                |
| **Mitigation** | What reduces the risk (e.g. not used in prod, input validation) |
| **Due date**   | When the exception must be re-evaluated or resolved             |
| **Owner**      | Who is responsible for tracking the fix                         |

## Current exceptions

> `pnpm audit --audit-level=high` (prod + full tree) — passes cleanly. The
> entry below is a `moderate` from the nightly full report (`pnpm audit` без
> `--audit-level=high` + OSV-Scanner SARIF), записаний для трекінгу, не як
> blocker для CI.

### ajv ReDoS via expo-dev-launcher (CVE-2025-69873)

| Field      | Value                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Advisory   | https://github.com/advisories/GHSA-2g4f-4pwh-qvx6 (CVE-2025-69873)                                                                                                                                                                   |
| Package    | `ajv@8.11.0` (vulnerable range `>=7.0.0-alpha.0 <8.18.0`; patched in `8.18.0`)                                                                                                                                                       |
| Severity   | moderate (CVSS 5.3) — ReDoS through the `$data` option only                                                                                                                                                                          |
| Path       | `apps/mobile > expo-dev-client@5.0.20 > expo-dev-launcher@5.0.35 > ajv@8.11.0`                                                                                                                                                       |
| Reason     | Transitive dev-only dependency of `expo-dev-client`. Upstream `expo-dev-launcher` ще не bump-нув `ajv` (трекаємо expo SDK release cadence — fix очікується разом із наступним SDK 53/54 minor).                                      |
| Mitigation | `expo-dev-client` входить лише в `apps/mobile` dev-build (debug-launcher), не входить у production-bundle (`expo prebuild --release` його викидає). У production app-і ajv `8.11.0` фізично відсутній. Production-tree audit чистий. |
| Due date   | 2026-09-30 (Q3 2026 — типове expo-bump вікно). Якщо не закрито — підняти у `security:medium` issue.                                                                                                                                  |
| Owner      | @Skords-01                                                                                                                                                                                                                           |

Доказ, що production-tree чистий:

```bash
$ pnpm audit --audit-level=high --prod
1 vulnerabilities found
Severity: 1 moderate
$ # production --audit-level=high → exit 0 (нема high+ у prod tree)
```

OSV-Scanner SARIF з найсвіжішого nightly run відображає цю саму
вразливість як `warning` у Code Scanning:
https://github.com/Skords-01/Sergeant/security/code-scanning/1

<!-- Template for adding a new exception:

### <Advisory title>

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| Advisory    | https://github.com/advisories/GHSA-xxxx     |
| Package     | `some-package@1.2.3`                        |
| Severity    | high                                        |
| Reason      | No patch available; upstream PR pending      |
| Mitigation  | Dev-only dependency, not in production build |
| Due date    | YYYY-MM-DD                                  |
| Owner       | @username                                   |

-->
