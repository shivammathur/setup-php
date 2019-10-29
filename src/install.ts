import {exec} from '@actions/exec/lib/exec';
import * as core from '@actions/core';
import * as path from 'path';
import * as config from './config';
import * as coverage from './coverage';
import * as extensions from './extensions';
import * as utils from './utils';

/**
 * Build the script
 *
 * @param filename
 * @param version
 * @param os_version
 */
async function build(
  filename: string,
  version: string,
  os_version: string
): Promise<string> {
  // taking inputs
  let extension_csv: string = await utils.getInput('extension-csv', false);
  let ini_values_csv: string = await utils.getInput('ini-values-csv', false);
  let coverage_driver: string = await utils.getInput('coverage', false);

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
async function run() {
  try {
    let os_version: string = process.platform;
    let version: string = await utils.getInput('php-version', true);
    // check the os version and run the respective script
    if (os_version == 'darwin') {
      let script_path: string = await build('darwin.sh', version, os_version);
      await exec('sh ' + script_path + ' ' + version + ' ' + __dirname);
    } else if (os_version == 'win32') {
      let script_path: string = await build('win32.ps1', version, os_version);
      await exec(
        'pwsh ' + script_path + ' -version ' + version + ' -dir ' + __dirname
      );
    } else if (os_version == 'linux') {
      let script_path: string = await build('linux.sh', version, os_version);
      await exec('sh ' + script_path + ' ' + version + ' ' + __dirname);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

// call the run function
run();
