import * as path from 'path';
import * as utils from './utils';

/**
 * Install and enable extensions for darwin
 *
 * @param extension_csv
 * @param version
 */
export async function addExtensionDarwin(
  extension_csv: string,
  version: string
): Promise<string> {
  const extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    extension = extension.toLowerCase();
    // add script to enable extension is already installed along with php
    let install_command = '';
    switch (version + extension) {
      case '5.6xdebug':
        install_command = 'sudo pecl install xdebug-2.5.5 >/dev/null 2>&1';
        break;
      case '5.6redis':
        install_command = 'sudo pecl install redis-2.2.8 >/dev/null 2>&1';
        break;
      default:
        install_command = 'sudo pecl install ' + extension + ' >/dev/null 2>&1';
        break;
    }
    script +=
      '\nadd_extension ' +
      extension +
      ' "' +
      install_command +
      '" ' +
      (await utils.getExtensionPrefix(extension));
  });
  return script;
}

/**
 * Install and enable extensions for windows
 *
 * @param extension_csv
 * @param version
 */
export async function addExtensionWindows(
  extension_csv: string,
  version: string
): Promise<string> {
  const extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    // add script to enable extension is already installed along with php
    switch (version + extension) {
      case '7.4redis':
        script += '\nAdd-Extension ' + extension + ' beta';
        break;
      default:
        script += '\nAdd-Extension ' + extension;
        break;
    }
  });
  return script;
}

/**
 * Install and enable extensions for linux
 *
 * @param extension_csv
 * @param version
 */
export async function addExtensionLinux(
  extension_csv: string,
  version: string
): Promise<string> {
  const extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    extension = extension.toLowerCase();
    // add script to enable extension is already installed along with php

    let install_command = '';
    switch (version + extension) {
      case '7.4redis':
        install_command =
          'sudo DEBIAN_FRONTEND=noninteractive apt-get install -y php7.4-igbinary php7.4-redis >/dev/null 2>&1';
        break;
      case '7.2phalcon3':
      case '7.3phalcon3':
        install_command =
          'sh ' +
          path.join(__dirname, '../src/scripts/phalcon.sh') +
          ' 3.4.x ' +
          version +
          ' >/dev/null 2>&1';
        break;
      case '7.2phalcon4':
      case '7.3phalcon4':
      case '7.4phalcon4':
        install_command =
          'sh ' +
          path.join(__dirname, '../src/scripts/phalcon.sh') +
          ' master ' +
          version +
          ' >/dev/null 2>&1';
        break;
      case '7.0gearman':
      case '7.1gearman':
      case '7.2gearman':
      case '7.3gearman':
      case '7.4gearman':
        install_command =
          'sh ' +
          path.join(__dirname, '../src/scripts/gearman.sh') +
          ' ' +
          version +
          ' >/dev/null 2>&1';
        break;
      default:
        install_command =
          'sudo DEBIAN_FRONTEND=noninteractive apt-get install -y php' +
          version +
          '-' +
          extension.replace('pdo_', '').replace('pdo-', '') +
          ' >/dev/null 2>&1 || sudo pecl install ' +
          extension +
          ' >/dev/null 2>&1';
        break;
    }
    script +=
      '\nadd_extension ' +
      extension +
      ' "' +
      install_command +
      '" ' +
      (await utils.getExtensionPrefix(extension));
  });
  return script;
}

/**
 * Install and enable extensions
 *
 * @param extension_csv
 * @param version
 * @param os_version
 * @param log_prefix
 */
export async function addExtension(
  extension_csv: string,
  version: string,
  os_version: string,
  no_step = false
): Promise<string> {
  let script = '\n';
  switch (no_step) {
    case true:
      script +=
        (await utils.stepLog('Setup Extensions', os_version)) +
        (await utils.suppressOutput(os_version));
      break;
    case false:
    default:
      script += await utils.stepLog('Setup Extensions', os_version);
      break;
  }

  switch (os_version) {
    case 'win32':
      return script + (await addExtensionWindows(extension_csv, version));
    case 'darwin':
      return script + (await addExtensionDarwin(extension_csv, version));
    case 'linux':
      return script + (await addExtensionLinux(extension_csv, version));
    default:
      return await utils.log(
        'Platform ' + os_version + ' is not supported',
        os_version,
        'error'
      );
  }
}
