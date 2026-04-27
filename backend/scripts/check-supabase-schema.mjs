#!/usr/bin/env node
import process from 'node:process';
import { Client } from 'pg';

const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Missing SUPABASE_DB_URL or DATABASE_URL');
  process.exit(1);
}

const requiredTables = [
  'workspaces',
  'workspace_members',
  'profiles',
  'unity_game_projects',
  'unity_build_jobs',
  'game_artifacts',
  'game_release_jobs',
  'user_integrations'
];

const requiredColumns = [
  { table: 'game_artifacts', column: 'unity_game_project_id' },
  { table: 'game_artifacts', column: 'file_url' }
];

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

const existsQuery = `
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = any($1::text[])
`;

const columnExistsQuery = `
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    select x.table_name, x.column_name
    from unnest($1::text[], $2::text[]) as x(table_name, column_name)
  )
`;

(async () => {
  try {
    await client.connect();

    const tableResult = await client.query(existsQuery, [requiredTables]);
    const foundTables = new Set(tableResult.rows.map((r) => r.table_name));
    const missingTables = requiredTables.filter((name) => !foundTables.has(name));

    const tableNames = requiredColumns.map((c) => c.table);
    const columnNames = requiredColumns.map((c) => c.column);
    const columnResult = await client.query(columnExistsQuery, [tableNames, columnNames]);
    const foundColumns = new Set(columnResult.rows.map((r) => `${r.table_name}.${r.column_name}`));
    const missingColumns = requiredColumns.filter(
      (c) => !foundColumns.has(`${c.table}.${c.column}`)
    );

    if (missingTables.length === 0 && missingColumns.length === 0) {
      console.log('✅ Supabase schema check passed.');
      process.exit(0);
    }

    if (missingTables.length > 0) {
      console.error('Missing tables:', missingTables.join(', '));
    }
    if (missingColumns.length > 0) {
      console.error(
        'Missing columns:',
        missingColumns.map((c) => `${c.table}.${c.column}`).join(', ')
      );
    }

    process.exit(2);
  } catch (error) {
    console.error('Schema check failed:', error.message);
    process.exit(3);
  } finally {
    await client.end().catch(() => undefined);
  }
})();
