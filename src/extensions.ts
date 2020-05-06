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
  let add_script = '\n';
  let remove_script = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    const version_extension: string = version + extension;
    const [ext_name, ext_version]: string[] = extension.split('-');
    const ext_prefix = await utils.getExtensionPrefix(ext_name);
    const command_prefix = 'sudo pecl install -f ';
    let command = '';
    switch (true) {
      // match :extension
      case /^:/.test(ext_name):
        remove_script += '\nremove_extension ' + ext_name.slice(1);
        return;
      // match 5.3blackfire...5.6blackfire, 7.0blackfire...7.4blackfire
      // match 5.3blackfire-1.31.0...5.6blackfire-1.31.0, 7.0blackfire-1.31.0...7.4blackfire-1.31.0
      case /^(5\.[3-6]|7\.[0-4])blackfire(-\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
        command =
          'bash ' +
          path.join(__dirname, '../src/scripts/ext/blackfire_darwin.sh') +
          ' ' +
          version +
          ' ' +
          (await utils.getBlackfireVersion(ext_version));
        break;
      // match pre-release versions. For example - xdebug-beta
      case /.*-(beta|alpha|devel|snapshot)/.test(version_extension):
        add_script +=
          '\nadd_unstable_extension ' +
          ext_name +
          ' ' +
          ext_version +
          ' ' +
          ext_prefix;
        return;
      // match semver
      case /.*-\d+\.\d+\.\d+.*/.test(version_extension):
        add_script +=
          '\nadd_pecl_extension ' +
          ext_name +
          ' ' +
          ext_version +
          ' ' +
          ext_prefix;
        return;
      // match 5.3xdebug
      case /5\.3xdebug/.test(version_extension):
        command = command_prefix + 'xdebug-2.2.7' + pipe;
        break;
      // match 5.4xdebug
      case /5\.4xdebug/.test(version_extension):
        command = command_prefix + 'xdebug-2.4.1' + pipe;
        break;
      // match 5.5xdebug and 5.6xdebug
      case /5\.[5-6]xdebug/.test(version_extension):
        command = command_prefix + 'xdebug-2.5.5' + pipe;
        break;
      // match 7.0redis
      case /7\.0xdebug/.test(version_extension):
        command = command_prefix + 'xdebug-2.9.0' + pipe;
        break;
      // match 5.6redis
      case /5\.6redis/.test(version_extension):
        command = command_prefix + 'redis-2.2.8' + pipe;
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
        command = command_prefix + extension + pipe;
        break;
      // match 7.0phalcon3...7.3phalcon3 and 7.2phalcon4...7.4phalcon4
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
        add_script +=
          'sh ' +
          path.join(__dirname, '../src/scripts/ext/phalcon_darwin.sh') +
          ' ' +
          extension +
          ' ' +
          version;
        return;
      default:
        command = command_prefix + extension + pipe;
        break;
    }
    add_script +=
      '\nadd_extension ' + extension + ' "' + command + '" ' + ext_prefix;
  });
  return add_script + remove_script;
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
  let add_script = '\n';
  let remove_script = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    const [ext_name, ext_version]: string[] = extension.split('-');
    const version_extension: string = version + extension;
    let matches: RegExpExecArray;
    switch (true) {
      // Match :extension
      case /^:/.test(ext_name):
        remove_script += '\nRemove-Extension ' + ext_name.slice(1);
        return;
      // match 5.4blackfire...5.6blackfire, 7.0blackfire...7.4blackfire
      // match 5.4blackfire-1.31.0...5.6blackfire-1.31.0, 7.0blackfire-1.31.0...7.4blackfire-1.31.0
      case /^(5\.[4-6]|7\.[0-4])blackfire(-\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
        add_script +=
          '\n& ' +
          path.join(__dirname, '../src/scripts/ext/blackfire.ps1') +
          ' ' +
          version +
          ' ' +
          (await utils.getBlackfireVersion(ext_version));
        return;
      // match pre-release versions. For example - xdebug-beta
      case /.*-(beta|alpha|devel|snapshot)/.test(version_extension):
        add_script += '\nAdd-Extension ' + ext_name + ' ' + ext_version;
        break;
      // match semver without state
      case /.*-\d+\.\d+\.\d+$/.test(version_extension):
        add_script += '\nAdd-Extension ' + ext_name + ' stable ' + ext_version;
        return;
      // match semver with state
      case /.*-(\d+\.\d+\.\d)(beta|alpha|devel|snapshot)\d*/.test(
        version_extension
      ):
        matches = /.*-(\d+\.\d+\.\d)(beta|alpha|devel|snapshot)\d*/.exec(
          version_extension
        ) as RegExpExecArray;
        add_script +=
          '\nAdd-Extension ' + ext_name + ' ' + matches[2] + ' ' + matches[1];
        return;
      // match 5.3mysql..5.6mysql
      // match 5.3mysqli..5.6mysqli
      // match 5.3mysqlnd..5.6mysqlnd
      case /^5\.\d(mysql|mysqli|mysqlnd)$/.test(version_extension):
        add_script +=
          '\nAdd-Extension mysql\nAdd-Extension mysqli\nAdd-Extension mysqlnd';
        break;
      // match 7.0mysql..8.0mysql
      // match 7.0mysqli..8.0mysqli
      // match 7.0mysqlnd..8.0mysqlnd
      case /[7-8]\.\d(mysql|mysqli|mysqlnd)$/.test(version_extension):
        add_script += '\nAdd-Extension mysqli\nAdd-Extension mysqlnd';
        break;
      // match sqlite
      case /^sqlite$/.test(extension):
        extension = 'sqlite3';
        add_script += '\nAdd-Extension ' + extension;
        break;
      // match 7.0phalcon3...7.3phalcon3 and 7.2phalcon4...7.4phalcon4
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
        add_script +=
          '\n& ' +
          path.join(__dirname, '../src/scripts/ext/phalcon.ps1') +
          ' ' +
          extension +
          ' ' +
          version +
          '\n';
        break;
      default:
        add_script += '\nAdd-Extension ' + extension;
        break;
    }
  });
  return add_script + remove_script;
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
  let add_script = '\n';
  let remove_script = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    const version_extension: string = version + extension;
    const [ext_name, ext_version]: string[] = extension.split('-');
    const ext_prefix = await utils.getExtensionPrefix(ext_name);
    const command_prefix = 'sudo $debconf_fix apt-get install -y php';
    let command = '';
    switch (true) {
      // Match :extension
      case /^:/.test(ext_name):
        remove_script += '\nremove_extension ' + ext_name.slice(1);
        return;
      // match 5.3blackfire...5.6blackfire, 7.0blackfire...7.4blackfire
      // match 5.3blackfire-1.31.0...5.6blackfire-1.31.0, 7.0blackfire-1.31.0...7.4blackfire-1.31.0
      case /^(5\.[3-6]|7\.[0-4])blackfire(-\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
        command =
          'bash ' +
          path.join(__dirname, '../src/scripts/ext/blackfire.sh') +
          ' ' +
          version +
          ' ' +
          (await utils.getBlackfireVersion(ext_version));
        break;
      // match pre-release versions. For example - xdebug-beta
      case /.*-(beta|alpha|devel|snapshot)/.test(version_extension):
        add_script +=
          '\nadd_unstable_extension ' +
          ext_name +
          ' ' +
          ext_version +
          ' ' +
          ext_prefix;
        return;
      // match semver versions
      case /.*-\d+\.\d+\.\d+.*/.test(version_extension):
        add_script +=
          '\nadd_pecl_extension ' +
          ext_name +
          ' ' +
          ext_version +
          ' ' +
          ext_prefix;
        return;
      // match 5.6gearman..7.4gearman
      case /^((5\.6)|(7\.[0-4]))gearman$/.test(version_extension):
        command =
          'sh ' +
          path.join(__dirname, '../src/scripts/ext/gearman.sh') +
          ' ' +
          version +
          pipe;
        break;
      // match 7.0phalcon3...7.3phalcon3 or 7.2phalcon4...7.4phalcon4
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
        add_script +=
          '\nsh ' +
          path.join(__dirname, '../src/scripts/ext/phalcon.sh') +
          ' ' +
          extension +
          ' ' +
          version;
        return;
      // match 7.1xdebug..7.4xdebug
      case /^7\.[1-4]xdebug$/.test(version_extension):
        add_script +=
          '\nupdate_extension xdebug 2.9.3' +
          pipe +
          '\n' +
          (await utils.addLog('$tick', 'xdebug', 'Enabled', 'linux'));
        return;
      // match pdo extensions
      case /.*pdo[_-].*/.test(version_extension):
        extension = extension.replace('pdo_', '').replace('pdo-', '');
        add_script += '\nadd_pdo_extension ' + extension;
        return;
      // match ast and uopz
      case /^(ast|uopz)$/.test(extension):
        command = command_prefix + '-' + extension + pipe;
        break;
      // match sqlite
      case /^sqlite$/.test(extension):
        extension = 'sqlite3';
        command = command_prefix + version + '-' + extension + pipe;
        break;
      default:
        command = command_prefix + version + '-' + extension + pipe;
        break;
    }
    add_script +=
      '\nadd_extension ' + extension + ' "' + command + '" ' + ext_prefix;
  });
  return add_script + remove_script;
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
