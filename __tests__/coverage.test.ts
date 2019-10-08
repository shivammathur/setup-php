import * as config from '../src/config';
import * as coverage from '../src/coverage';
import * as extensions from '../src/coverage';

jest.mock('../src/extensions', () => ({
  addExtension: jest.fn().mockImplementation(extension => {
    return 'addExtension ' + extension + '\n';
  })
}));

describe('Config tests', () => {
  it('checking addCoverage with PCOV on windows', async () => {
    let win32: string = await coverage.addCoverage('pcov', '7.4', 'win32');
    expect(win32).toContain('addExtension pcov');
    expect(win32).toContain(
      'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug C:\\tools\\php'
    );

    win32 = await coverage.addCoverage('pcov', '7.0', 'win32');
    expect(win32).toContain('PCOV requires PHP 7.1 or newer');

    win32 = await coverage.addCoverage('pcov', '5.6', 'win32');
    expect(win32).toContain('PCOV requires PHP 7.1 or newer');
  });

  it('checking addCoverage with PCOV on linux', async () => {
    let linux: string = await coverage.addCoverage('pcov', '7.4', 'linux');
    expect(linux).toContain('addExtension pcov');
    expect(linux).toContain('sudo sed -i "/xdebug/d" $ini_file');
    expect(linux).toContain('sudo phpdismod xdebug');
  });

  it('checking addCoverage with PCOV on darwin', async () => {
    let darwin: string = await coverage.addCoverage('pcov', '7.4', 'darwin');
    expect(darwin).toContain('addExtension pcov');
  });

  it('checking addCoverage with Xdebug on windows', async () => {
    let win32: string = await coverage.addCoverage('xdebug', '7.3', 'win32');
    expect(win32).toContain('addExtension xdebug');
  });

  it('checking addCoverage with Xdebug on linux', async () => {
    let linux: string = await coverage.addCoverage('xdebug', '7.4', 'linux');
    expect(linux).toContain('addExtension xdebug');
  });

  it('checking addCoverage with Xdebug on darwin', async () => {
    let darwin: string = await coverage.addCoverage('xdebug', '7.4', 'darwin');
    expect(darwin).toContain('addExtension xdebug');
  });

  it('checking disableCoverage windows', async () => {
    let win32 = await coverage.addCoverage('none', '7.4', 'win32');
    expect(win32).toContain('Disable-PhpExtension xdebug');
    expect(win32).toContain('Disable-PhpExtension pcov');
  });

  it('checking disableCoverage on linux', async () => {
    let linux: string = await coverage.addCoverage('none', '7.4', 'linux');
    expect(linux).toContain('sudo phpdismod xdebug');
    expect(linux).toContain('sudo phpdismod pcov');
    expect(linux).toContain('sudo sed -i "/xdebug/d" $ini_file');
    expect(linux).toContain('sudo sed -i "/pcov/d" $ini_file');
  });

  it('checking disableCoverage on darwin', async () => {
    let darwin: string = await coverage.addCoverage('none', '7.4', 'darwin');
    expect(darwin).toContain('sudo sed -i \'\' "/xdebug/d" $ini_file');
    expect(darwin).toContain('sudo sed -i \'\' "/pcov/d" $ini_file');
  });

  it('checking no or invalid coverage driver', async () => {
    let nocov: string = await coverage.addCoverage('nocov', '7.x', 'any');
    expect(nocov).toEqual('');

    nocov = await coverage.addCoverage('', '7.x', 'any');
    expect(nocov).toEqual('');
  });
});
