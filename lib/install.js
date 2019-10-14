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
const exec_1 = require("@actions/exec/lib/exec");
const core = __importStar(require("@actions/core"));
const utils = __importStar(require("./utils"));
const extensions = __importStar(require("./extensions"));
const config = __importStar(require("./config"));
const coverage = __importStar(require("./coverage"));
/**
 * Run the script
 */
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // taking inputs
            let version = yield utils.getInput('php-version', true);
            let extension_csv = yield utils.getInput('extension-csv', false);
            let ini_values_csv = yield utils.getInput('ini-values-csv', false);
            let coverage_driver = yield utils.getInput('coverage', false);
            let os_version = process.platform;
            // check the os version and run the respective script
            if (os_version == 'darwin') {
                let darwin = yield utils.readScript('darwin.sh', version, os_version);
                darwin += yield extensions.addExtension(extension_csv, version, os_version);
                darwin += yield config.addINIValues(ini_values_csv, os_version);
                darwin += yield coverage.addCoverage(coverage_driver, version, os_version);
                yield utils.writeScript('darwin.sh', version, darwin);
                yield exec_1.exec('sh ./' + version + 'darwin.sh ' + version);
            }
            else if (os_version == 'win32') {
                let windows = yield utils.readScript('win32.ps1', version, os_version);
                windows += yield extensions.addExtension(extension_csv, version, os_version);
                windows += yield config.addINIValues(ini_values_csv, os_version);
                windows += yield coverage.addCoverage(coverage_driver, version, os_version);
                yield utils.writeScript('win32.ps1', version, windows);
                yield exec_1.exec('powershell .\\' + version + 'win32.ps1 -version ' + version);
            }
            else if (os_version == 'linux') {
                let linux = yield utils.readScript('linux.sh', version, os_version);
                linux += yield extensions.addExtension(extension_csv, version, os_version);
                linux += yield config.addINIValues(ini_values_csv, os_version);
                linux += yield coverage.addCoverage(coverage_driver, version, os_version);
                yield utils.writeScript('linux.sh', version, linux);
                yield exec_1.exec('./' + version + 'linux.sh ' + version);
            }
        }
        catch (err) {
            core.setFailed(err.message);
        }
    });
}
// call the run function
run();
