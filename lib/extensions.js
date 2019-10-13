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
 * Install and enable extensions
 *
 * @param extension_csv
 * @param version
 * @param os_version
 * @param log_prefix
 */
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
                        install_command = 'sudo pecl install ' + extension + ' >/dev/null 2>&1';
                        break;
                }
                script +=
                    'add_extension ' +
                        extension +
                        ' "' +
                        install_command +
                        '" ' +
                        (yield utils.getExtensionPrefix(extension)) +
                        ' "' +
                        log_prefix +
                        '"\n';
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
                    'Add-Extension ' +
                        extension +
                        ' "' +
                        install_command +
                        '" ' +
                        (yield utils.getExtensionPrefix(extension)) +
                        ' "' +
                        log_prefix +
                        '"\n';
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
                    case '7.2phalcon3':
                    case '7.3phalcon3':
                        install_command = './phalcon.sh master ' + version + ' >/dev/null 2>&1';
                        break;
                    case '7.2phalcon4':
                    case '7.3phalcon4':
                        install_command = './phalcon.sh 4.0.x ' + version + ' >/dev/null 2>&1';
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
                    'add_extension ' +
                        extension +
                        ' "' +
                        install_command +
                        '" ' +
                        (yield utils.getExtensionPrefix(extension)) +
                        ' "' +
                        log_prefix +
                        '"\n';
            });
        });
        return script;
    });
}
exports.addExtensionLinux = addExtensionLinux;
