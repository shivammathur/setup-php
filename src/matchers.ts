import * as path from 'path';
import * as utils from './utils';
import * as io from '@actions/io';

/**
 * Cache json files for problem matchers
 */
export async function addMatchers(): Promise<void> {
  const config_path = path.join(__dirname, '..', 'src', 'configs');
  const runner_dir: string = await utils.getInput('RUNNER_TOOL_CACHE', false);
  await io.cp(path.join(config_path, 'phpunit.json'), runner_dir);
  await io.cp(path.join(config_path, 'php.json'), runner_dir);
}
