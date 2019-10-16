import * as utils from './utils';
import * as extensions from './extensions';
import * as config from './config';

/**
 * Function to set coverage driver
 *
 * @param coverage_driver
 * @param version
 * @param os_version
 */
export async function addCoverage(
  coverage_driver: string,
  version: string,
  os_version: string
): Promise<string> {
  coverage_driver.toLowerCase();
  let script: string =
    '\n' + (await utils.stepLog('Setup Coverage', os_version));
  switch (coverage_driver) {
    case 'pcov':
      return script + (await addCoveragePCOV(version, os_version));
    case 'xdebug':
      return script + (await addCoverageXdebug(version, os_version));
    case 'none':
      return script + (await disableCoverage(version, os_version));
    default:
      return '';
  }
}

/**
 * Function to setup Xdebug
 *
 * @param version
 * @param os_version
 */
export async function addCoverageXdebug(version: string, os_version: string) {
  return (
    (await extensions.addExtension('xdebug', version, os_version, true)) +
    (await utils.suppressOutput(os_version)) +
    '\n' +
    (await utils.addLog(
      '$tick',
      'xdebug',
      'Xdebug enabled as coverage driver',
      os_version
    ))
  );
}

/**
 * Function to setup PCOV
 *
 * @param version
 * @param os_version
 */
export async function addCoveragePCOV(version: string, os_version: string) {
  let script: string = '\n';
  switch (version) {
    default:
      script +=
        (await extensions.addExtension('pcov', version, os_version, true)) +
        (await utils.suppressOutput(os_version)) +
        '\n';
      script +=
        (await config.addINIValues('pcov.enabled=1', os_version, true)) + '\n';

      // add command to disable xdebug and enable pcov
      switch (os_version) {
        case 'linux':
          script +=
            'if [ -e /etc/php/' +
            version +
            '/mods-available/xdebug.ini ]; then sudo phpdismod -v ' +
            version +
            ' xdebug; fi\n';
          script += 'sudo sed -i "/xdebug/d" $ini_file\n';
          break;
        case 'darwin':
          script += 'sudo sed -i \'\' "/xdebug/d" $ini_file\n';
          break;
        case 'win32':
          script +=
            'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug C:\\tools\\php }\n';
          break;
      }

      // success
      script += await utils.addLog(
        '$tick',
        'coverage: pcov',
        'PCOV enabled as coverage driver',
        os_version
      );
      // version is not supported
      break;
    case '5.6':
    case '7.0':
      script += await utils.addLog(
        '$cross',
        'pcov',
        'PHP 7.1 or newer is required',
        os_version
      );
      break;
  }

  return script;
}

/**
 * Function to disable Xdebug and PCOV
 *
 * @param version
 * @param os_version
 */
export async function disableCoverage(version: string, os_version: string) {
  let script: string = '\n';
  switch (os_version) {
    case 'linux':
      script +=
        'if [ -e /etc/php/' +
        version +
        '/mods-available/xdebug.ini ]; then sudo phpdismod -v ' +
        version +
        ' xdebug; fi\n';
      script +=
        'if [ -e /etc/php/' +
        version +
        '/mods-available/pcov.ini ]; then sudo phpdismod -v ' +
        version +
        ' pcov; fi\n';
      script += 'sudo sed -i "/xdebug/d" $ini_file\n';
      script += 'sudo sed -i "/pcov/d" $ini_file\n';
      break;
    case 'darwin':
      script += 'sudo sed -i \'\' "/xdebug/d" $ini_file\n';
      script += 'sudo sed -i \'\' "/pcov/d" $ini_file\n';
      break;
    case 'win32':
      script +=
        'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug C:\\tools\\php }\n';
      script +=
        'if(php -m | findstr -i pcov) { Disable-PhpExtension pcov C:\\tools\\php }\n';
      break;
  }
  script += await utils.addLog(
    '$tick',
    'none',
    'Disabled Xdebug and PCOV',
    os_version
  );

  return script;
}
