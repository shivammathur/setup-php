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
 * @param os
 * @param pipe
 */
export async function addCoverageXdebug(
  extension: string,
  version: string,
  os: string,
  pipe: string
): Promise<string> {
  let script = '\n';
  let message: string = await checkXdebugError(extension, version);
  let status = '$cross';
  if (!message) {
    script +=
      (await extensions.addExtension(':pcov:false', version, os, true)) + pipe;
    extension = extension == 'xdebug3' ? 'xdebug' : extension;
    script +=
      (await extensions.addExtension(extension, version, os, true)) + pipe;
    message = 'Xdebug enabled as coverage driver';
    status = '$tick';
  }
  script += await utils.addLog(status, extension, message, os);
  return script;
}

/**
 * Function to setup PCOV
 *
 * @param version
 * @param os
 * @param pipe
 */
export async function addCoveragePCOV(
  version: string,
  os: string,
  pipe: string
): Promise<string> {
  let script = '\n';
  switch (true) {
    default:
      script +=
        (await extensions.addExtension(':xdebug:false', version, os, true)) +
        pipe;
      script +=
        (await extensions.addExtension('pcov', version, os, true)) + pipe;
      script += (await config.addINIValues('pcov.enabled=1', os, true)) + '\n';

      // success
      script += await utils.addLog(
        '$tick',
        'coverage: pcov',
        'PCOV enabled as coverage driver',
        os
      );
      // version is not supported
      break;

    case /5\.[3-6]|7\.0/.test(version):
      script += await utils.addLog(
        '$cross',
        'pcov',
        'PHP 7.1 or newer is required',
        os
      );
      break;
  }

  return script;
}

/**
 * Function to disable Xdebug and PCOV
 *
 * @param version
 * @param os
 * @param pipe
 */
export async function disableCoverage(
  version: string,
  os: string,
  pipe: string
): Promise<string> {
  let script = '\n';
  script +=
    (await extensions.addExtension(':pcov:false', version, os, true)) + pipe;
  script +=
    (await extensions.addExtension(':xdebug:false', version, os, true)) + pipe;
  script += await utils.addLog('$tick', 'none', 'Disabled Xdebug and PCOV', os);

  return script;
}

/**
 * Function to set coverage driver
 *
 * @param coverage_driver
 * @param version
 * @param os
 */
export async function addCoverage(
  coverage_driver: string,
  version: string,
  os: string
): Promise<string> {
  coverage_driver = coverage_driver.toLowerCase();
  const script: string = '\n' + (await utils.stepLog('Setup Coverage', os));
  const pipe: string = (await utils.suppressOutput(os)) + '\n';
  switch (coverage_driver) {
    case 'pcov':
      return script + (await addCoveragePCOV(version, os, pipe));
    case 'xdebug':
    case 'xdebug2':
    case 'xdebug3':
      return (
        script + (await addCoverageXdebug(coverage_driver, version, os, pipe))
      );
    case 'none':
      return script + (await disableCoverage(version, os, pipe));
    default:
      return '';
  }
}
