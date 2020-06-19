import * as coverage from '../src/coverage';

jest.mock('../src/extensions', () => ({
  addExtension: jest.fn().mockImplementation(extension => {
    return 'add_extension ' + extension + '\n';
  })
}));

describe('Config tests', () => {
  it('checking addCoverage with PCOV on windows', async () => {
    let win32: string = await coverage.addCoverage('PCOV', '7.4', 'win32');
    expect(win32).toContain('add_extension pcov');
    expect(win32).toContain('Remove-Extension xdebug');

    win32 = await coverage.addCoverage('pcov', '7.0', 'win32');
    expect(win32).toContain('PHP 7.1 or newer is required');

    win32 = await coverage.addCoverage('pcov', '5.6', 'win32');
    expect(win32).toContain('PHP 7.1 or newer is required');
  });

  it('checking addCoverage with PCOV on linux', async () => {
    const linux: string = await coverage.addCoverage('pcov', '7.4', 'linux');
    expect(linux).toContain('add_extension pcov');
    expect(linux).toContain('remove_extension xdebug');
  });

  it('checking addCoverage with PCOV on darwin', async () => {
    const darwin: string = await coverage.addCoverage('pcov', '7.4', 'darwin');
    expect(darwin).toContain('add_extension pcov');
    expect(darwin).toContain('remove_extension xdebug');
  });

  it('checking addCoverage with Xdebug on windows', async () => {
    const win32: string = await coverage.addCoverage('xdebug', '7.4', 'win32');
    expect(win32).toContain('add_extension xdebug');
  });

  it('checking addCoverage with Xdebug on windows', async () => {
    const win32: string = await coverage.addCoverage('xdebug', '8.0', 'win32');
    expect(win32).toContain('Xdebug currently only supports PHP 7.4 or lower');
  });

  it('checking addCoverage with Xdebug on linux', async () => {
    const linux: string = await coverage.addCoverage('xdebug', '7.4', 'linux');
    expect(linux).toContain('add_extension xdebug');
  });

  it('checking addCoverage with Xdebug on linux', async () => {
    const linux: string = await coverage.addCoverage('xdebug', '8.0', 'linux');
    expect(linux).toContain('add_extension xdebug');
    expect(linux).toContain('echo "xdebug.mode=coverage"');
  });

  it('checking addCoverage with Xdebug on darwin', async () => {
    const darwin: string = await coverage.addCoverage(
      'xdebug',
      '7.4',
      'darwin'
    );
    expect(darwin).toContain('add_extension xdebug');
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
    expect(win32).toContain('Remove-Extension xdebug');
    expect(win32).toContain('Remove-Extension pcov');
  });

  it('checking disableCoverage on linux', async () => {
    const linux: string = await coverage.addCoverage('none', '7.4', 'linux');
    expect(linux).toContain('remove_extension xdebug');
    expect(linux).toContain('remove_extension pcov');
  });

  it('checking disableCoverage on darwin', async () => {
    const darwin: string = await coverage.addCoverage('none', '7.4', 'darwin');
    expect(darwin).toContain('remove_extension xdebug');
    expect(darwin).toContain('remove_extension pcov');
  });

  it('checking no or invalid coverage driver', async () => {
    let nocov: string = await coverage.addCoverage('nocov', '7.x', 'any');
    expect(nocov).toEqual('');

    nocov = await coverage.addCoverage('', '7.x', 'any');
    expect(nocov).toEqual('');
  });
});
