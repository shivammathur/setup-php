import * as install from '../src/install';
import * as utils from '../src/utils';

/**
 * Mock install.ts
 */
jest.mock('../src/install', () => ({
  getScript: jest
    .fn()
    .mockImplementation(
      async (
        filename: string,
        version: string,
        os_version: string
      ): Promise<string> => {
        const extension_csv: string = process.env['extensions'] || '';
        const ini_values_csv: string = process.env['ini-values'] || '';
        const coverage_driver: string = process.env['coverage'] || '';
        let tools_csv: string = process.env['tools'] || '';
        const pecl: string = process.env['pecl'] || '';
        if (pecl == 'true') {
          tools_csv = 'pecl, ' + tools_csv;
        }

        let script = 'initial script ' + filename + version + os_version;
        if (tools_csv) {
          script += 'add_tool';
        }
        if (extension_csv) {
          script += 'install extensions';
        }
        if (coverage_driver) {
          script += 'set coverage driver';
        }
        if (ini_values_csv) {
          script += 'edit php.ini';
        }

        return script;
      }
    ),
  run: jest.fn().mockImplementation(async (): Promise<string> => {
    const os_version: string = process.env['RUNNER_OS'] || '';
    const version: string = await utils.parseVersion(
      await utils.getInput('php-version', true)
    );
    const tool = await utils.scriptTool(os_version);
    const filename = os_version + (await utils.scriptExtension(os_version));
    return [
      await install.getScript(filename, version, os_version),
      tool,
      filename,
      version,
      __dirname
    ].join(' ');
  })
}));

/**
 * Function to set the process.env
 *
 * @param version
 * @param os
 * @param extension_csv
 * @param ini_values_csv
 * @param coverage_driver
 * @param tools
 */
function setEnv(
  version: string | number,
  os: string,
  extension_csv: string,
  ini_values_csv: string,
  coverage_driver: string,
  tools: string
): void {
  process.env['php-version'] = version.toString();
  process.env['RUNNER_OS'] = os;
  process.env['extensions'] = extension_csv;
  process.env['ini-values'] = ini_values_csv;
  process.env['coverage'] = coverage_driver;
  process.env['tools'] = tools;
}

describe('Install', () => {
  it('Test install on windows', async () => {
    setEnv('7.0', 'win32', '', '', '', '');

    let script: string = '' + (await install.run());
    expect(script).toContain('initial script');
    expect(script).toContain('pwsh win32.ps1 7.0 ' + __dirname);

    setEnv('7.3', 'win32', '', '', '', '');

    script = '' + (await install.run());
    expect(script).toContain('initial script');
    expect(script).toContain('pwsh win32.ps1 7.3 ' + __dirname);

    setEnv('7.3', 'win32', 'a, b', 'a=b', 'x', '');

    script = '' + (await install.run());
    expect(script).toContain('initial script');
    expect(script).toContain('install extensions');
    expect(script).toContain('edit php.ini');
    expect(script).toContain('set coverage driver');
    expect(script).toContain('pwsh win32.ps1 7.3 ' + __dirname);
  });

  it('Test install on linux', async () => {
    setEnv('7.3', 'linux', '', '', '', '');

    let script: string = '' + (await install.run());
    expect(script).toContain('initial script');
    expect(script).toContain('bash linux.sh 7.3 ');

    setEnv('latest', 'linux', '', '', '', '');

    script = '' + (await install.run());
    expect(script).toContain('initial script');
    expect(script).toContain('bash linux.sh 8.0 ');

    setEnv('7.3', 'linux', 'a, b', 'a=b', 'x', 'phpunit');

    script = '' + (await install.run());
    expect(script).toContain('initial script');
    expect(script).toContain('install extensions');
    expect(script).toContain('edit php.ini');
    expect(script).toContain('set coverage driver');
    expect(script).toContain('bash linux.sh 7.3');
    expect(script).toContain('add_tool');
  });

  it('Test install on darwin', async () => {
    setEnv('7.3', 'darwin', '', '', '', '');

    let script: string = '' + (await install.run());
    expect(script).toContain('initial script');
    expect(script).toContain('bash darwin.sh 7.3 ' + __dirname);

    setEnv('7.3', 'darwin', 'a, b', 'a=b', 'x', '');

    script = '' + (await install.run());
    expect(script).toContain('initial script');
    expect(script).toContain('install extensions');
    expect(script).toContain('edit php.ini');
    expect(script).toContain('set coverage driver');
    expect(script).toContain('bash darwin.sh 7.3 ' + __dirname);
  });

  it('Test malformed version inputs', async () => {
    setEnv('7.4.1', 'darwin', '', '', '', '');

    let script: string = '' + '' + (await install.run());
    expect(script).toContain('initial script');
    expect(script).toContain('bash darwin.sh 7.4 ' + __dirname);

    setEnv(8.0, 'darwin', '', '', '', '');

    script = '' + (await install.run());
    expect(script).toContain('initial script');
    expect(script).toContain('bash darwin.sh 8.0 ' + __dirname);

    setEnv(8, 'darwin', '', '', '', '');

    script = '' + (await install.run());
    expect(script).toContain('initial script');
    expect(script).toContain('bash darwin.sh 8.0 ' + __dirname);

    setEnv(8.1, 'darwin', '', '', '', '');

    script = '' + (await install.run());
    expect(script).toContain('initial script');
    expect(script).toContain('bash darwin.sh 8.1 ' + __dirname);
  });
});
