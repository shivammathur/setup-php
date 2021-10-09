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
        let script = 'initial script ' + filename + version + os_version;
        script += tools_csv ? 'add_tool' : '';
        script += extension_csv ? 'install extensions' : '';
        script += coverage_driver ? 'set coverage driver' : '';
        script += ini_values_csv ? 'edit php.ini' : '';
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
  it.each`
    version  | extension_csv | ini_values_csv | coverage_driver | tools | output
    ${'7.0'} | ${''}         | ${''}          | ${''}           | ${''} | ${new RegExp(`initial script.*pwsh win32.ps1 7.0.*${__dirname}`)}
    ${'7.3'} | ${''}         | ${''}          | ${''}           | ${''} | ${new RegExp(`initial script.*pwsh win32.ps1 7.3.*${__dirname}`)}
    ${'7.3'} | ${'a, b'}     | ${'a=b'}       | ${'x'}          | ${''} | ${new RegExp(`initial script.*install extensions*set coverage driver.*edit php.ini.*pwsh win32.ps1 7.3.*${__dirname}`)}
  `(
    'Test install on windows for $version with extensions=$extension_csv, ini_values=$ini_values_csv, coverage_driver=$coverage_driver, tools=$tools',
    async ({
      version,
      extension_csv,
      ini_values_csv,
      coverage_driver,
      tools,
      output
    }) => {
      setEnv(
        version,
        'win32',
        extension_csv,
        ini_values_csv,
        coverage_driver,
        tools
      );

      expect(await install.run()).toMatch(output);
    }
  );

  it.each`
    version     | extension_csv | ini_values_csv | coverage_driver | tools        | output
    ${'7.3'}    | ${''}         | ${''}          | ${''}           | ${''}        | ${new RegExp(`initial script.*bash linux.sh 7.3`)}
    ${'latest'} | ${''}         | ${''}          | ${''}           | ${''}        | ${new RegExp(`initial script.*bash linux.sh 8.0`)}
    ${'7.3'}    | ${'a, b'}     | ${'a=b'}       | ${'x'}          | ${'phpunit'} | ${new RegExp(`initial script.*add_tool.*install extensions.*set coverage driver.*edit php.ini.*bash linux.sh 7.3`)}
  `(
    'Test install on linux for $version with extensions=$extension_csv, ini_values=$ini_values_csv, coverage_driver=$coverage_driver, tools=$tools',
    async ({
      version,
      extension_csv,
      ini_values_csv,
      coverage_driver,
      tools,
      output
    }) => {
      setEnv(
        version,
        'linux',
        extension_csv,
        ini_values_csv,
        coverage_driver,
        tools
      );

      expect('' + (await install.run())).toMatch(output);
    }
  );

  it.each`
    version  | extension_csv | ini_values_csv | coverage_driver | tools | output
    ${'7.3'} | ${''}         | ${''}          | ${''}           | ${''} | ${new RegExp(`initial script.*bash darwin.sh 7.3 .*${__dirname}`)}
    ${'7.3'} | ${'a, b'}     | ${'a=b'}       | ${'x'}          | ${''} | ${new RegExp(`initial script.*install extensions.*set coverage driver.*edit php.ini.*bash darwin.sh 7.3 .*${__dirname}`)}
  `(
    'Test install on darwin for $version with extensions=$extension_csv, ini_values=$ini_values_csv, coverage_driver=$coverage_driver, tools=$tools',
    async ({
      version,
      extension_csv,
      ini_values_csv,
      coverage_driver,
      tools,
      output
    }) => {
      setEnv(
        version,
        'darwin',
        extension_csv,
        ini_values_csv,
        coverage_driver,
        tools
      );

      expect('' + (await install.run())).toMatch(output);
    }
  );

  it.each`
    version    | extension_csv | ini_values_csv | coverage_driver | tools | output
    ${'7.4.1'} | ${''}         | ${''}          | ${''}           | ${''} | ${new RegExp(`initial script.*bash darwin.sh 7.4 .*${__dirname}`)}
    ${'8.0'}   | ${''}         | ${''}          | ${''}           | ${''} | ${new RegExp(`initial script.*bash darwin.sh 8.0 .*${__dirname}`)}
    ${'8'}     | ${''}         | ${''}          | ${''}           | ${''} | ${new RegExp(`initial script.*bash darwin.sh 8.0 .*${__dirname}`)}
    ${'8.1'}   | ${''}         | ${''}          | ${''}           | ${''} | ${new RegExp(`initial script.*bash darwin.sh 8.1 .*${__dirname}`)}
  `(
    'Test malformed version inputs for $version with extensions=$extension_csv, ini_values=$ini_values_csv, coverage_driver=$coverage_driver, tools=$tools',
    async ({
      version,
      extension_csv,
      ini_values_csv,
      coverage_driver,
      tools,
      output
    }) => {
      setEnv(
        version,
        'darwin',
        extension_csv,
        ini_values_csv,
        coverage_driver,
        tools
      );

      expect('' + (await install.run())).toMatch(output);
    }
  );
});
