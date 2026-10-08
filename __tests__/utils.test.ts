import {fileURLToPath} from 'url';
import {jest} from '@jest/globals';
import fs from 'fs';
import os from 'os';
import * as path from 'path';
const fetchMock = jest.fn<typeof import('../src/fetch.js').fetch>();
jest.unstable_mockModule('../src/fetch.js', () => ({fetch: fetchMock}));
const utils = await import('../src/utils.js');

const dirname = path.dirname(fileURLToPath(import.meta.url));

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
    const fetchSpy = fetchMock.mockResolvedValue({
      data: fs.readFileSync(
        path.join(dirname, '../src/configs/php-versions.json'),
        'utf8'
      )
    });
    expect(await utils.parseVersion('latest')).toBe('8.5');
    expect(await utils.parseVersion('nightly')).toBe('8.6');
    expect(await utils.parseVersion('master')).toBe('8.7');
    expect(await utils.parseVersion('8.7')).toBe('8.7');
    expect(await utils.parseVersion('8.7.0')).toBe('8.7');
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
    await expect(utils.parseVersion('8.4\n$(id)')).rejects.toThrow(
      'Invalid PHP version:'
    );

    for (const latest of ['8.1.0', 'pre', 8.4, ['8.4']]) {
      fetchSpy.mockResolvedValue({data: JSON.stringify({latest})});
      await expect(utils.parseVersion('latest')).rejects.toThrow(
        'Invalid PHP version in manifest:'
      );
    }

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

    const existsSync = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const readFileSync = jest.spyOn(fs, 'readFileSync').mockReturnValue('');

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

    readFileSync.mockReturnValue('ruby 1.2.3\nphp 8.4\nnode 20.1.2');
    expect(await utils.readPHPVersion()).toBe('8.4');

    readFileSync.mockReturnValue('ruby 1.2.3\nphp latest\nnode 20.1.2');
    expect(await utils.readPHPVersion()).toBe('latest');

    readFileSync.mockReturnValue(' \t8.4 \t\n');
    expect(await utils.readPHPVersion()).toBe('8.4');

    readFileSync.mockReturnValue(
      '#PHP\r\n\r\nruby 1.2.3\r\n \tphp \t latest \t# version\r\nnode 20.1.2'
    );
    expect(await utils.readPHPVersion()).toBe('latest');

    readFileSync.mockReturnValue('php\n8.4');
    await expect(utils.readPHPVersion()).rejects.toThrow('Invalid PHP version');

    process.env['php-version-file'] = '.tool-versions';
    readFileSync.mockReturnValue("ruby 1.2.3\nphp 8.4';id;#\nnode 20.1.2");
    await expect(utils.readPHPVersion()).rejects.toThrow('.tool-versions');
    delete process.env['php-version-file'];

    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue('php 8.4 8.5');
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
    const existsSync = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const readFileSync = jest.spyOn(fs, 'readFileSync').mockReturnValue('');

    process.env['php-version'] = '$0';
    await expect(utils.readPHPVersion()).rejects.toThrow('php-version input');
    delete process.env['php-version'];

    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(';id');
    await expect(utils.readPHPVersion()).rejects.toThrow('.php-version');

    existsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);
    readFileSync.mockReturnValue('{"platform-overrides":{"php":"`w`"}}');
    await expect(utils.readPHPVersion()).rejects.toThrow(
      'composer.lock platform-overrides.php'
    );

    existsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);
    readFileSync.mockReturnValue('{"platform-overrides":{"php":8.4}}');
    await expect(utils.readPHPVersion()).rejects.toThrow(
      'composer.lock platform-overrides.php: number'
    );

    existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    readFileSync.mockReturnValue('{"config":{"platform":{"php":"8.4$(id)"}}}');
    await expect(utils.readPHPVersion()).rejects.toThrow(
      'composer.json config.platform.php'
    );

    existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    readFileSync.mockReturnValue('{"config":{"platform":{"php":["8.4"]}}}');
    await expect(utils.readPHPVersion()).rejects.toThrow(
      'composer.json config.platform.php: object'
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

describe.each(['linux', 'darwin', 'win32'])(
  'Verbose script preparation on %s',
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
      helper = path.join(scripts, 'tools', 'helper' + extension);
      run = path.join(scripts, 'run' + extension);
      fs.writeFileSync(helper, 'echo helper-output\n');
      fs.writeFileSync(
        run,
        `. '${helper}' ${platform === 'win32' ? '>$null' : '>/dev/null'} 2>&1\n`
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
