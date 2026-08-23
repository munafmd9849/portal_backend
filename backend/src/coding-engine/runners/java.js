import { writeFile, mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { timedProcess } from './timedProcess.js';

async function exec(cmd, args, cwd, timeoutMs) {
  const result = await timedProcess(cmd, args, { cwd, timeoutMs });
  return {
    ok: result.ok,
    stdout: result.output,
    stderr: result.timedOut ? 'Time Limit Exceeded' : result.stderr,
    ms: result.executionTime,
    timedOut: result.timedOut,
  };
}

function splitImportsAndBody(code) {
  const lines = String(code || '').split('\n');
  const imports = [];
  const body = [];
  let pastImports = false;

  for (const line of lines) {
    const t = line.trim();
    if (!pastImports && (t.startsWith('import ') || t.startsWith('package '))) {
      imports.push(line);
      continue;
    }
    if (!pastImports && t === '' && body.length === 0 && imports.length > 0) {
      continue;
    }
    pastImports = true;
    body.push(line);
  }

  return { imports, body: body.join('\n').trim() };
}

/** Injected main: reads stdin (same bytes Judge0 sends), then calls solution(...). */
function runnerMainBlock() {
  return `
  public static void main(String[] args) throws Exception {
    byte[] buf = System.in.readAllBytes();
    String rawInput = new String(buf, java.nio.charset.StandardCharsets.UTF_8);
    runWithInput(rawInput);
  }

  static void runWithInput(String rawInput) throws Exception {
    java.lang.reflect.Method target = null;
    for (java.lang.reflect.Method m : Main.class.getDeclaredMethods()) {
      if (!"solution".equals(m.getName()) || m.getParameterCount() != 1) continue;
      if (!java.lang.reflect.Modifier.isStatic(m.getModifiers())) continue;
      target = m;
      break;
    }
    if (target == null) {
      System.err.println("Add a static method: public static Object solution(Object input) { ... }");
      System.exit(1);
    }
    Object arg = coerceArg(target.getParameterTypes()[0], rawInput);
    Object result = target.invoke(null, arg);
    if (result != null) System.out.print(String.valueOf(result));
  }

  static Object coerceArg(Class<?> type, String raw) {
    if (type == String.class) return raw;
    if (type == int.class || type == Integer.class) return Integer.parseInt(raw.trim());
    if (type == long.class || type == Long.class) return Long.parseLong(raw.trim());
    if (type == double.class || type == Double.class) return Double.parseDouble(raw.trim());
    if (type == float.class || type == Float.class) return Float.parseFloat(raw.trim());
    if (type == boolean.class || type == Boolean.class) return Boolean.parseBoolean(raw.trim());
    return raw;
  }`;
}

export function buildJavaSource(code) {
  const { imports, body } = splitImportsAndBody(code);
  const importBlock = imports.length ? `${imports.join('\n')}\n\n` : '';
  const mainBlock = runnerMainBlock();

  if (/^\s*(?:public\s+)?class\s+Main\b/m.test(body)) {
    if (/\bpublic\s+static\s+void\s+main\s*\(/m.test(body)) {
      return `${importBlock}${body}`;
    }
    const lastBrace = body.lastIndexOf('}');
    if (lastBrace === -1) {
      return `${importBlock}${body}\n${mainBlock}\n}`;
    }
    return `${importBlock}${body.slice(0, lastBrace)}${mainBlock}\n${body.slice(lastBrace)}`;
  }

  return `${importBlock}public class Main {
${body}
${mainBlock}
}`;
}

const COMPILE_TIMEOUT_MS = 20_000;

function compileErrorResult(compile) {
  return {
    output: '',
    error: compile.timedOut ? 'Time Limit Exceeded' : compile.stderr || 'Compilation failed',
    executionTime: compile.ms,
  };
}

export async function runJava(code, input, timeoutMs = 5000) {
  const results = await runJavaSuite(code, [input], timeoutMs);
  return results[0];
}

/** Compile once, then run each stdin. Submit was recompiling Java on every hidden test. */
export async function runJavaSuite(code, inputs, timeoutMs = 5000) {
  const source = buildJavaSource(code);
  const stdinList = (inputs || []).map((v) => String(v ?? ''));
  let dir;
  try {
    dir = await mkdtemp(join(tmpdir(), 'portal-java-'));
    const src = join(dir, 'Main.java');
    await writeFile(src, source, 'utf8');
    const compile = await exec('javac', [src], dir, COMPILE_TIMEOUT_MS);
    if (!compile.ok) {
      return stdinList.map(() => compileErrorResult(compile));
    }
    const runs = [];
    for (const stdin of stdinList) {
      const run = await timedProcess('java', ['-cp', dir, 'Main'], {
        cwd: dir,
        timeoutMs,
        stdin,
      });
      runs.push({
        output: run.output,
        error: run.ok ? null : run.timedOut ? 'Time Limit Exceeded' : run.stderr || 'Runtime error',
        executionTime: run.executionTime,
      });
    }
    return runs;
  } finally {
    if (dir) {
      try { await rm(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}
