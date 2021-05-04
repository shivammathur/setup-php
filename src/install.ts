import {exec} from '@actions/exec';
import * as core from '@actions/core';
import * as config from './config';
import * as coverage from './coverage';
import * as extensions from './extensions';
import * as tools from './tools';
import * as utils from './utils';

/**
 * Build the script
 *
 * @param filename
 * @param version
 * @param os_version
 */
export async function build(
  filename: string,
  version: string,
  os_version: string
): Promise<string> {
  // taking inputs
  const name = 'setup-php';
  const url = 'https://setup-php.com/support';
  const extension_csv: string =
    (await utils.getInput('extensions', false)) ||
    (await utils.getInput('extension', false)) ||
    (await utils.getInput('extension-csv', false));
  const ini_values_csv: string =
    (await utils.getInput('ini-values', false)) ||
    (await utils.getInput('ini-values-csv', false));
  const coverage_driver: string = await utils.getInput('coverage', false);
  const tools_csv: string = await utils.getInput('tools', false);

  let script: string = await utils.readScript(filename);
  script += await tools.addTools(tools_csv, version, os_version);

  if (extension_csv) {
    script += await extensions.addExtension(extension_csv, version, os_version);
  }
  if (coverage_driver) {
    script += await coverage.addCoverage(coverage_driver, version, os_version);
  }
  if (ini_values_csv) {
    script += await config.addINIValues(ini_values_csv, os_version);
  }

  script += '\n' + (await utils.stepLog('Support this project', os_version));
  script += '\n' + (await utils.addLog('$tick', name, url, os_version));

  return await utils.writeScript(filename, script);
}

/**
 * Run the script
 */
export async function run(): Promise<void> {
  try {
    core.warning(
      'setup-php v1 is deprecated.\nPlease upgrade to v2 - https://setup-php.com/w/Switch-to-v2'
    );
    const version: string = await utils.parseVersion(
      await utils.getInput('php-version', true)
    );
    if (version == '8.1') {
      core.setFailed(
        'PHP 8.1 is not supported on setup-php v1.\nPlease upgrade to v2 - https://setup-php.com/w/Switch-to-v2'
      );
      return;
    }
    if (version) {
      const os_version: string = process.platform;
      // check the os version and run the respective script
      let script_path = '';
      switch (os_version) {
        case 'darwin':
        case 'linux':
          script_path = await build(os_version + '.sh', version, os_version);
          await exec('bash ' + script_path + ' ' + version + ' ' + __dirname);
          break;
        case 'win32':
          script_path = await build('win32.ps1', version, os_version);
          await exec('pwsh ' + script_path + ' ' + version + ' ' + __dirname);
          break;
      }
    } else {
      core.setFailed('Unable to get the PHP version');
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

// call the run function
(async () => {
  await run();
})().catch(error => {
  core.setFailed(error.message);
});
