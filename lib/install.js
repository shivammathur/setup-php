"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec_1 = require("@actions/exec/lib/exec");
const path = __importStar(require("path"));
const httpm = __importStar(require("typed-rest-client/HttpClient"));
const fs = __importStar(require("fs"));
/*
Read the scripts
*/
let os_version = process.platform;
let darwin = fs.readFileSync(path.join(__dirname, '../src/darwin.sh'), 'utf8');
let linux = fs.readFileSync(path.join(__dirname, '../src/linux.sh'), 'utf8');
let windows = fs.readFileSync(path.join(__dirname, '../src/windows.ps1'), 'utf8');
/*
Credit: https://github.com/Atinux
*/
function asyncForEach(array, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let index = 0; index < array.length; index++) {
            yield callback(array[index], index, array);
        }
    });
}
/*
Enable extensions which are installed but not enabled
*/
function enableExtension(extension) {
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
function addExtension(extension_csv, version) {
    return __awaiter(this, void 0, void 0, function* () {
        let extensions = extension_csv
            .split(',')
            .map(function (extension) {
            return extension
                .trim()
                .replace('php-', '')
                .replace('php_', '');
        });
        linux += '\n';
        windows += '\n';
        darwin += '\n';
        yield asyncForEach(extensions, function (extension) {
            return __awaiter(this, void 0, void 0, function* () {
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
                }
                else {
                    // check if pecl extension exists
                    const http = new httpm.HttpClient('shivammathur/php-setup', [], {
                        allowRetries: true,
                        maxRetries: 2
                    });
                    const response = yield http.get('https://pecl.php.net/package/' + extension);
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
                                '_found -eq 0 ]; then sudo pecl install ' +
                                extension +
                                ' || echo "Couldn\'t find extension: ' +
                                extension +
                                '"; fi\n';
                    }
                    else {
                        console.log('Cannot find pecl extension: ' + extension);
                    }
                }
            });
        });
        linux += 'sudo DEBIAN_FRONTEND=noninteractive apt autoremove -y';
    });
}
/*
Add script to set custom ini values
*/
function addINIValues(ini_values_csv) {
    return __awaiter(this, void 0, void 0, function* () {
        let ini_values = ini_values_csv
            .split(',')
            .map(function (ini_value) {
            return ini_value.trim();
        });
        yield asyncForEach(ini_values, function (ini_value) {
            return __awaiter(this, void 0, void 0, function* () {
                // add script to set ini value
                linux += '\necho "' + ini_value + '" >> $ini_file';
                darwin += '\necho "' + ini_value + '" >> $ini_file';
                windows +=
                    '\nAdd-Content C:\\tools\\php$version\\php.ini "' + ini_value + '"';
            });
        });
    });
}
/*
Write final script which runs
*/
function createScript(filename, version) {
    return __awaiter(this, void 0, void 0, function* () {
        let script = '';
        if (filename == 'linux.sh') {
            script = linux;
        }
        else if (filename == 'darwin.sh') {
            script = darwin;
        }
        else if (filename == 'windows.ps1') {
            script = windows;
        }
        fs.writeFile(version + filename, script, function (error) {
            if (error) {
                return console.log(error);
            }
            console.log('The file was saved!');
        });
    });
}
/*
Run the script
*/
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // taking inputs
            let version = process.env['php-version'];
            if (!version) {
                version = core.getInput('php-version', { required: true });
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
                yield addExtension(extension_csv, version);
            }
            let ini_values_csv = process.env['ini-values-csv'];
            if (!ini_values_csv) {
                ini_values_csv = core.getInput('ini-values-csv');
            }
            if (ini_values_csv) {
                console.log('INI Values: ' + ini_values_csv);
                yield addINIValues(ini_values_csv);
            }
            // check the os version and run the respective script
            if (os_version == 'darwin') {
                yield createScript('darwin.sh', version);
                yield exec_1.exec('sudo chmod a+x ' + version + 'darwin.sh');
                yield exec_1.exec('sh -x ./' + version + 'darwin.sh ' + version);
            }
            else if (os_version == 'win32') {
                yield createScript('windows.ps1', version);
                yield exec_1.exec('powershell .\\' + version + 'windows.ps1 -version ' + version);
            }
            else if (os_version == 'linux') {
                yield createScript('linux.sh', version);
                yield exec_1.exec('sudo chmod a+x ' + version + 'linux.sh');
                yield exec_1.exec('./' + version + 'linux.sh ' + version);
            }
        }
        catch (err) {
            core.setFailed(err.message);
        }
    });
}
// call the run function
run().then(function () {
    console.log('done');
});
