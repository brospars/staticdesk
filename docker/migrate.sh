#!/bin/sh
# Applies supabase/migrations once the Supabase services have created their
# schemas. Applied versions are recorded like the Supabase CLI does
# (supabase_migrations.schema_migrations), each file in one transaction.
set -eu

export PGHOST=db PGPORT=5432 PGUSER=supabase_admin PGDATABASE=postgres PGPASSWORD="$POSTGRES_PASSWORD"
# Objects are owned by "postgres", as on Supabase's platform.
export PGOPTIONS='-c role=postgres -c client_min_messages=warning'
run() { psql -X -q -v ON_ERROR_STOP=1 "$@"; }

echo "[migrate] waiting for the auth, storage and realtime schemas"
tries=0
until [ "$(psql -X -Atc "select to_regclass('auth.identities') is not null and to_regclass('storage.buckets') is not null and to_regclass('realtime.messages') is not null" 2>/dev/null)" = "t" ]; do
  tries=$((tries + 1))
  if [ "$tries" -gt 150 ]; then echo "[migrate] timed out: check the auth, storage and realtime containers"; exit 1; fi
  sleep 2
done

run -c "create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);"

for file in /migrations/*.sql; do
  base=$(basename "$file" .sql)
  version=${base%%_*}
  name=${base#*_}
  if [ "$(psql -X -Atc "select 1 from supabase_migrations.schema_migrations where version = '$version'")" = "1" ]; then
    continue
  fi
  echo "[migrate] applying $base"
  run -1 -f "$file" -c "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '$name')"
done
echo "[migrate] database is up to date"
