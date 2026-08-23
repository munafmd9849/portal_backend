import { spawn } from 'child_process';

/**
 * Spawn a process with a hard wall-clock kill. Local runners cannot enforce
 * RSS the way Judge0 isolate does; timeout is mapped to Time Limit Exceeded.
 */
export function timedProcess(cmd, args, { cwd, timeoutMs, stdin } = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(cmd, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, Math.max(50, Number(timeoutMs) || 3000));

    if (stdin != null && stdin !== '') {
      child.stdin.write(String(stdin));
    }
    child.stdin.end();

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        output: '',
        error: err.code === 'ENOENT' ? `${cmd} is not installed on the server` : err.message,
        executionTime: Date.now() - start,
        timedOut: false,
        ok: false,
        stderr: err.message,
      });
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const ms = Date.now() - start;
      if (timedOut || signal === 'SIGKILL' || signal === 'SIGTERM') {
        resolve({
          output: stdout.trimEnd(),
          error: 'Time Limit Exceeded',
          executionTime: ms,
          timedOut: true,
          ok: false,
          stderr: stderr.trim(),
        });
        return;
      }
      resolve({
        output: stdout.trimEnd(),
        error: code !== 0 ? (stderr.trim() || `Process exited with code ${code}`) : null,
        executionTime: ms,
        timedOut: false,
        ok: code === 0,
        stderr: stderr.trim(),
      });
    });
  });
}
