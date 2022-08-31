import * as path from 'path';
import * as core from '@actions/core';
import * as fetch from './fetch';
import fs = require('fs');

/**
 * Function to read environment variable and return a string value.
 *
 * @param property
 */
export async function readEnv(property: string): Promise<string> {
  const property_lc: string = property.toLowerCase();
  const property_uc: string = property.toUpperCase();
  return (
    process.env[property] ||
    process.env[property_lc] ||
    process.env[property_uc] ||
    process.env[property_lc.replace('_', '-')] ||
    process.env[property_uc.replace('_', '-')] ||
    ''
  );
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

export async function resolveVersionInput(): Promise<string> {
  let version = core.getInput('php-version');
  const version_file = core.getInput('php-version-file');

  if (version && version_file) {
    core.info(
      'Both php-version and php-version-file inputs are specified, only php-version will be used'
    );
  }

  if (version) {
    return version;
  }

  if (version_file) {
    const version_file_path = path.join(
      process.env.GITHUB_WORKSPACE!,
      version_file
    );
    if (!fs.existsSync(version_file_path)) {
      throw new Error(
        `The specified php version file at: ${version_file_path} does not exist`
      );
    }
    version = parsePhpVersionFile(fs.readFileSync(version_file_path, 'utf8'));
  }

  return version;
}

export function parsePhpVersionFile(contents: string): string {
  const match = contents.match(/("php:")?.*?(\d+(\.\d+))/);
  return match ? match[2] : '';
}

/** Function to get manifest URL
 *
 */
export async function getManifestURL(): Promise<string> {
  return 'https://raw.githubusercontent.com/shivammathur/setup-php/develop/src/configs/php-versions.json';
}

/**
 * Function to parse PHP version.
 *
 * @param version
 */
export async function parseVersion(version: string): Promise<string> {
  const manifest = await getManifestURL();
  switch (true) {
    case /^(latest|nightly|\d+\.x)$/.test(version):
      return JSON.parse((await fetch.fetch(manifest))['data'])[version];
    default:
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
  switch (true) {
    case /^(production|development|none)$/.test(ini_file):
      return ini_file;
    case /php\.ini-(production|development)$/.test(ini_file):
      return ini_file.split('-')[1];
    default:
      return 'production';
  }
}

/**
 * Async foreach loop
 *
 * @author https://github.com/Atinux
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
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
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
      return 'Step-Log "' + message + '"';
    case 'linux':
    case 'darwin':
      return 'step_log "' + message + '"';
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
  switch (os) {
    case 'win32':
      return 'Add-Log "' + mark + '" "' + subject + '" "' + message + '"';
    case 'linux':
    case 'darwin':
      return 'add_log "' + mark + '" "' + subject + '" "' + message + '"';
    default:
      return await log('Platform ' + os + ' is not supported', os, 'error');
  }
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
            if (/.+-.+\/.+@.+/.test(extension)) {
              return extension;
            }
            return extension
              .trim()
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
            .replace(/=(((?!E_).)*[?{}|&~![()^]+((?!E_).)+)/, "='$1'");
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
      return ' >$null 2>&1';
    case 'linux':
    case 'darwin':
      return ' >/dev/null 2>&1';
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
      return 'Add-' + suffix.charAt(0).toUpperCase() + suffix.slice(1) + ' ';
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
  const pkg_name: string = pkg.replace(/\d+|(pdo|pecl)[_-]/, '');
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
