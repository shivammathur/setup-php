import {exec} from '@actions/exec/lib/exec';
import * as core from '@actions/core';
import * as utils from './utils';
import * as extensions from './extensions';
import * as config from './config';
import * as coverage from './coverage';

/**
 * Run the script
 */
async function run() {
  try {
    // taking inputs
    let version: string = await utils.getInput('php-version', true);
    let extension_csv: string = await utils.getInput('extension-csv', false);
    let ini_values_csv: string = await utils.getInput('ini-values-csv', false);
    let coverage_driver: string = await utils.getInput('coverage', false);

    let os_version: string = process.platform;
    // check the os version and run the respective script
    if (os_version == 'darwin') {
      let darwin: string = await utils.readScript(
        'darwin.sh',
        version,
        os_version
      );

      darwin += await extensions.addExtension(
        extension_csv,
        version,
        os_version
      );
      darwin += await config.addINIValues(ini_values_csv, os_version);
      darwin += await coverage.addCoverage(
        coverage_driver,
        version,
        os_version
      );
      await utils.writeScript('darwin.sh', version, darwin);
      await exec('sh ./' + version + 'darwin.sh ' + version);
    } else if (os_version == 'win32') {
      let windows: string = await utils.readScript(
        'win32.ps1',
        version,
        os_version
      );
      windows += await extensions.addExtension(
        extension_csv,
        version,
        os_version
      );
      windows += await config.addINIValues(ini_values_csv, os_version);
      windows += await coverage.addCoverage(
        coverage_driver,
        version,
        os_version
      );
      await utils.writeScript('win32.ps1', version, windows);
      await exec('powershell .\\' + version + 'win32.ps1 -version ' + version);
    } else if (os_version == 'linux') {
      let linux: string = await utils.readScript(
        'linux.sh',
        version,
        os_version
      );
      linux += await extensions.addExtension(
        extension_csv,
        version,
        os_version
      );
      linux += await config.addINIValues(ini_values_csv, os_version);
      linux += await coverage.addCoverage(coverage_driver, version, os_version);
      await utils.writeScript('linux.sh', version, linux);
      await exec('./' + version + 'linux.sh ' + version);
    }
  } catch (err) {
    core.setFailed(err.message);
  }
}

// call the run function
run();
