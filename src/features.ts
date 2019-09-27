import * as utils from './utils';
import * as pecl from './pecl';

export async function addExtension(
  extension_csv: string,
  version: string,
  os_version: string
): Promise<string> {
  switch (os_version) {
    case 'win32':
      return await addExtensionWindows(extension_csv, version);
    case 'darwin':
      return await addExtensionDarwin(extension_csv, version);
    case 'linux':
      return await addExtensionLinux(extension_csv, version);
    default:
      return await utils.log(
        'Platform ' + os_version + ' is not supported',
        os_version,
        'error'
      );
  }
}

export async function addINIValues(ini_values_csv: string, os_version: string) {
  switch (os_version) {
    case 'win32':
      return await addINIValuesWindows(ini_values_csv);
    case 'darwin':
    case 'linux':
      return await addINIValuesUnix(ini_values_csv);
    default:
      return await utils.log(
        'Platform ' + os_version + ' is not supported',
        os_version,
        'error'
      );
  }
}

/**
 * Enable extensions which are installed but not enabled on windows
 *
 * @param extension
 */
export async function enableExtensionWindows(extension: string) {
  return (
    `try {  
  $exist = Test-Path -Path $ext_dir\\php_${extension}.dll
  if(!(php -m | findstr -i ${extension}) -and $exist) {
    Add-Content C:\\tools\\php\\php.ini "extension=php_${extension}.dll"\n` +
    (await utils.log('Enabled ' + extension, 'win32', 'success')) +
    ` } elseif(php -m | findstr -i ${extension}) {\n` +
    (await utils.log(
      'Extension ' + extension + ' was already enabled',
      'win32',
      'success'
    )) +
    ` }
} catch [Exception] {\n` +
    (await utils.log(extension + ' could not be enabled', 'win32', 'error')) +
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
  os_version: string
) {
  return (
    `if [ ! "$(php -m | grep -i ${extension})" ] && [ -e "$ext_dir/${extension}.so" ]; then
  echo "extension=${extension}.so" >> 'php -i | grep "Loaded Configuration" | sed -e "s|.*=>\s*||"'\n` +
    (await utils.log('Enabled ' + extension, os_version, 'success')) +
    `;\n elif [ "$(php -m | grep -i ${extension})" ]; then \n` +
    (await utils.log(
      'Extension ' + extension + ' was already enabled',
      os_version,
      'success'
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
  version: string
): Promise<string> {
  let extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script: string = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    extension = extension.toLowerCase();
    // add script to enable extension is already installed along with php
    script += await enableExtensionUnix(extension, 'darwin');
    switch (await pecl.checkPECLExtension(extension)) {
      case true:
        let extension_version: string =
          version === '5.6' && extension === 'xdebug'
            ? 'xdebug-2.5.5'
            : extension;
        script +=
          'if [ ! "$(php -m | grep -i ' +
          extension +
          ')" ]; then sudo pecl install ' +
          extension_version +
          ' >/dev/null 2>&1 && ' +
          (await utils.log(
            'Installed and enabled ' + extension,
            'darwin',
            'success'
          )) +
          ' || ' +
          (await utils.log(
            'Could not install ' + extension + ' on PHP' + version,
            'darwin',
            'error'
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
            'error'
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
  version: string
): Promise<string> {
  let extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script: string = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    extension = extension.toLowerCase();
    // add script to enable extension is already installed along with php
    script += await enableExtensionWindows(extension);
    let extension_version: string = '';
    switch (version) {
      case '7.4':
        extension_version = 'alpha';
        break;
      case '7.2':
      default:
        extension_version = 'stable';
        break;
    }

    switch (await pecl.checkPECLExtension(extension)) {
      case true:
        script +=
          'if(!(php -m | findstr -i ' +
          extension +
          ')) { ' +
          'try { Install-PhpExtension ' +
          extension +
          ' -MinimumStability ' +
          extension_version +
          '\n' +
          (await utils.log(
            'Installed and enabled ' + extension,
            'win32',
            'success'
          )) +
          ' } catch [Exception] { ' +
          (await utils.log(
            'Could not install ' + extension + ' on PHP' + version,
            'win32',
            'error'
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
            'error'
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
  version: string
): Promise<string> {
  let extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script: string = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    extension = extension.toLowerCase();
    // add script to enable extension is already installed along with php
    script += await enableExtensionUnix(extension, 'linux');
    script +=
      'if [ ! "$(php -m | grep -i ' +
      extension +
      ')" ]; then sudo DEBIAN_FRONTEND=noninteractive apt install -y php' +
      version +
      '-' +
      extension +
      ' >/dev/null 2>&1 && ' +
      (await utils.log(
        'Installed and enabled ' + extension,
        'linux',
        'success'
      )) +
      ' || ' +
      (await utils.log(
        'Could not find php' + version + '-' + extension + ' on APT repository',
        'linux',
        'error'
      )) +
      '; fi\n';
  });
  return script;
}

/**
 * Add script to set custom ini values for unix
 *
 * @param ini_values_csv
 */
export async function addINIValuesUnix(
  ini_values_csv: string
): Promise<string> {
  let script: string = '\n';
  let ini_values: Array<string> = await utils.INIArray(ini_values_csv);
  await utils.asyncForEach(ini_values, async function(ini_value: string) {
    // add script to set ini value
    script += 'echo "' + ini_value + '" >> $ini_file\n';
  });
  return script;
}

/**
 * Add script to set custom ini values for windows
 *
 * @param ini_values_csv
 */
export async function addINIValuesWindows(
  ini_values_csv: string
): Promise<string> {
  let script: string = '\n';
  let ini_values: Array<string> = await utils.INIArray(ini_values_csv);
  await utils.asyncForEach(ini_values, async function(ini_value: string) {
    // add script to set ini value
    script += 'Add-Content C:\\tools\\php\\php.ini "' + ini_value + '"\n';
  });
  return script;
}

export async function addCoverage(
  coverage: string,
  version: string,
  os_version: string
): Promise<string> {
  let script: string = '';
  script += '\n';
  coverage = coverage.toLowerCase();
  // pcov
  switch (coverage) {
    case 'pcov':
      // if version is 7.1 or newer
      switch (version) {
        default:
          script += await addExtension(coverage, version, os_version);
          script += await addINIValues('pcov.enabled=1', os_version);

          // add command to disable xdebug and enable pcov
          switch (os_version) {
            case 'linux':
              script +=
                "sudo phpdismod xdebug || echo 'xdebug not installed'\n";
              script += "sudo phpenmod pcov || echo 'pcov not installed'\n";
              break;
            case 'darwin':
              script += 'sudo sed -i \'\' "/xdebug/d" $ini_file\n';
              break;
            case 'win32':
              script +=
                'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug C:\\tools\\php }\n';
              break;
          }

          // success
          script += await utils.log(
            'pcov enabled as coverage driver',
            os_version,
            'success'
          );
          // version is not supported
          break;
        case '5.6':
        case '7.0':
          script += await utils.log(
            'pcov requires php 7.1 or newer',
            os_version,
            'warning'
          );
          break;
      }
      break;
    //xdebug
    case 'xdebug':
      script += await addExtension(coverage, version, os_version);
      script += await utils.log(
        'Xdebug enabled as coverage driver',
        os_version,
        'success'
      );
      break;
    // unknown coverage driver
    default:
      script = '';
  }
  return script;
}
