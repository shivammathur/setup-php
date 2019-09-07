import * as core from '@actions/core';
import {exec} from '@actions/exec/lib/exec';
import * as path from 'path';
import * as httpm from 'typed-rest-client/HttpClient';
import * as fs from 'fs';

/*
Read the scripts
*/
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
Enable functions which are installed but not enabled
*/
async function enableExtension(extension: string) {
  windows += `try {
  $ext_dir = Get-PhpIniKey extension_dir
  $exist = Test-Path -Path $ext_dir\\php_${extension}.dll
  $enabled = php -r "if (in_array('${extension}', get_loaded_extensions())) {echo 'yes';} else {echo 'no';}"
  if($enabled -eq 'no' -and $exist) {
    Enable-PhpExtension ${extension} C:\\tools\\php$version
  }
} catch [Exception] {
  echo $_
}\n`;

  let shell_code = `ext_dir=$(php -i | grep "extension_dir" | sed -e "s|.*=>\s*||")
enabled=$(php -r "if (in_array('${extension}', get_loaded_extensions())) {echo 'yes';} else {echo 'no';}")
if [ "$enabled" == 'no' ] && [ test -f "$ext_dir/${extension}.so" ]; then
  echo "extension=${extension}.so" >> 'php -i | grep "Loaded Configuration" | sed -e "s|.*:\s*||"'
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
    enableExtension(extension);
    linux +=
      'sudo apt install -y php' +
      version +
      '-' +
      extension +
      ' || echo "Couldn\'t find extension php' +
      version +
      '-' +
      extension +
      '"\n';
    const http = new httpm.HttpClient('shivammathur/php-setup', [], {
      allowRetries: true,
      maxRetries: 2
    });
    const response: httpm.HttpClientResponse = await http.get(
      'https://pecl.php.net/package/' + extension
    );
    if (response.message.statusCode == 200) {
      windows +=
        'try { Install-PhpExtension ' +
        extension +
        ' } catch [Exception] { echo $_; echo "Could not install extension: "' +
        extension +
        ' }\n';
      darwin +=
        'pecl install ' +
        extension +
        ' || echo "Couldn\'t find extension: ' +
        extension +
        '"\n';
    } else {
      console.log('Cannot find pecl extension: ' + extension);
    }
  });
  linux += 'sudo apt autoremove -y';
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

    console.log('The file was saved!');
  });
}

/*
Run the script
*/
async function run() {
  try {
    let version = process.env['php-version'];
    if (!version) {
      version = core.getInput('php-version', {required: true});
    }
    console.log('Input: ' + version);

    let extension_csv = process.env['extension-csv'];
    if (!extension_csv) {
      extension_csv = core.getInput('extension-csv');
    }
    if (extension_csv) {
      console.log('Input: ' + extension_csv);
      await addExtension(extension_csv, version);
    }

    let os_version = process.platform;
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
