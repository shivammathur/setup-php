import * as utils from './utils';
import * as extensions from './extensions';
import * as config from './config';

/**
 * Function to setup Xdebug
 *
 * @param extension
 * @param version
 * @param os_version
 * @param pipe
 */
export async function addCoverageXdebug(
  extension: string,
  version: string,
  os_version: string,
  pipe: string
): Promise<string> {
  let script = '\n';
  script +=
    (await extensions.addExtension(':pcov', version, os_version, true)) + pipe;
  script +=
    (await extensions.addExtension(extension, version, os_version, true)) +
    pipe;
  script += await utils.addLog(
    '$tick',
    extension,
    'Xdebug enabled as coverage driver',
    os_version
  );
  return script;
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
        (await extensions.addExtension(':xdebug', version, os_version, true)) +
        pipe;
      script +=
        (await extensions.addExtension('pcov', version, os_version, true)) +
        pipe;
      script +=
        (await config.addINIValues('pcov.enabled=1', os_version, true)) + '\n';

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
  script +=
    (await extensions.addExtension(':pcov', version, os_version, true)) + pipe;
  script +=
    (await extensions.addExtension(':xdebug', version, os_version, true)) +
    pipe;
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
  const pipe: string = (await utils.suppressOutput(os_version)) + '\n';
  switch (coverage_driver) {
    case 'pcov':
      return script + (await addCoveragePCOV(version, os_version, pipe));
    case 'xdebug':
    case 'xdebug3':
      return (
        script + (await addCoverageXdebug('xdebug', version, os_version, pipe))
      );
    case 'xdebug2':
      return (
        script + (await addCoverageXdebug('xdebug2', version, os_version, pipe))
      );
    case 'none':
      return script + (await disableCoverage(version, os_version, pipe));
    default:
      return '';
  }
}
