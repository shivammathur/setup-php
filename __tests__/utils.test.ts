import fs from 'fs';
import os from 'os';
import {spawnSync} from 'child_process';
import * as path from 'path';
import * as utils from '../src/utils';
import * as fetchModule from '../src/fetch';

describe('Utils tests', () => {
  it('checking readEnv', async () => {
    process.env['test'] = 'setup-php';
    process.env['test-hyphen'] = 'setup-php';
    expect(await utils.readEnv('test')).toBe('setup-php');
    expect(await utils.readEnv('TEST')).toBe('setup-php');
    expect(await utils.readEnv('test_hyphen')).toBe('setup-php');
    expect(await utils.readEnv('TEST_HYPHEN')).toBe('setup-php');
    expect(await utils.readEnv('test invalid')).toBe('');
    process.env['conflict_hyphen'] = 'setup-php';
    process.env['conflict-hyphen'] = 'wrong';
    expect(await utils.readEnv('conflict_hyphen')).toBe('setup-php');
    delete process.env['conflict_hyphen'];
    delete process.env['conflict-hyphen'];
    expect(await utils.readEnv('undefined')).toBe('');
  });

  it('checking getInput', async () => {
    process.env['test'] = 'setup-php';
    process.env['INPUT_SETUP-PHP'] = 'setup-php';
    expect(await utils.getInput('test', false)).toBe('setup-php');
    expect(await utils.getInput('setup-php', false)).toBe('setup-php');
    expect(await utils.getInput('DoesNotExist', false)).toBe('');
    await expect(async () => {
      await utils.getInput('DoesNotExist', true);
    }).rejects.toThrow('Input required and not supplied: DoesNotExist');
    delete process.env['INPUT_SETUP-PHP'];
  });

  it('checking getManifestURL', async () => {
    for (const url of await utils.getManifestURLS()) {
      expect(url).toContain('php-versions.json');
    }
  });

  it('checking parseVersion', async () => {
    const fetchSpy = jest
      .spyOn(fetchModule, 'fetch')
      .mockResolvedValue({data: '{ "latest": "8.1", "5.x": "5.6" }'});
    expect(await utils.parseVersion('latest')).toBe('8.1');
    expect(await utils.parseVersion('7')).toBe('7.0');
    expect(await utils.parseVersion('7.4')).toBe('7.4');
    expect(await utils.parseVersion('5.x')).toBe('5.6');
    expect(await utils.parseVersion('pre')).toBe('pre');
    expect(await utils.parseVersion('pre-installed')).toBe('pre');
    await expect(utils.parseVersion('4.x')).rejects.toThrow(
      'Invalid PHP version: 4.x'
    );
    await expect(utils.parseVersion('foo')).rejects.toThrow(
      'Invalid PHP version:'
    );

    fetchSpy.mockResolvedValue({data: '{ "latest": "8.1.0" }'});
    await expect(utils.parseVersion('latest')).rejects.toThrow(
      'Invalid PHP version in manifest:'
    );

    fetchSpy.mockReset();
    fetchSpy.mockResolvedValueOnce({}).mockResolvedValueOnce({});
    await expect(utils.parseVersion('latest')).rejects.toThrow(
      'Could not fetch the PHP version manifest.'
    );
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('checking parseIniFile', async () => {
    expect(await utils.parseIniFile('production')).toBe('production');
    expect(await utils.parseIniFile('development')).toBe('development');
    expect(await utils.parseIniFile('none')).toBe('none');
    expect(await utils.parseIniFile('php.ini-production')).toBe('production');
    expect(await utils.parseIniFile('php.ini-development')).toBe('development');
    expect(await utils.parseIniFile('/etc/php.ini-production')).toBe(
      'production'
    );
    expect(await utils.parseIniFile('/a-b/php.ini-development')).toBe(
      'development'
    );
    expect(await utils.parseIniFile('invalid')).toBe('production');
  });

  it('checking asyncForEach', async () => {
    const array: Array<string> = ['a', 'b', 'c'];
    let concat = '';
    await utils.asyncForEach(
      array,
      async function (str: string): Promise<void> {
        concat += str;
      }
    );
    expect(concat).toBe('abc');
  });

  it('checking asyncForEach', async () => {
    expect(await utils.color('error')).toBe('31');
    expect(await utils.color('success')).toBe('32');
    expect(await utils.color('any')).toBe('32');
    expect(await utils.color('warning')).toBe('33');
  });

  it('checking extensionArray', async () => {
    expect(
      await utils.extensionArray('a, :b, php_c, none, php-d, Zend e, :Zend f')
    ).toEqual(['none', 'a', ':b', 'c', 'd', 'e', ':f']);

    expect(await utils.extensionArray('')).toEqual([]);
    expect(await utils.extensionArray(' ')).toEqual([]);

    expect(
      await utils.extensionArray('apcu, mbstring, \\ pdo_pgsql, posix, session')
    ).toEqual(['apcu', 'mbstring', 'pdo_pgsql', 'posix', 'session']);
  });

  it('checking shell helpers', () => {
    expect(utils.escapeForShell('a$b`c\\d"e', 'linux')).toBe(
      'a\\$b\\`c\\\\d\\"e'
    );
    expect(utils.escapeForShell('a$b`c"d', 'win32')).toBe('a`$b``c`"d');
    expect(utils.safeArg('vendor-pkg/repo@v1.0.0', 'linux')).toBe(
      'vendor-pkg/repo@v1.0.0'
    );
    expect(utils.safeArg('phpcs:>=3.0', 'linux')).toBe('"phpcs:>=3.0"');
    expect(utils.safeArg('foo$bar', 'win32')).toBe('"foo`$bar"');
    expect(utils.sanitizeShellInput('foo;$(`ls`)bar')).toBe('foolsbar');
    expect(utils.sanitizeShellInput('vendor/foo:1.*', true)).toBe(
      'vendor/foo:1.'
    );
  });

  it('checking INIArray', async () => {
    expect(await utils.CSVArray('a=1, b=2, c=3')).toEqual([
      'a=1',
      'b=2',
      'c=3'
    ]);
    expect(await utils.CSVArray('\'a=1,2\', "b=3, 4", c=5, d=~e~')).toEqual([
      'a=1,2',
      'b=3, 4',
      'c=5',
      "d='~e~'"
    ]);
    expect(await utils.CSVArray('a=\'1,2\', b="3, 4", c=5')).toEqual([
      'a=1,2',
      'b=3, 4',
      'c=5'
    ]);
    expect(
      await utils.CSVArray('a=E_ALL, b=E_ALL & ~ E_ALL, c="E_ALL", d=\'E_ALL\'')
    ).toEqual(['a=E_ALL', 'b=E_ALL & ~ E_ALL', 'c=E_ALL', 'd=E_ALL']);
    expect(
      await utils.CSVArray('a="b=c;d=e", b=\'c=d,e\', c="g=h,i=j", d=g=h, a===')
    ).toEqual(["a='b=c;d=e'", "b='c=d,e'", "c='g=h,i=j'", "d='g=h'", "a='=='"]);
    expect(await utils.CSVArray('')).toEqual([]);
    expect(await utils.CSVArray(' ')).toEqual([]);
  });

  it('checking log', async () => {
    const message = 'Test message';

    let warning_log: string = await utils.log(message, 'win32', 'warning');
    expect(warning_log).toEqual('printf "\\033[33;1m' + message + ' \\033[0m"');
    warning_log = await utils.log(message, 'linux', 'warning');
    expect(warning_log).toEqual('echo "\\033[33;1m' + message + '\\033[0m"');
    warning_log = await utils.log(message, 'darwin', 'warning');
    expect(warning_log).toEqual('echo "\\033[33;1m' + message + '\\033[0m"');

    let error_log: string = await utils.log(message, 'win32', 'error');
    expect(error_log).toEqual('printf "\\033[31;1m' + message + ' \\033[0m"');
    error_log = await utils.log(message, 'linux', 'error');
    expect(error_log).toEqual('echo "\\033[31;1m' + message + '\\033[0m"');
    error_log = await utils.log(message, 'darwin', 'error');
    expect(error_log).toEqual('echo "\\033[31;1m' + message + '\\033[0m"');

    let success_log: string = await utils.log(message, 'win32', 'success');
    expect(success_log).toEqual('printf "\\033[32;1m' + message + ' \\033[0m"');
    success_log = await utils.log(message, 'linux', 'success');
    expect(success_log).toEqual('echo "\\033[32;1m' + message + '\\033[0m"');
    success_log = await utils.log(message, 'darwin', 'success');
    expect(success_log).toEqual('echo "\\033[32;1m' + message + '\\033[0m"');

    let step_log: string = await utils.stepLog(message, 'win32');
    expect(step_log).toEqual('Step-Log "Test message"');
    step_log = await utils.stepLog(message, 'linux');
    expect(step_log).toEqual('step_log "Test message"');
    step_log = await utils.stepLog(message, 'darwin');
    expect(step_log).toEqual('step_log "Test message"');
    step_log = await utils.stepLog(message, 'openbsd');
    expect(step_log).toContain('Platform openbsd is not supported');

    let add_log: string = await utils.addLog(
      'tick',
      'xdebug',
      'enabled',
      'win32'
    );
    expect(add_log).toEqual('Add-Log "tick" "xdebug" "enabled"');
    add_log = await utils.addLog('tick', 'xdebug', 'enabled', 'linux');
    expect(add_log).toEqual('add_log "tick" "xdebug" "enabled"');
    add_log = await utils.addLog('tick', 'xdebug', 'enabled', 'darwin');
    expect(add_log).toEqual('add_log "tick" "xdebug" "enabled"');
    add_log = await utils.addLog('tick', 'xdebug', 'enabled', 'openbsd');
    expect(add_log).toContain('Platform openbsd is not supported');
  });

  it('checking getExtensionPrefix', async () => {
    expect(await utils.getExtensionPrefix('extensionDoesNotExist')).toEqual(
      'extension'
    );
    expect(await utils.getExtensionPrefix('xsl')).toEqual('extension');
    expect(await utils.getExtensionPrefix('xdebug')).toEqual('zend_extension');
    expect(await utils.getExtensionPrefix('xdebug3')).toEqual('zend_extension');
    expect(await utils.getExtensionPrefix('opcache')).toEqual('zend_extension');
  });

  it('checking suppressOutput', async () => {
    expect(await utils.suppressOutput('win32')).toEqual(' >$null 2>&1');
    expect(await utils.suppressOutput('linux')).toEqual(' >/dev/null 2>&1');
    expect(await utils.suppressOutput('darwin')).toEqual(' >/dev/null 2>&1');
    expect(await utils.suppressOutput('openbsd')).toContain(
      'Platform openbsd is not supported'
    );
  });

  it('checking getUnsupportedLog', async () => {
    expect(await utils.getUnsupportedLog('ext', '5.6', 'linux')).toContain(
      'add_log "$cross" "ext" "ext is not supported on PHP 5.6"'
    );
  });

  it('checking getCommand', async () => {
    expect(await utils.getCommand('linux', 'tool')).toBe('add_tool ');
    expect(await utils.getCommand('darwin', 'tool')).toBe('add_tool ');
    expect(await utils.getCommand('win32', 'tool')).toBe('Add-Tool ');
    expect(await utils.getCommand('win32', 'tool_name')).toBe('Add-ToolName ');
    expect(await utils.getCommand('openbsd', 'tool')).toContain(
      'Platform openbsd is not supported'
    );
  });

  it('checking joins', async () => {
    expect(await utils.joins('a', 'b', 'c')).toBe('a b c');
  });

  it('checking scriptExtension', async () => {
    expect(await utils.scriptExtension('linux')).toBe('.sh');
    expect(await utils.scriptExtension('darwin')).toBe('.sh');
    expect(await utils.scriptExtension('win32')).toBe('.ps1');
    expect(await utils.scriptExtension('openbsd')).toContain(
      'Platform openbsd is not supported'
    );
  });

  it('checking scriptTool', async () => {
    expect(await utils.scriptTool('linux')).toBe('bash ');
    expect(await utils.scriptTool('darwin')).toBe('bash ');
    expect(await utils.scriptTool('win32')).toBe('pwsh ');
    expect(await utils.scriptTool('openbsd')).toContain(
      'Platform openbsd is not supported'
    );
  });

  it('checking customPackage', async () => {
    const script_path: string = path.join('ext', 'pkg.sh');
    expect(await utils.customPackage('pkg', 'ext', '1.2.3', 'linux')).toContain(
      script_path + '\nadd_pkg 1.2.3'
    );
    expect(
      await utils.customPackage('pdo_pkg', 'ext', '1.2.3', 'linux')
    ).toContain(script_path + '\nadd_pkg 1.2.3');
    expect(
      await utils.customPackage('pkg8', 'ext', '1.2.3', 'linux')
    ).toContain(script_path + '\nadd_pkg 1.2.3');
  });

  it('checking parseExtensionSource', async () => {
    expect(
      await utils.parseExtensionSource(
        'ext-org-name/repo-name@release',
        'extension'
      )
    ).toContain(
      '\nadd_extension_from_source ext https://github.com org-name repo-name release extension'
    );
    expect(
      await utils.parseExtensionSource(
        'ext-https://sub.domain.tld/org/repo@release',
        'extension'
      )
    ).toContain(
      '\nadd_extension_from_source ext https://sub.domain.tld org repo release extension'
    );
    expect(
      await utils.parseExtensionSource(
        'ext-https://sub.domain.XN--tld/org/repo@release',
        'extension'
      )
    ).toContain(
      '\nadd_extension_from_source ext https://sub.domain.XN--tld org repo release extension'
    );
  });

  it('checking readPHPVersion', async () => {
    expect(await utils.readPHPVersion()).toBe('latest');

    process.env['php-version-file'] = '.phpenv-version';
    await expect(utils.readPHPVersion()).rejects.toThrow(
      "Could not find '.phpenv-version' file."
    );

    const existsSync = jest.spyOn(fs, 'existsSync').mockImplementation();
    const readFileSync = jest.spyOn(fs, 'readFileSync').mockImplementation();

    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue('8.1');

    expect(await utils.readPHPVersion()).toBe('8.1');

    process.env['php-version'] = '8.2';
    expect(await utils.readPHPVersion()).toBe('8.2');

    process.env['php-version'] = 'pre-installed';
    expect(await utils.readPHPVersion()).toBe('pre-installed');

    delete process.env['php-version-file'];
    delete process.env['php-version'];

    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue('ruby 1.2.3\nphp 8.4.2\nnode 20.1.2');
    expect(await utils.readPHPVersion()).toBe('8.4.2');

    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue('setup-php');
    await expect(utils.readPHPVersion()).rejects.toThrow('Invalid PHP version');

    existsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);
    readFileSync.mockReturnValue(
      '{ "platform-overrides": { "php": "7.3.25" } }'
    );
    expect(await utils.readPHPVersion()).toBe('7.3.25');

    existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    readFileSync.mockReturnValue(
      '{ "config": { "platform": { "php": "7.4.33" } } }'
    );
    expect(await utils.readPHPVersion()).toBe('7.4.33');

    existsSync.mockClear();
    readFileSync.mockClear();
  });

  it('readPHPVersion rejects unsupported values from each source', async () => {
    const existsSync = jest.spyOn(fs, 'existsSync').mockImplementation();
    const readFileSync = jest.spyOn(fs, 'readFileSync').mockImplementation();

    process.env['php-version'] = 'bogus';
    await expect(utils.readPHPVersion()).rejects.toThrow('php-version input');
    delete process.env['php-version'];

    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue('bogus');
    await expect(utils.readPHPVersion()).rejects.toThrow('.php-version');

    existsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);
    readFileSync.mockReturnValue('{"platform-overrides":{"php":"bogus"}}');
    await expect(utils.readPHPVersion()).rejects.toThrow(
      'composer.lock platform-overrides.php'
    );

    existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    readFileSync.mockReturnValue('{"config":{"platform":{"php":"bogus"}}}');
    await expect(utils.readPHPVersion()).rejects.toThrow(
      'composer.json config.platform.php'
    );

    existsSync.mockClear();
    readFileSync.mockClear();
  });

  it('checking setVariable', async () => {
    let script: string = await utils.setVariable('var', 'command', 'linux');
    expect(script).toEqual('\nvar="$(command)"\n');
    script = await utils.setVariable('var', 'command', 'darwin');
    expect(script).toEqual('\nvar="$(command)"\n');
    script = await utils.setVariable('var', 'command', 'win32');
    expect(script).toEqual('\n$var = command\n');
  });
});

