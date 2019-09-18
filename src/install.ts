import * as core from '@actions/core';
import {exec} from '@actions/exec/lib/exec';
import * as path from 'path';
import * as httpm from 'typed-rest-client/HttpClient';
import * as fs from 'fs';

/*
Read the scripts
*/
let os_version = process.platform;
let darwin = fs.readFileSync(path.join(__dirname, '../src/darwin.sh'), 'utf8');
let linux = fs.readFileSync(path.join(__dirname, '../src/linux.sh'), 'utf8');
let windows = fs.readFileSync(
  path.join(__dirname, '../src/windows.ps1'),
  'utf8'
);

/*
Credit: https://github.com/Atinux
*/
async function asyncForEach(array: any, callback: any) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

/*
Enable extensions which are installed but not enabled
*/
function enableExtension(extension: string) {
  windows += `try {
  $${extension}_found = 0
  $ext_dir = Get-PhpIniKey extension_dir
  $exist = Test-Path -Path $ext_dir\\php_${extension}.dll
  $enabled = php -r "if (in_array('${extension}', get_loaded_extensions())) {echo 'yes';} else {echo 'no';}"
  if($enabled -eq 'no' -and $exist) {
    Enable-PhpExtension ${extension} C:\\tools\\php$version
    $${extension}_found = 1
  }
} catch [Exception] {
  echo $_
}\n`;

  let shell_code = `ext_dir=$(php-config --extension-dir)
${extension}_found=0
enabled=$(php -r "if (in_array('${extension}', get_loaded_extensions())) {echo 'yes';} else {echo 'no';}")
if [ "$enabled" = "no" ] && [ -e "$ext_dir/${extension}.so" ]; then
  echo "extension=${extension}.so" >> 'php -i | grep "Loaded Configuration" | sed -e "s|.*=>\s*||"'
  echo "${extension} enabled"
  ${extension}_found=1
fi\n`;
  linux += shell_code;
  darwin += shell_code;
}

/*
Install and enable extensions
*/
async function addExtension(extension_csv: string, version: string) {
  let extensions: any = extension_csv
    .split(',')
    .map(function(extension: string) {
      return extension
        .trim()
        .replace('php-', '')
        .replace('php_', '');
    });
  linux += '\n';
  windows += '\n';
  darwin += '\n';
  await asyncForEach(extensions, async function(extension: string) {
    // add script to enable extension is already installed along with php
    enableExtension(extension);

    // else add script to attempt to install the extension
    if (os_version == 'linux') {
      linux +=
        'if [ $' +
        extension +
        '_found -eq 0 ]; then sudo DEBIAN_FRONTEND=noninteractive apt install -y php' +
        version +
        '-' +
        extension +
        ' || echo "Couldn\'t find extension php' +
        version +
        '-' +
        extension +
        '"; fi\n';
    } else {
      // check if pecl extension exists
      const http = new httpm.HttpClient('shivammathur/php-setup', [], {
        allowRetries: true,
        maxRetries: 2
      });
      const response: httpm.HttpClientResponse = await http.get(
        'https://pecl.php.net/package/' + extension
      );
      if (response.message.statusCode == 200) {
        let extension_version = 'stable';
        if (version == '7.4') {
          extension_version = 'alpha';
        }
        windows +=
          'if($' +
          extension +
          '_found -eq 0) { ' +
          'try { Install-PhpExtension ' +
          extension +
          ' -MinimumStability ' +
          extension_version +
          ' } catch [Exception] { echo $_; echo "Could not install extension: "' +
          extension +
          ' } }\n';
        darwin +=
          'if [ $' +
          extension +
          '_found -eq 0 ]; then pecl install ' +
          extension +
          ' || echo "Couldn\'t find extension: ' +
          extension +
          '"; fi\n';
      } else {
        console.log('Cannot find pecl extension: ' + extension);
      }
    }
  });
  linux += 'sudo DEBIAN_FRONTEND=noninteractive apt autoremove -y';
}

/*
Add script to set custom ini values
*/
async function addINIValues(ini_values_csv: string) {
  let ini_values: any = ini_values_csv
    .split(',')
    .map(function(ini_value: string) {
      return ini_value.trim();
    });
  await asyncForEach(ini_values, async function(ini_value: string) {
    // add script to set ini value
    linux += '\necho "' + ini_value + '" >> $ini_file';
    darwin += '\necho "' + ini_value + '" >> $ini_file';
    windows +=
      '\nAdd-Content C:\\tools\\php$version\\php.ini "' + ini_value + '"';
  });
}

/*
Write final script which runs
*/
async function createScript(filename: string, version: string) {
  let script = '';
  if (filename == 'linux.sh') {
    script = linux;
  } else if (filename == 'darwin.sh') {
    script = darwin;
  } else if (filename == 'windows.ps1') {
    script = windows;
  }
  fs.writeFile(version + filename, script, function(error: any) {
    if (error) {
      return console.log(error);
    }
    console.log('The file was saved! \n' + script);
  });
}

/*
Run the script
*/
async function run() {
  try {
    // taking inputs
    let version = process.env['php-version'];
    if (!version) {
      version = core.getInput('php-version', {required: true});
    }
    console.log('Version: ' + version);

    if (version == '7.4') {
      darwin = fs.readFileSync(path.join(__dirname, '../src/7.4.sh'), 'utf8');
    }

    let extension_csv = process.env['extension-csv'];
    if (!extension_csv) {
      extension_csv = core.getInput('extension-csv');
    }
    if (extension_csv) {
      console.log('Extensions: ' + extension_csv);
      await addExtension(extension_csv, version);
    }

    let ini_values_csv = process.env['ini-values-csv'];
    if (!ini_values_csv) {
      ini_values_csv = core.getInput('ini-values-csv');
    }
    if (ini_values_csv) {
      console.log('INI Values: ' + ini_values_csv);
      await addINIValues(ini_values_csv);
    }

    // check the os version and run the respective script
    if (os_version == 'darwin') {
      await createScript('darwin.sh', version);
      await exec('sudo chmod a+x ' + version + 'darwin.sh');
      await exec('sh -x ./' + version + 'darwin.sh ' + version);
    } else if (os_version == 'win32') {
      await createScript('windows.ps1', version);
      await exec(
        'powershell .\\' + version + 'windows.ps1 -version ' + version
      );
    } else if (os_version == 'linux') {
      await createScript('linux.sh', version);
      await exec('sudo chmod a+x ' + version + 'linux.sh');
      await exec('./' + version + 'linux.sh ' + version);
    }
  } catch (err) {
    core.setFailed(err.message);
  }
}

// call the run function
run().then(function() {
  console.log('done');
});
