import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';

export async function getInput(
  name: string,
  mandatory: boolean
): Promise<string> {
  let input = process.env[name];
  switch (input) {
    case '':
    case undefined:
      return core.getInput(name, {required: mandatory});
    default:
      return input;
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
  array: Array<any>,
  callback: any
): Promise<any> {
  for (let index: number = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

/**
 * Read the scripts
 *
 * @param filename
 * @param version
 * @param os_version
 */
export async function readScript(
  filename: string,
  version: string,
  os_version: string
): Promise<string> {
  switch (os_version) {
    case 'darwin':
      switch (version) {
        case '7.4':
          return fs.readFileSync(path.join(__dirname, '../src/7.4.sh'), 'utf8');
        case '7.3':
        default:
          return fs.readFileSync(
            path.join(__dirname, '../src/' + filename),
            'utf8'
          );
      }
    case 'win32':
    case 'linux':
      return fs.readFileSync(
        path.join(__dirname, '../src/' + filename),
        'utf8'
      );
    default:
      return await log(
        'Platform ' + os_version + ' is not supported',
        os_version,
        'error'
      );
  }
}

/**
 * Write final script which runs
 *
 * @param filename
 * @param version
 * @param script
 */
export async function writeScript(
  filename: string,
  version: string,
  script: string
): Promise<any> {
  fs.writeFileSync(version + filename, script, {mode: 0o755});
}

/**
 * Function to break extension csv into an array
 * @param extension_csv
 */
export async function extensionArray(
  extension_csv: string
): Promise<Array<string>> {
  return extension_csv.split(',').map(function(extension: string) {
    return extension
      .trim()
      .replace('php-', '')
      .replace('php_', '');
  });
}

/**
 * Function to break ini values csv into an array
 *
 * @param ini_values_csv
 * @constructor
 */
export async function INIArray(ini_values_csv: string): Promise<Array<string>> {
  return ini_values_csv.split(',').map(function(ini_value: string) {
    return ini_value.trim();
  });
}

export async function log(
  message: string,
  os_version: string,
  log_type: string
): Promise<string> {
  switch (os_version) {
    case 'win32':
      const color: any = {
        error: 'red',
        success: 'green',
        warning: 'yellow'
      };
      return "Write-Host '" + message + "' -ForegroundColor " + color[log_type];

    case 'linux':
    case 'darwin':
    default:
      const unix_color: any = {
        error: '31',
        success: '32',
        warning: '33'
      };
      return (
        'echo -e "\\033[' + unix_color[log_type] + ';1m' + message + '\\033[0m"'
      );
  }
}
