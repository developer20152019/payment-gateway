import { spawn } from 'child_process';
import fs from 'fs';

// Colors for console output
const RESET = '\x1b[0m';
const BLUE = '\x1b[34m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';

// 1. Check for node_modules
if (!fs.existsSync('./node_modules')) {
  console.error(RED + '======================================================' + RESET);
  console.error(RED + ' [ERROR] node_modules not found' + RESET);
  console.error(RED + '======================================================' + RESET);
  console.error(YELLOW + ' It looks like dependencies are not installed.' + RESET);
  console.error(YELLOW + ' Please run the following command first:\n' + RESET);
  console.error(GREEN + '     npm install' + RESET);
  console.error(RED + '======================================================\n' + RESET);
  process.exit(1);
}

const isWin = process.platform === "win32";
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// Helper to spawn processes with colored output
const startProcess = (name, color, script) => {
  const child = spawn(npmCmd, ['run', script], {
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, FORCE_COLOR: true } 
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) console.log(`${color}[${name}] ${RESET}${line}`);
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) console.error(`${color}[${name}] ${RESET}${line}`);
    });
  });

  child.on('close', (code) => {
    if (code !== 0 && code !== null) {
        console.log(`${color}[${name}] exited with code ${code}${RESET}`);
        process.exit(code);
    }
  });

  return child;
};

console.log(GREEN + '-----------------------------------------------------' + RESET);
console.log(GREEN + '🚀 Starting PayLink (Frontend + Backend)' + RESET);
console.log(GREEN + '-----------------------------------------------------' + RESET);

const backend = startProcess('BACKEND', BLUE, 'server');

// Give backend a small head start to bind ports
setTimeout(() => {
    const frontend = startProcess('FRONTEND', GREEN, 'client');
    
    // Handle termination
    const killChildren = () => {
      if (backend) backend.kill();
      if (frontend) frontend.kill();
      process.exit();
    };

    process.on('SIGINT', killChildren);
    process.on('SIGTERM', killChildren);
}, 1500);