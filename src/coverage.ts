import * as utils from './utils';
import * as extensions from './extensions';
import * as config from './config';

/**
 * Function to setup Xdebug
 *
 * @param version
 * @param os_version
 * @param pipe
 */
export async function addCoverageXdebug(
  version: string,
  os_version: string,
  pipe: string
): Promise<string> {
  switch (version) {
    case '7.4':
    default:
      return (
        (await extensions.addExtension('xdebug', version, os_version, true)) +
        pipe +
        '\n' +
        (await utils.addLog(
          '$tick',
          'xdebug',
          'Xdebug enabled as coverage driver',
          os_version
        ))
      );
  }
}

/**
 * Function to setup PCOV
 *
 * @param version
 * @param os_version
 * @param pipe
 */
export async function addCoveragePCOV(
  version: string,
  os_version: string,
  pipe: string
): Promise<string> {
  let script = '\n';
  switch (true) {
    default:
      script +=
        (await extensions.addExtension('pcov', version, os_version, true)) +
        pipe +
        '\n';
      script +=
        (await config.addINIValues('pcov.enabled=1', os_version, true)) + '\n';

      // add command to disable xdebug and enable pcov
      switch (os_version) {
        case 'linux':
        case 'darwin':
          script += 'remove_extension xdebug' + pipe + '\n';
          break;
        case 'win32':
          script += 'Remove-Extension xdebug' + pipe + '\n';
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

    case /5\.[3-6]|7\.0/.test(version):
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
 * @param pipe
 */
export async function disableCoverage(
  version: string,
  os_version: string,
  pipe: string
): Promise<string> {
  let script = '\n';
  switch (os_version) {
    case 'linux':
    case 'darwin':
      script += 'remove_extension xdebug' + pipe + '\n';
      script += 'remove_extension pcov' + pipe + '\n';
      break;
    case 'win32':
      script += 'Remove-Extension xdebug' + pipe + '\n';
      script += 'Remove-Extension pcov' + pipe + '\n';
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
  coverage_driver = coverage_driver.toLowerCase();
  const script: string =
    '\n' + (await utils.stepLog('Setup Coverage', os_version));
  const pipe: string = await utils.suppressOutput(os_version);
  switch (coverage_driver) {
    case 'pcov':
      return script + (await addCoveragePCOV(version, os_version, pipe));
    case 'xdebug':
      return script + (await addCoverageXdebug(version, os_version, pipe));
    case 'none':
      return script + (await disableCoverage(version, os_version, pipe));
    default:
      return '';
  }
}
