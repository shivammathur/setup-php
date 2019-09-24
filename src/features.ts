import * as utils from './utils';
import * as pecl from './pecl';

export async function addExtension(
  extensions: string,
  version: string,
  os_version: string
): Promise<string> {
  if (os_version === 'win32') {
    return await addExtensionWindows(extensions, version);
  } else if (os_version === 'linux') {
    return await addExtensionLinux(extensions, version);
  }

  return await addExtensionDarwin(extensions);
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
  return `try {  
  $exist = Test-Path -Path $ext_dir\\php_${extension}.dll
  if(!(php -m | findstr -i ${extension}) -and $exist) {
    Enable-PhpExtension ${extension} C:\\tools\\php  
  }
} catch [Exception] {
  echo $_
}\n`;
}

/**
 * Enable extensions which are installed but not enabled on unix
 *
 * @param extension
 */
export async function enableExtensionUnix(extension: string) {
  return `if [ ! "$(php -m | grep ${extension})" ] && [ -e "$ext_dir/${extension}.so" ]; then
  echo "extension=${extension}.so" >> 'php -i | grep "Loaded Configuration" | sed -e "s|.*=>\s*||"'
  echo "${extension} enabled"  
fi\n`;
}

/**
 * Install and enable extensions for darwin
 *
 * @param extension_csv
 */
export async function addExtensionDarwin(
  extension_csv: string
): Promise<string> {
  let extensions: Array<string> = await utils.extensionArray(extension_csv);
  let script: string = '\n';
  await utils.asyncForEach(extensions, async function(extension: string) {
    // add script to enable extension is already installed along with php
    script += await enableExtensionUnix(extension);
    if (await pecl.checkPECLExtension(extension)) {
      script +=
        'if [ ! "$(php -m | grep ' +
        extension +
        ')" ]; then sudo pecl install ' +
        extension +
        ' || echo "Couldn\'t find extension: ' +
        extension +
        '"; fi\n';
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
        ' } catch [Exception] { echo $_; echo "Could not install extension: "' +
        extension +
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
    // add script to enable extension is already installed along with php
    script += await enableExtensionUnix(extension);
    script +=
      'if [ ! "$(php -m | grep ' +
      extension +
      ')" ]; then sudo DEBIAN_FRONTEND=noninteractive apt install -y php' +
      version +
      '-' +
      extension +
      ' || echo "Couldn\'t find extension php' +
      version +
      '-' +
      extension +
      '"; fi\n';
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
