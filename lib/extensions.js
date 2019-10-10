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
function addExtension(extension_csv, version, os_version, log_prefix = 'Add Extension') {
    return __awaiter(this, void 0, void 0, function* () {
        switch (os_version) {
            case 'win32':
                return yield addExtensionWindows(extension_csv, version, log_prefix);
            case 'darwin':
                return yield addExtensionDarwin(extension_csv, version, log_prefix);
            case 'linux':
                return yield addExtensionLinux(extension_csv, version, log_prefix);
            default:
                return yield utils.log('Platform ' + os_version + ' is not supported', os_version, 'error', log_prefix);
        }
    });
}
exports.addExtension = addExtension;
/**
 * Enable extensions which are installed but not enabled on windows
 *
 * @param extension
 */
function enableExtensionWindows(extension, log_prefix) {
    return __awaiter(this, void 0, void 0, function* () {
        return (`try {  
  $exist = Test-Path -Path $ext_dir\\php_${extension}.dll
  if(!(php -m | findstr -i ${extension}) -and $exist) {
    Add-Content C:\\tools\\php\\php.ini "${yield utils.getExtensionPrefix(extension)}=php_${extension}.dll"\n` +
            (yield utils.log('Enabled ' + extension, 'win32', 'success', log_prefix)) +
            ` } elseif(php -m | findstr -i ${extension}) {\n` +
            (yield utils.log(extension + ' was already enabled', 'win32', 'success', log_prefix)) +
            ` }
} catch [Exception] {\n` +
            (yield utils.log(extension + ' could not be enabled', 'win32', 'error', log_prefix)) +
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
function enableExtensionUnix(extension, os_version, log_prefix) {
    return __awaiter(this, void 0, void 0, function* () {
        return (`if [ ! "$(php -m | grep -i ${extension})" ] && [ -e "$ext_dir/${extension}.so" ]; then
  echo "${yield utils.getExtensionPrefix(extension)}=${extension}" >> $ini_file\n` +
            (yield utils.log('Enabled ' + extension, os_version, 'success', log_prefix)) +
            `;\n elif [ "$(php -m | grep -i ${extension})" ]; then \n` +
            (yield utils.log(extension + ' was already enabled', os_version, 'success', log_prefix)) +
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
function addExtensionDarwin(extension_csv, version, log_prefix) {
    return __awaiter(this, void 0, void 0, function* () {
        let extensions = yield utils.extensionArray(extension_csv);
        let script = '\n';
        yield utils.asyncForEach(extensions, function (extension) {
            return __awaiter(this, void 0, void 0, function* () {
                extension = extension.toLowerCase();
                // add script to enable extension is already installed along with php
                script += yield enableExtensionUnix(extension, 'darwin', log_prefix);
                switch (yield pecl.checkPECLExtension(extension)) {
                    case true:
                        let install_command = '';
                        switch (version + extension) {
                            case '7.4xdebug':
                                install_command =
                                    'sh ./xdebug_darwin.sh >/dev/null 2>&1 && echo "zend_extension=xdebug.so" >> $ini_file';
                                break;
                            case '7.4pcov':
                                install_command =
                                    'sh ./pcov.sh >/dev/null 2>&1 && echo "extension=pcov.so" >> $ini_file';
                                break;
                            case '5.6xdebug':
                                install_command = 'sudo pecl install xdebug-2.5.5 >/dev/null 2>&1';
                                break;
                            default:
                                install_command =
                                    'sudo pecl install ' + extension + ' >/dev/null 2>&1';
                                break;
                        }
                        script +=
                            'if [ ! "$(php -m | grep -i ' +
                                extension +
                                ')" ]; then ' +
                                install_command +
                                ' && ' +
                                (yield utils.log('Installed and enabled ' + extension, 'darwin', 'success', log_prefix)) +
                                ' || ' +
                                (yield utils.log('Could not install ' + extension + ' on PHP' + version, 'darwin', 'error', log_prefix)) +
                                '; fi\n';
                        break;
                    case false:
                    default:
                        script +=
                            'if [ ! "$(php -m | grep -i ' +
                                extension +
                                ')" ]; then \n' +
                                (yield utils.log('Could not find ' + extension + ' for PHP' + version + ' on PECL', 'darwin', 'error', log_prefix)) +
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
function addExtensionWindows(extension_csv, version, log_prefix) {
    return __awaiter(this, void 0, void 0, function* () {
        let extensions = yield utils.extensionArray(extension_csv);
        let script = '\n';
        yield utils.asyncForEach(extensions, function (extension) {
            return __awaiter(this, void 0, void 0, function* () {
                extension = extension.toLowerCase();
                // add script to enable extension is already installed along with php
                script += yield enableExtensionWindows(extension, log_prefix);
                switch (yield pecl.checkPECLExtension(extension)) {
                    case true:
                        let install_command = '';
                        switch (version + extension) {
                            case '7.4xdebug':
                                const extension_url = 'https://xdebug.org/files/php_xdebug-2.8.0beta2-7.4-vc15.dll';
                                install_command =
                                    'Invoke-WebRequest -Uri ' +
                                        extension_url +
                                        ' -OutFile C:\\tools\\php\\ext\\php_xdebug.dll\n';
                                install_command += 'Enable-PhpExtension xdebug';
                                break;
                            case '7.2xdebug':
                            default:
                                install_command = 'Install-PhpExtension ' + extension;
                                break;
                        }
                        script +=
                            'if(!(php -m | findstr -i ' +
                                extension +
                                ')) { ' +
                                'try { ' +
                                install_command +
                                '\n' +
                                (yield utils.log('Installed and enabled ' + extension, 'win32', 'success', log_prefix)) +
                                ' } catch [Exception] { ' +
                                (yield utils.log('Could not install ' + extension + ' on PHP' + version, 'win32', 'error', log_prefix)) +
                                ' } }\n';
                        break;
                    case false:
                    default:
                        script +=
                            'if(!(php -m | findstr -i ' +
                                extension +
                                ')) { ' +
                                (yield utils.log('Could not find ' + extension + ' for PHP' + version + ' on PECL', 'win32', 'error', log_prefix)) +
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
function addExtensionLinux(extension_csv, version, log_prefix) {
    return __awaiter(this, void 0, void 0, function* () {
        let extensions = yield utils.extensionArray(extension_csv);
        let script = '\n';
        yield utils.asyncForEach(extensions, function (extension) {
            return __awaiter(this, void 0, void 0, function* () {
                extension = extension.toLowerCase();
                // add script to enable extension is already installed along with php
                script += yield enableExtensionUnix(extension, 'linux', log_prefix);
                let install_command = '';
                switch (version + extension) {
                    case '7.4xdebug':
                        install_command =
                            './xdebug.sh >/dev/null 2>&1 && echo "zend_extension=xdebug.so" >> $ini_file';
                        break;
                    case '7.4pcov':
                        install_command =
                            './pcov.sh >/dev/null 2>&1 && echo "extension=pcov.so" >> $ini_file';
                        break;
                    default:
                        install_command =
                            'sudo DEBIAN_FRONTEND=noninteractive apt install -y php' +
                                version +
                                '-' +
                                extension +
                                ' >/dev/null 2>&1';
                        break;
                }
                script +=
                    'if [ ! "$(php -m | grep -i ' +
                        extension +
                        ')" ]; then ' +
                        install_command +
                        ' && ' +
                        (yield utils.log('Installed and enabled ' + extension, 'linux', 'success', log_prefix)) +
                        ' || ' +
                        (yield utils.log('Could not find php' + version + '-' + extension + ' on APT repository', 'linux', 'error', log_prefix)) +
                        '; fi\n';
            });
        });
        return script;
    });
}
exports.addExtensionLinux = addExtensionLinux;
