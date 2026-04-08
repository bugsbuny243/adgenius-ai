import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const nextDir = path.join(appDir, '.next');
const standaloneDir = path.join(nextDir, 'standalone');
const standaloneNextDir = path.join(standaloneDir, '.next');
const sourceStaticDir = path.join(nextDir, 'static');
const targetStaticDir = path.join(standaloneNextDir, 'static');
const sourcePublicDir = path.join(appDir, 'public');
const targetPublicDir = path.join(standaloneDir, 'public');

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function syncDirectory(sourceDir, targetDir) {
  if (!existsSync(sourceDir)) {
    return;
  }

  ensureDir(path.dirname(targetDir));
  cpSync(sourceDir, targetDir, { recursive: true, force: true });
}

if (!existsSync(path.join(standaloneDir, 'server.js'))) {
  console.error('Standalone build output not found. Run "npm run build" first.');
  process.exit(1);
}

ensureDir(standaloneNextDir);
syncDirectory(sourceStaticDir, targetStaticDir);
syncDirectory(sourcePublicDir, targetPublicDir);

const child = spawn(process.execPath, ['server.js'], {
  cwd: standaloneDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    HOSTNAME: '0.0.0.0',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
