import * as utils from './utils';
import * as pecl from './pecl';
import * as extensions from './extensions';
import * as config from './config';

export async function addCoverage(
  coverage_driver: string,
  version: string,
  os_version: string
): Promise<string> {
  coverage_driver.toLowerCase();
  switch (coverage_driver) {
    case 'pcov':
      return addCoveragePCOV(version, os_version);
    case 'xdebug':
      return addCoverageXdebug(version, os_version);
    case 'none':
      return disableCoverage(version, os_version);
    default:
      return '';
  }
}

export async function addCoverageXdebug(version: string, os_version: string) {
  let script: string = '\n';
  script += await extensions.addExtension(
    'xdebug',
    version,
    os_version,
    'Set Coverage Driver'
  );
  script += await utils.log(
    'Xdebug enabled as coverage driver',
    os_version,
    'success',
    'Set Coverage Driver'
  );

  return script;
}

export async function addCoveragePCOV(version: string, os_version: string) {
  let script: string = '\n';
  switch (version) {
    default:
      script += await extensions.addExtension(
        'pcov',
        version,
        os_version,
        'Set Coverage Driver'
      );
      script += await config.addINIValues('pcov.enabled=1', os_version);

      // add command to disable xdebug and enable pcov
      switch (os_version) {
        case 'linux':
          script +=
            'if [ -e /etc/php/' +
            version +
            '/mods-available/xdebug.ini ]; then sudo phpdismod xdebug; fi\n';
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
      script += await utils.log(
        'PCOV enabled as coverage driver',
        os_version,
        'success',
        'Set Coverage Driver'
      );
      // version is not supported
      break;
    case '5.6':
    case '7.0':
      script += await utils.log(
        'PCOV requires PHP 7.1 or newer',
        os_version,
        'warning',
        'Set Coverage Driver'
      );
      break;
  }

  return script;
}

export async function disableCoverage(version: string, os_version: string) {
  let script: string = '\n';
  switch (os_version) {
    case 'linux':
      script +=
        'if [ -e /etc/php/' +
        version +
        '/mods-available/xdebug.ini ]; then sudo phpdismod xdebug; fi\n';
      script +=
        'if [ -e /etc/php/' +
        version +
        '/mods-available/pcov.ini ]; then sudo phpdismod pcov; fi\n';
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
  script += await utils.log(
    'Disabled Xdebug and PCOV',
    os_version,
    'success',
    'Set Coverage Driver'
  );

  return script;
}
