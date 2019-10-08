import * as utils from './utils';
import * as pecl from './pecl';

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
 * Enable extensions which are installed but not enabled on windows
 *
 * @param extension
 */
export async function enableExtensionWindows(
  extension: string,
  log_prefix: string
) {
  return (
    `try {  
  $exist = Test-Path -Path $ext_dir\\php_${extension}.dll
  if(!(php -m | findstr -i ${extension}) -and $exist) {
    Add-Content C:\\tools\\php\\php.ini "${await utils.getExtensionPrefix(
      extension
    )}=php_${extension}.dll"\n` +
    (await utils.log('Enabled ' + extension, 'win32', 'success', log_prefix)) +
    ` } elseif(php -m | findstr -i ${extension}) {\n` +
    (await utils.log(
      extension + ' was already enabled',
      'win32',
      'success',
      log_prefix
    )) +
    ` }
} catch [Exception] {\n` +
    (await utils.log(
      extension + ' could not be enabled',
      'win32',
      'error',
      log_prefix
    )) +
    ` }\n`
  );
}

/**
 * Enable extensions which are installed but not enabled on unix
 *
 * @param extension
 * @param os_version
 */
export async function enableExtensionUnix(
  extension: string,
  os_version: string,
  log_prefix: string
) {
  return (
    `if [ ! "$(php -m | grep -i ${extension})" ] && [ -e "$ext_dir/${extension}.so" ]; then
  echo "${await utils.getExtensionPrefix(
    extension
  )}=${extension}" >> 'php -i | grep "Loaded Configuration" | sed -e "s|.*=>\s*||"'\n` +
    (await utils.log(
      'Enabled ' + extension,
      os_version,
      'success',
      log_prefix
    )) +
    `;\n elif [ "$(php -m | grep -i ${extension})" ]; then \n` +
    (await utils.log(
      extension + ' was already enabled',
      os_version,
      'success',
      log_prefix
    )) +
    `; fi\n`
  );
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
    script += await enableExtensionUnix(extension, 'darwin', log_prefix);
    switch (await pecl.checkPECLExtension(extension)) {
      case true:
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
            install_command =
              'sudo pecl install ' + extension + ' >/dev/null 2>&1';
            break;
        }
        script +=
          'if [ ! "$(php -m | grep -i ' +
          extension +
          ')" ]; then ' +
          install_command +
          ' && ' +
          (await utils.log(
            'Installed and enabled ' + extension,
            'darwin',
            'success',
            log_prefix
          )) +
          ' || ' +
          (await utils.log(
            'Could not install ' + extension + ' on PHP' + version,
            'darwin',
            'error',
            log_prefix
          )) +
          '; fi\n';
        break;
      case false:
      default:
        script +=
          'if [ ! "$(php -m | grep -i ' +
          extension +
          ')" ]; then \n' +
          (await utils.log(
            'Could not find ' + extension + ' for PHP' + version + ' on PECL',
            'darwin',
            'error',
            log_prefix
          )) +
          '; fi\n';
        break;
    }
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
    script += await enableExtensionWindows(extension, log_prefix);

    switch (await pecl.checkPECLExtension(extension)) {
      case true:
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
          'if(!(php -m | findstr -i ' +
          extension +
          ')) { ' +
          'try { ' +
          install_command +
          '\n' +
          (await utils.log(
            'Installed and enabled ' + extension,
            'win32',
            'success',
            log_prefix
          )) +
          ' } catch [Exception] { ' +
          (await utils.log(
            'Could not install ' + extension + ' on PHP' + version,
            'win32',
            'error',
            log_prefix
          )) +
          ' } }\n';
        break;
      case false:
      default:
        script +=
          'if(!(php -m | findstr -i ' +
          extension +
          ')) { ' +
          (await utils.log(
            'Could not find ' + extension + ' for PHP' + version + ' on PECL',
            'win32',
            'error',
            log_prefix
          )) +
          ' } \n';
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
  version: string,
  log_prefix: string
): Promise<string> {
  let extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script: string = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    extension = extension.toLowerCase();
    // add script to enable extension is already installed along with php
    script += await enableExtensionUnix(extension, 'linux', log_prefix);

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
      'if [ ! "$(php -m | grep -i ' +
      extension +
      ')" ]; then ' +
      install_command +
      ' && ' +
      (await utils.log(
        'Installed and enabled ' + extension,
        'linux',
        'success',
        log_prefix
      )) +
      ' || ' +
      (await utils.log(
        'Could not find php' + version + '-' + extension + ' on APT repository',
        'linux',
        'error',
        log_prefix
      )) +
      '; fi\n';
  });
  return script;
}
