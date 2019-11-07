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
const config = __importStar(require("./config"));
const coverage = __importStar(require("./coverage"));
const extensions = __importStar(require("./extensions"));
const utils = __importStar(require("./utils"));
/**
 * Build the script
 *
 * @param filename
 * @param version
 * @param os_version
 */
function build(filename, version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        // taking inputs
        let extension_csv = yield utils.getInput('extension-csv', false);
        let ini_values_csv = yield utils.getInput('ini-values-csv', false);
        let coverage_driver = yield utils.getInput('coverage', false);
        let script = yield utils.readScript(filename, version, os_version);
        if (extension_csv) {
            script += yield extensions.addExtension(extension_csv, version, os_version);
        }
        if (ini_values_csv) {
            script += yield config.addINIValues(ini_values_csv, os_version);
        }
        if (coverage_driver) {
            script += yield coverage.addCoverage(coverage_driver, version, os_version);
        }
        return yield utils.writeScript(filename, script);
    });
}
exports.build = build;
/**
 * Run the script
 */
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let os_version = process.platform;
            let version = yield utils.getInput('php-version', true);
            // check the os version and run the respective script
            let script_path = '';
            switch (os_version) {
                case 'darwin':
                    script_path = yield build(os_version + '.sh', version, os_version);
                    yield exec_1.exec('sh ' + script_path + ' ' + version + ' ' + __dirname);
                    break;
                case 'linux':
                    let pecl = yield utils.getInput('pecl', false);
                    script_path = yield build(os_version + '.sh', version, os_version);
                    yield exec_1.exec('sh ' + script_path + ' ' + version + ' ' + pecl);
                    break;
                case 'win32':
                    script_path = yield build('win32.ps1', version, os_version);
                    yield exec_1.exec('pwsh ' + script_path + ' -version ' + version + ' -dir ' + __dirname);
                    break;
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
exports.run = run;
// call the run function
run();
