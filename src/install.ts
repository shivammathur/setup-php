import {exec} from '@actions/exec/lib/exec';
import * as core from '@actions/core';
import * as config from './config';
import * as coverage from './coverage';
import * as extensions from './extensions';
import * as utils from './utils';
import * as matchers from './matchers';

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
  const extension_csv: string =
    (await utils.getInput('extensions', false)) ||
    (await utils.getInput('extension-csv', false));
  const ini_values_csv: string =
    (await utils.getInput('ini-values', false)) ||
    (await utils.getInput('ini-values-csv', false));
  const coverage_driver: string = await utils.getInput('coverage', false);
  const setup_matchers: string = await utils.getInput('matchers', false);

  let script: string = await utils.readScript(filename, version, os_version);
  if (extension_csv) {
    script += await extensions.addExtension(extension_csv, version, os_version);
  }
  if (ini_values_csv) {
    script += await config.addINIValues(ini_values_csv, os_version);
  }
  if (coverage_driver) {
    script += await coverage.addCoverage(coverage_driver, version, os_version);
  }

  return await utils.writeScript(filename, script);
}

/**
 * Run the script
 */
export async function run(): Promise<void> {
  try {
    const os_version: string = process.platform;
    let version: string = await utils.getInput('php-version', true);
    version = version.length > 1 ? version.slice(0, 3) : version + '.0';
    // check the os version and run the respective script
    let script_path = '';
    switch (os_version) {
      case 'darwin':
        script_path = await build(os_version + '.sh', version, os_version);
        await exec('sh ' + script_path + ' ' + version + ' ' + __dirname);
        break;
      case 'linux': {
        const pecl: string = await utils.getInput('pecl', false);
        script_path = await build(os_version + '.sh', version, os_version);
        await exec('sh ' + script_path + ' ' + version + ' ' + pecl);
        break;
      }
      case 'win32':
        script_path = await build('win32.ps1', version, os_version);
        await exec(
          'pwsh ' + script_path + ' -version ' + version + ' -dir ' + __dirname
        );
        break;
    }
    await matchers.addMatchers();
  } catch (error) {
    core.setFailed(error.message);
  }
}

// call the run function
run();
