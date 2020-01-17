import * as path from 'path';
import * as utils from './utils';

/**
 * Install and enable extensions for darwin
 *
 * @param extension_csv
 * @param version
 * @param pipe
 */
export async function addExtensionDarwin(
  extension_csv: string,
  version: string,
  pipe: string
): Promise<string> {
  const extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    extension = extension.toLowerCase();
    const version_extension: string = version + extension;
    // add script to enable extension is already installed along with php
    let install_command = '';
    switch (true) {
      case /5\.6xdebug/.test(version_extension):
        install_command = 'sudo pecl install xdebug-2.5.5' + pipe;
        break;
      case /7\.0xdebug/.test(version_extension):
        install_command = 'sudo pecl install xdebug-2.9.0' + pipe;
        break;
      case /5\.6redis/.test(version_extension):
        install_command = 'sudo pecl install redis-2.2.8' + pipe;
        break;
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
        install_command =
          'sh ' +
          path.join(__dirname, '../src/scripts/ext/phalcon_darwin.sh') +
          ' ' +
          extension +
          ' ' +
          version +
          pipe;
        break;
      default:
        install_command = 'sudo pecl install ' + extension + pipe;
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
 * @param pipe
 */
export async function addExtensionWindows(
  extension_csv: string,
  version: string,
  pipe: string
): Promise<string> {
  const extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    // add script to enable extension is already installed along with php
    const version_extension: string = version + extension;
    switch (true) {
      // match 7.0phalcon3...7.3phalcon3 and 7.2phalcon4...7.4phalcon4
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
        script +=
          '\n& ' +
          path.join(__dirname, '../src/scripts/ext/phalcon.ps1') +
          ' ' +
          extension +
          ' ' +
          version +
          '\n';
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
 * @param pipe
 */
export async function addExtensionLinux(
  extension_csv: string,
  version: string,
  pipe: string
): Promise<string> {
  const extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    extension = extension.toLowerCase();
    // add script to enable extension is already installed along with php
    const version_extension: string = version + extension;
    let install_command = '';
    switch (true) {
      // match 5.6gearman..7.4gearman
      case /^((5\.6)|(7\.[0-4]))gearman$/.test(version_extension):
        install_command =
          'sh ' +
          path.join(__dirname, '../src/scripts/ext/gearman.sh') +
          ' ' +
          version +
          pipe;
        break;
      // match 7.0xdebug..7.4xdebug
      case /^7\.[0-4]xdebug$/.test(version_extension):
        script +=
          '\nupdate_extension xdebug 2.9.0' +
          pipe +
          '\n' +
          (await utils.addLog('$tick', 'xdebug', 'Enabled', 'linux'));
        return;
      // match 7.0phalcon3..7.3phalcon3 and 7.2phalcon4...7.4phalcon4
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
        script +=
          '\nsh ' +
          path.join(__dirname, '../src/scripts/ext/phalcon.sh') +
          ' ' +
          extension +
          ' ' +
          version +
          pipe +
          '\n' +
          (await utils.addLog(
            '$tick',
            extension,
            'Installed and enabled',
            'linux'
          ));
        return;
      default:
        install_command =
          'sudo DEBIAN_FRONTEND=noninteractive apt-get install -y php' +
          version +
          '-' +
          extension.replace('pdo_', '').replace('pdo-', '') +
          pipe +
          ' || sudo pecl install ' +
          extension +
          pipe;
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
  const pipe: string = await utils.suppressOutput(os_version);
  let script = '\n';
  switch (no_step) {
    case true:
      script += (await utils.stepLog('Setup Extensions', os_version)) + pipe;
      break;
    case false:
    default:
      script += await utils.stepLog('Setup Extensions', os_version);
      break;
  }

  switch (os_version) {
    case 'win32':
      return script + (await addExtensionWindows(extension_csv, version, pipe));
    case 'darwin':
      return script + (await addExtensionDarwin(extension_csv, version, pipe));
    case 'linux':
      return script + (await addExtensionLinux(extension_csv, version, pipe));
    default:
      return await utils.log(
        'Platform ' + os_version + ' is not supported',
        os_version,
        'error'
      );
  }
}
