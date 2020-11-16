import {exec} from '@actions/exec/lib/exec';
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
export async function getScript(
  filename: string,
  version: string,
  os_version: string
): Promise<string> {
  const name = 'setup-php';
  const url = 'https://setup-php.com/support';
  // taking inputs
  process.env['fail_fast'] = await utils.getInput('fail-fast', false);
  const extension_csv: string = await utils.getInput('extensions', false);
  const ini_values_csv: string = await utils.getInput('ini-values', false);
  const coverage_driver: string = await utils.getInput('coverage', false);
  let tools_csv: string = await utils.getInput('tools', false);
  if (/.*-(beta|alpha|devel|snapshot|\d+\.\d+\.\d+).*/.test(extension_csv)) {
    tools_csv = 'pecl, ' + tools_csv;
  }

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
    const version: string = await utils.parseVersion(
      await utils.getInput('php-version', true)
    );
    const os_version: string = process.platform;
    const tool = await utils.scriptTool(os_version);
    const script = os_version + (await utils.scriptExtension(os_version));
    const location = await getScript(script, version, os_version);
    await exec(await utils.joins(tool, location, version, __dirname));
  } catch (error) {
    core.setFailed(error.message);
  }
}

// call the run function
run();
