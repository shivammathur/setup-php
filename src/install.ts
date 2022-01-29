import {exec} from '@actions/exec';
import * as core from '@actions/core';
import * as config from './config';
import * as coverage from './coverage';
import * as extensions from './extensions';
import * as tools from './tools';
import * as utils from './utils';
import path from 'path';
import fs from 'fs';

/**
 * Build the script
 *
 * @param filename
 * @param version
 * @param os
 */
export async function getScript(
  filename: string,
  version: string,
  os: string
): Promise<string> {
  const url = 'https://setup-php.com/sponsor';
  // taking inputs
  process.env['fail_fast'] = await utils.getInput('fail-fast', false);
  const extension_csv: string = await utils.getInput('extensions', false);
  const ini_values_csv: string = await utils.getInput('ini-values', false);
  const coverage_driver: string = await utils.getInput('coverage', false);
  const tools_csv: string = await utils.getInput('tools', false);
  const script_path = path.join(__dirname, '../src/scripts', filename);
  let script = '\n';
  if (extension_csv) {
    script += await extensions.addExtension(extension_csv, version, os);
  }
  script += await tools.addTools(tools_csv, version, os);
  if (coverage_driver) {
    script += await coverage.addCoverage(coverage_driver, version, os);
  }
  if (ini_values_csv) {
    script += await config.addINIValues(ini_values_csv, os);
  }
  script += '\n' + (await utils.stepLog(`Sponsor setup-php`, os));
  script += '\n' + (await utils.addLog('$tick', 'setup-php', url, os));

  fs.appendFileSync(script_path, script, {mode: 0o755});

  return script_path;
}

/**
 * Run the script
 */
export async function run(): Promise<void> {
  try {
    if ((await utils.readEnv('ImageOS')) == 'ubuntu16') {
      core.setFailed(
        'setup-php is not supported on Ubuntu 16.04. Please upgrade to Ubuntu 18.04 or Ubuntu 20.04 - https://setup-php.com/i/452'
      );
      return;
    }
    const version: string = await utils.parseVersion(
      await utils.getInput('php-version', true)
    );
    const ini_file: string = await utils.parseIniFile(
      await utils.getInput('ini-file', false)
    );
    if (version) {
      const os: string = process.platform;
      const tool = await utils.scriptTool(os);
      const script = os + (await utils.scriptExtension(os));
      const location = await getScript(script, version, os);
      await exec(await utils.joins(tool, location, version, ini_file));
    } else {
      core.setFailed('Unable to get the PHP version');
    }
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

// call the run function
(async () => {
  await run();
})().catch(error => {
  core.setFailed(error.message);
});
