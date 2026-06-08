import fs from 'fs';
import * as path from 'path';
import * as core from './core';
import * as fetch from './fetch';

/**
 * Function to read environment variable and return a string value.
 *
 * @param property
 */
export async function readEnv(property: string): Promise<string> {
  if (!/^[A-Za-z0-9_-]+$/.test(property)) {
    return '';
  }
  const property_lc: string = property.toLowerCase();
  const property_uc: string = property.toUpperCase();
  const candidates = [
    property,
    property_lc,
    property_uc,
    property_lc.replace('_', '-'),
    property_uc.replace('_', '-')
  ].filter((value, index, array) => array.indexOf(value) === index);
  return candidates.map(name => process.env[name] || '').find(Boolean) || '';
}

/**
 * Function to get inputs from both with and env annotations.
 *
 * @param name
 * @param mandatory
 */
export async function getInput(
  name: string,
  mandatory: boolean
): Promise<string> {
  const input = core.getInput(name);
  const env_input = await readEnv(name);
  switch (true) {
    case input != '':
      return input;
    case input == '' && env_input != '':
      return env_input;
    case input == '' && env_input == '' && mandatory:
      throw new Error(`Input required and not supplied: ${name}`);
    default:
      return '';
  }
}

/**
 * Function to get manifest URL
 */
export async function getManifestURLS(): Promise<string[]> {
  return [
    'https://raw.githubusercontent.com/shivammathur/setup-php/develop/src/configs/php-versions.json',
    'https://setup-php.com/php-versions.json'
  ];
}

/**
 * Function to parse PHP version.
 *
 * @param version
 */
export async function parseVersion(version: string): Promise<string> {
  switch (true) {
    case /^pre(-installed)?$/.test(version):
      return 'pre';
    case /^(latest|lowest|highest|nightly|master|\d+\.x)$/.test(version):
      for (const manifestURL of await getManifestURLS()) {
        const fetchResult = await fetch.fetch(manifestURL);
        if (fetchResult['data'] ?? false) {
          const resolved: string | undefined = JSON.parse(fetchResult['data'])[
            version
          ];
          if (resolved === undefined) {
            throw new Error(`Invalid PHP version: ${version.slice(0, 20)}`);
          }
          if (!/^\d+\.\d+$/.test(resolved)) {
            throw new Error(
              `Invalid PHP version in manifest: ${resolved.slice(0, 10)}`
            );
          }
          return resolved;
        }
      }
      throw new Error(`Could not fetch the PHP version manifest.`);
    default:
      if (!/^\d+(\.\d+){0,2}$/.test(version)) {
        throw new Error(`Invalid PHP version: ${version.slice(0, 20)}`);
      }
      switch (true) {
        case version.length > 1:
          return version.slice(0, 3);
        default:
          return version + '.0';
      }
  }
}

/**
 * Function to parse ini file.
 *
 * @param ini_file
 */
export async function parseIniFile(ini_file: string): Promise<string> {
  if (/^(production|development|none)$/.test(ini_file)) {
    return ini_file;
  }
  const match = ini_file.match(/php\.ini-(production|development)$/);
  return match ? match[1] : 'production';
}

/**
 * Async foreach loop using modern for...of pattern
 *
 * @param array
 * @param callback
 */
export async function asyncForEach(
  array: Array<string>,
  callback: (
    element: string,
    index: number,
    array: Array<string>
  ) => Promise<void>
): Promise<void> {
  for (const [index, element] of array.entries()) {
    await callback(element, index, array);
  }
}

/**
 * Get color index
 *
 * @param type
 */
export async function color(type: string): Promise<string> {
  switch (type) {
    case 'error':
      return '31';
    default:
    case 'success':
      return '32';
    case 'warning':
      return '33';
  }
}

/**
 * Log to console
 *
 * @param message
 * @param os
 * @param log_type
 */
export async function log(
  message: string,
  os: string,
  log_type: string
): Promise<string> {
  switch (os) {
    case 'win32':
      return (
        'printf "\\033[' +
        (await color(log_type)) +
        ';1m' +
        message +
        ' \\033[0m"'
      );

    case 'linux':
    case 'darwin':
    default:
      return (
        'echo "\\033[' + (await color(log_type)) + ';1m' + message + '\\033[0m"'
      );
  }
}

/**
 * Function to log a step
 *
 * @param message
 * @param os
 */
export async function stepLog(message: string, os: string): Promise<string> {
  switch (os) {
    case 'win32':
      return 'Step-Log "' + escapeForShell(message, os) + '"';
    case 'linux':
    case 'darwin':
      return 'step_log "' + escapeForShell(message, os) + '"';
    default:
      return await log('Platform ' + os + ' is not supported', os, 'error');
  }
}

