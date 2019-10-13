import * as utils from './utils';

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
  log_prefix = 'Add Extension'
): Promise<string> {
  switch (os_version) {
    case 'win32':
      return await addExtensionWindows(extension_csv, version, log_prefix);
    case 'darwin':
      return await addExtensionDarwin(extension_csv, version, log_prefix);
    case 'linux':
      return await addExtensionLinux(extension_csv, version, log_prefix);
    default:
      return await utils.log(
        'Platform ' + os_version + ' is not supported',
        os_version,
        'error',
        log_prefix
      );
  }
}

/**
 * Install and enable extensions for darwin
 *
 * @param extension_csv
 * @param version
 */
export async function addExtensionDarwin(
  extension_csv: string,
  version: string,
  log_prefix: string
): Promise<string> {
  let extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script: string = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    extension = extension.toLowerCase();
    // add script to enable extension is already installed along with php
    let install_command: string = '';
    switch (version + extension) {
      case '7.4xdebug':
        install_command =
          'sh ./xdebug_darwin.sh >/dev/null 2>&1 && echo "zend_extension=xdebug.so" >> $ini_file';
        break;
      case '7.4pcov':
        install_command =
          'sh ./pcov.sh >/dev/null 2>&1 && echo "extension=pcov.so" >> $ini_file';
        break;
      case '5.6xdebug':
        install_command = 'sudo pecl install xdebug-2.5.5 >/dev/null 2>&1';
        break;
      default:
        install_command = 'sudo pecl install ' + extension + ' >/dev/null 2>&1';
        break;
    }
    script +=
      'add_extension ' +
      extension +
      ' "' +
      install_command +
      '" ' +
      (await utils.getExtensionPrefix(extension)) +
      ' "' +
      log_prefix +
      '"\n';
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
  version: string,
  log_prefix: string
): Promise<string> {
  let extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script: string = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    extension = extension.toLowerCase();
    // add script to enable extension is already installed along with php

    let install_command: string = '';
    switch (version + extension) {
      case '7.4xdebug':
        const extension_url: string =
          'https://xdebug.org/files/php_xdebug-2.8.0beta2-7.4-vc15.dll';
        install_command =
          'Invoke-WebRequest -Uri ' +
          extension_url +
          ' -OutFile C:\\tools\\php\\ext\\php_xdebug.dll\n';
        install_command += 'Enable-PhpExtension xdebug';
        break;
      case '7.2xdebug':
      default:
        install_command = 'Install-PhpExtension ' + extension;
        break;
    }
    script +=
      'Add-Extension ' +
      extension +
      ' "' +
      install_command +
      '" ' +
      (await utils.getExtensionPrefix(extension)) +
      ' "' +
      log_prefix +
      '"\n';
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
  version: string,
  log_prefix: string
): Promise<string> {
  let extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script: string = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    extension = extension.toLowerCase();
    // add script to enable extension is already installed along with php

    let install_command: string = '';
    switch (version + extension) {
      case '7.4xdebug':
        install_command =
          './xdebug.sh >/dev/null 2>&1 && echo "zend_extension=xdebug.so" >> $ini_file';
        break;
      case '7.4pcov':
        install_command =
          './pcov.sh >/dev/null 2>&1 && echo "extension=pcov.so" >> $ini_file';
        break;
      case '7.2phalcon3':
      case '7.3phalcon3':
        install_command = './phalcon.sh master ' + version + ' >/dev/null 2>&1';
        break;
      case '7.2phalcon4':
      case '7.3phalcon4':
        install_command = './phalcon.sh 4.0.x ' + version + ' >/dev/null 2>&1';
        break;
      default:
        install_command =
          'sudo DEBIAN_FRONTEND=noninteractive apt install -y php' +
          version +
          '-' +
          extension +
          ' >/dev/null 2>&1';
        break;
    }
    script +=
      'add_extension ' +
      extension +
      ' "' +
      install_command +
      '" ' +
      (await utils.getExtensionPrefix(extension)) +
      ' "' +
      log_prefix +
      '"\n';
  });
  return script;
}
