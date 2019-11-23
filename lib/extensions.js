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
const path = __importStar(require("path"));
const utils = __importStar(require("./utils"));
/**
 * Install and enable extensions for darwin
 *
 * @param extension_csv
 * @param version
 */
function addExtensionDarwin(extension_csv, version) {
    return __awaiter(this, void 0, void 0, function* () {
        const extensions = yield utils.extensionArray(extension_csv);
        let script = '\n';
        yield utils.asyncForEach(extensions, function (extension) {
            return __awaiter(this, void 0, void 0, function* () {
                extension = extension.toLowerCase();
                // add script to enable extension is already installed along with php
                let install_command = '';
                switch (version + extension) {
                    case '5.6xdebug':
                        install_command = 'sudo pecl install xdebug-2.5.5 >/dev/null 2>&1';
                        break;
                    default:
                        install_command = 'sudo pecl install ' + extension + ' >/dev/null 2>&1';
                        break;
                }
                script +=
                    '\nadd_extension ' +
                        extension +
                        ' "' +
                        install_command +
                        '" ' +
                        (yield utils.getExtensionPrefix(extension));
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
        const extensions = yield utils.extensionArray(extension_csv);
        let script = '\n';
        yield utils.asyncForEach(extensions, function (extension) {
            return __awaiter(this, void 0, void 0, function* () {
                extension = extension.toLowerCase();
                // add script to enable extension is already installed along with php
                let install_command = '';
                switch (version + extension) {
                    case '7.4xdebug': {
                        const extension_url = 'https://xdebug.org/files/php_xdebug-2.8.0-7.4-vc15.dll';
                        install_command =
                            'Invoke-WebRequest -Uri ' +
                                extension_url +
                                ' -OutFile C:\\tools\\php\\ext\\php_xdebug.dll\n';
                        install_command += 'Enable-PhpExtension xdebug';
                        break;
                    }
                    case '7.2xdebug':
                    default:
                        install_command = 'Install-PhpExtension ' + extension;
                        break;
                }
                script +=
                    '\nAdd-Extension ' +
                        extension +
                        ' "' +
                        install_command +
                        '" ' +
                        (yield utils.getExtensionPrefix(extension));
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
        const extensions = yield utils.extensionArray(extension_csv);
        let script = '\n';
        yield utils.asyncForEach(extensions, function (extension) {
            return __awaiter(this, void 0, void 0, function* () {
                extension = extension.toLowerCase();
                // add script to enable extension is already installed along with php
                let install_command = '';
                switch (version + extension) {
                    case '7.2phalcon3':
                    case '7.3phalcon3':
                        install_command =
                            'sh ' +
                                path.join(__dirname, '../src/scripts/phalcon.sh') +
                                ' master ' +
                                version +
                                ' >/dev/null 2>&1';
                        break;
                    case '7.2phalcon4':
                    case '7.3phalcon4':
                    case '7.4phalcon4':
                        install_command =
                            'sh ' +
                                path.join(__dirname, '../src/scripts/phalcon.sh') +
                                ' 4.0.x ' +
                                version +
                                ' >/dev/null 2>&1';
                        break;
                    default:
                        install_command =
                            'sudo DEBIAN_FRONTEND=noninteractive apt-get install -y php' +
                                version +
                                '-' +
                                extension.replace('pdo_', '').replace('pdo-', '') +
                                ' >/dev/null 2>&1 || sudo pecl install ' +
                                extension +
                                ' >/dev/null 2>&1';
                        break;
                }
                script +=
                    '\nadd_extension ' +
                        extension +
                        ' "' +
                        install_command +
                        '" ' +
                        (yield utils.getExtensionPrefix(extension));
            });
        });
        return script;
    });
}
exports.addExtensionLinux = addExtensionLinux;
/**
 * Install and enable extensions
 *
 * @param extension_csv
 * @param version
 * @param os_version
 * @param log_prefix
 */
function addExtension(extension_csv, version, os_version, no_step = false) {
    return __awaiter(this, void 0, void 0, function* () {
        let script = '\n';
        switch (no_step) {
            case true:
                script +=
                    (yield utils.stepLog('Setup Extensions', os_version)) +
                        (yield utils.suppressOutput(os_version));
                break;
            case false:
            default:
                script += yield utils.stepLog('Setup Extensions', os_version);
                break;
        }
        switch (os_version) {
            case 'win32':
                return script + (yield addExtensionWindows(extension_csv, version));
            case 'darwin':
                return script + (yield addExtensionDarwin(extension_csv, version));
            case 'linux':
                return script + (yield addExtensionLinux(extension_csv, version));
            default:
                return yield utils.log('Platform ' + os_version + ' is not supported', os_version, 'error');
        }
    });
}
exports.addExtension = addExtension;
