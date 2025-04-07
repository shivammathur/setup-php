import path from 'path';
import fs from 'fs';
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
 * @param os
 */
export async function getScript(os: string): Promise<string> {
  const url = 'https://setup-php.com/sponsor';
  const filename = os + (await utils.scriptExtension(os));
  const script_path = path.join(__dirname, '../src/scripts', filename);
  const run_path = script_path.replace(os, 'run');
  process.env['fail_fast'] = await utils.getInput('fail-fast', false);
  const extension_csv: string = await utils.getInput('extensions', false);
  const ini_values_csv: string = await utils.getInput('ini-values', false);
  const coverage_driver: string = await utils.getInput('coverage', false);
  const tools_csv: string = await utils.getInput('tools', false);
  const version: string = await utils.parseVersion(
    await utils.readPHPVersion()
  );
  const ini_file: string = await utils.parseIniFile(
    await utils.getInput('ini-file', false)
  );
  let script = await utils.joins('.', script_path, version, ini_file);
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

  fs.writeFileSync(run_path, script, {mode: 0o755});

  return run_path;
}

/**
 * Run the script
 */
export async function run(): Promise<void> {
  const os: string = process.platform;
  const tool = await utils.scriptTool(os);
  const run_path = await getScript(os);
  await exec(tool + run_path);
}

// call the run function
(async () => {
  await run();
})().catch(error => {
  core.setFailed(error.message);
});