/**
 * Function to log a result
 * @param mark
 * @param subject
 * @param message
 * @param os
 */
export async function addLog(
  mark: string,
  subject: string,
  message: string,
  os: string
): Promise<string> {
  const sub = escapeForShell(subject, os);
  const msg = escapeForShell(message, os);
  switch (os) {
    case 'win32':
      return `Add-Log "${mark}" "${sub}" "${msg}"`;
    case 'linux':
    case 'darwin':
      return `add_log "${mark}" "${sub}" "${msg}"`;
    default:
      return await log('Platform ' + os + ' is not supported', os, 'error');
  }
}

export function escapeForShell(value: string, os: string): string {
  if (os === 'win32') {
    return value.replace(/[`$"]/g, '`$&');
  }
  return value.replace(/[\\`$"]/g, '\\$&');
}

export function safeArg(value: string, os: string): string {
  if (!/^[a-zA-Z0-9_./:@+,~^-]*$/.test(value)) {
    return '"' + escapeForShell(value, os) + '"';
  }
  return value;
}

export function sanitizeShellInput(value: string, strict = false): string {
  const pattern = strict
    ? /[$`"';|&(){}[\]\\<>*?\n\r\t]/g
    : /[$`"';|&(){}[\]\\\n\r\t]/g;
  return value.replace(pattern, '');
}

/**
 * Function to break extension csv into an array
 *
 * @param extension_csv
 */
export async function extensionArray(
  extension_csv: string
): Promise<Array<string>> {
  switch (extension_csv) {
    case '':
    case ' ':
      return [];
    default:
      return [
        extension_csv.match(/(^|,\s?)none(\s?,|$)/) ? 'none' : '',
        ...extension_csv
          .split(',')

          .map(function (extension: string) {
            extension = extension.trim().replace(/^\\\s*/, '');
            if (/.+-.+\/.+@.+/.test(extension)) {
              return extension;
            }
            return extension
              .toLowerCase()
              .replace(/^(:)?(php[-_]|none|zend )|(-[^-]*)-/, '$1$3');
          })
      ].filter(Boolean);
  }
}

/**
 * Function to break csv into an array
 *
 * @param values_csv
 * @constructor
 */
export async function CSVArray(values_csv: string): Promise<Array<string>> {
  switch (values_csv) {
    case '':
    case ' ':
      return [];
    default:
      return values_csv
        .split(/,(?=(?:(?:[^"']*["']){2})*[^"']*$)/)
        .map(function (value) {
          return value
            .trim()
            .replace(/^["']|["']$|(?<==)["']/g, '')
            .replace(/=(((?!E_).)*[?{}|&~![()^]+((?!E_).)+)/, "='$1'")
            .replace(/=(.*?)(=.*)/, "='$1$2'")
            .replace(/:\s*["'](.*?)/g, ':$1');
        })
        .filter(Boolean);
  }
}

/**
 * Function to get prefix required to load an extension.
 *
 * @param extension
 */
export async function getExtensionPrefix(extension: string): Promise<string> {
  switch (true) {
    default:
      return 'extension';
    case /xdebug([2-3])?$|opcache|ioncube|eaccelerator/.test(extension):
      return 'zend_extension';
  }
}

/**
 * Function to get the suffix to suppress console output
 *
 * @param os
 */
export async function suppressOutput(os: string): Promise<string> {
  switch (os) {
    case 'win32':
      return ' ';
    case 'linux':
    case 'darwin':
      return ' ';
    default:
      return await log('Platform ' + os + ' is not supported', os, 'error');
  }
}

/**
 * Function to get script to log unsupported extensions.
 *
 * @param extension
 * @param version
 * @param os
 */
export async function getUnsupportedLog(
  extension: string,
  version: string,
  os: string
): Promise<string> {
  return (
    '\n' +
    (await addLog(
      '$cross',
      extension,
      [extension, 'is not supported on PHP', version].join(' '),
      os
    )) +
    '\n'
  );
}

/**
 * Function to get command to setup tools
 *
 * @param os
 * @param suffix
 */
export async function getCommand(os: string, suffix: string): Promise<string> {
  switch (os) {
    case 'linux':
    case 'darwin':
      return 'add_' + suffix + ' ';
    case 'win32':
      return (
        'Add-' +
        suffix
          .split('_')
          .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
          .join('') +
        ' '
      );
    default:
      return await log('Platform ' + os + ' is not supported', os, 'error');
  }
}

/**
 * Function to join strings with space
 *
 * @param str
 */
export async function joins(...str: string[]): Promise<string> {
  return [...str].join(' ');
}

/**
 * Function to get script extensions
 *
 * @param os
 */
export async function scriptExtension(os: string): Promise<string> {
  switch (os) {
    case 'win32':
      return '.ps1';
    case 'linux':
    case 'darwin':
      return '.sh';
    default:
      return await log('Platform ' + os + ' is not supported', os, 'error');
  }
}

/**
 * Function to get script tool
 *
 * @param os
 */
export async function scriptTool(os: string): Promise<string> {
  switch (os) {
    case 'win32':
      return 'pwsh ';
    case 'linux':
    case 'darwin':
      return 'bash ';
    default:
      return await log('Platform ' + os + ' is not supported', os, 'error');
  }
}

/**
 * Function to get script to add tools with custom support.
 *
 * @param pkg
 * @param type
 * @param version
 * @param os
 */
export async function customPackage(
  pkg: string,
  type: string,
  version: string,
  os: string
): Promise<string> {
  const pkg_name: string = pkg.replace(/\d+|(pdo|pecl)[_-]|[_-]db2/, '');
  const script_extension: string = await scriptExtension(os);
  const script: string = path.join(
    __dirname,
    '../src/scripts/' + type + '/' + pkg_name + script_extension
  );
  const command: string = await getCommand(os, pkg_name);
  return '\n. ' + script + '\n' + command + version;
}

/**
 * Function to extension input for installation from source.
 *
 * @param extension
 * @param prefix
 */
export async function parseExtensionSource(
  extension: string,
  prefix: string
): Promise<string> {
  // Groups: extension, domain url, org, repo, release
  const regex =
    /(\w+)-(\w+:\/\/.{1,253}(?:[.:][^:/\s]{2,63})+\/)?([\w.-]+)\/([\w.-]+)@(.+)/;
  const matches = regex.exec(extension) as RegExpExecArray;
  matches[2] = matches[2] ? matches[2].slice(0, -1) : 'https://github.com';
  return await joins(
    '\nadd_extension_from_source',
    ...matches.splice(1, matches.length),
    prefix
  );
}

const VERSION_INPUT_REGEX =
  /^(latest|lowest|highest|nightly|master|pre|pre-installed|\d+\.x|\d+(\.\d+){0,2})$/;

function validatePHPVersionInput(version: string, source: string): string {
  if (!VERSION_INPUT_REGEX.test(version)) {
    throw new Error(
      `Invalid PHP version in ${source}: ${version.slice(0, 20)}`
    );
  }
  return version;
}

/**
 * Read php version from input or file
 */
export async function readPHPVersion(): Promise<string> {
  const version = await getInput('php-version', false);
  if (version) {
    return validatePHPVersionInput(version, 'php-version input');
  }
  const versionFile =
    (await getInput('php-version-file', false)) || '.php-version';
  if (fs.existsSync(versionFile)) {
    const contents: string = fs.readFileSync(versionFile, 'utf8');
    const match = contents.match(/^(?:php\s)?(\d+\.\d+\.\d+)$/m);
    return validatePHPVersionInput(
      match ? match[1] : contents.trim(),
      versionFile
    );
  } else if (versionFile !== '.php-version') {
    throw new Error(`Could not find '${versionFile}' file.`);
  }

  const composerProjectDir = await readEnv('COMPOSER_PROJECT_DIR');
  const composerLock = path.join(composerProjectDir, 'composer.lock');
  if (fs.existsSync(composerLock)) {
    const lockFileContents = JSON.parse(fs.readFileSync(composerLock, 'utf8'));
    /* istanbul ignore next */
    if (lockFileContents['platform-overrides']?.['php']) {
      return validatePHPVersionInput(
        lockFileContents['platform-overrides']['php'],
        'composer.lock platform-overrides.php'
      );
    }
  }

  const composerJson = path.join(composerProjectDir, 'composer.json');
  if (fs.existsSync(composerJson)) {
    const composerFileContents = JSON.parse(
      fs.readFileSync(composerJson, 'utf8')
    );
    /* istanbul ignore next */
    if (composerFileContents['config']?.['platform']?.['php']) {
      return validatePHPVersionInput(
        composerFileContents['config']['platform']['php'],
        'composer.json config.platform.php'
      );
    }
  }

  return 'latest';
}

/**
 * Log to console
 *
 * @param variable
 * @param command
 * @param os
 */
export async function setVariable(
  variable: string,
  command: string,
  os: string
): Promise<string> {
  switch (os) {
    case 'win32':
      return '\n$' + variable + ' = ' + command + '\n';

    case 'linux':
    case 'darwin':
    default:
      return '\n' + variable + '="$(' + command + ')"\n';
  }
}
