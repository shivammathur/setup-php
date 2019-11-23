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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const core = __importStar(require("@actions/core"));
/**
 * Function to get inputs from both with and env annotations.
 *
 * @param name
 * @param mandatory
 */
function getInput(name, mandatory) {
    return __awaiter(this, void 0, void 0, function* () {
        const input = process.env[name];
        switch (input) {
            case '':
            case undefined:
                return core.getInput(name, { required: mandatory });
            default:
                return input;
        }
    });
}
exports.getInput = getInput;
/**
 * Async foreach loop
 *
 * @author https://github.com/Atinux
 * @param array
 * @param callback
 */
function asyncForEach(array, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let index = 0; index < array.length; index++) {
            yield callback(array[index], index, array);
        }
    });
}
exports.asyncForEach = asyncForEach;
/**
 * Get color index
 *
 * @param type
 */
function color(type) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (type) {
            case 'error':
                return '31';
            default:
            case 'success':
                return '32';
            case 'warning':
                return '33';
        }
    });
}
exports.color = color;
/**
 * Log to console
 *
 * @param message
 * @param os_version
 * @param log_type
 * @param prefix
 */
function log(message, os_version, log_type) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (os_version) {
            case 'win32':
                return ('printf "\\033[' +
                    (yield color(log_type)) +
                    ';1m' +
                    message +
                    ' \\033[0m"');
            case 'linux':
            case 'darwin':
            default:
                return ('echo "\\033[' + (yield color(log_type)) + ';1m' + message + '\\033[0m"');
        }
    });
}
exports.log = log;
/**
 * Function to log a step
 *
 * @param message
 * @param os_version
 */
function stepLog(message, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (os_version) {
            case 'win32':
                return 'Step-Log "' + message + '"';
            case 'linux':
            case 'darwin':
                return 'step_log "' + message + '"';
            default:
                return yield log('Platform ' + os_version + ' is not supported', os_version, 'error');
        }
    });
}
exports.stepLog = stepLog;
/**
 * Function to log a result
 * @param mark
 * @param subject
 * @param message
 */
function addLog(mark, subject, message, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (os_version) {
            case 'win32':
                return 'Add-Log "' + mark + '" "' + subject + '" "' + message + '"';
            case 'linux':
            case 'darwin':
                return 'add_log "' + mark + '" "' + subject + '" "' + message + '"';
            default:
                return yield log('Platform ' + os_version + ' is not supported', os_version, 'error');
        }
    });
}
exports.addLog = addLog;
/**
 * Read the scripts
 *
 * @param filename
 * @param version
 * @param os_version
 */
function readScript(filename, version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (os_version) {
            case 'darwin':
                switch (version) {
                    case '7.4':
                        return fs.readFileSync(path.join(__dirname, '../src/scripts/7.4.sh'), 'utf8');
                }
                return fs.readFileSync(path.join(__dirname, '../src/scripts/' + filename), 'utf8');
            case 'linux':
            case 'win32':
                return fs.readFileSync(path.join(__dirname, '../src/scripts/' + filename), 'utf8');
            default:
                return yield log('Platform ' + os_version + ' is not supported', os_version, 'error');
        }
    });
}
exports.readScript = readScript;
/**
 * Write final script which runs
 *
 * @param filename
 * @param version
 * @param script
 */
function writeScript(filename, script) {
    return __awaiter(this, void 0, void 0, function* () {
        const runner_dir = yield getInput('RUNNER_TOOL_CACHE', false);
        const script_path = path.join(runner_dir, filename);
        fs.writeFileSync(script_path, script, { mode: 0o755 });
        return script_path;
    });
}
exports.writeScript = writeScript;
/**
 * Function to break extension csv into an array
 *
 * @param extension_csv
 */
function extensionArray(extension_csv) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (extension_csv) {
            case '':
            case ' ':
                return [];
            default:
                return extension_csv.split(',').map(function (extension) {
                    return extension
                        .trim()
                        .replace('php-', '')
                        .replace('php_', '');
                });
        }
    });
}
exports.extensionArray = extensionArray;
/**
 * Function to break ini values csv into an array
 *
 * @param ini_values_csv
 * @constructor
 */
function INIArray(ini_values_csv) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (ini_values_csv) {
            case '':
            case ' ':
                return [];
            default:
                return ini_values_csv.split(',').map(function (ini_value) {
                    return ini_value.trim();
                });
        }
    });
}
exports.INIArray = INIArray;
/**
 * Function to get prefix required to load an extension.
 *
 * @param extension
 */
function getExtensionPrefix(extension) {
    return __awaiter(this, void 0, void 0, function* () {
        const zend = ['xdebug', 'opcache', 'ioncube', 'eaccelerator'];
        switch (zend.indexOf(extension)) {
            case 0:
            case 1:
                return 'zend_extension';
            case -1:
            default:
                return 'extension';
        }
    });
}
exports.getExtensionPrefix = getExtensionPrefix;
/**
 * Function to get the suffix to suppress console output
 *
 * @param os_version
 */
function suppressOutput(os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (os_version) {
            case 'win32':
                return ' >$null 2>&1';
            case 'linux':
            case 'darwin':
                return ' >/dev/null 2>&1';
            default:
                return yield log('Platform ' + os_version + ' is not supported', os_version, 'error');
        }
    });
}
exports.suppressOutput = suppressOutput;
