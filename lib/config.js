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
/**
 * Add script to set custom ini values for unix
 *
 * @param ini_values_csv
 */
function addINIValuesUnix(ini_values_csv) {
    return __awaiter(this, void 0, void 0, function* () {
        const ini_values = yield utils.INIArray(ini_values_csv);
        let script = '\n';
        yield utils.asyncForEach(ini_values, function (line) {
            return __awaiter(this, void 0, void 0, function* () {
                script +=
                    (yield utils.addLog('$tick', line, 'Added to php.ini', 'linux')) + '\n';
            });
        });
        return 'echo "' + ini_values.join('\n') + '" >> $ini_file' + script;
    });
}
exports.addINIValuesUnix = addINIValuesUnix;
/**
 * Add script to set custom ini values for windows
 *
 * @param ini_values_csv
 */
function addINIValuesWindows(ini_values_csv) {
    return __awaiter(this, void 0, void 0, function* () {
        const ini_values = yield utils.INIArray(ini_values_csv);
        let script = '\n';
        yield utils.asyncForEach(ini_values, function (line) {
            return __awaiter(this, void 0, void 0, function* () {
                script +=
                    (yield utils.addLog('$tick', line, 'Added to php.ini', 'win32')) + '\n';
            });
        });
        return ('Add-Content C:\\tools\\php\\php.ini "' +
            ini_values.join('\n') +
            '"' +
            script);
    });
}
exports.addINIValuesWindows = addINIValuesWindows;
/**
 * Function to add custom ini values
 *
 * @param ini_values_csv
 * @param os_version
 */
function addINIValues(ini_values_csv, os_version, no_step = false) {
    return __awaiter(this, void 0, void 0, function* () {
        let script = '\n';
        switch (no_step) {
            case true:
                script +=
                    (yield utils.stepLog('Add php.ini values', os_version)) +
                        (yield utils.suppressOutput(os_version)) +
                        '\n';
                break;
            case false:
            default:
                script += (yield utils.stepLog('Add php.ini values', os_version)) + '\n';
                break;
        }
        switch (os_version) {
            case 'win32':
                return script + (yield addINIValuesWindows(ini_values_csv));
            case 'darwin':
            case 'linux':
                return script + (yield addINIValuesUnix(ini_values_csv));
            default:
                return yield utils.log('Platform ' + os_version + ' is not supported', os_version, 'error');
        }
    });
}
exports.addINIValues = addINIValues;
