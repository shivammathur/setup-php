import * as path from 'path';
import * as utils from './utils';

/**
 * Function to get Xdebug version compatible with php versions
 *
 * @param version
 */
export async function getXdebugVersion(version: string): Promise<string> {
  switch (version) {
    case '5.3':
      return '2.2.7';
    case '5.4':
      return '2.4.1';
    case '5.5':
      return '2.5.5';
    default:
      return '2.9.6';
  }
}

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
  await utils.asyncForEach(extensions, async function (extension: string) {
    const version_extension: string = version + extension;
    const [extension_name, stability]: string[] = extension.split('-');
    const ext_prefix = await utils.getExtensionPrefix(extension_name);
    const command_prefix = 'sudo pecl install -f ';
    let command = '';
    switch (true) {
      // match pre-release versions
      case /.*-(beta|alpha|devel|snapshot)/.test(version_extension):
        script +=
          '\nadd_unstable_extension ' +
          extension_name +
          ' ' +
          stability +
          ' ' +
          ext_prefix;
        return;
      // match 5.6xdebug, 7.0xdebug...7.4xdebug, 8.0xdebug
      case /(5\.6|7\.[0-4]|8\.[0-9])xdebug/.test(version_extension):
        command = 'add_brew_extension xdebug';
        break;
      // match 7.1pcov...7.4pcov, 8.0pcov
      case /(7\.[1-4]|8\.[0-9])pcov/.test(version_extension):
        command = 'add_brew_extension pcov';
        break;
      // match 5.6redis
      case /5\.6redis/.test(version_extension):
        command = command_prefix + 'redis-2.2.8';
        break;
      // match imagick
      case /^imagick$/.test(extension):
        command =
          'brew install pkg-config imagemagick' +
          pipe +
          ' && ' +
          command_prefix +
          'imagick' +
          pipe;
        break;
      // match sqlite
      case /^sqlite$/.test(extension):
        extension = 'sqlite3';
        command = command_prefix + extension;
        break;
      // match 7.0phalcon3...7.3phalcon3 and 7.2phalcon4...7.4phalcon4
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
        script +=
          '\nbash ' +
          path.join(__dirname, '../src/scripts/ext/phalcon_darwin.sh') +
          ' ' +
          extension +
          ' ' +
          version;
        return;
      default:
        command = command_prefix + extension;
        break;
    }
    script +=
      '\nadd_extension ' +
      extension +
      ' "' +
      command +
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
  await utils.asyncForEach(extensions, async function (extension: string) {
    const [extension_name, stability]: string[] = extension.split('-');
    const version_extension: string = version + extension;
    switch (true) {
      // match pre-release versions
      case /.*-(beta|alpha|devel|snapshot)/.test(version_extension):
        script += '\nAdd-Extension ' + extension_name + ' ' + stability;
        break;
      // match 5.6mysql, 5.6mysqli, 5.6mysqlnd
      case /^5\.6(mysql|mysqli|mysqlnd)$/.test(version_extension):
        script +=
          '\nAdd-Extension mysql\nAdd-Extension mysqli\nAdd-Extension mysqlnd';
        break;
      // match 7.0mysql..8.0mysql
      // match 7.0mysqli..8.0mysqli
      // match 7.0mysqlnd..8.0mysqlnd
      case /[7-8]\.\d(mysql|mysqli|mysqlnd)$/.test(version_extension):
        script += '\nAdd-Extension mysqli\nAdd-Extension mysqlnd';
        break;
      // match sqlite
      case /^sqlite$/.test(extension):
        extension = 'sqlite3';
        script += '\nAdd-Extension ' + extension;
        break;
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
  await utils.asyncForEach(extensions, async function (extension: string) {
    const version_extension: string = version + extension;
    const [extension_name, stability]: string[] = extension.split('-');
    const ext_prefix = await utils.getExtensionPrefix(extension_name);
    const command_prefix = 'sudo $debconf_fix apt-get install -y php';
    let command = '';
    switch (true) {
      // match pre-release versions
      case /.*-(beta|alpha|devel|snapshot)/.test(version_extension):
        script +=
          '\nadd_unstable_extension ' +
          extension_name +
          ' ' +
          stability +
          ' ' +
          ext_prefix;
        return;
      // match 5.6gearman..7.4gearman
      case /^((5\.6)|(7\.[0-4]))gearman$/.test(version_extension):
        command =
          '\nbash ' +
          path.join(__dirname, '../src/scripts/ext/gearman.sh') +
          ' ' +
          version +
          pipe;
        break;
      // match 7.0phalcon3...7.3phalcon3 or 7.2phalcon4...7.4phalcon4
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
        script +=
          '\nbash ' +
          path.join(__dirname, '../src/scripts/ext/phalcon.sh') +
          ' ' +
          extension +
          ' ' +
          version;
        return;
      // match 7.0xdebug..7.4xdebug
      case /^7\.[0-4]xdebug$/.test(version_extension):
        script +=
          '\nupdate_extension xdebug 2.9.2' +
          pipe +
          '\n' +
          (await utils.addLog('$tick', 'xdebug', 'Enabled', 'linux'));
        return;
      // match sqlite
      case /^sqlite$/.test(extension):
        extension = 'sqlite3';
        command = command_prefix + version + '-' + extension + pipe;
        break;
      default:
        command =
          command_prefix +
          version +
          '-' +
          extension.replace('pdo_', '').replace('pdo-', '') +
          pipe;
        break;
    }
    script +=
      '\nadd_extension ' + extension + ' "' + command + '" ' + ext_prefix;
  });
  return script;
}

/**
 * Install and enable extensions
 *
 * @param extension_csv
 * @param version
 * @param os_version
 * @param no_step
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
      return script + (await addExtensionWindows(extension_csv, version));
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
