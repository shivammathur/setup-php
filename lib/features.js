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
        if (os_version === 'win32') {
            return yield addExtensionWindows(extension_csv, version);
        }
        else if (os_version === 'linux') {
            return yield addExtensionLinux(extension_csv, version);
        }
        return yield addExtensionDarwin(extension_csv, version);
    });
}
exports.addExtension = addExtension;
function addINIValues(ini_values_csv, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (os_version === 'win32') {
            return yield addINIValuesWindows(ini_values_csv);
        }
        return yield addINIValuesUnix(ini_values_csv);
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
    Enable-PhpExtension ${extension} C:\\tools\\php\n` +
            (yield utils.log(extension + ' enabled', 'win32', 'success')) +
            `}
} catch [Exception] {\n` +
            (yield utils.log(extension + ' could not be installed', 'win32', 'error')) +
            ` }\n`);
    });
}
exports.enableExtensionWindows = enableExtensionWindows;
/**
 * Enable extensions which are installed but not enabled on unix
 *
 * @param extension
 */
function enableExtensionUnix(extension) {
    return __awaiter(this, void 0, void 0, function* () {
        return (`if [ ! "$(php -m | grep ${extension})" ] && [ -e "$ext_dir/${extension}.so" ]; then
  echo "extension=${extension}.so" >> 'php -i | grep "Loaded Configuration" | sed -e "s|.*=>\s*||"'\n` +
            (yield utils.log(extension + ' enabled', 'unix', 'success')) +
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
                script += yield enableExtensionUnix(extension);
                if (yield pecl.checkPECLExtension(extension)) {
                    if (version === '5.6' && extension === 'xdebug') {
                        extension = 'xdebug-2.5.5';
                    }
                    script +=
                        'if [ ! "$(php -m | grep ' +
                            extension +
                            ')" ]; then sudo pecl install ' +
                            extension +
                            ' || ' +
                            (yield utils.log("Couldn't install extension: " + extension, 'darwin', 'error')) +
                            '; fi\n';
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
                let extension_version = 'stable';
                if (version == '7.4') {
                    extension_version = 'alpha';
                }
                if (yield pecl.checkPECLExtension(extension)) {
                    script +=
                        'if(!(php -m | findstr -i ' +
                            extension +
                            ')) { ' +
                            'try { Install-PhpExtension ' +
                            extension +
                            ' -MinimumStability ' +
                            extension_version +
                            ' } catch [Exception] { ' +
                            (yield utils.log('Could not install extension: ' + extension, 'win32', 'error')) +
                            ' } }\n';
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
                script += yield enableExtensionUnix(extension);
                script +=
                    'if [ ! "$(php -m | grep ' +
                        extension +
                        ')" ]; then sudo DEBIAN_FRONTEND=noninteractive apt install -y php' +
                        version +
                        '-' +
                        extension +
                        ' || ' +
                        (yield utils.log("Couldn't find extension php" + version + '-' + extension, 'linux', 'error')) +
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
        let script = '\n';
        if (coverage) {
            coverage = coverage.toLowerCase();
            // pcov
            if (coverage === 'pcov') {
                // if version is 7.1 or newer
                if (version >= '7.1') {
                    script += yield addExtension(coverage, version, os_version);
                    script += yield addINIValues('pcov.enabled=1', os_version);
                    // add command to disable xdebug and enable pcov
                    if (os_version === 'linux') {
                        script += "sudo phpdismod xdebug || echo 'xdebug not installed'\n";
                        script += "sudo phpenmod pcov || echo 'pcov not installed'\n";
                    }
                    else if (os_version === 'darwin') {
                        script += 'sudo sed -i \'\' "/xdebug/d" $ini_file\n';
                    }
                    else {
                        script +=
                            'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug C:\\tools\\php }\n';
                    }
                    // success
                    script += yield utils.log('pcov enabled as coverage driver', os_version, 'success');
                    // version is not supported
                }
                else {
                    script += yield utils.log('pcov requires php 7.1 or newer', os_version, 'warning');
                }
                //xdebug
            }
            else if (coverage === 'xdebug') {
                script += yield addExtension(coverage, version, os_version);
                script += yield utils.log('Xdebug enabled as coverage driver', os_version, 'success');
                // unknown coverage driver
            }
            else {
                script += yield utils.log(coverage + ' is not a coverage driver or it is not supported', os_version, 'warning');
            }
        }
        return script;
    });
}
exports.addCoverage = addCoverage;
