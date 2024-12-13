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
        remove_script += '\ndisable_extension' + ext_name.replace(/:/g, ' ');
        return;
      // Match none
      case /^none$/.test(ext_name):
        add_script += '\ndisable_all_shared';
        return;
      // match extensions for compiling from source
      case /.+-.+\/.+@.+/.test(extension):
        add_script += await utils.parseExtensionSource(extension, ext_prefix);
        return;
      // match 7.4relay...8.5relay
      // match 5.3blackfire...8.3blackfire
      // match 5.3blackfire-(semver)...8.3blackfire-(semver)
      // match couchbase, event, geos, pdo_oci, oci8, http, pecl_http
      // match 5.3ioncube...8.2ioncube
      // match 7.0phalcon3...7.3phalcon3, 7.2phalcon4...7.4phalcon4, and 7.4phalcon5...8.3phalcon5
      // match 7.0zephir_parser...8.3zephir_parser
      case /^(7\.4|8\.[0-5])relay(-v?\d+\.\d+\.\d+)?$/.test(version_extension):
      case /^(5\.[3-6]|7\.[0-4]|8\.[0-3])blackfire(-\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
      case /^couchbase|^event|^gearman$|^geos$|^pdo_oci$|^oci8$|^(pecl_)?http|^pdo_firebird$/.test(
        extension
      ):
      case /^(5\.[3-6]|7\.[0-4]|8\.[0-2])ioncube$/.test(version_extension):
      case /(5\.6|7\.[0-3])phalcon3|7\.[2-4]phalcon4|(7\.4|8\.[0-3])phalcon5?/.test(
        version_extension
      ):
      case /(?<!5\.[3-6])(pdo_)?sqlsrv$/.test(version_extension):
      case /^(7\.[0-4]|8\.[0-3])zephir_parser(-v?\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
        add_script += await utils.customPackage(
          ext_name,
          'extensions',
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
      case /.+-\d+(\.\d+\.\d+.*)?/.test(extension):
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
      // match brew extensions
      case /(?<!5\.[3-5])(amqp|apcu|expect|gnupg|grpc|igbinary|imagick|imap|mailparse|mcrypt|memcache|memcached|mongodb|msgpack|protobuf|psr|raphf|rdkafka|redis|snmp|ssh2|swoole|uuid|vld|xdebug|xdebug2|yaml|zmq)/.test(
        version_extension
      ):
      case /(?<!5\.[3-6])(ds|v8js)/.test(version_extension):
      case /(5\.6|7\.[0-4])(propro|lua)/.test(version_extension):
      case /(?<!5\.[3-6]|7\.0)pcov/.test(version_extension):
      case /(?<!5\.[3-6])(ast|vips|xlswriter)/.test(version_extension):
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
        remove_script += '\nDisable-Extension' + ext_name.replace(/:/g, ' ');
        break;
      // Match none
      case /^none$/.test(ext_name):
        add_script += '\nDisable-AllShared';
        break;
      // match 5.3blackfire...8.3blackfire
      // match 5.3blackfire-(semver)...8.3blackfire-(semver)
      // match pdo_oci and oci8
      // match 5.3ioncube...8.2ioncube
      // match 7.0phalcon3...7.3phalcon3, 7.2phalcon4...7.4phalcon4, and 7.4phalcon5...8.3phalcon5
      // match 7.1pecl_http...8.1pecl_http and 7.1http...8.1http
      // match 7.0zephir_parser...8.3zephir_parser
      case /^(5\.[3-6]|7\.[0-4]|8\.[0-3])blackfire(-\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
      case /^pdo_oci$|^oci8$|^pdo_firebird$/.test(extension):
      case /^(5\.[3-6]|7\.[0-4]|8\.[0-2])ioncube$/.test(version_extension):
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$|^(7\.4|8\.[0-3])phalcon5?$/.test(
        version_extension
      ):
      case /^(7\.[1-4]|8\.1)(pecl_)?http/.test(version_extension):
      case /(?<!5\.[3-6])(pdo_)?sqlsrv$/.test(version_extension):
      case /^(7\.[0-4]|8\.[0-3])zephir_parser(-v?\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
        add_script += await utils.customPackage(
          ext_name,
          'extensions',
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
      // match semver without state
      case /.+-\d+(\.\d+\.\d+.*)?/.test(extension):
        add_script += await utils.joins(
          '\nAdd-Extension',
          ext_name,
          'stable',
          ext_version
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
    const [ext_name, ext_version]: string[] = extension
      .split(/-(.+)/)
      .filter(Boolean);
    const ext_prefix = await utils.getExtensionPrefix(ext_name);

    switch (true) {
      // Match :extension
      case /^:/.test(ext_name):
        remove_script += '\ndisable_extension' + ext_name.replace(/:/g, ' ');
        return;
      // Match none
      case /^none$/.test(ext_name):
        add_script += '\ndisable_all_shared';
        return;
      // match extensions for compiling from source
      case /.+-.+\/.+@.+/.test(extension):
        add_script += await utils.parseExtensionSource(extension, ext_prefix);
        return;
      // match 7.4relay...8.5relay
      // match 5.3blackfire...8.3blackfire
      // match 5.3blackfire-(semver)...8.3blackfire-(semver)
      // match 5.3pdo_cubrid...7.2php_cubrid, 5.3cubrid...7.4cubrid
      // match couchbase, geos, pdo_oci, oci8, http, pecl_http
      // match 5.3ioncube...8.2ioncube
      // match 7.0phalcon3...7.3phalcon3, 7.2phalcon4...7.4phalcon4, 7.4phalcon5...8.3phalcon5
      // match 7.0zephir_parser...8.3zephir_parser
      case /^(7\.4|8\.[0-5])relay(-v?\d+\.\d+\.\d+)?$/.test(version_extension):
      case /^(5\.[3-6]|7\.[0-4]|8\.[0-3])blackfire(-\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
      case /^((5\.[3-6])|(7\.[0-2]))pdo_cubrid$|^((5\.[3-6])|(7\.[0-4]))cubrid$/.test(
        version_extension
      ):
      case /^couchbase|^event|^gearman$|^geos$|^pdo_oci$|^oci8$|^(pecl_)?http|^pdo_firebird$/.test(
        extension
      ):
      case /(?<!5\.[3-5])intl-\d+\.\d+$/.test(version_extension):
      case /^(5\.[3-6]|7\.[0-4]|8\.[0-2])ioncube$/.test(version_extension):
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$|^(7\.4|8\.[0-3])phalcon5?$/.test(
        version_extension
      ):
      case /(?<!5\.[3-6])(pdo_)?sqlsrv$/.test(version_extension):
      case /^(7\.[0-4]|8\.[0-3])zephir_parser(-v?\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
        add_script += await utils.customPackage(
          ext_name,
          'extensions',
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
      case /.+-\d+(\.\d+\.\d+.*)?/.test(extension):
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
 * @param os
 * @param no_step
 */
export async function addExtension(
  extension_csv: string,
  version: string,
  os: string,
  no_step = false
): Promise<string> {
  const log: string = await utils.stepLog('Setup Extensions', os);
  let script = '\n';
  switch (no_step) {
    case true:
      script += log + (await utils.suppressOutput(os));
      break;
    case false:
    default:
      script += log;
      break;
  }

  switch (os) {
    case 'win32':
      return script + (await addExtensionWindows(extension_csv, version));
    case 'darwin':
      return script + (await addExtensionDarwin(extension_csv, version));
    case 'linux':
      return script + (await addExtensionLinux(extension_csv, version));
    default:
      return await utils.log(
        'Platform ' + os + ' is not supported',
        os,
        'error'
      );
  }
}
