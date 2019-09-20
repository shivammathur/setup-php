import * as fs from 'fs';
import * as path from 'path';
import * as utils from '../src/utils';
import * as pecl from '../src/pecl';

let valid_extensions = ['xdebug', 'pcov'];
jest.mock('../src/pecl', () => ({
  checkPECLExtension: jest.fn().mockImplementation(extension => {
    return valid_extensions.indexOf(extension) !== -1;
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
    expect(await utils.getInput('test', false)).toBe('setup-php');
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
      path.join(__dirname, '../src/7.4.sh'),
      'utf8'
    );
    let darwin: string = fs.readFileSync(
      path.join(__dirname, '../src/darwin.sh'),
      'utf8'
    );
    let linux: string = fs.readFileSync(
      path.join(__dirname, '../src/linux.sh'),
      'utf8'
    );
    let win32: string = fs.readFileSync(
      path.join(__dirname, '../src/win32.ps1'),
      'utf8'
    );
    expect(rc).toBe(await utils.readScript('darwin.sh', '7.4', 'darwin'));
    expect(darwin).toBe(await utils.readScript('darwin.sh', '7.3', 'darwin'));
    expect(linux).toBe(await utils.readScript('linux.sh', '7.3', 'linux'));
    expect(win32).toBe(await utils.readScript('win32.ps1', '7.3', 'win32'));
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
  });

  it('checking INIArray', async () => {
    expect(await utils.INIArray('a=1, b=2, c=3')).toEqual([
      'a=1',
      'b=2',
      'c=3'
    ]);
  });

  it('checking checkPECLExtension', async () => {
    expect(await pecl.checkPECLExtension('extensionDoesNotExist')).toBe(false);
    expect(await pecl.checkPECLExtension('xdebug')).toBe(true);
  });
});
