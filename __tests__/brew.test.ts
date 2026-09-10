import {spawn, spawnSync} from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const brew = fs.readFileSync(
  path.join(__dirname, '../src/scripts/tools/brew.sh'),
  'utf8'
);
const describeUnix = process.platform === 'win32' ? describe.skip : describe;

describeUnix('Homebrew inactivity watchdog', () => {
  let root: string;
  let fixture: string;
  let buildScript: string;

  const pids = () =>
    fs.existsSync(path.join(root, 'pids'))
      ? fs
          .readFileSync(path.join(root, 'pids'), 'utf8')
          .trim()
          .split('\n')
          .map(Number)
      : [];

  const running = (pid: number) => {
    const result = spawnSync('ps', ['-p', String(pid), '-o', 'stat='], {
      encoding: 'utf8'
    });
    return result.status === 0 && !result.stdout.trim().startsWith('Z');
  };

  const cleanup = () => {
    for (const pid of pids().reverse()) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // The watchdog may have already terminated this process.
      }
    }
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-php-brew-test-'));
    fixture = path.join(root, 'source.cjs');
    buildScript = path.join(root, 'Homebrew', 'build.rb');
    fs.mkdirSync(path.dirname(buildScript));
    fs.symlinkSync(fixture, buildScript);
    fs.writeFileSync(
      fixture,
      `const fs = require('fs');
const {spawn, spawnSync} = require('child_process');
const role = process.argv[2] || 'brew';
const pidFile = process.env.TEST_ROOT + '/pids';
if (role === 'brew') {
  if (fs.existsSync(pidFile)) {
    for (const pid of fs.readFileSync(pidFile, 'utf8').trim().split('\\n')) {
      const state = spawnSync('ps', ['-p', pid, '-o', 'stat='], {encoding: 'utf8'});
      if (state.status === 0 && !state.stdout.trim().startsWith('Z')) {
        fs.appendFileSync(process.env.TEST_ROOT + '/overlap', pid + '\\n');
      }
    }
  }
  fs.appendFileSync(process.env.TEST_ROOT + '/attempts', 'attempt\\n');
  process.stdout.write('==> make\\n');
}
fs.appendFileSync(pidFile, process.pid + '\\n');
if (role === 'compiler') {
  process.on('SIGTERM', () => {});
  if (process.env.TEST_BUILD_DURATION) {
    setTimeout(() => process.exit(0), Number(process.env.TEST_BUILD_DURATION));
  }
} else {
  const script = role === 'brew' ? process.env.TEST_BUILD_SCRIPT : __filename;
  const child = spawn(process.execPath, [script, role === 'brew' ? 'builder' : 'compiler'], {
    detached: true,
    stdio: process.env.TEST_BUILD_STDIO
  });
  child.on('exit', status => {
    if (process.env.TEST_BUILD_DURATION) {
      if (role === 'brew') fs.writeFileSync(process.env.TEST_ROOT + '/built', 'done');
      const delay = role === 'brew' ? Number(process.env.TEST_AFTER_BUILD_DELAY || 0) : 0;
      setTimeout(() => process.exit(status || 0), delay);
    }
  });
  child.unref();
}
setInterval(() => {}, 1000);
`
    );
  });

  afterEach(() => {
    cleanup();
    fs.rmSync(root, {recursive: true, force: true});
  });

  const run = (script: string, env: NodeJS.ProcessEnv = {}) =>
    new Promise<{status: number | null; stdout: string; stderr: string}>(
      (resolve, reject) => {
        const child = spawn('bash', ['-c', brew + '\n' + script], {
          detached: true,
          env: {
            ...process.env,
            TEST_NODE: process.execPath,
            TEST_ROOT: root,
            TEST_FIXTURE: fixture,
            TEST_BUILD_SCRIPT: buildScript,
            TEST_BUILD_STDIO: 'ignore',
            SETUP_PHP_BREW_WATCHDOG: 'true',
            SETUP_PHP_BREW_INACTIVITY_TIMEOUT: '1',
            SETUP_PHP_BREW_SOURCE_INACTIVITY_TIMEOUT: '1',
            SETUP_PHP_BREW_WATCHDOG_POLL: '0.05',
            SETUP_PHP_BREW_RETRY_ATTEMPTS: '3',
            ...env
          }
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', data => (stdout += data));
        child.stderr.on('data', data => (stderr += data));
        const timer = setTimeout(() => {
          cleanup();
          if (child.pid) {
            try {
              process.kill(-child.pid, 'SIGKILL');
            } catch {
              // The shell may have just exited.
            }
          }
          reject(new Error('Watchdog did not finish: ' + stderr));
        }, 20000);
        child.on('error', error => {
          clearTimeout(timer);
          reject(error);
        });
        child.on('close', status => {
          clearTimeout(timer);
          resolve({status, stdout, stderr});
        });
      }
    );

  it.each(['ignore', 'inherit'])(
    'kills the complete source-build tree with %s stdio before returning',
    async stdio => {
      const result = await run(
        'run_with_inactivity_watchdog "$TEST_NODE" "$TEST_FIXTURE"',
        {TEST_BUILD_STDIO: stdio}
      );
      expect(result.status).toBe(124);
      expect(pids()).toHaveLength(3);
      expect(pids().filter(running)).toEqual([]);
      expect(result.stderr).toContain('brew produced no output');
      expect(result.stderr).not.toContain('retrying');
    },
    25000
  );

  it('cleans up each timed-out build before retrying, then stops at the limit', async () => {
    const result = await run(`
brew() { "$TEST_NODE" "$TEST_FIXTURE"; }
sleep() { case "$1" in 5|10) return 0;; *) command sleep "$@";; esac; }
safe_brew install php@8.4
`);
    expect(result.status).toBe(124);
    expect(fs.readFileSync(path.join(root, 'attempts'), 'utf8')).toBe(
      'attempt\nattempt\nattempt\n'
    );
    expect(fs.existsSync(path.join(root, 'overlap'))).toBe(false);
    expect(pids().filter(running)).toEqual([]);
    expect(result.stderr.match(/retrying brew command/g)).toHaveLength(2);
    expect(result.stderr).not.toContain('attempt 4');
  }, 25000);

  it('recovers on the next attempt after cleaning up a timed-out source build', async () => {
    const result = await run(`
brew() {
  if [ ! -e "$TEST_ROOT/attempts" ]; then
    "$TEST_NODE" "$TEST_FIXTURE"
  else
    echo recovered
  fi
}
sleep() { case "$1" in 5) return 0;; *) command sleep "$@";; esac; }
safe_brew install php@8.4
`);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('recovered\n');
    expect(result.stderr.match(/retrying brew command/g)).toHaveLength(1);
    expect(result.stderr).toContain('attempt 2/3, exit 124');
    expect(pids().filter(running)).toEqual([]);
  }, 10000);

  it('retries an ordinary failure and stops after success', async () => {
    const result = await run(`
brew() {
  if [ ! -e "$TEST_ROOT/failed" ]; then
    touch "$TEST_ROOT/failed"
    return 37
  fi
  printf recovered
}
sleep() { case "$1" in 5) return 0;; *) command sleep "$@";; esac; }
safe_brew install php@8.4
`);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('recovered');
    expect(result.stderr.match(/retrying brew command/g)).toHaveLength(1);
    expect(result.stderr).toContain('attempt 2/3, exit 37');
  });

  it('preserves the opt-out from the watchdog and retries', async () => {
    const result = await run(
      'brew() { printf disabled; return 37; }; safe_brew install php@8.4',
      {SETUP_PHP_BREW_WATCHDOG: 'false'}
    );
    expect(result).toEqual({status: 37, stdout: 'disabled', stderr: ''});
  });

  it.each([0, 37])('preserves output and exit status %s', async status => {
    const result = await run(
      `run_with_inactivity_watchdog bash -c 'printf out; printf err >&2; exit ${status}'`
    );
    expect(result).toEqual({status, stdout: 'out', stderr: 'err'});
  });

  it('keeps the bottle timeout when no source build is running', async () => {
    const result = await run(
      'run_with_inactivity_watchdog "$TEST_NODE" -e "setTimeout(() => {}, 6000)"',
      {SETUP_PHP_BREW_SOURCE_INACTIVITY_TIMEOUT: '4'}
    );
    expect(result.status).toBe(124);
    expect(result.stderr).toContain('no output for 1s; terminating');
  }, 10000);

  it('ignores source builds outside the watched process tree', async () => {
    const otherBuild = spawn(
      process.execPath,
      ['-e', 'setTimeout(() => {}, 10000)', buildScript],
      {stdio: 'ignore'}
    );
    try {
      const result = await run(
        'run_with_inactivity_watchdog "$TEST_NODE" -e "setTimeout(() => {}, 6000)"',
        {SETUP_PHP_BREW_SOURCE_INACTIVITY_TIMEOUT: '4'}
      );
      expect(result.status).toBe(124);
      expect(result.stderr).toContain('no output for 1s; terminating');
    } finally {
      otherBuild.kill('SIGKILL');
    }
  }, 10000);

  it.each(['', '4'])(
    'allows quiet source builds past the bottle timeout with source timeout=%s',
    async sourceTimeout => {
      const result = await run(
        'run_with_inactivity_watchdog "$TEST_NODE" "$TEST_FIXTURE"',
        {
          SETUP_PHP_BREW_SOURCE_INACTIVITY_TIMEOUT: sourceTimeout,
          TEST_BUILD_DURATION: '2500'
        }
      );
      expect(result.status).toBe(0);
      expect(fs.existsSync(path.join(root, 'built'))).toBe(true);
      expect(pids().filter(running)).toEqual([]);
      expect(result.stderr).not.toContain('terminating');
    },
    10000
  );

  it('terminates a stalled source build at its longer timeout', async () => {
    const result = await run(
      'run_with_inactivity_watchdog "$TEST_NODE" "$TEST_FIXTURE"',
      {SETUP_PHP_BREW_SOURCE_INACTIVITY_TIMEOUT: '3'}
    );
    expect(result.status).toBe(124);
    expect(result.stderr).toContain('no output for 3s; terminating');
    expect(pids().filter(running)).toEqual([]);
  }, 10000);

  it('restores the bottle timeout after the source build finishes', async () => {
    const result = await run(
      'run_with_inactivity_watchdog "$TEST_NODE" "$TEST_FIXTURE"',
      {
        SETUP_PHP_BREW_SOURCE_INACTIVITY_TIMEOUT: '4',
        TEST_BUILD_DURATION: '2500',
        TEST_AFTER_BUILD_DELAY: '6000'
      }
    );
    expect(result.status).toBe(124);
    expect(fs.existsSync(path.join(root, 'built'))).toBe(true);
    expect(result.stderr).toContain('no output for 1s; terminating');
    expect(pids().filter(running)).toEqual([]);
  }, 10000);

  it.each(['stdout', 'stderr'] as const)(
    'counts partial output on %s as activity',
    async stream => {
      const result = await run(
        `run_with_inactivity_watchdog "$TEST_NODE" -e '
let count = 0;
const timer = setInterval(() => {
  process.${stream}.write(".");
  if (++count === 25) clearInterval(timer);
}, 100);
'`,
        {SETUP_PHP_BREW_INACTIVITY_TIMEOUT: '2'}
      );
      expect(result.status).toBe(0);
      expect(result[stream]).toBe('.'.repeat(25));
      expect(result.stderr).not.toContain('terminating');
    },
    10000
  );
});
