import path from 'path';
import fs from 'fs';
import * as yargs from 'yargs';
import * as config from './config';
import * as coverage from './coverage';
import * as extensions from './extensions';
import * as tools from './tools';
import * as local_utils from './local_utils';

// Helper function to get input from yargs argv.
// local_utils.getInput will now handle the logic of checking yargs_argv or env.
function getYargsInput(argv: yargs.ArgumentsCamelCase<any>, name: string, defaultValue?: string): string {
  // This function is primarily for direct use within local_installer.ts
  // For sub-modules, they should use local_utils.getInput()
  const value = argv[name.replace(/-/g, '')];
  if (value === undefined || value === null) {
    return defaultValue !== undefined ? defaultValue : '';
  }
  return String(value);
}


/**
 * Build the script
 */
async function getScript(os: string, argv: yargs.ArgumentsCamelCase<any>): Promise<string> {
  const url = 'https://setup-php.com/sponsor';
  const filename = os + (await local_utils.scriptExtension(os));
  const script_path = path.join(path.resolve(__dirname, '../src/scripts'), filename);
  const run_path = path.resolve(process.cwd(), 'run.sh');

  // Set environment variables from CLI options for shell scripts and local_utils.getInput as fallback
  Object.keys(argv).forEach(key => {
    if (key !== '_' && key !== '$0') {
      // Convert camelCase from yargs to UPPER_SNAKE_CASE for env vars, as scripts might expect that
      // e.g. phpVersion -> PHP_VERSION. This also helps local_utils.getInput via readEnv.
      const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
      process.env[envKey] = String(argv[key]);
    }
  });

  // Explicitly set some critical env vars that scripts use with specific names
  process.env['FAIL_FAST'] = getYargsInput(argv, 'fail-fast', 'false');
  process.env['PHPTS'] = getYargsInput(argv, 'phpts', 'nts');
  process.env['UPDATE'] = getYargsInput(argv, 'update', 'false');
  process.env['DEBUG'] = getYargsInput(argv, 'debug', 'false');
  process.env['RUNNER'] = getYargsInput(argv, 'runner', 'self-hosted');
  process.env['SETUP_PHP_TOOLS_DIR'] = getYargsInput(argv, 'tools-dir', '/usr/local/bin');
  process.env['RUNNER_TOOL_CACHE'] = getYargsInput(argv, 'runner-tool-cache', '/opt/hostedtoolcache');
  process.env['GITHUB_WORKSPACE'] = process.cwd(); // Default GITHUB_WORKSPACE
  delete process.env['GITHUB_ACTIONS']; // Ensure GITHUB_ACTIONS is not inadvertently set


  // These values are passed to the main functions of sub-modules
  // If those modules still use utils.getInput for *other* parameters,
  // local_utils.getInput will try to find them in process.env or the initialized yargs_argv
  const extension_csv: string = getYargsInput(argv, 'extensions', '');
  const ini_values_csv: string = getYargsInput(argv, 'ini-values', '');
  const coverage_driver: string = getYargsInput(argv, 'coverage', '');
  const tools_csv: string = getYargsInput(argv, 'tools', 'composer');

  const phpVersionInput: string = getYargsInput(argv, 'php-version', 'latest');
  const phpVersionFile: string = getYargsInput(argv, 'php-version-file', '.php-version');

  const version: string = await local_utils.parseVersion(
    await local_utils.readPHPVersion(phpVersionInput, phpVersionFile)
  );
  const ini_file: string = await local_utils.parseIniFile(
    getYargsInput(argv, 'ini-file', 'production')
  );

  // Use logging functions from local_utils
  let script = await local_utils.joins('.', script_path, version, ini_file);
  if (extension_csv) {
    // Assuming extensions.addExtension and others will use local_utils.getInput() internally
    // or are refactored to take all their params.
    // For now, rely on local_utils.getInput() being able to access process.env or yargs_argv
    script += await extensions.addExtension(extension_csv, version, os);
  }
  script += await tools.addTools(tools_csv, version, os);
  if (coverage_driver) {
    script += await coverage.addCoverage(coverage_driver, version, os);
  }
  if (ini_values_csv) {
    script += await config.addINIValues(ini_values_csv, os);
  }
  script += '\n' + (await local_utils.stepLog(`Sponsor setup-php`, os));
  script += '\n' + (await local_utils.addLog('$tick', 'setup-php', url, os));

  fs.writeFileSync(run_path, script, {mode: 0o755});

  return run_path;
}

/**
 * Main function to generate the script
 */
async function main(): Promise<void> {
  const argv = await yargs.default(process.argv.slice(2))
    .usage('Usage: $0 [options]')
    .option('php-version', { type: 'string', default: 'latest', description: 'PHP version (e.g., 8.2, latest, nightly)' })
    .option('php-version-file', { type: 'string', default: '.php-version', description: 'Path to .php-version file' })
    .option('extensions', { type: 'string', default: '', description: 'CSV list of PHP extensions (e.g., mbstring,gd)' })
    .option('ini-file', { type: 'string', default: 'production', choices: ['production', 'development', 'none'], description: 'Base php.ini file to use' })
    .option('ini-values', { type: 'string', default: '', description: 'CSV list of php.ini values (e.g., memory_limit=256M)' })
    .option('coverage', { type: 'string', default: '', choices: ['', 'xdebug', 'pcov', 'none'], description: 'Code coverage driver' })
    .option('tools', { type: 'string', default: 'composer', description: 'CSV list of tools to install (e.g., composer,phpunit)' })
    .option('fail-fast', { type: 'boolean', default: false, description: 'Exit immediately if a tool or extension fails to install' })
    .option('phpts', { type: 'string', default: 'nts', choices: ['nts', 'zts', 'ts'], description: 'PHP thread safety (nts or zts/ts)' })
    .option('update', { type: 'boolean', default: false, description: 'Force update PHP to the latest patch version' })
    .option('debug', { type: 'boolean', default: false, description: 'Install debug build of PHP' })
    .option('runner', { type: 'string', default: 'self-hosted', hidden: true, description: 'Runner type (self-hosted or github)' })
    .option('tools-dir', { type: 'string', default: '/usr/local/bin', description: 'Directory for installing tools' })
    .option('runner-tool-cache', { type: 'string', default: '/opt/hostedtoolcache', description: 'Directory for caching tools (like RUNNER_TOOL_CACHE)'})
    .help('h')
    .alias('h', 'help')
    .argv;

  local_utils.initYargs(argv); // Initialize yargs arguments for local_utils

  const os: string = process.platform;
  if (os !== 'linux') {
    console.error('This script is intended for Linux/Ubuntu environments.');
    process.exit(1);
  }

  try {
    const generatedScriptPath = await getScript(os, argv);
    console.log(`Setup script generated at: ${generatedScriptPath}`);
    console.log(`You can now run it using: sudo bash ${generatedScriptPath}`);
    console.log(`Important: Ensure that the following environment variables are set if your setup requires them:`);
    console.log(`  COMPOSER_AUTH_JSON, GITHUB_TOKEN, PACKAGIST_TOKEN (for private composer repositories)`);
    console.log(`  Any other environment variables specific to your PHP application or build process.`);

  } catch (error: any) {
    console.error('Error generating script:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Call the main function
main().catch(error => {
  console.error('Unhandled error in main:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