const hasPwsh =
  spawnSync('pwsh', ['-NoProfile', '-Command', 'exit 0']).status === 0;
const scripts = path.join(__dirname, '../src/scripts');
const unixInit = fs.readFileSync(path.join(scripts, 'unix.sh'), 'utf8');
const windowsSource = fs.readFileSync(path.join(scripts, 'win32.ps1'), 'utf8');
const windowsInit = [
  windowsSource.match(/Function Invoke-WithoutTrace[\s\S]*?\n}/)![0],
  windowsSource.match(
    /\$setup_php_trace = 0\r?\nif \(\$env:SETUP_PHP_TRACE[\s\S]*?\n}/
  )![0]
].join('\n');

describe.each(['linux', 'darwin', 'win32'])(
  'Verbose scripts on %s',
  platform => {
    let root: string;
    let run: string;
    let helper: string;
    const env = {...process.env};

    beforeEach(() => {
      jest.restoreAllMocks();
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-php-verbose-'));
      const scripts = path.join(root, 'src', 'scripts');
      const extension = platform === 'win32' ? '.ps1' : '.sh';
      fs.mkdirSync(path.join(scripts, 'tools'), {recursive: true});
      const init = path.join(scripts, 'init' + extension);
      fs.writeFileSync(
        init,
        platform === 'win32'
          ? windowsInit
          : unixInit + '\nrunner=self-hosted read_env\n'
      );
      helper = path.join(scripts, 'tools', 'helper' + extension);
      run = path.join(scripts, 'run' + extension);
      fs.writeFileSync(helper, 'echo helper-output\n');
      fs.writeFileSync(
        run,
        `. '${init}'\n. '${helper}' ${platform === 'win32' ? '>$null' : '>/dev/null'} 2>&1\n`
      );
      delete process.env.verbose;
      delete process.env.VERBOSE;
      delete process.env.RUNNER_DEBUG;
    });

    afterEach(() => {
      process.env = {...env};
      fs.rmSync(root, {recursive: true, force: true});
    });

    it.each([undefined, '', 'false', 'true', 'v', 'vv', 'vvv', 'invalid'])(
      'prepares scripts for verbose=%s',
      async verbose => {
        if (verbose !== undefined) process.env.verbose = verbose;
        const original = fs.readFileSync(run, 'utf8');
        const enabled = /^(true|v{1,3})$/.test(verbose || '');
        const tracing = /^v{2,3}$/.test(verbose || '');
        const prepared = await utils.addVerbose(run, platform);
        const script = fs.readFileSync(prepared, 'utf8');
        expect(prepared !== run).toBe(enabled);
        expect(
          script.includes(platform === 'win32' ? '>$null' : '>/dev/null')
        ).toBe(!enabled);
        expect(script.includes('src-verbose')).toBe(enabled);
        expect(script.startsWith('. ')).toBe(true);
        expect(process.env.SETUP_PHP_TRACE).toBe(
          tracing ? String(verbose!.length - 1) : '0'
        );
        expect(fs.readFileSync(run, 'utf8')).toBe(original);
        if (platform === 'win32' ? hasPwsh : process.platform !== 'win32') {
          const result = spawnSync(
            platform === 'win32' ? 'pwsh' : 'bash',
            platform === 'win32'
              ? ['-NoProfile', '-File', prepared]
              : [prepared],
            {encoding: 'utf8', env: process.env}
          );
          expect(result.status).toBe(0);
          expect(/helper-output\r?\n/.test(result.stdout)).toBe(enabled);
          expect(
            platform === 'win32'
              ? result.stdout.includes('DEBUG:')
              : result.stderr.includes('+ ')
          ).toBe(tracing);
        }
      }
    );

    it.each(['', ' ', '\t'])(
      'handles pipe spacing %j and subsequent quiet runs',
      async space => {
        const target = platform === 'win32' ? '$null' : '/dev/null';
        const pipe = `>${space}${target} 2>&1`;
        const probe =
          platform === 'win32'
            ? 'echo probe 2>$null'
            : 'command -v sh >/dev/null';
        fs.writeFileSync(helper, `echo nested-output ${pipe}\n${probe}\n`);
        process.env.VERBOSE = 'true';
        const prepared = await utils.addVerbose(run, platform);
        expect(
          fs.readFileSync(
            path.join(path.dirname(prepared), 'tools', path.basename(helper)),
            'utf8'
          )
        ).toBe(
          `echo nested-output ${platform === 'win32' ? '2>&1 | Out-Host' : ''}\n${probe}\n`
        );
        expect(fs.readFileSync(helper, 'utf8')).toContain(pipe);
        const shell = platform === 'win32' ? 'pwsh' : 'bash';
        if (platform === 'win32' ? hasPwsh : process.platform !== 'win32') {
          const result = spawnSync(
            shell,
            platform === 'win32'
              ? ['-NoProfile', '-File', prepared]
              : [prepared],
            {encoding: 'utf8', env: process.env}
          );
          expect(result.status).toBe(0);
          expect(result.stdout).toMatch(/nested-output\r?\n/);
        }
        process.env.verbose = 'false';
        expect(await utils.addVerbose(run, platform)).toBe(run);
        expect(process.env.SETUP_PHP_TRACE).toBe('0');
        expect(fs.readFileSync(helper, 'utf8')).toContain(pipe);
      }
    );

    it.each([undefined, 'false', 'true', 'v', 'vv', 'vvv'])(
      'enables output for runner debug with verbose=%s',
      async verbose => {
        process.env.RUNNER_DEBUG = '1';
        if (verbose !== undefined) process.env.verbose = verbose;
        const prepared = await utils.addVerbose(run, platform);
        expect(prepared).not.toBe(run);
        expect(fs.readFileSync(prepared, 'utf8')).not.toMatch(
          />\s*(?:\/dev\/null|\$null)\s+2>&1/
        );
        expect(process.env.SETUP_PHP_TRACE).toBe(
          /^v{2,3}$/.test(verbose || '') ? String(verbose!.length - 1) : '0'
        );
      }
    );

    it.each(['true', 'vv', 'vvv'])(
      'protects nested sensitive calls and restores tracing for verbose=%s',
      async verbose => {
        const windows = platform === 'win32';
        if (windows ? !hasPwsh : process.platform === 'win32') return;
        process.env.verbose = verbose;
        process.env.GITHUB_TOKEN = 'example-github-token';
        process.env.TRACE_TEST_OUTPUT = path.join(root, 'tokens');
        fs.writeFileSync(
          helper,
          windows
            ? `$result = 0
try {
  Invoke-WithoutTrace {
    Invoke-WithoutTrace {
      $token = $env:GITHUB_TOKEN
      Set-Content $env:TRACE_TEST_OUTPUT $token
    }
    $token = $env:GITHUB_TOKEN
    Add-Content $env:TRACE_TEST_OUTPUT $token
    if ($env:TRACE_TEST_STATUS -ne '0') { throw 'example-failure' }
  }
} catch {
  if ($_.Exception.Message -ne 'example-failure') { throw }
  $result = [int]$env:TRACE_TEST_STATUS
}
$after_wrapper = 'after-wrapper'
Write-Output $after_wrapper
Write-Output "status=$result"
`
            : `inner_sensitive() {
  token="$GITHUB_TOKEN"
  printf '%s\\n' "$token" > "$TRACE_TEST_OUTPUT"
  return "$TRACE_TEST_STATUS"
}
outer_sensitive() {
  without_trace inner_sensitive
  local result=$?
  token="$GITHUB_TOKEN"
  printf '%s\\n' "$token" >> "$TRACE_TEST_OUTPUT"
  return "$result"
}
without_trace outer_sensitive
result=$?
echo "\${token:+state-preserved}"
echo after-wrapper
exit "$result"
`
        );
        const prepared = await utils.addVerbose(run, platform);
        for (const status of [0, 37]) {
          const result = spawnSync(
            windows ? 'pwsh' : 'bash',
            windows ? ['-NoProfile', '-File', prepared] : [prepared],
            {
              encoding: 'utf8',
              env: {...process.env, TRACE_TEST_STATUS: String(status)}
            }
          );
          expect(result.status).toBe(windows ? 0 : status);
          expect(result.stdout + result.stderr).not.toContain(
            'example-github-token'
          );
          expect(result.stdout).toContain('after-wrapper');
          expect(
            windows
              ? /DEBUG:.*Write-Output \$after_wrapper/.test(result.stdout)
              : result.stderr.includes('+ echo after-wrapper')
          ).toBe(verbose !== 'true');
          if (windows) {
            expect(result.stdout).toContain('status=' + status);
            expect(/DEBUG:\s+!\s+SET \$after_wrapper/.test(result.stdout)).toBe(
              verbose === 'vvv'
            );
          } else {
            expect(result.stdout).toContain('state-preserved');
          }
          expect(
            fs
              .readFileSync(process.env.TRACE_TEST_OUTPUT!, 'utf8')
              .trim()
              .split(/\r?\n/)
          ).toEqual(['example-github-token', 'example-github-token']);
        }
      }
    );

    it.each(['true', 'vv', 'vvv'])(
      'keeps Blackfire credentials out of traces for verbose=%s',
      async verbose => {
        const windows = platform === 'win32';
        if (windows ? !hasPwsh : process.platform === 'win32') return;
        process.env.verbose = verbose;
        process.env.TRACE_TEST_OUTPUT = path.join(root, 'blackfire-config');
        process.env.BLACKFIRE_SERVER_ID = 'example-blackfire-server-id';
        process.env.BLACKFIRE_SERVER_TOKEN = 'example-blackfire-server-token';
        process.env.BLACKFIRE_CLIENT_ID = 'example-blackfire-client-id';
        process.env.BLACKFIRE_CLIENT_TOKEN = 'example-blackfire-client-token';
        fs.writeFileSync(
          helper,
          fs.readFileSync(
            path.join(
              scripts,
              'tools',
              'blackfire' + (windows ? '.ps1' : '.sh')
            ),
            'utf8'
          ) +
            (windows
              ? `
function Invoke-RestMethod { @{cli='1.2.3'} }
function Get-File {}
function Expand-Archive {}
function Add-ToProfile {}
function Add-Log {}
function blackfire { Add-Content $env:TRACE_TEST_OUTPUT ($args -join ' ') }
$version = '8.4'
$bin_dir = 'unused'
Add-Blackfire
Write-Output after-blackfire
`
              : `
blackfire() { printf '%s\\n' "$@" >> "$TRACE_TEST_OUTPUT"; }
os=Test
blackfire_config
echo after-blackfire
`)
        );
        const prepared = await utils.addVerbose(run, platform);
        const result = spawnSync(
          windows ? 'pwsh' : 'bash',
          windows ? ['-NoProfile', '-File', prepared] : [prepared],
          {encoding: 'utf8', env: process.env}
        );
        expect(result.status).toBe(0);
        expect(result.stdout + result.stderr).not.toContain(
          'example-blackfire-'
        );
        expect(result.stdout).toContain('after-blackfire');
        expect(
          windows
            ? /DEBUG:.*Write-Output after-blackfire/.test(result.stdout)
            : result.stderr.includes('+ echo after-blackfire')
        ).toBe(verbose !== 'true');
        const config = fs.readFileSync(process.env.TRACE_TEST_OUTPUT!, 'utf8');
        for (const value of [
          'server-id',
          'server-token',
          'client-id',
          'client-token'
        ]) {
          expect(config).toContain('example-blackfire-' + value);
        }
      }
    );

    it('keeps Composer credentials out of traces and resumes tracing', async () => {
      if (platform === 'win32' ? !hasPwsh : process.platform === 'win32')
        return;
      process.env.verbose = 'vvv';
      process.env.GITHUB_TOKEN = 'example-github-token';
      process.env.COMPOSER_TOKEN = 'example-composer-token';
      process.env.PACKAGIST_TOKEN = 'example-packagist-token';
      process.env.COMPOSER_AUTH_JSON =
        '{"bearer":{"example.org":"example-json-token"}}';
      process.env.GITHUB_SERVER_URL = 'https://github.com';
      const windows = platform === 'win32';
      const source = fs.readFileSync(
        path.join(scripts, 'tools', 'add_tools' + (windows ? '.ps1' : '.sh')),
        'utf8'
      );
      fs.writeFileSync(
        helper,
        source +
          (windows
            ? `\n$composer_home='${root}'\nSet-ComposerAuth\nWrite-Output after-auth\n`
            : `\ncomposer_home='${root}'\nset_composer_auth\necho after-auth\n`)
      );
      const prepared = await utils.addVerbose(run, platform);
      const result = spawnSync(
        windows ? 'pwsh' : 'bash',
        windows ? ['-NoProfile', '-File', prepared] : [prepared],
        {encoding: 'utf8', env: process.env}
      );
      expect(result.status).toBe(0);
      expect(result.stdout + result.stderr).not.toMatch(
        /example-(github|composer|packagist|json)-token/
      );
      expect(windows ? result.stdout : result.stderr).toMatch(
        windows ? /DEBUG:.*Write-Output after-auth/ : /\+ echo after-auth/
      );
      const auth = JSON.parse(
        fs.readFileSync(path.join(root, 'auth.json'), 'utf8')
      );
      expect(auth['github-oauth']['github.com']).toBe('example-composer-token');
      expect(auth['http-basic']['repo.packagist.com'].password).toBe(
        'example-packagist-token'
      );
      expect(auth.bearer['example.org']).toBe('example-json-token');
    });

    if (platform !== 'win32') {
      (process.platform === 'win32' ? it.skip : it).each([
        ['exit 37', 37],
        ['set -e\nfalse', 1]
      ])('preserves shell termination for %s', async (failure, status) => {
        process.env.verbose = 'vvv';
        process.env.GITHUB_TOKEN = 'example-github-token';
        fs.writeFileSync(
          helper,
          `
sensitive_failure() {
  token="$GITHUB_TOKEN"
  ${failure}
  echo should-not-run
}
trap 'echo cleanup' EXIT
without_trace sensitive_failure
echo should-not-run
`
        );
        const prepared = await utils.addVerbose(run, platform);
        const result = spawnSync('bash', [prepared], {
          encoding: 'utf8',
          env: process.env
        });
        expect(result.status).toBe(status);
        expect(result.stdout).toBe('cleanup\n');
        expect(result.stdout + result.stderr).not.toContain(
          'example-github-token'
        );
      });

      (process.platform === 'win32' ? it.skip : it).each(['true', 'vv', 'vvv'])(
        'protects Relay credentials and preserves tracing and status for verbose=%s',
        async verbose => {
          process.env.verbose = verbose;
          const ini = path.join(root, 'relay.ini');
          fs.writeFileSync(
            helper,
            fs.readFileSync(path.join(scripts, 'extensions/relay.sh'), 'utf8') +
              '\nsudo() { if [ "$1" = rm ]; then return "$RELAY_TEST_STATUS"; fi; "$@"; }\n' +
              `init_relay_ini '${ini}'\nrelay_status=$?\necho after-relay\nexit "$relay_status"\n`
          );
          const prepared = await utils.addVerbose(run, platform);
          for (const status of [0, 37]) {
            fs.writeFileSync(ini, '; relay.key =\n');
            const result = spawnSync('bash', [prepared], {
              encoding: 'utf8',
              env: {
                ...process.env,
                RELAY_KEY: 'example-relay-key',
                RELAY_TEST_STATUS: String(status)
              }
            });
            expect(result.status).toBe(status);
            expect(result.stdout + result.stderr).not.toContain(
              'example-relay-key'
            );
            expect(result.stdout).toContain('after-relay');
            expect(result.stderr.includes('+ echo after-relay')).toBe(
              verbose !== 'true'
            );
            expect(fs.readFileSync(ini, 'utf8')).toBe(
              'relay.key = example-relay-key\n'
            );
          }
        }
      );
    }

    (process.platform === 'win32' ? it.skip : it)(
      'uses fresh copies without writing through source symlinks',
      async () => {
        const outside = path.join(root, path.basename(helper));
        const original = 'echo original >/dev/null 2>&1\n';
        fs.writeFileSync(outside, original);
        fs.unlinkSync(helper);
        fs.symlinkSync(outside, helper);
        process.env.verbose = 'true';
        const first = await utils.addVerbose(run, platform);
        const second = await utils.addVerbose(run, platform);
        expect(first).not.toBe(second);
        expect(fs.readFileSync(outside, 'utf8')).toBe(original);
        expect(fs.readFileSync(helper, 'utf8')).toBe(original);
        expect(
          fs.readFileSync(
            path.join(path.dirname(first), 'tools', path.basename(helper)),
            'utf8'
          )
        ).toBe(
          `echo original ${platform === 'win32' ? '2>&1 | Out-Host' : ''}\n`
        );
      }
    );
  }
);
