import * as utils from './utils';
import * as extensions from './extensions';
import * as config from './config';

export async function checkXdebugError(
  extension: string,
  version: string
): Promise<string> {
  if (
    (/^5\.[3-6]$|^7\.[0-1]$/.test(version) && extension == 'xdebug3') ||
    (/^8\.[0-9]$/.test(version) && extension == 'xdebug2')
  ) {
    return extension + ' is not supported on PHP ' + version;
  }
  return '';
}

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
  let message: string = await checkXdebugError(extension, version);
  let status = '$cross';
  if (!message) {
    script +=
      (await extensions.addExtension(
        ':pcov:false',
        version,
        os_version,
        true
      )) + pipe;
    extension = extension == 'xdebug3' ? 'xdebug' : extension;
    script +=
      (await extensions.addExtension(extension, version, os_version, true)) +
      pipe;
    message = 'Xdebug enabled as coverage driver';
    status = '$tick';
  }
  script += await utils.addLog(status, extension, message, os_version);
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
        (await extensions.addExtension(
          ':xdebug:false',
          version,
          os_version,
          true
        )) + pipe;
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
    (await extensions.addExtension(':pcov:false', version, os_version, true)) +
    pipe;
  script +=
    (await extensions.addExtension(
      ':xdebug:false',
      version,
      os_version,
      true
    )) + pipe;
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
    case 'xdebug2':
    case 'xdebug3':
      return (
        script +
        (await addCoverageXdebug(coverage_driver, version, os_version, pipe))
      );
    case 'none':
      return script + (await disableCoverage(version, os_version, pipe));
    default:
      return '';
  }
}
