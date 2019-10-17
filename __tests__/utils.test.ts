import * as fs from 'fs';
import * as path from 'path';
import * as utils from '../src/utils';

jest.mock('@actions/core', () => ({
  getInput: jest.fn().mockImplementation(key => {
    return ['setup-php'].indexOf(key) !== -1 ? key : '';
  })
}));

async function cleanup(path: string): Promise<void> {
  fs.unlink(path, error => {
    if (error) {
      console.log(error);
    }
  });
}

describe('Utils tests', () => {
  it('checking getInput', async () => {
    process.env['test'] = 'setup-php';
    process.env['undefined'] = '';
    expect(await utils.getInput('test', false)).toBe('setup-php');
    expect(await utils.getInput('undefined', false)).toBe('');
    expect(await utils.getInput('setup-php', false)).toBe('setup-php');
    expect(await utils.getInput('DoesNotExist', false)).toBe('');
  });

  it('checking asyncForEach', async () => {
    let array: Array<number> = [1, 2, 3, 4];
    let sum: number = 0;
    await utils.asyncForEach(array, function(num: number): void {
      sum += num;
    });
    expect(sum).toBe(10);
  });

  it('checking readScripts', async () => {
    let rc: string = fs.readFileSync(
      path.join(__dirname, '../src/scripts/7.4.sh'),
      'utf8'
    );
    let darwin: string = fs.readFileSync(
      path.join(__dirname, '../src/scripts/darwin.sh'),
      'utf8'
    );
    let linux: string = fs.readFileSync(
      path.join(__dirname, '../src/scripts/linux.sh'),
      'utf8'
    );
    let win32: string = fs.readFileSync(
      path.join(__dirname, '../src/scripts/win32.ps1'),
      'utf8'
    );
    expect(await utils.readScript('darwin.sh', '7.4', 'darwin')).toBe(rc);
    expect(await utils.readScript('darwin.sh', '7.3', 'darwin')).toBe(darwin);
    expect(await utils.readScript('linux.sh', '7.4', 'linux')).toBe(linux);
    expect(await utils.readScript('linux.sh', '7.3', 'linux')).toBe(linux);
    expect(await utils.readScript('win32.ps1', '7.4', 'win32')).toBe(win32);
    expect(await utils.readScript('win32.ps1', '7.3', 'win32')).toBe(win32);
    expect(await utils.readScript('fedora.sh', '7.3', 'fedora')).toContain(
      'Platform fedora is not supported'
    );
    await cleanup('./config.yaml');
    await cleanup('./pcov.sh');
    await cleanup('./phalcon.sh');
    await cleanup('./php_pcov.dll');
    await cleanup('./xdebug_darwin.sh');
  });

  it('checking writeScripts', async () => {
    let testString: string = 'sudo apt-get install php';
    await utils.writeScript('test.sh', '10', testString);
    await fs.readFile(path.join(__dirname, '../10test.sh'), function(
      error: any,
      data: Buffer
    ) {
      expect(testString).toBe(data.toString());
    });
    await cleanup('./10test.sh');
  });

  it('checking extensionArray', async () => {
    expect(await utils.extensionArray('a, b, php_c, php-d')).toEqual([
      'a',
      'b',
      'c',
      'd'
    ]);

    expect(await utils.extensionArray('')).toEqual([]);
    expect(await utils.extensionArray(' ')).toEqual([]);
  });

  it('checking INIArray', async () => {
    expect(await utils.INIArray('a=1, b=2, c=3')).toEqual([
      'a=1',
      'b=2',
      'c=3'
    ]);
    expect(await utils.INIArray('')).toEqual([]);
    expect(await utils.INIArray(' ')).toEqual([]);
  });

  it('checking log', async () => {
    let message: string = 'Test message';

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
    step_log = await utils.stepLog(message, 'fedora');
    expect(step_log).toContain('Platform fedora is not supported');

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
    add_log = await utils.addLog('tick', 'xdebug', 'enabled', 'fedora');
    expect(add_log).toContain('Platform fedora is not supported');
  });

  it('checking getExtensionPrefix', async () => {
    expect(await utils.getExtensionPrefix('extensionDoesNotExist')).toEqual(
      'extension'
    );
    expect(await utils.getExtensionPrefix('xsl')).toEqual('extension');
    expect(await utils.getExtensionPrefix('xdebug')).toEqual('zend_extension');
    expect(await utils.getExtensionPrefix('opcache')).toEqual('zend_extension');
  });

  it('checking suppressOutput', async () => {
    expect(await utils.suppressOutput('win32')).toEqual(' >$null 2>&1');
    expect(await utils.suppressOutput('linux')).toEqual(' >/dev/null 2>&1');
    expect(await utils.suppressOutput('darwin')).toEqual(' >/dev/null 2>&1');
    expect(await utils.suppressOutput('fedora')).toContain(
      'Platform fedora is not supported'
    );
  });
});
