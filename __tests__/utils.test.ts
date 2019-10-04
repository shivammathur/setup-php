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
    expect(warning_log).toEqual(
      "Write-Host '" + message + "' -ForegroundColor yellow"
    );
    warning_log = await utils.log(message, 'linux', 'warning');
    expect(warning_log).toEqual('echo "\\033[33;1m' + message + '\\033[0m"');
    warning_log = await utils.log(message, 'darwin', 'warning');
    expect(warning_log).toEqual('echo "\\033[33;1m' + message + '\\033[0m"');

    let error_log: string = await utils.log(message, 'win32', 'error');
    expect(error_log).toEqual(
      "Write-Host '" + message + "' -ForegroundColor red"
    );
    error_log = await utils.log(message, 'linux', 'error');
    expect(error_log).toEqual('echo "\\033[31;1m' + message + '\\033[0m"');
    error_log = await utils.log(message, 'darwin', 'error');
    expect(error_log).toEqual('echo "\\033[31;1m' + message + '\\033[0m"');

    let success_log: string = await utils.log(message, 'win32', 'success');
    expect(success_log).toEqual(
      "Write-Host '" + message + "' -ForegroundColor green"
    );
    success_log = await utils.log(message, 'linux', 'success');
    expect(success_log).toEqual('echo "\\033[32;1m' + message + '\\033[0m"');
    success_log = await utils.log(message, 'darwin', 'success');
    expect(success_log).toEqual('echo "\\033[32;1m' + message + '\\033[0m"');

    success_log = await utils.log(message, 'win32', 'success', 'Test win');
    expect(success_log).toEqual(
      "Write-Host 'Test win: " + message + "' -ForegroundColor green"
    );
  });

  it('checking log with prefix', async () => {
    let message: string = 'Test message';
    let prefix_log: string = await utils.log(
      message,
      'linux',
      'success',
      'Test Prefix'
    );
    expect(prefix_log).toEqual(
      'echo "\\033[32;1mTest Prefix: ' + message + '\\033[0m"'
    );
    prefix_log = await utils.log(message, 'darwin', 'success', 'Test');
    expect(prefix_log).toEqual(
      'echo "\\033[32;1mTest: ' + message + '\\033[0m"'
    );
  });

  it('checking getExtensionPrefix', async () => {
    expect(await utils.getExtensionPrefix('extensionDoesNotExist')).toEqual(
      'extension'
    );
    expect(await utils.getExtensionPrefix('xsl')).toEqual('extension');
    expect(await utils.getExtensionPrefix('xdebug')).toEqual('zend_extension');
    expect(await utils.getExtensionPrefix('opcache')).toEqual('zend_extension');
  });
});
