import * as path from 'path';
import * as utils from './utils';

/**
 * Function to get script to install custom extensions
 *
 * @param script
 * @param command
 */
export async function customExtension(
  script: string,
  ...command: string[]
): Promise<string> {
  return (
    '\n. ' +
    path.join(__dirname, '../src/scripts/ext/' + script) +
    '\n' +
    (await utils.joins(...command))
  );
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
  let add_script = '\n';
  let remove_script = '';
  await utils.asyncForEach(extensions, async function (extension: string) {
    const version_extension: string = version + extension;
    const [ext_name, ext_version]: string[] = extension.split('-');
    const ext_prefix = await utils.getExtensionPrefix(ext_name);
    const command_prefix = 'pecl_install ';
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
        add_script += await customExtension(
          'blackfire.sh',
          'add_blackfire',
          extension
        );
        return;
      // match pdo_oci and oci8
      case /^pdo_oci$|^oci8$/.test(extension):
        add_script += await customExtension('oci.sh', 'add_oci', extension);
        return;
      // match 5.3ioncube...7.4ioncube, 7.0ioncube...7.4ioncube
      case /^5\.[3-6]ioncube$|^7\.[0-4]ioncube$/.test(version_extension):
        add_script += await customExtension('ioncube.sh', 'add_ioncube');
        return;
      // match 7.0phalcon3...7.3phalcon3 and 7.2phalcon4...7.4phalcon4
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
        add_script += await customExtension(
          'phalcon.sh',
          'add_phalcon',
          extension
        );
        return;
      // match pre-release versions. For example - xdebug-beta
      case /.*-(beta|alpha|devel|snapshot)/.test(version_extension):
        add_script += await utils.joins(
          '\nadd_unstable_extension',
          ext_name,
          ext_version,
          ext_prefix
        );
        return;
      // match semver
      case /.*-\d+\.\d+\.\d+.*/.test(version_extension):
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
      // match 5.6xdebug to 8.0xdebug, 5.6swoole to 8.0swoole
      // match 5.6grpc to 7.4grpc, 5.6protobuf to 7.4protobuf
      // match 7.1pcov to 8.0pcov
      case /(5\.6|7\.[0-4]|8\.[0-9])xdebug/.test(version_extension):
      case /(5\.6|7\.[0-4])(grpc|protobuf|swoole)/.test(version_extension):
      case /(7\.[1-4]|8\.[0-9])pcov/.test(version_extension):
        command = 'add_brew_extension ' + ext_name;
        break;
      // match 5.6redis
      case /5\.6redis/.test(version_extension):
        command = command_prefix + 'redis-2.2.8';
        break;
      // match imagick
      case /^imagick$/.test(extension):
        command = await utils.joins(
          'brew install pkg-config imagemagick' + pipe,
          '&& ' + command_prefix + 'imagick' + pipe
        );
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
    add_script += await utils.joins(
      '\nadd_extension',
      extension,
      '"' + command + '"',
      ext_prefix
    );
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
      // match 5.4blackfire...5.6blackfire, 7.0blackfire...7.4blackfire
      // match 5.4blackfire-1.31.0...5.6blackfire-1.31.0, 7.0blackfire-1.31.0...7.4blackfire-1.31.0
      case /^(5\.[4-6]|7\.[0-4])blackfire(-\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
        add_script += await customExtension(
          'blackfire.ps1',
          'Add-Blackfire',
          extension
        );
        break;
      // match pdo_oci and oci8
      case /^pdo_oci$|^oci8$/.test(extension):
        add_script += await customExtension('oci.ps1', 'Add-OCI', extension);
        break;
      // match 5.3ioncube...7.4ioncube, 7.0ioncube...7.4ioncube
      case /^5\.[3-6]ioncube$|^7\.[0-4]ioncube$/.test(version_extension):
        add_script += await customExtension('ioncube.ps1', 'Add-Ioncube');
        break;
      // match 7.0phalcon3...7.3phalcon3 and 7.2phalcon4...7.4phalcon4
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
        add_script += await customExtension(
          'phalcon.ps1',
          'Add-Phalcon',
          extension
        );
        break;
      // match pre-release versions. For example - xdebug-beta
      case /.*-(beta|alpha|devel|snapshot)/.test(version_extension):
        add_script += await utils.joins(
          '\nAdd-Extension',
          ext_name,
          ext_version
        );
        break;
      // match semver without state
      case /.*-\d+\.\d+\.\d+$/.test(version_extension):
        add_script += await utils.joins(
          '\nAdd-Extension',
          ext_name,
          'stable',
          ext_version
        );
        break;
      // match semver with state
      case /.*-(\d+\.\d+\.\d)(beta|alpha|devel|snapshot)\d*/.test(
        version_extension
      ):
        matches = /.*-(\d+\.\d+\.\d)(beta|alpha|devel|snapshot)\d*/.exec(
          version_extension
        ) as RegExpExecArray;
        add_script += await utils.joins(
          '\nAdd-Extension',
          ext_name,
          matches[2],
          matches[1]
        );
        break;
      // match 5.3pcov to 7.0pcov
      case /(5\.[3-6]|7\.0)pcov/.test(version_extension):
        add_script += await utils.getUnsupportedLog('pcov', version, 'win32');
        break;
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
 * @param pipe
 */
export async function addExtensionLinux(
  extension_csv: string,
  version: string,
  pipe: string
): Promise<string> {
  const extensions: Array<string> = await utils.extensionArray(extension_csv);
  let add_script = '\n';
  let remove_script = '';
  await utils.asyncForEach(extensions, async function (extension: string) {
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
      // match 5.3blackfire-{semver}...5.6blackfire-{semver}, 7.0blackfire-{semver}...7.4blackfire-{semver}
      case /^(5\.[3-6]|7\.[0-4])blackfire(-\d+\.\d+\.\d+)?$/.test(
        version_extension
      ):
        add_script += await customExtension(
          'blackfire.sh',
          'add_blackfire',
          extension
        );
        return;
      // match pdo_oci and oci8
      case /^pdo_oci$|^oci8$/.test(extension):
        add_script += await customExtension('oci.sh', 'add_oci', extension);
        return;
      // match 5.3ioncube...7.4ioncube, 7.0ioncube...7.4ioncube
      case /^5\.[3-6]ioncube$|^7\.[0-4]ioncube$/.test(version_extension):
        add_script += await customExtension('ioncube.sh', 'add_ioncube');
        return;
      // match 7.0phalcon3...7.3phalcon3 and 7.2phalcon4...7.4phalcon4
      case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
        add_script += await customExtension(
          'phalcon.sh',
          'add_phalcon',
          extension
        );
        return;
      // match 5.6gearman..7.4gearman
      case /^((5\.6)|(7\.[0-4]))gearman$/.test(version_extension):
        add_script += await customExtension('gearman.sh', 'add_gearman');
        return;
      // match pre-release versions. For example - xdebug-beta
      case /.*-(beta|alpha|devel|snapshot)/.test(version_extension):
        add_script += await utils.joins(
          '\nadd_unstable_extension',
          ext_name,
          ext_version,
          ext_prefix
        );
        return;
      // match semver versions
      case /.*-\d+\.\d+\.\d+.*/.test(version_extension):
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
      // match 7.2xdebug3..7.4xdebug3
      case /^7\.[2-4]xdebug3$/.test(version_extension):
        add_script +=
          '\nadd_extension_from_source xdebug xdebug/xdebug master --enable-xdebug zend_extension';
        return;
      // match 8.0xdebug3
      case /^8\.[0-9]xdebug3$/.test(version_extension):
        extension = 'xdebug';
        command = command_prefix + version + '-' + extension + pipe;
        break;
      // match pdo extensions
      case /.*pdo[_-].*/.test(version_extension):
        extension = extension.replace(/pdo[_-]|3/, '');
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
    add_script += await utils.joins(
      '\nadd_extension',
      extension,
      '"' + command + '"',
      ext_prefix
    );
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
