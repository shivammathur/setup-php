import * as coverage from '../src/coverage';

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
      'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug $php_dir'
    );
    expect(win32).toContain(
      'if (Test-Path $ext_dir\\php_xdebug.dll) { Remove-Item $ext_dir\\php_xdebug.dll }'
    );

    win32 = await coverage.addCoverage('pcov', '7.0', 'win32');
    expect(win32).toContain('PHP 7.1 or newer is required');

    win32 = await coverage.addCoverage('pcov', '5.6', 'win32');
    expect(win32).toContain('PHP 7.1 or newer is required');
  });

  it('checking addCoverage with PCOV on linux', async () => {
    const linux: string = await coverage.addCoverage('pcov', '7.4', 'linux');
    expect(linux).toContain('addExtension pcov');
    expect(linux).toContain('sudo sed -i "/xdebug/d" "$ini_file"');
    expect(linux).toContain('sudo phpdismod -v 7.4 xdebug');
    expect(linux).toContain(
      'sudo DEBIAN_FRONTEND=noninteractive apt-fast remove php-xdebug'
    );
  });

  it('checking addCoverage with PCOV on darwin', async () => {
    const darwin: string = await coverage.addCoverage('pcov', '7.4', 'darwin');
    expect(darwin).toContain('addExtension pcov');
    expect(darwin).toContain('sudo sed -i \'\' "/xdebug/d" "$ini_file"');
    expect(darwin).toContain('sudo rm -rf "$ext_dir"/xdebug.so');
  });

  it('checking addCoverage with Xdebug on windows', async () => {
    const win32: string = await coverage.addCoverage('xdebug', '7.4', 'win32');
    expect(win32).toContain('addExtension xdebug');
  });

  it('checking addCoverage with Xdebug on windows', async () => {
    const win32: string = await coverage.addCoverage('xdebug', '8.0', 'win32');
    expect(win32).toContain('Xdebug currently only supports PHP 7.4 or lower');
  });

  it('checking addCoverage with Xdebug on linux', async () => {
    const linux: string = await coverage.addCoverage('xdebug', '7.4', 'linux');
    expect(linux).toContain('addExtension xdebug');
  });

  it('checking addCoverage with Xdebug on linux', async () => {
    const linux: string = await coverage.addCoverage('xdebug', '8.0', 'linux');
    expect(linux).toContain('Xdebug currently only supports PHP 7.4 or lower');
  });

  it('checking addCoverage with Xdebug on darwin', async () => {
    const darwin: string = await coverage.addCoverage(
      'xdebug',
      '7.4',
      'darwin'
    );
    expect(darwin).toContain('addExtension xdebug');
  });

  it('checking addCoverage with Xdebug on darwin', async () => {
    const darwin: string = await coverage.addCoverage(
      'xdebug',
      '8.0',
      'darwin'
    );
    expect(darwin).toContain('Xdebug currently only supports PHP 7.4 or lower');
  });

  it('checking disableCoverage windows', async () => {
    const win32 = await coverage.addCoverage('none', '7.4', 'win32');
    expect(win32).toContain('Disable-PhpExtension xdebug');
    expect(win32).toContain('Disable-PhpExtension pcov');
    expect(win32).toContain(
      'if (Test-Path $ext_dir\\php_xdebug.dll) { Remove-Item $ext_dir\\php_xdebug.dll }'
    );
    expect(win32).toContain(
      'if (Test-Path $ext_dir\\php_pcov.dll) { Remove-Item $ext_dir\\php_pcov.dll }'
    );
  });

  it('checking disableCoverage on linux', async () => {
    const linux: string = await coverage.addCoverage('none', '7.4', 'linux');
    expect(linux).toContain('sudo phpdismod -v 7.4 xdebug');
    expect(linux).toContain('sudo phpdismod -v 7.4 pcov');
    expect(linux).toContain('sudo sed -i "/xdebug/d" "$ini_file"');
    expect(linux).toContain('sudo sed -i "/pcov/d" "$ini_file"');
    expect(linux).toContain(
      'sudo DEBIAN_FRONTEND=noninteractive apt-fast remove php-xdebug php-pcov'
    );
  });

  it('checking disableCoverage on darwin', async () => {
    const darwin: string = await coverage.addCoverage('none', '7.4', 'darwin');
    expect(darwin).toContain('sudo sed -i \'\' "/xdebug/d" "$ini_file"');
    expect(darwin).toContain('sudo sed -i \'\' "/pcov/d" "$ini_file"');
    expect(darwin).toContain('sudo rm -rf "$ext_dir"/xdebug.so');
    expect(darwin).toContain('sudo rm -rf "$ext_dir"/pcov.so');
  });

  it('checking no or invalid coverage driver', async () => {
    let nocov: string = await coverage.addCoverage('nocov', '7.x', 'any');
    expect(nocov).toEqual('');

    nocov = await coverage.addCoverage('', '7.x', 'any');
    expect(nocov).toEqual('');
  });
});
