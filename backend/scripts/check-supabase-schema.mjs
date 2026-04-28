#!/usr/bin/env node
import process from 'node:process';
import { Client } from 'pg';

const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing SUPABASE_DB_URL or DATABASE_URL');
  process.exit(1);
}

const requiredColumns = [
  { table: 'game_artifacts', column: 'unity_game_project_id' },
  { table: 'game_artifacts', column: 'unity_build_job_id' },
  { table: 'game_artifacts', column: 'workspace_id' },
  { table: 'unity_build_jobs', column: 'unity_build_number' },
  { table: 'unity_build_jobs', column: 'external_build_id' },
  { table: 'user_integrations', column: 'workspace_id' },
  { table: 'integration_credentials', column: 'encrypted_payload' }
];

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    await client.connect();

    const tableNames = requiredColumns.map((c) => c.table);
    const columnNames = requiredColumns.map((c) => c.column);

    const columnResult = await client.query(
      `select table_name, column_name
       from information_schema.columns
       where table_schema = 'public'
       and (table_name, column_name) in (
         select x.table_name, x.column_name
         from unnest($1::text[], $2::text[]) as x(table_name, column_name)
       )`,
      [tableNames, columnNames]
    );

    const foundColumns = new Set(columnResult.rows.map((r) => `${r.table_name}.${r.column_name}`));
    const missingColumns = requiredColumns.filter((c) => !foundColumns.has(`${c.table}.${c.column}`));

    const viewResult = await client.query(
      `select 1
       from information_schema.views
       where table_schema = 'public' and table_name = 'user_integrations_public'
       limit 1`
    );
    const hasView = viewResult.rowCount > 0;

    if (missingColumns.length === 0 && hasView) {
      console.log('✅ Supabase schema check passed.');
      process.exit(0);
    }

    if (missingColumns.length > 0) {
      console.error('Missing columns:', missingColumns.map((c) => `${c.table}.${c.column}`).join(', '));
    }
    if (!hasView) {
      console.error('Missing view: user_integrations_public');
    }

    process.exit(2);
  } catch (error) {
    console.error('Schema check failed:', error.message);
    process.exit(3);
  } finally {
    await client.end().catch(() => undefined);
  }
})();
