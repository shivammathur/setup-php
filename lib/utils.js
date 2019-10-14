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
        let input = process.env[name];
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
 * Copy config
 *
 * @param files
 */
function readFiles74(files) {
    return __awaiter(this, void 0, void 0, function* () {
        yield asyncForEach(files, function (filename) {
            fs.createReadStream(path.join(__dirname, '../src/' + filename)).pipe(fs.createWriteStream(filename.split('/')[1], { mode: 0o755 }));
        });
    });
}
exports.readFiles74 = readFiles74;
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
                        yield readFiles74([
                            'configs/config.yaml',
                            'scripts/xdebug_darwin.sh',
                            'scripts/pcov.sh'
                        ]);
                        return fs.readFileSync(path.join(__dirname, '../src/scripts/7.4.sh'), 'utf8');
                }
                break;
            case 'linux':
                let files = ['scripts/phalcon.sh'];
                yield readFiles74(['scripts/phalcon.sh']);
                switch (version) {
                    case '7.4':
                        files.concat(['scripts/xdebug.sh', 'scripts/pcov.sh']);
                        break;
                }
                yield readFiles74(files);
                break;
            case 'win32':
                switch (version) {
                    case '7.4':
                        yield readFiles74(['ext/php_pcov.dll']);
                        break;
                }
                break;
            default:
                return yield log('Platform ' + os_version + ' is not supported', os_version, 'error');
        }
        return fs.readFileSync(path.join(__dirname, '../src/scripts/' + filename), 'utf8');
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
function writeScript(filename, version, script) {
    return __awaiter(this, void 0, void 0, function* () {
        fs.writeFileSync(version + filename, script, { mode: 0o755 });
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
function log(message, os_version, log_type, prefix = '') {
    return __awaiter(this, void 0, void 0, function* () {
        const unix_color = {
            error: '31',
            success: '32',
            warning: '33'
        };
        switch (prefix) {
            case '':
                prefix = '';
                break;
            default:
                prefix = prefix + ': ';
                break;
        }
        switch (os_version) {
            case 'win32':
                const color = {
                    error: 'red',
                    success: 'green',
                    warning: 'yellow'
                };
                return ("Write-Host '" +
                    prefix +
                    message +
                    "' -ForegroundColor " +
                    color[log_type]);
            case 'linux':
            case 'darwin':
            default:
                return ('echo "\\033[' +
                    unix_color[log_type] +
                    ';1m' +
                    prefix +
                    message +
                    '\\033[0m"');
        }
    });
}
exports.log = log;
/**
 * Function to get prefix required to load an extension.
 *
 * @param extension
 */
function getExtensionPrefix(extension) {
    return __awaiter(this, void 0, void 0, function* () {
        let zend = ['xdebug', 'opcache', 'ioncube', 'eaccelerator'];
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
