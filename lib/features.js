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
function addExtension(extensions, version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (os_version === 'win32') {
            return yield addExtensionWindows(extensions, version);
        }
        else if (os_version === 'linux') {
            return yield addExtensionLinux(extensions, version);
        }
        return yield addExtensionDarwin(extensions);
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
        return `try {
  $${extension}_found = 0
  $ext_dir = Get-PhpIniKey extension_dir
  $exist = Test-Path -Path $ext_dir\\php_${extension}.dll
  $enabled = php -r "if (in_array('${extension}', get_loaded_extensions())) {echo 'yes';} else {echo 'no';}"
  if($enabled -eq 'no' -and $exist) {
    Enable-PhpExtension ${extension} C:\\tools\\php
    $${extension}_found = 1
  }
} catch [Exception] {
  echo $_
}\n`;
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
        return `${extension}_found=0
enabled=$(php -r "if (in_array('${extension}', get_loaded_extensions())) {echo 'yes';} else {echo 'no';}")
if [ "$enabled" = "no" ] && [ -e "$ext_dir/${extension}.so" ]; then
  echo "extension=${extension}.so" >> 'php -i | grep "Loaded Configuration" | sed -e "s|.*=>\s*||"'
  echo "${extension} enabled"
  ${extension}_found=1
fi\n`;
    });
}
exports.enableExtensionUnix = enableExtensionUnix;
/**
 * Install and enable extensions for darwin
 *
 * @param extension_csv
 */
function addExtensionDarwin(extension_csv) {
    return __awaiter(this, void 0, void 0, function* () {
        let extensions = yield utils.extensionArray(extension_csv);
        let script = '\n';
        yield utils.asyncForEach(extensions, function (extension) {
            return __awaiter(this, void 0, void 0, function* () {
                // add script to enable extension is already installed along with php
                script += yield enableExtensionUnix(extension);
                if (yield pecl.checkPECLExtension(extension)) {
                    script +=
                        'if [ $' +
                            extension +
                            '_found -eq 0 ]; then sudo pecl install ' +
                            extension +
                            ' || echo "Couldn\'t find extension: ' +
                            extension +
                            '"; fi\n';
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
                // add script to enable extension is already installed along with php
                script += yield enableExtensionWindows(extension);
                let extension_version = 'stable';
                if (version == '7.4') {
                    extension_version = 'alpha';
                }
                if (yield pecl.checkPECLExtension(extension)) {
                    script +=
                        'if($' +
                            extension +
                            '_found -eq 0) { ' +
                            'try { Install-PhpExtension ' +
                            extension +
                            ' -MinimumStability ' +
                            extension_version +
                            ' } catch [Exception] { echo $_; echo "Could not install extension: "' +
                            extension +
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
                // add script to enable extension is already installed along with php
                script += yield enableExtensionUnix(extension);
                script +=
                    'if [ $' +
                        extension +
                        '_found -eq 0 ]; then sudo DEBIAN_FRONTEND=noninteractive apt install -y php' +
                        version +
                        '-' +
                        extension +
                        ' || echo "Couldn\'t find extension php' +
                        version +
                        '-' +
                        extension +
                        '"; fi\n';
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
                script +=
                    'Add-Content C:\\tools\\php\\php.ini "' + ini_value + '"\n';
            });
        });
        return script;
    });
}
exports.addINIValuesWindows = addINIValuesWindows;
