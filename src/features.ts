import * as utils from './utils';
import * as pecl from './pecl';

export async function addExtension(
  extension_csv: string,
  version: string,
  os_version: string
): Promise<string> {
  if (os_version === 'win32') {
    return await addExtensionWindows(extension_csv, version);
  } else if (os_version === 'linux') {
    return await addExtensionLinux(extension_csv, version);
  }

  return await addExtensionDarwin(extension_csv, version);
}

export async function addINIValues(ini_values_csv: string, os_version: string) {
  if (os_version === 'win32') {
    return await addINIValuesWindows(ini_values_csv);
  }
  return await addINIValuesUnix(ini_values_csv);
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
    Enable-PhpExtension ${extension} C:\\tools\\php\n` +
    (await utils.log(extension + ' enabled', 'win32', 'success')) +
    `}
} catch [Exception] {\n` +
    (await utils.log(extension + ' could not be installed', 'win32', 'error')) +
    ` }\n`
  );
}

/**
 * Enable extensions which are installed but not enabled on unix
 *
 * @param extension
 */
export async function enableExtensionUnix(extension: string) {
  return (
    `if [ ! "$(php -m | grep ${extension})" ] && [ -e "$ext_dir/${extension}.so" ]; then
  echo "extension=${extension}.so" >> 'php -i | grep "Loaded Configuration" | sed -e "s|.*=>\s*||"'\n` +
    (await utils.log(extension + ' enabled', 'unix', 'success')) +
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
    script += await enableExtensionUnix(extension);
    if (await pecl.checkPECLExtension(extension)) {
      if (version === '5.6' && extension === 'xdebug') {
        extension = 'xdebug-2.5.5';
      }
      script +=
        'if [ ! "$(php -m | grep ' +
        extension +
        ')" ]; then sudo pecl install ' +
        extension +
        ' || ' +
        (await utils.log(
          "Couldn't install extension: " + extension,
          'darwin',
          'error'
        )) +
        '; fi\n';
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
    let extension_version = 'stable';
    if (version == '7.4') {
      extension_version = 'alpha';
    }
    if (await pecl.checkPECLExtension(extension)) {
      script +=
        'if(!(php -m | findstr -i ' +
        extension +
        ')) { ' +
        'try { Install-PhpExtension ' +
        extension +
        ' -MinimumStability ' +
        extension_version +
        ' } catch [Exception] { ' +
        (await utils.log(
          'Could not install extension: ' + extension,
          'win32',
          'error'
        )) +
        ' } }\n';
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
    script += await enableExtensionUnix(extension);
    script +=
      'if [ ! "$(php -m | grep ' +
      extension +
      ')" ]; then sudo DEBIAN_FRONTEND=noninteractive apt install -y php' +
      version +
      '-' +
      extension +
      ' || ' +
      (await utils.log(
        "Couldn't find extension php" + version + '-' + extension,
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
  let script: string = '\n';
  if (coverage) {
    coverage = coverage.toLowerCase();
    // pcov
    if (coverage === 'pcov') {
      // if version is 7.1 or newer
      if (version >= '7.1') {
        script += await addExtension(coverage, version, os_version);
        script += await addINIValues('pcov.enabled=1', os_version);

        // add command to disable xdebug and enable pcov
        if (os_version === 'linux') {
          script += "sudo phpdismod xdebug || echo 'xdebug not installed'\n";
          script += "sudo phpenmod pcov || echo 'pcov not installed'\n";
        } else if (os_version === 'darwin') {
          script += 'sudo sed -i \'\' "/xdebug/d" $ini_file\n';
        } else {
          script +=
            'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug C:\\tools\\php }\n';
        }
        // success
        script += await utils.log(
          'pcov enabled as coverage driver',
          os_version,
          'success'
        );
        // version is not supported
      } else {
        script += await utils.log(
          'pcov requires php 7.1 or newer',
          os_version,
          'warning'
        );
      }
      //xdebug
    } else if (coverage === 'xdebug') {
      script += await addExtension(coverage, version, os_version);
      script += await utils.log(
        'Xdebug enabled as coverage driver',
        os_version,
        'success'
      );
      // unknown coverage driver
    } else {
      script += await utils.log(
        coverage + ' is not a coverage driver or it is not supported',
        os_version,
        'warning'
      );
    }
  }
  return script;
}
