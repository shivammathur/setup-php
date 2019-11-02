import * as install from '../src/install';

/**
 * Mock install.ts
 */
jest.mock('../src/install', () => ({
  build: jest.fn().mockImplementation(
    async (
      filename: string,
      version: string,
      os_version: string
    ): Promise<string> => {
      let extension_csv: string = process.env['extension-csv'] || '';
      let ini_values_csv: string = process.env['ini-values-csv'] || '';
      let coverage_driver: string = process.env['coverage'] || '';

      let script: string = 'initial script';
      if (extension_csv) {
        script += 'install extensions';
      }
      if (ini_values_csv) {
        script += 'edit php.ini';
      }
      if (coverage_driver) {
        script += 'set coverage driver';
      }

      return script;
    }
  ),
  run: jest.fn().mockImplementation(
    async (): Promise<string> => {
      let os_version: string = process.env['RUNNER_OS'] || '';
      let version: string = process.env['php-version'] || '';
      let script: string = '';
      switch (os_version) {
        case 'darwin':
        case 'linux':
          script = await install.build(os_version + '.sh', version, os_version);
          script += 'sh script.sh ' + version + ' ' + __dirname;
          break;
        case 'win32':
          script = await install.build(os_version + '.sh', version, os_version);
          script +=
            'pwsh script.ps1 -version ' + version + ' -dir ' + __dirname;
          break;
        default:
          script += os_version + ' is not supported';
      }

      return script;
    }
  )
}));

/**
 * Function to set the process.env
 *
 * @param version
 * @param os
 * @param extension_csv
 * @param ini_values_csv
 * @param coverage_driver
 */
function setEnv(
  version: string,
  os: string,
  extension_csv: string,
  ini_values_csv: string,
  coverage_driver: string
): void {
  process.env['php-version'] = version;
  process.env['RUNNER_OS'] = os;
  process.env['extension-csv'] = extension_csv;
  process.env['ini-values-csv'] = ini_values_csv;
  process.env['coverage'] = coverage_driver;
}

describe('Install', () => {
  it('Test install on windows', async () => {
    setEnv('7.3', 'win32', '', '', '');
    // @ts-ignore
    let script: string = await install.run();
    expect(script).toContain('initial script');
    expect(script).toContain('pwsh script.ps1 -version 7.3 -dir ' + __dirname);

    setEnv('7.3', 'win32', 'a, b', 'a=b', 'x');
    // @ts-ignore
    script = await install.run();
    expect(script).toContain('initial script');
    expect(script).toContain('install extensions');
    expect(script).toContain('edit php.ini');
    expect(script).toContain('set coverage driver');
    expect(script).toContain('pwsh script.ps1 -version 7.3 -dir ' + __dirname);
  });

  it('Test install on linux', async () => {
    setEnv('7.3', 'linux', '', '', '');
    // @ts-ignore
    let script: string = await install.run();
    expect(script).toContain('initial script');
    expect(script).toContain('sh script.sh 7.3 ' + __dirname);

    setEnv('7.3', 'linux', 'a, b', 'a=b', 'x');
    // @ts-ignore
    script = await install.run();
    expect(script).toContain('initial script');
    expect(script).toContain('install extensions');
    expect(script).toContain('edit php.ini');
    expect(script).toContain('set coverage driver');
    expect(script).toContain('sh script.sh 7.3 ' + __dirname);
  });

  it('Test install on darwin', async () => {
    setEnv('7.3', 'darwin', '', '', '');
    // @ts-ignore
    let script: string = await install.run();
    expect(script).toContain('initial script');
    expect(script).toContain('sh script.sh 7.3 ' + __dirname);

    setEnv('7.3', 'darwin', 'a, b', 'a=b', 'x');
    // @ts-ignore
    script = await install.run();
    expect(script).toContain('initial script');
    expect(script).toContain('install extensions');
    expect(script).toContain('edit php.ini');
    expect(script).toContain('set coverage driver');
    expect(script).toContain('sh script.sh 7.3 ' + __dirname);
  });
});
