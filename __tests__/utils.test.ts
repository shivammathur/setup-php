import fs = require('fs');
import * as path from 'path';
import * as utils from '../src/utils';

/**
 * Mock @actions/core
 */
jest.mock('@actions/core', () => ({
  getInput: jest.fn().mockImplementation(key => {
    return ['setup-php'].indexOf(key) !== -1 ? key : '';
  }),
  info: jest.fn()
}));

/**
 * Mock fetch.ts
 */
jest.mock('../src/fetch', () => ({
  fetch: jest.fn().mockImplementation(() => {
    return {data: '{ "latest": "8.1", "5.x": "5.6" }'};
  })
}));

describe('Utils tests', () => {
  it('checking readEnv', async () => {
    process.env['test'] = 'setup-php';
    process.env['test-hyphen'] = 'setup-php';
    expect(await utils.readEnv('test')).toBe('setup-php');
    expect(await utils.readEnv('TEST')).toBe('setup-php');
    expect(await utils.readEnv('test_hyphen')).toBe('setup-php');
    expect(await utils.readEnv('TEST_HYPHEN')).toBe('setup-php');
    expect(await utils.readEnv('undefined')).toBe('');
  });

  it('checking getInput', async () => {
    process.env['test'] = 'setup-php';
    expect(await utils.getInput('test', false)).toBe('setup-php');
    expect(await utils.getInput('setup-php', false)).toBe('setup-php');
    expect(await utils.getInput('DoesNotExist', false)).toBe('');
    await expect(async () => {
      await utils.getInput('DoesNotExist', true);
    }).rejects.toThrow('Input required and not supplied: DoesNotExist');
  });

  it('checking getManifestURL', async () => {
    expect(await utils.getManifestURL()).toContain('php-versions.json');
  });

  it('checking parseVersion', async () => {
    expect(await utils.parseVersion('latest')).toBe('8.1');
    expect(await utils.parseVersion('7')).toBe('7.0');
    expect(await utils.parseVersion('7.4')).toBe('7.4');
    expect(await utils.parseVersion('5.x')).toBe('5.6');
    expect(await utils.parseVersion('4.x')).toBe(undefined);
  });

  it('checking parseIniFile', async () => {
    expect(await utils.parseIniFile('production')).toBe('production');
    expect(await utils.parseIniFile('development')).toBe('development');
    expect(await utils.parseIniFile('none')).toBe('none');
    expect(await utils.parseIniFile('php.ini-production')).toBe('production');
    expect(await utils.parseIniFile('php.ini-development')).toBe('development');
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
    expect(await utils.suppressOutput('win32')).toEqual(' ');
    expect(await utils.suppressOutput('linux')).toEqual(' ');
    expect(await utils.suppressOutput('darwin')).toEqual(' ');
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

    delete process.env['php-version-file'];
    delete process.env['php-version'];

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

  it('checking setVariable', async () => {
    let script: string = await utils.setVariable('var', 'command', 'linux');
    expect(script).toEqual('\nvar="$(command)"\n');
    script = await utils.setVariable('var', 'command', 'darwin');
    expect(script).toEqual('\nvar="$(command)"\n');
    script = await utils.setVariable('var', 'command', 'win32');
    expect(script).toEqual('\n$var = command\n');
  });
});
