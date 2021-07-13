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
  await utils.asyncForEach(extensions, async function (extension: string) {
    const version_extension: string = version + extension;
    const [extension_name, stability]: string[] = extension.split('-');
    const ext_prefix = await utils.getExtensionPrefix(extension_name);
    const command_prefix = 'pecl_install ';
    let command = '';
    switch (true) {
      // match pre-release versions
      case /.+-(beta|alpha|devel|snapshot)/.test(extension):
        script +=
          '\nadd_unstable_extension ' +
          extension_name +
          ' ' +
          stability +
          ' ' +
          ext_prefix;
        return;
      // match 5.6 to 8.0 amqp, grpc, igbinary, imagick, imap, msgpack, pecl_http, propro, protobuf, raphf, rdkafka, redis, swoole, xdebug, xdebug2, zmq
      // match 7.1pcov to 8.0pcov
      case /(5\.6|7\.[0-4]|8.0)(amqp|grpc|igbinary|imagick|imap|msgpack|^(pecl_)?http$|propro|protobuf|psr|raphf|rdkafka|redis|swoole|xdebug|xdebug2|zmq)/.test(
        version_extension
      ):
      case /(7\.[1-4]|8\.0])pcov/.test(version_extension):
      case /^(5\.6|7\.[0-3])phalcon3$|^7\.[2-4]phalcon4$/.test(
        version_extension
      ):
        command = 'add_brew_extension ' + extension_name.replace('pecl_', '');
        break;
      // match sqlite
      case /^sqlite$/.test(extension):
        extension = 'sqlite3';
        command = command_prefix + extension;
        break;
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
      case /.+-(beta|alpha|devel|snapshot)/.test(extension):
        script += '\nAdd-Extension ' + extension_name + ' ' + stability;
        break;
      // match 5.6mysql, 5.6mysqli, 5.6mysqlnd
      case /^5\.6(mysql|mysqli|mysqlnd)$/.test(version_extension):
        script +=
          '\nAdd-Extension mysql\nAdd-Extension mysqli\nAdd-Extension mysqlnd';
        break;
      // match 7.2xdebug2 to 7.4xdebug2
      case /7\.[2-4]xdebug2/.test(version_extension):
        script += '\nAdd-Extension xdebug stable 2.9.8';
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
      case /.+-(beta|alpha|devel|snapshot)/.test(extension):
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
        script +=
          '\n. ' + path.join(__dirname, '../src/scripts/ext/gearman.sh');
        return;
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
      // match 7.2xdebug2 to 7.4xdebug2
      case /^7\.[2-4]xdebug2$/.test(version_extension):
        script += '\nadd_pecl_extension xdebug 2.9.8 ' + ext_prefix;
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
      return script + (await addExtensionDarwin(extension_csv, version));
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
