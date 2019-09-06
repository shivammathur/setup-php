import * as core from '@actions/core';
import {exec} from '@actions/exec/lib/exec';
const https = require('https');
const fs = require('fs');

async function get_file(filename: string, version: string) {
  let github_path: string =
    'https://raw.githubusercontent.com/shivammathur/setup-php/master/src/';
  const file: any = fs.createWriteStream(version + filename);
  file.on('open', function(fd: any) {
    https.get(github_path + filename, function(response: any) {
      response
        .on('data', function(chunk: any) {
          file.write(chunk);
        })
        .on('end', function() {
          file.end();
        });
    });
  });
}

async function run() {
  try {
    let version = process.env['php-version'];
    if (!version) {
      version = core.getInput('php-version', {required: true});
    }
    console.log('Input: ' + version);

    let os_version = process.platform;
    if (os_version == 'darwin') {
      await get_file('darwin.sh', version);
      await exec('sudo chmod a+x ' + version + 'darwin.sh');
      await exec('./' + version + 'darwin.sh ' + version);
    } else if (os_version == 'win32') {
      await get_file('windows.ps1', version);
      await exec(
        'powershell .\\' + version + 'windows.ps1 -version ' + version
      );
    } else if (os_version == 'linux') {
      await get_file('linux.sh', version);
      await exec('sudo chmod a+x ' + version + 'linux.sh');
      await exec('./' + version + 'linux.sh ' + version);
    }
  } catch (err) {
    core.setFailed(err.message);
  }
}

run().then(() => {
  console.log('done');
});
