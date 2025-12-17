
import { spawn } from 'child_process';
import fs from 'fs';

const RESET = '\x1b[0m';
const BLUE = '\x1b[34m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';

if (!fs.existsSync('./node_modules')) {
  console.error(RED + ' [ERROR] node_modules not found. Run npm install first.' + RESET);
  process.exit(1);
}

const isWin = process.platform === "win32";
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const startProcess = (name, color, script) => {
  const child = spawn(npmCmd, ['run', script], {
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, FORCE_COLOR: true }
  });

  child.stdout.on('data', (data) => {
    data.toString().split('\n').forEach(line => {
      if (line.trim()) console.log(`${color}[${name}] ${RESET}${line}`);
    });
  });

  child.stderr.on('data', (data) => {
    data.toString().split('\n').forEach(line => {
      if (line.trim()) console.error(`${color}[${name}] ${RESET}${line}`);
    });
  });

  return child;
};

console.log(GREEN + '🚀 Starting PayLink Fullstack...' + RESET);
const backend = startProcess('BACKEND', BLUE, 'server');
setTimeout(() => {
    const frontend = startProcess('FRONTEND', GREEN, 'client');
    process.on('SIGINT', () => { backend.kill(); frontend.kill(); process.exit(); });
}, 1500);
