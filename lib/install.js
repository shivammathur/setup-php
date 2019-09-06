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
const https = require('https');
const fs = require('fs');
function get_file(filename, version) {
    return __awaiter(this, void 0, void 0, function* () {
        let github_path = 'https://raw.githubusercontent.com/shivammathur/setup-php/master/src/';
        const file = fs.createWriteStream(version + filename);
        file.on('open', function (fd) {
            https.get(github_path + filename, function (response) {
                response
                    .on('data', function (chunk) {
                    file.write(chunk);
                })
                    .on('end', function () {
                    file.end();
                });
            });
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let version = process.env['php-version'];
            if (!version) {
                version = core.getInput('php-version', { required: true });
            }
            console.log('Input: ' + version);
            let os_version = process.platform;
            if (os_version == 'darwin') {
                yield get_file('darwin.sh', version);
                yield exec_1.exec('sudo chmod a+x ' + version + 'darwin.sh');
                yield exec_1.exec('./' + version + 'darwin.sh ' + version);
            }
            else if (os_version == 'win32') {
                yield get_file('windows.ps1', version);
                yield exec_1.exec('powershell .\\' + version + 'windows.ps1 -version ' + version);
            }
            else if (os_version == 'linux') {
                yield get_file('linux.sh', version);
                yield exec_1.exec('sudo chmod a+x ' + version + 'linux.sh');
                yield exec_1.exec('./' + version + 'linux.sh ' + version);
            }
        }
        catch (err) {
            core.setFailed(err.message);
        }
    });
}
run().then(() => {
    console.log('done');
});
