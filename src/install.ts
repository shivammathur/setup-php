import * as core from '@actions/core';
import {exec} from '@actions/exec/lib/exec';
const https = require('https');
const fs = require('fs');

async function get_file(filename: string) {
  let github_path: string =
    'https://raw.githubusercontent.com/shivammathur/setup-php/master/src/';
  const file: any = fs.createWriteStream(filename);
  https.get(github_path + filename, function(response: any) {
    response.pipe(file);
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
      await get_file('darwin.sh');
      await exec('sudo chmod a+x darwin.sh');
      await exec('./darwin.sh ' + version);
    } else if (os_version == 'win32') {
      await get_file('windows.ps1');
      await exec('DIR');
      await exec('powershell .\\windows.ps1 -version ' + version);
    } else if (os_version == 'linux') {
      await get_file('linux.sh');
      await exec('sudo chmod a+x linux.sh');
      await exec('./linux.sh ' + version);
    }
  } catch (err) {
    core.setFailed(err.message);
  }
}

run().then(() => {
  console.log('done');
});
