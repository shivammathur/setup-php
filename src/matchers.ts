import * as path from 'path';
import * as utils from './utils';
import * as io from '@actions/io';

/**
 * Cache json files for problem matchers
 */
export async function addMatchers(): Promise<void> {
  const config_path = path.join(
    __dirname,
    '..',
    'src',
    'configs',
    'phpunit.json'
  );
  const runner_dir: string = await utils.getInput('RUNNER_TOOL_CACHE', false);
  await io.cp(config_path, runner_dir);
}
