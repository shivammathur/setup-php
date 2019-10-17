import {exec} from '@actions/exec/lib/exec';
import * as core from '@actions/core';
import * as utils from './utils';
import * as extensions from './extensions';
import * as config from './config';
import * as coverage from './coverage';

/**
 * Build the script
 *
 * @param filename
 * @param version
 * @param os_version
 */
async function build(filename: string, version: string, os_version: string) {
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
  await utils.writeScript(filename, version, script);
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
      await build('darwin.sh', version, os_version);
      await exec('sh ./' + version + 'darwin.sh ' + version);
    } else if (os_version == 'win32') {
      await build('win32.ps1', version, os_version);
      await exec('powershell .\\' + version + 'win32.ps1 -version ' + version);
    } else if (os_version == 'linux') {
      await build('linux.sh', version, os_version);
      await exec('./' + version + 'linux.sh ' + version);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

// call the run function
run();
