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
const pecl = __importStar(require("./pecl"));
function addExtension(extension_csv, version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (os_version) {
            case 'win32':
                return yield addExtensionWindows(extension_csv, version);
            case 'darwin':
                return yield addExtensionDarwin(extension_csv, version);
            case 'linux':
                return yield addExtensionLinux(extension_csv, version);
            default:
                return yield utils.log('Platform ' + os_version + ' is not supported', os_version, 'error');
        }
    });
}
exports.addExtension = addExtension;
function addINIValues(ini_values_csv, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (os_version) {
            case 'win32':
                return yield addINIValuesWindows(ini_values_csv);
            case 'darwin':
            case 'linux':
                return yield addINIValuesUnix(ini_values_csv);
            default:
                return yield utils.log('Platform ' + os_version + ' is not supported', os_version, 'error');
        }
    });
}
exports.addINIValues = addINIValues;
/**
 * Enable extensions which are installed but not enabled on windows
 *
 * @param extension
 */
function enableExtensionWindows(extension) {
    return __awaiter(this, void 0, void 0, function* () {
        return (`try {  
  $exist = Test-Path -Path $ext_dir\\php_${extension}.dll
  if(!(php -m | findstr -i ${extension}) -and $exist) {
    Add-Content C:\\tools\\php\\php.ini "extension=php_${extension}.dll"\n` +
            (yield utils.log('Enabled ' + extension, 'win32', 'success')) +
            ` } elseif(php -m | findstr -i ${extension}) {\n` +
            (yield utils.log('Extension ' + extension + ' was already enabled', 'win32', 'success')) +
            ` }
} catch [Exception] {\n` +
            (yield utils.log(extension + ' could not be enabled', 'win32', 'error')) +
            ` }\n`);
    });
}
exports.enableExtensionWindows = enableExtensionWindows;
/**
 * Enable extensions which are installed but not enabled on unix
 *
 * @param extension
 * @param os_version
 */
function enableExtensionUnix(extension, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        return (`if [ ! "$(php -m | grep -i ${extension})" ] && [ -e "$ext_dir/${extension}.so" ]; then
  echo "extension=${extension}.so" >> 'php -i | grep "Loaded Configuration" | sed -e "s|.*=>\s*||"'\n` +
            (yield utils.log('Enabled ' + extension, os_version, 'success')) +
            `;\n elif [ "$(php -m | grep -i ${extension})" ]; then \n` +
            (yield utils.log('Extension ' + extension + ' was already enabled', os_version, 'success')) +
            `; fi\n`);
    });
}
exports.enableExtensionUnix = enableExtensionUnix;
/**
 * Install and enable extensions for darwin
 *
 * @param extension_csv
 * @param version
 */
function addExtensionDarwin(extension_csv, version) {
    return __awaiter(this, void 0, void 0, function* () {
        let extensions = yield utils.extensionArray(extension_csv);
        let script = '\n';
        yield utils.asyncForEach(extensions, function (extension) {
            return __awaiter(this, void 0, void 0, function* () {
                extension = extension.toLowerCase();
                // add script to enable extension is already installed along with php
                script += yield enableExtensionUnix(extension, 'darwin');
                switch (yield pecl.checkPECLExtension(extension)) {
                    case true:
                        let extension_version = version === '5.6' && extension === 'xdebug'
                            ? 'xdebug-2.5.5'
                            : extension;
                        script +=
                            'if [ ! "$(php -m | grep -i ' +
                                extension +
                                ')" ]; then sudo pecl install ' +
                                extension_version +
                                ' >/dev/null 2>&1 && ' +
                                (yield utils.log('Installed and enabled ' + extension, 'darwin', 'success')) +
                                ' || ' +
                                (yield utils.log('Could not install ' + extension + ' on PHP' + version, 'darwin', 'error')) +
                                '; fi\n';
                        break;
                    case false:
                    default:
                        script +=
                            'if [ ! "$(php -m | grep -i ' +
                                extension +
                                ')" ]; then \n' +
                                (yield utils.log('Could not find ' + extension + ' for PHP' + version + ' on PECL', 'darwin', 'error')) +
                                '; fi\n';
                        break;
                }
            });
        });
        return script;
    });
}
exports.addExtensionDarwin = addExtensionDarwin;
/**
 * Install and enable extensions for windows
 *
 * @param extension_csv
 * @param version
 */
