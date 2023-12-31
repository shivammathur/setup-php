import * as install from '../src/install';
import * as utils from '../src/utils';

/**
 * Mock install.ts
 */
jest.mock('../src/install', () => ({
  getScript: jest
    .fn()
    .mockImplementation(async (os: string): Promise<string> => {
      const filename = os + (await utils.scriptExtension(os));
      const version: string = await utils.parseVersion(
        await utils.readPHPVersion()
      );
      const ini_file: string = await utils.parseIniFile(
        await utils.getInput('ini-file', false)
      );
      const extension_csv: string = process.env['extensions'] || '';
      const ini_values_csv: string = process.env['ini-values'] || '';
      const coverage_driver: string = process.env['coverage'] || '';
      const tools_csv: string = process.env['tools'] || '';
      let script = await utils.joins(filename, version, ini_file);
      script += extension_csv ? ' install extensions' : '';
      script += tools_csv ? ' add_tool' : '';
      script += coverage_driver ? ' set coverage driver' : '';
      script += ini_values_csv ? ' edit php.ini' : '';
      return script;
    }),
  run: jest.fn().mockImplementation(async (): Promise<string> => {
    const os: string = process.env['RUNNER_OS'] || '';
    const tool = await utils.scriptTool(os);
    return tool + (await install.getScript(os));
  })
}));

/**
 * Mock fetch.ts
 */
jest.mock('../src/fetch', () => ({
  fetch: jest.fn().mockImplementation(() => {
    return {
      data: '{ "latest": "8.3", "lowest": "8.1", "highest": "8.3", "nightly": "8.4", "5.x": "5.6" }'
    };
  })
}));

describe('Install', () => {
  it.each`
    version      | os          | extension_csv | ini_file         | ini_values_csv | coverage_driver | tools        | output
    ${'7.3'}     | ${'darwin'} | ${''}         | ${'production'}  | ${''}          | ${''}           | ${''}        | ${'bash darwin.sh 7.3 production'}
    ${'7.3'}     | ${'darwin'} | ${'a, b'}     | ${'development'} | ${'a=b'}       | ${'x'}          | ${''}        | ${'bash darwin.sh 7.3 development install extensions set coverage driver edit php.ini'}
    ${'7.4.1'}   | ${'darwin'} | ${''}         | ${'none'}        | ${''}          | ${''}           | ${''}        | ${'bash darwin.sh 7.4 none'}
    ${'8'}       | ${'darwin'} | ${''}         | ${''}            | ${''}          | ${''}           | ${''}        | ${'bash darwin.sh 8.0 production'}
    ${'8.0'}     | ${'darwin'} | ${''}         | ${'development'} | ${''}          | ${''}           | ${''}        | ${'bash darwin.sh 8.0 development'}
    ${'8.1'}     | ${'darwin'} | ${''}         | ${'none'}        | ${''}          | ${''}           | ${''}        | ${'bash darwin.sh 8.1 none'}
    ${'7.3'}     | ${'linux'}  | ${''}         | ${'invalid'}     | ${''}          | ${''}           | ${''}        | ${'bash linux.sh 7.3 production'}
    ${'7.3'}     | ${'linux'}  | ${'a, b'}     | ${'development'} | ${'a=b'}       | ${'x'}          | ${'phpunit'} | ${'bash linux.sh 7.3 development install extensions add_tool set coverage driver edit php.ini'}
    ${'latest'}  | ${'linux'}  | ${''}         | ${'none'}        | ${''}          | ${''}           | ${''}        | ${'bash linux.sh 8.3 none'}
    ${'lowest'}  | ${'linux'}  | ${''}         | ${'none'}        | ${''}          | ${''}           | ${''}        | ${'bash linux.sh 8.1 none'}
    ${'highest'} | ${'linux'}  | ${''}         | ${'none'}        | ${''}          | ${''}           | ${''}        | ${'bash linux.sh 8.3 none'}
    ${'nightly'} | ${'linux'}  | ${''}         | ${'none'}        | ${''}          | ${''}           | ${''}        | ${'bash linux.sh 8.4 none'}
    ${'7.0'}     | ${'win32'}  | ${''}         | ${'production'}  | ${''}          | ${''}           | ${''}        | ${'pwsh win32.ps1 7.0 production'}
    ${'7.3'}     | ${'win32'}  | ${''}         | ${'development'} | ${''}          | ${''}           | ${''}        | ${'pwsh win32.ps1 7.3 development'}
    ${'7.3'}     | ${'win32'}  | ${'a, b'}     | ${'none'}        | ${'a=b'}       | ${'x'}          | ${''}        | ${'pwsh win32.ps1 7.3 none install extensions set coverage driver edit php.ini'}
  `(
    'Test install on $os for $version with extensions=$extension_csv, ini_values=$ini_values_csv, coverage_driver=$coverage_driver, tools=$tools',
    async ({
      version,
      os,
      extension_csv,
      ini_file,
      ini_values_csv,
      coverage_driver,
      tools,
      output
    }) => {
      process.env['php-version'] = version.toString();
      process.env['RUNNER_OS'] = os;
      process.env['extensions'] = extension_csv;
      process.env['ini-file'] = ini_file;
      process.env['ini-values'] = ini_values_csv;
      process.env['coverage'] = coverage_driver;
      process.env['tools'] = tools;
      expect(await install.run()).toBe(output);
    }
  );
});
