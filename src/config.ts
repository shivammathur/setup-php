import * as utils from './utils';

/**
 * Function to add custom ini values
 *
 * @param ini_values_csv
 * @param os_version
 */
export async function addINIValues(ini_values_csv: string, os_version: string) {
  switch (os_version) {
    case 'win32':
      return await addINIValuesWindows(ini_values_csv);
    case 'darwin':
    case 'linux':
      return await addINIValuesUnix(ini_values_csv);
    default:
      return await utils.log(
        'Platform ' + os_version + ' is not supported',
        os_version,
        'error',
        'Add Config'
      );
  }
}

/**
 * Add script to set custom ini values for unix
 *
 * @param ini_values_csv
 */
export async function addINIValuesUnix(
  ini_values_csv: string
): Promise<string> {
  let script: string = '\n';
  let ini_values: Array<string> = await utils.INIArray(ini_values_csv);
  await utils.asyncForEach(ini_values, async function(ini_value: string) {
    // add script to set ini value
    script += 'echo "' + ini_value + '" >> $ini_file\n';
  });
  return script;
}

/**
 * Add script to set custom ini values for windows
 *
 * @param ini_values_csv
 */
export async function addINIValuesWindows(
  ini_values_csv: string
): Promise<string> {
  let script: string = '\n';
  let ini_values: Array<string> = await utils.INIArray(ini_values_csv);
  await utils.asyncForEach(ini_values, async function(ini_value: string) {
    // add script to set ini value
    script += 'Add-Content C:\\tools\\php\\php.ini "' + ini_value + '"\n';
  });
  return script;
}
