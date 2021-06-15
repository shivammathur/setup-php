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
  let add_script = '\n';
  let remove_script = '';
  await utils.asyncForEach(extensions, async function (extension: string) {
    const version_extension: string = version + extension;
    const [ext_name, ext_version]: string[] = extension.split('-');
    const ext_prefix = await utils.getExtensionPrefix(ext_name);

    switch (true) {
      // match :extension
      case /^:/.test(ext_name):
        remove_script += '\nremove_extension ' + ext_name.slice(1);
        return;
      // match extensions for compiling from source
      case /.+-.+\/.+@.+/.test(extension):
        add_script += await utils.parseExtensionSource(extension, ext_prefix);
        return;
      // match 5.3blackfire...8.0blackfire
      // match 5.3blackfire-(semver)...8.0blackfire-(semver)
      // match couchbase, geos, pdo_oci, oci8, http, pecl_http
      // match 5.3ioncube...7.4ioncube
      // match 7.0phalcon3...7.3phalcon3 and 7.2phalcon4...7.4phalcon4
      case /^(5\.[3-6]|7\.[0-4]|8\.0)blackfire(-\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
      case /^couchbase$|^geos$|^pdo_oci$|^oci8$|^(pecl_)?http|^pdo_firebird$/.test(
        extension
      ):
      case /^(5\.[3-6]|7\.[0-4])ioncube$/.test(version_extension):
        add_script += await utils.customPackage(
          ext_name,
          'ext',
          extension,
          'darwin'
        );
        return;
      // match pre-release versions. For example - xdebug-beta
      case /.+-(stable|beta|alpha|devel|snapshot|rc|preview)/.test(extension):
        add_script += await utils.joins(
          '\nadd_unstable_extension',
          ext_name,
          ext_version,
          ext_prefix
        );
        return;
      // match semver
      case /.+-\d+\.\d+\.\d+.*/.test(extension):
        add_script += await utils.joins(
          '\nadd_pecl_extension',
          ext_name,
          ext_version,
          ext_prefix
        );
        return;
      // match 5.3pcov to 7.0pcov
      case /(5\.[3-6]|7\.0)pcov/.test(version_extension):
        add_script += await utils.getUnsupportedLog('pcov', version, 'darwin');
        return;
      // match 5.6 and newer - amqp, apcu, grpc, igbinary, imagick, imap, msgpack, protobuf, raphf, rdkafka, redis, swoole, xdebug, xdebug2, zmq
      // match 7.1 and newer - pcov
      // match 5.6 to 7.4 - propro
      case /(?<!5\.[3-5])(amqp|apcu|grpc|igbinary|imagick|imap|memcache|memcached|msgpack|protobuf|psr|raphf|rdkafka|redis|swoole|xdebug|xdebug2|zmq)/.test(
        version_extension
      ):
      case /(5\.6|7\.[0-4])propro/.test(version_extension):
      case /(?<!5\.[3-6]|7\.0)pcov/.test(version_extension):
      case /(5\.6|7\.[0-3])phalcon3|7\.[2-4]phalcon4/.test(version_extension):
        add_script += await utils.joins(
          '\nadd_brew_extension',
          ext_name,
          ext_prefix
        );
        return;
      // match sqlite
      case /^sqlite$/.test(extension):
        extension = 'sqlite3';
        break;
      default:
        break;
    }
    add_script += await utils.joins('\nadd_extension', extension, ext_prefix);
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
  let remove_script = '';
  await utils.asyncForEach(extensions, async function (extension: string) {
    const [ext_name, ext_version]: string[] = extension.split('-');
    const version_extension: string = version + extension;
    let matches: RegExpExecArray;
    switch (true) {
      // Match :extension
      case /^:/.test(ext_name):
        remove_script += '\nRemove-Extension ' + ext_name.slice(1);
        break;
      // match 5.3blackfire...8.0blackfire
      // match 5.3blackfire-(semver)...8.0blackfire-(semver)
      // match pdo_oci and oci8
      // match 5.3ioncube...7.4ioncube
      // match 7.0phalcon3...7.3phalcon3 and 7.2phalcon4...7.4phalcon4
      // match 7.1pecl_http...8.0pecl_http and 7.1http...8.0http
      case /^(5\.[3-6]|7\.[0-4]|8\.0)blackfire(-\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
      case /^pdo_oci$|^oci8$|^pdo_firebird$/.test(extension):
      case /^(5\.[3-6]|7\.[0-4])ioncube$/.test(version_extension):
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
      case /^(7\.[1-4]|8\.0)(pecl_)?http/.test(version_extension):
        add_script += await utils.customPackage(
          ext_name,
          'ext',
          extension,
          'win32'
        );
        return;
      // match pre-release versions. For example - xdebug-beta
      case /.+-(stable|beta|alpha|devel|snapshot)/.test(extension):
        add_script += await utils.joins(
          '\nAdd-Extension',
          ext_name,
          ext_version.replace('stable', '')
        );
        break;
      // match extensions for compiling from source
      case /.+-.+\/.+@.+/.test(extension):
        add_script += await utils.getUnsupportedLog(
          extension,
          version,
          'win32'
        );
        break;
      // match semver without state
      case /.+-\d+\.\d+\.\d+$/.test(extension):
        add_script += await utils.joins(
          '\nAdd-Extension',
          ext_name,
          'stable',
          ext_version
        );
        break;
      // match semver with state
      case /.+-\d+\.\d+\.\d+[a-zA-Z]+\d*/.test(extension):
        matches = /.+-(\d+\.\d+\.\d+)([a-zA-Z]+)\d*/.exec(
          version_extension
        ) as RegExpExecArray;
        add_script += await utils.joins(
          '\nAdd-Extension',
          ext_name,
          matches[2].replace('preview', 'devel'),
          matches[1]
        );
        break;
      // match 7.2xdebug2 to 7.4xdebug2
      case /7\.[2-4]xdebug2/.test(version_extension):
        add_script += '\nAdd-Extension xdebug stable 2.9.8';
        break;
      // match 5.3pcov to 7.0pcov
      case /(5\.[3-6]|7\.0)pcov/.test(version_extension):
        add_script += await utils.getUnsupportedLog('pcov', version, 'win32');
        break;
      // match 5.3 to 5.6 - mysql, mysqli, mysqlnd
      case /^5\.[3-6](?<!pdo_)(mysql|mysqli|mysqlnd)$/.test(version_extension):
        add_script +=
          '\nAdd-Extension mysql\nAdd-Extension mysqli\nAdd-Extension mysqlnd';
        break;
      // match 7.0 and newer mysql, mysqli and mysqlnd
      case /(?<!5\.[3-6])(?<!pdo_)(mysql|mysqli|mysqlnd)$/.test(
        version_extension
      ):
        add_script += '\nAdd-Extension mysqli\nAdd-Extension mysqlnd';
        break;
      // match sqlite
      case /^sqlite$/.test(extension):
        extension = 'sqlite3';
        add_script += await utils.joins('\nAdd-Extension', extension);
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
 */
export async function addExtensionLinux(
  extension_csv: string,
  version: string
): Promise<string> {
  const extensions: Array<string> = await utils.extensionArray(extension_csv);
  let add_script = '\n';
  let remove_script = '';
  await utils.asyncForEach(extensions, async function (extension: string) {
    const version_extension: string = version + extension;
    const [ext_name, ext_version]: string[] = extension.split('-');
    const ext_prefix = await utils.getExtensionPrefix(ext_name);

    switch (true) {
      // Match :extension
      case /^:/.test(ext_name):
        remove_script += '\nremove_extension ' + ext_name.slice(1);
        return;
      // match extensions for compiling from source
      case /.+-.+\/.+@.+/.test(extension):
        add_script += await utils.parseExtensionSource(extension, ext_prefix);
        return;
      // match 5.3blackfire...8.0blackfire
      // match 5.3blackfire-(semver)...8.0blackfire-(semver)
      // match 5.3pdo_cubrid...7.2php_cubrid, 5.3cubrid...7.4cubrid
      // match couchbase, geos, pdo_oci, oci8, http, pecl_http
      // match 5.3ioncube...7.4ioncube
      // match 7.0phalcon3...7.3phalcon3 and 7.2phalcon4...7.4phalcon4
      case /^(5\.[3-6]|7\.[0-4]|8\.0)blackfire(-\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
      case /^((5\.[3-6])|(7\.[0-2]))pdo_cubrid$|^((5\.[3-6])|(7\.[0-4]))cubrid$/.test(
        version_extension
      ):
      case /^couchbase$|^gearman$|^geos$|^pdo_oci$|^oci8$|^(pecl_)?http|^pdo_firebird$/.test(
        extension
      ):
      case /(?<!5\.[3-5])intl-[\d]+\.[\d]+$/.test(version_extension):
      case /^(5\.[3-6]|7\.[0-4])ioncube$/.test(version_extension):
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
        add_script += await utils.customPackage(
          ext_name,
          'ext',
          extension,
          'linux'
        );
        return;
      // match pre-release versions. For example - xdebug-beta
      case /.+-(stable|beta|alpha|devel|snapshot|rc|preview)/.test(extension):
        add_script += await utils.joins(
          '\nadd_unstable_extension',
          ext_name,
          ext_version,
          ext_prefix
        );
        return;
      // match semver versions
      case /.+-\d+\.\d+\.\d+.*/.test(extension):
        add_script += await utils.joins(
          '\nadd_pecl_extension',
          ext_name,
          ext_version,
          ext_prefix
        );
        return;
      // match 5.3pcov to 7.0pcov
      case /(5\.[3-6]|7\.0)pcov/.test(version_extension):
        add_script += await utils.getUnsupportedLog('pcov', version, 'linux');
        return;
      // match 7.2xdebug2...7.4xdebug2
      case /^7\.[2-4]xdebug2$/.test(version_extension):
        add_script += await utils.joins(
          '\nadd_pecl_extension',
          'xdebug',
          '2.9.8',
          ext_prefix
        );
        return;
      // match pdo extensions
      case /^pdo[_-].+/.test(extension):
        extension = extension.replace(/pdo[_-]|3/, '');
        add_script += '\nadd_pdo_extension ' + extension;
        return;
      // match sqlite
      case /^sqlite$/.test(extension):
        extension = 'sqlite3';
        break;
      default:
        break;
    }
    add_script += await utils.joins('\nadd_extension', extension, ext_prefix);
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
  const log: string = await utils.stepLog('Setup Extensions', os_version);
  let script = '\n';
  switch (no_step) {
    case true:
      script += log + (await utils.suppressOutput(os_version));
      break;
    case false:
    default:
      script += log;
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