function addExtensionWindows(extension_csv, version) {
    return __awaiter(this, void 0, void 0, function* () {
        let extensions = yield utils.extensionArray(extension_csv);
        let script = '\n';
        yield utils.asyncForEach(extensions, function (extension) {
            return __awaiter(this, void 0, void 0, function* () {
                extension = extension.toLowerCase();
                // add script to enable extension is already installed along with php
                script += yield enableExtensionWindows(extension);
                let extension_version = '';
                switch (version) {
                    case '7.4':
                        extension_version = 'alpha';
                        break;
                    case '7.2':
                    default:
                        extension_version = 'stable';
                        break;
                }
                switch (yield pecl.checkPECLExtension(extension)) {
                    case true:
                        script +=
                            'if(!(php -m | findstr -i ' +
                                extension +
                                ')) { ' +
                                'try { Install-PhpExtension ' +
                                extension +
                                ' -MinimumStability ' +
                                extension_version +
                                '\n' +
                                (yield utils.log('Installed and enabled ' + extension, 'win32', 'success')) +
                                ' } catch [Exception] { ' +
                                (yield utils.log('Could not install ' + extension + ' on PHP' + version, 'win32', 'error')) +
                                ' } }\n';
                        break;
                    case false:
                    default:
                        script +=
                            'if(!(php -m | findstr -i ' +
                                extension +
                                ')) { ' +
                                (yield utils.log('Could not find ' + extension + ' for PHP' + version + ' on PECL', 'win32', 'error')) +
                                ' } \n';
                        break;
                }
            });
        });
        return script;
    });
}
exports.addExtensionWindows = addExtensionWindows;
/**
 * Install and enable extensions for linux
 *
 * @param extension_csv
 * @param version
 */
function addExtensionLinux(extension_csv, version) {
    return __awaiter(this, void 0, void 0, function* () {
        let extensions = yield utils.extensionArray(extension_csv);
        let script = '\n';
        yield utils.asyncForEach(extensions, function (extension) {
            return __awaiter(this, void 0, void 0, function* () {
                extension = extension.toLowerCase();
                // add script to enable extension is already installed along with php
                script += yield enableExtensionUnix(extension, 'linux');
                script +=
                    'if [ ! "$(php -m | grep -i ' +
                        extension +
                        ')" ]; then sudo DEBIAN_FRONTEND=noninteractive apt install -y php' +
                        version +
                        '-' +
                        extension +
                        ' >/dev/null 2>&1 && ' +
                        (yield utils.log('Installed and enabled ' + extension, 'linux', 'success')) +
                        ' || ' +
                        (yield utils.log('Could not find php' + version + '-' + extension + ' on APT repository', 'linux', 'error')) +
                        '; fi\n';
            });
        });
        return script;
    });
}
exports.addExtensionLinux = addExtensionLinux;
/**
 * Add script to set custom ini values for unix
 *
 * @param ini_values_csv
 */
function addINIValuesUnix(ini_values_csv) {
    return __awaiter(this, void 0, void 0, function* () {
        let script = '\n';
        let ini_values = yield utils.INIArray(ini_values_csv);
        yield utils.asyncForEach(ini_values, function (ini_value) {
            return __awaiter(this, void 0, void 0, function* () {
                // add script to set ini value
                script += 'echo "' + ini_value + '" >> $ini_file\n';
            });
        });
        return script;
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
        let script = '\n';
        let ini_values = yield utils.INIArray(ini_values_csv);
        yield utils.asyncForEach(ini_values, function (ini_value) {
            return __awaiter(this, void 0, void 0, function* () {
                // add script to set ini value
                script += 'Add-Content C:\\tools\\php\\php.ini "' + ini_value + '"\n';
            });
        });
        return script;
    });
}
exports.addINIValuesWindows = addINIValuesWindows;
function addCoverage(coverage, version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        let script = '';
        script += '\n';
        coverage = coverage.toLowerCase();
        // pcov
        switch (coverage) {
            case 'pcov':
                // if version is 7.1 or newer
                switch (version) {
                    default:
                        script += yield addExtension(coverage, version, os_version);
                        script += yield addINIValues('pcov.enabled=1', os_version);
                        // add command to disable xdebug and enable pcov
                        switch (os_version) {
                            case 'linux':
                                script +=
                                    "sudo phpdismod xdebug || echo 'xdebug not installed'\n";
                                script += "sudo phpenmod pcov || echo 'pcov not installed'\n";
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
                        script += yield utils.log('pcov enabled as coverage driver', os_version, 'success');
                        // version is not supported
                        break;
                    case '5.6':
                    case '7.0':
                        script += yield utils.log('pcov requires php 7.1 or newer', os_version, 'warning');
                        break;
                }
                break;
            //xdebug
            case 'xdebug':
                script += yield addExtension(coverage, version, os_version);
                script += yield utils.log('Xdebug enabled as coverage driver', os_version, 'success');
                break;
            // unknown coverage driver
            default:
                script = '';
        }
        return script;
    });
}
exports.addCoverage = addCoverage;
