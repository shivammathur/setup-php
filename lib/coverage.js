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
const utils = __importStar(require("./utils"));
const extensions = __importStar(require("./extensions"));
const config = __importStar(require("./config"));
/**
 * Function to setup Xdebug
 *
 * @param version
 * @param os_version
 */
function addCoverageXdebug(version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        return ((yield extensions.addExtension('xdebug', version, os_version, true)) +
            (yield utils.suppressOutput(os_version)) +
            '\n' +
            (yield utils.addLog('$tick', 'xdebug', 'Xdebug enabled as coverage driver', os_version)));
    });
}
exports.addCoverageXdebug = addCoverageXdebug;
/**
 * Function to setup PCOV
 *
 * @param version
 * @param os_version
 */
function addCoveragePCOV(version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        let script = '\n';
        switch (version) {
            default:
                script +=
                    (yield extensions.addExtension('pcov', version, os_version, true)) +
                        (yield utils.suppressOutput(os_version)) +
                        '\n';
                script +=
                    (yield config.addINIValues('pcov.enabled=1', os_version, true)) + '\n';
                // add command to disable xdebug and enable pcov
                switch (os_version) {
                    case 'linux':
                        script +=
                            'if [ -e /etc/php/' +
                                version +
                                '/mods-available/xdebug.ini ]; then sudo phpdismod -v ' +
                                version +
                                ' xdebug; fi\n';
                        script += 'sudo sed -i "/xdebug/d" $ini_file\n';
                        break;
                    case 'darwin':
                        script += 'sudo sed -i \'\' "/xdebug/d" $ini_file\n';
                        break;
                    case 'win32':
                        script +=
                            'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug C:\\tools\\php }\n';
                        break;
                }
                // success
                script += yield utils.addLog('$tick', 'coverage: pcov', 'PCOV enabled as coverage driver', os_version);
                // version is not supported
                break;
            case '5.6':
            case '7.0':
                script += yield utils.addLog('$cross', 'pcov', 'PHP 7.1 or newer is required', os_version);
                break;
        }
        return script;
    });
}
exports.addCoveragePCOV = addCoveragePCOV;
/**
 * Function to disable Xdebug and PCOV
 *
 * @param version
 * @param os_version
 */
function disableCoverage(version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        let script = '\n';
        switch (os_version) {
            case 'linux':
                script +=
                    'if [ -e /etc/php/' +
                        version +
                        '/mods-available/xdebug.ini ]; then sudo phpdismod -v ' +
                        version +
                        ' xdebug; fi\n';
                script +=
                    'if [ -e /etc/php/' +
                        version +
                        '/mods-available/pcov.ini ]; then sudo phpdismod -v ' +
                        version +
                        ' pcov; fi\n';
                script += 'sudo sed -i "/xdebug/d" $ini_file\n';
                script += 'sudo sed -i "/pcov/d" $ini_file\n';
                break;
            case 'darwin':
                script += 'sudo sed -i \'\' "/xdebug/d" $ini_file\n';
                script += 'sudo sed -i \'\' "/pcov/d" $ini_file\n';
                break;
            case 'win32':
                script +=
                    'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug C:\\tools\\php }\n';
                script +=
                    'if(php -m | findstr -i pcov) { Disable-PhpExtension pcov C:\\tools\\php }\n';
                break;
        }
        script += yield utils.addLog('$tick', 'none', 'Disabled Xdebug and PCOV', os_version);
        return script;
    });
}
exports.disableCoverage = disableCoverage;
/**
 * Function to set coverage driver
 *
 * @param coverage_driver
 * @param version
 * @param os_version
 */
function addCoverage(coverage_driver, version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        coverage_driver.toLowerCase();
        const script = '\n' + (yield utils.stepLog('Setup Coverage', os_version));
        switch (coverage_driver) {
            case 'pcov':
                return script + (yield addCoveragePCOV(version, os_version));
            case 'xdebug':
                return script + (yield addCoverageXdebug(version, os_version));
            case 'none':
                return script + (yield disableCoverage(version, os_version));
            default:
                return '';
        }
    });
}
exports.addCoverage = addCoverage;
