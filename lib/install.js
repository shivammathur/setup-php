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
var https = require('https');
const fs = require('fs');
function get_file(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        let github_path = 'https://raw.githubusercontent.com/shivammathur/setup-php/develop/src/';
        const file = fs.createWriteStream(filename);
        const request = https.get(github_path + filename, function (response) {
            response.pipe(file);
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
                yield get_file('darwin.sh');
                yield exec_1.exec('sudo chmod a+x darwin.sh');
                yield exec_1.exec('./darwin.sh ' + version);
            }
            else if (os_version == 'win32') {
                yield get_file('windows.ps1');
                yield exec_1.exec('DIR');
                yield exec_1.exec('powershell .\\windows.ps1 -version ' + version);
            }
            else if (os_version == 'linux') {
                yield get_file('linux.sh');
                yield exec_1.exec('sudo chmod a+x linux.sh');
                yield exec_1.exec('./linux.sh ' + version);
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
