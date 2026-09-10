import {spawnSync} from 'child_process';
import fs from 'fs';
import path from 'path';

const darwin = fs
  .readFileSync(path.join(__dirname, '../src/scripts/darwin.sh'), 'utf8')
  .split('\n# Variables\n')[0];
const describeUnix = process.platform === 'win32' ? describe.skip : describe;

describeUnix('macOS PHP installation', () => {
  const run = (env: NodeJS.ProcessEnv) =>
    spawnSync(
      'bash',
      [
        '-c',
        `${darwin}
uname() { echo "$TEST_ARCH"; }
setup_cached_versions() { echo cache; return "$TEST_CACHE_STATUS"; }
update_dependencies() { echo update; }
add_brew_tap() { echo tap; }
safe_brew() {
  echo "brew $*"
  case "$*" in
    *--only-dependencies*) return "$TEST_DEPENDENCY_STATUS";;
    install*) return "$TEST_INSTALL_STATUS";;
    upgrade*) return "$TEST_UPGRADE_STATUS";;
  esac
}
brew() { echo "brew $*"; }
add_php "$TEST_ACTION" "$TEST_EXISTING_VERSION"
`
      ],
      {
        encoding: 'utf8',
        timeout: 5000,
        env: {
          ...process.env,
          TEST_ARCH: 'arm64',
          TEST_ACTION: 'install',
          TEST_EXISTING_VERSION: 'false',
          TEST_CACHE_STATUS: '0',
          TEST_DEPENDENCY_STATUS: '0',
          TEST_INSTALL_STATUS: '0',
          TEST_UPGRADE_STATUS: '0',
          version: '8.4',
          debug: 'none',
          ts: 'nts',
          runner: 'github',
          use_package_cache: 'true',
          php_tap: 'shivammathur/homebrew-php',
          ...env
        }
      }
    );

  it.each([
    ['arm64', '0', false, 0],
    ['arm64', '37', true, 0],
    ['x86_64', '0', false, 0],
    ['x86_64', '37', false, 1]
  ])(
    'preserves the cache fallback on %s with cache status %s',
    (arch, cacheStatus, fallback, status) => {
      const result = run({TEST_ARCH: arch, TEST_CACHE_STATUS: cacheStatus});
      expect(result.error).toBeUndefined();
      expect(result.stderr).toBe('');
      expect(result.status).toBe(status);
      expect(result.stdout).toContain('cache\n');
      expect(result.stdout.includes('brew install')).toBe(fallback);
    }
  );

  it.each([
    ['install', '124', '0', '0', 124, 1],
    ['install', '37', '0', '0', 37, 1],
    ['install', '0', '124', '0', 124, 2],
    ['install', '0', '37', '124', 124, 3],
    ['install', '0', '37', '37', 37, 3],
    ['upgrade', '124', '0', '0', 124, 1],
    ['upgrade', '0', '0', '124', 124, 2],
    ['upgrade', '0', '0', '37', 37, 2]
  ])(
    'stops %s after failures (dependencies=%s, install=%s, upgrade=%s)',
    (action, dependencyStatus, installStatus, upgradeStatus, status, calls) => {
      const result = run({
        TEST_ACTION: action,
        TEST_EXISTING_VERSION: action === 'upgrade' ? '8.4.10' : 'false',
        TEST_CACHE_STATUS: '37',
        TEST_DEPENDENCY_STATUS: dependencyStatus,
        TEST_INSTALL_STATUS: installStatus,
        TEST_UPGRADE_STATUS: upgradeStatus
      });
      expect(result.error).toBeUndefined();
      expect(result.stderr).toBe('');
      expect(result.status).toBe(status);
      expect(result.stdout.match(/^brew /gm)).toHaveLength(calls);
      expect(result.stdout).not.toContain('brew link');
    }
  );

  it('retains the upgrade fallback for an install failure other than a timeout', () => {
    const result = run({TEST_CACHE_STATUS: '37', TEST_INSTALL_STATUS: '1'});
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'brew upgrade -f --overwrite shivammathur/php/php@8.4\n'
    );
    expect(result.stdout).toContain('brew link --force --overwrite php@8.4\n');
  });

  it('reuses an existing installation without invoking the cache or Homebrew install', () => {
    const result = run({TEST_EXISTING_VERSION: '8.4.10'});
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(
      'brew unlink php@8.4\nbrew link --force --overwrite php@8.4\n'
    );
  });

  it.each([
    ['debug', 'nts', '-debug'],
    ['none', 'zts', '-zts'],
    ['debug', 'zts', '-debug-zts']
  ])('keeps cache fallback for debug=%s, ts=%s', (debug, ts, suffix) => {
    const result = run({
      TEST_EXISTING_VERSION: '8.4.10',
      TEST_CACHE_STATUS: '37',
      debug,
      ts
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('cache\n');
    expect(result.stdout).toContain(
      `brew install --skip-link -f --overwrite shivammathur/php/php@8.4${suffix}\n`
    );
  });

  it.each([
    ['self-hosted', 'true'],
    ['github', 'false']
  ])('uses Homebrew for runner=%s, cache=%s', (runner, use_package_cache) => {
    const result = run({runner, use_package_cache, TEST_CACHE_STATUS: '37'});
    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('cache\n');
    expect(result.stdout).toContain(
      'brew install --skip-link -f --overwrite shivammathur/php/php@8.4\n'
    );
    expect(result.stdout).toContain('brew link --force --overwrite php@8.4\n');
  });
});
