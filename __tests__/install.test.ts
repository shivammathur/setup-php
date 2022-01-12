import * as install from '../src/install';
import * as utils from '../src/utils';

/**
 * Mock install.ts
 */
jest.mock('../src/install', () => ({
  getScript: jest.fn().mockImplementation(async (): Promise<string> => {
    const extension_csv: string = process.env['extensions'] || '';
    const ini_values_csv: string = process.env['ini-values'] || '';
    const coverage_driver: string = process.env['coverage'] || '';
    const tools_csv: string = process.env['tools'] || '';
    let script = 'initial script';
    script += extension_csv ? ' install extensions' : '';
    script += tools_csv ? ' add_tool' : '';
    script += coverage_driver ? ' set coverage driver' : '';
    script += ini_values_csv ? ' edit php.ini' : '';
    return script;
  }),
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
  it.each`
    version     | os          | extension_csv | ini_values_csv | coverage_driver | tools        | output
    ${'7.3'}    | ${'darwin'} | ${''}         | ${''}          | ${''}           | ${''}        | ${'initial script bash darwin.sh 7.3 ' + __dirname}
    ${'7.3'}    | ${'darwin'} | ${'a, b'}     | ${'a=b'}       | ${'x'}          | ${''}        | ${'initial script install extensions set coverage driver edit php.ini bash darwin.sh 7.3 ' + __dirname}
    ${'7.4.1'}  | ${'darwin'} | ${''}         | ${''}          | ${''}           | ${''}        | ${'initial script bash darwin.sh 7.4 ' + __dirname}
    ${'8'}      | ${'darwin'} | ${''}         | ${''}          | ${''}           | ${''}        | ${'initial script bash darwin.sh 8.0 ' + __dirname}
    ${'8.0'}    | ${'darwin'} | ${''}         | ${''}          | ${''}           | ${''}        | ${'initial script bash darwin.sh 8.0 ' + __dirname}
    ${'8.1'}    | ${'darwin'} | ${''}         | ${''}          | ${''}           | ${''}        | ${'initial script bash darwin.sh 8.1 ' + __dirname}
    ${'7.3'}    | ${'linux'}  | ${''}         | ${''}          | ${''}           | ${''}        | ${'initial script bash linux.sh 7.3 ' + __dirname}
    ${'7.3'}    | ${'linux'}  | ${'a, b'}     | ${'a=b'}       | ${'x'}          | ${'phpunit'} | ${'initial script install extensions add_tool set coverage driver edit php.ini bash linux.sh 7.3 ' + __dirname}
    ${'latest'} | ${'linux'}  | ${''}         | ${''}          | ${''}           | ${''}        | ${'initial script bash linux.sh 8.1 ' + __dirname}
    ${'7.0'}    | ${'win32'}  | ${''}         | ${''}          | ${''}           | ${''}        | ${'initial script pwsh win32.ps1 7.0 ' + __dirname}
    ${'7.3'}    | ${'win32'}  | ${''}         | ${''}          | ${''}           | ${''}        | ${'initial script pwsh win32.ps1 7.3 ' + __dirname}
    ${'7.3'}    | ${'win32'}  | ${'a, b'}     | ${'a=b'}       | ${'x'}          | ${''}        | ${'initial script install extensions set coverage driver edit php.ini pwsh win32.ps1 7.3 ' + __dirname}
  `(
    'Test install on $os for $version with extensions=$extension_csv, ini_values=$ini_values_csv, coverage_driver=$coverage_driver, tools=$tools',
    async ({
      version,
      os,
      extension_csv,
      ini_values_csv,
      coverage_driver,
      tools,
      output
    }) => {
      setEnv(
        version,
        os,
        extension_csv,
        ini_values_csv,
        coverage_driver,
        tools
      );

      expect(await install.run()).toBe(output);
    }
  );
});
