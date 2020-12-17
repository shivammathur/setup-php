import * as utils from './utils';

/**
 * Add script to set custom ini values for unix
 *
 * @param ini_values_csv
 */
export async function addINIValuesUnix(
  ini_values_csv: string
): Promise<string> {
  const ini_values: Array<string> = await utils.CSVArray(ini_values_csv);
  let script = '';
  await utils.asyncForEach(ini_values, async function (line: string) {
    script +=
      '\n' + (await utils.addLog('$tick', line, 'Added to php.ini', 'linux'));
  });
  return (
    'echo "' +
    ini_values.join('\n') +
    '" | sudo tee -a "${pecl_file:-${ini_file[@]}}" >/dev/null 2>&1' +
    script
  );
}

/**
 * Add script to set custom ini values for windows
 *
 * @param ini_values_csv
 */
export async function addINIValuesWindows(
  ini_values_csv: string
): Promise<string> {
  const ini_values: Array<string> = await utils.CSVArray(ini_values_csv);
  let script = '\n';
  await utils.asyncForEach(ini_values, async function (line: string) {
    script +=
      (await utils.addLog('$tick', line, 'Added to php.ini', 'win32')) + '\n';
  });
  return (
    'Add-Content "$php_dir\\php.ini" "' + ini_values.join('\n') + '"' + script
  );
}

/**
 * Function to add custom ini values
 *
 * @param ini_values_csv
 * @param os_version
 * @param no_step
 */
export async function addINIValues(
  ini_values_csv: string,
  os_version: string,
  no_step = false
): Promise<string> {
  let script = '\n';
  switch (no_step) {
    case true:
      script +=
        (await utils.stepLog('Add php.ini values', os_version)) +
        (await utils.suppressOutput(os_version)) +
        '\n';
      break;
    case false:
    default:
      script += (await utils.stepLog('Add php.ini values', os_version)) + '\n';
      break;
  }
  switch (os_version) {
    case 'win32':
      return script + (await addINIValuesWindows(ini_values_csv));
    case 'darwin':
    case 'linux':
      return script + (await addINIValuesUnix(ini_values_csv));
    default:
      return await utils.log(
        'Platform ' + os_version + ' is not supported',
        os_version,
        'error'
      );
  }
}
