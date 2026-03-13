# DB Schema Parity Runbook

This runbook explains how to verify that local schema + migrations can recreate production DB structure in an isolated database, without touching production data.

---

## Goal

Validate strict schema parity between:

- **Production DB** (read-only checks via MCP / SQL metadata)
- **Isolated local DB** built from current local schema + alignment migrations

Strict parity means:

- same table set
- same column types/nullability/defaults
- same index names and definitions (including `WHERE` predicates and sort direction)

---

## Safety First

Use an isolated DB container only. Do **not** run these commands against production.

Before running anything, verify the target DB is the temporary one:

```bash
docker exec -it wrapper-parity-db psql -U postgres -d paritydb -c "select current_database(), current_user;"
```

Expected result includes:

- `paritydb`
- `postgres`

---

## One-Time Setup

### 1) Start isolated Postgres

```bash
docker rm -f wrapper-parity-db 2>/dev/null || true
docker run --name wrapper-parity-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=paritydb \
  -p 55432:5432 \
  -d postgres:16-alpine
```

### 2) Use backend workspace

```bash
cd /Users/chintadineshreddy/Downloads/WrapperStandalone/backend
```

---

## Apply Local Schema to Isolated DB

Because this repo uses ESM `.js` specifiers in schema exports, use the parity schema entrypoint:

- `src/db/schema/parity-schema.ts`

Run:

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:55432/paritydb" \
NODE_OPTIONS="--import tsx" \
pnpm exec drizzle-kit push:pg \
  --schema ./src/db/schema/parity-schema.ts \
  --driver pg \
  --connectionString "postgres://postgres:postgres@localhost:55432/paritydb" \
  --strict false
```

Expected success line:

- `[✓] Changes applied`

---

## Apply Strict-Parity Alignment Migrations

`push:pg` alone may not preserve all production partial/filtered index semantics. Apply these afterward:

```bash
docker exec -i wrapper-parity-db psql -U postgres -d paritydb < src/db/migrations/add_event_tracking_partial_indexes.sql
docker exec -i wrapper-parity-db psql -U postgres -d paritydb < src/db/migrations/align_event_tracking_column_types.sql
docker exec -i wrapper-parity-db psql -U postgres -d paritydb < src/db/migrations/align_remaining_partial_indexes.sql
```

These scripts enforce:

- `event_tracking` partial indexes + `DESC` ordering
- `event_tracking` `text` / `timestamptz` type alignment
- filtered/partial indexes for change log, credit configs, invitations, seasonal allocations, tenants

---

## Export Metadata for Comparison

### From isolated DB

```bash
docker exec -i wrapper-parity-db psql -U postgres -d paritydb -t -A -F $'\t' -c \
"select table_name, column_name, udt_name, is_nullable, coalesce(column_default,'') \
 from information_schema.columns \
 where table_schema='public' \
 order by table_name, ordinal_position;" > /tmp/parity_columns.tsv

docker exec -i wrapper-parity-db psql -U postgres -d paritydb -t -A -F $'\t' -c \
"select tablename, indexname, indexdef \
 from pg_indexes \
 where schemaname='public' \
 order by tablename, indexname;" > /tmp/parity_indexes.tsv
```

### From production

Use MCP SQL (read-only) to fetch the same two datasets:

- `information_schema.columns` query
- `pg_indexes` query

Then diff isolated vs production outputs.

---

## Pass/Fail Criteria

### PASS

- table set matches
- `event_tracking` types match (`text`, `timestamptz` where expected)
- parity-critical index definitions match exactly, including:
  - `WHERE (...)`
  - `DESC`
  - filtered unique indexes (`tenant_id IS NULL/IS NOT NULL`)

### FAIL

Any mismatch in:

- missing table/column/index
- differing type/null/default
- differing index SQL definition

---

## Known Troubleshooting

### `zsh: command not found: psql`

Use container `psql`:

```bash
docker exec -it wrapper-parity-db psql -U postgres -d paritydb -c "select now();"
```

### `Cannot find module './core/tenants.js'` from `drizzle-kit push:pg`

This occurs with the default schema entrypoint in this repo. Use:

- `--schema ./src/db/schema/parity-schema.ts`
- `NODE_OPTIONS="--import tsx"`

### `must be owner of index ...`

You likely targeted a non-temp DB. Re-check:

```bash
docker exec -it wrapper-parity-db psql -U postgres -d paritydb -c "select current_database(), current_user;"
```

### `unknown command 'migrate:pg'`

Expected for this `drizzle-kit` version. Use `push:pg` + alignment migration SQL scripts from this runbook.

### Interactive/drizzle prompt issues

Use `--strict false` for non-interactive push to isolated DB.

---

## Cleanup

When done:

```bash
docker rm -f wrapper-parity-db
```

---

## Files Introduced for Parity Workflow

- `src/db/schema/parity-schema.ts`
- `src/db/migrations/add_event_tracking_partial_indexes.sql`
- `src/db/migrations/align_event_tracking_column_types.sql`
- `src/db/migrations/align_remaining_partial_indexes.sql`
- `docs/schema-parity-report.md`
- `docs/db-schema-parity-runbook.md` (this file)
