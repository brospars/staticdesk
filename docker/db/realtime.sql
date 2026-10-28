-- From Supabase's self-hosting setup (Apache-2.0): schema of the Realtime service.
\set pguser `echo "$POSTGRES_USER"`

create schema if not exists _realtime;
alter schema _realtime owner to :pguser;
