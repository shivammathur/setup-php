module.exports =
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	__webpack_require__.ab = __dirname + "/";
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(655);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ({

/***/ 1:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

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
Object.defineProperty(exports, "__esModule", { value: true });
const childProcess = __webpack_require__(129);
const path = __webpack_require__(622);
const util_1 = __webpack_require__(669);
const ioUtil = __webpack_require__(672);
const exec = util_1.promisify(childProcess.exec);
/**
 * Copies a file or folder.
 * Based off of shelljs - https://github.com/shelljs/shelljs/blob/9237f66c52e5daa40458f94f9565e18e8132f5a6/src/cp.js
 *
 * @param     source    source path
 * @param     dest      destination path
 * @param     options   optional. See CopyOptions.
 */
function cp(source, dest, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const { force, recursive } = readCopyOptions(options);
        const destStat = (yield ioUtil.exists(dest)) ? yield ioUtil.stat(dest) : null;
        // Dest is an existing file, but not forcing
        if (destStat && destStat.isFile() && !force) {
            return;
        }
        // If dest is an existing directory, should copy inside.
        const newDest = destStat && destStat.isDirectory()
            ? path.join(dest, path.basename(source))
            : dest;
        if (!(yield ioUtil.exists(source))) {
            throw new Error(`no such file or directory: ${source}`);
        }
        const sourceStat = yield ioUtil.stat(source);
        if (sourceStat.isDirectory()) {
            if (!recursive) {
                throw new Error(`Failed to copy. ${source} is a directory, but tried to copy without recursive flag.`);
            }
            else {
                yield cpDirRecursive(source, newDest, 0, force);
            }
        }
        else {
            if (path.relative(source, newDest) === '') {
                // a file cannot be copied to itself
                throw new Error(`'${newDest}' and '${source}' are the same file`);
            }
            yield copyFile(source, newDest, force);
        }
    });
}
exports.cp = cp;
/**
 * Moves a path.
 *
 * @param     source    source path
 * @param     dest      destination path
 * @param     options   optional. See MoveOptions.
 */
function mv(source, dest, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        if (yield ioUtil.exists(dest)) {
            let destExists = true;
            if (yield ioUtil.isDirectory(dest)) {
                // If dest is directory copy src into dest
                dest = path.join(dest, path.basename(source));
                destExists = yield ioUtil.exists(dest);
            }
            if (destExists) {
                if (options.force == null || options.force) {
                    yield rmRF(dest);
                }
                else {
                    throw new Error('Destination already exists');
                }
            }
        }
        yield mkdirP(path.dirname(dest));
        yield ioUtil.rename(source, dest);
    });
}
exports.mv = mv;
/**
 * Remove a path recursively with force
 *
 * @param inputPath path to remove
 */
function rmRF(inputPath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (ioUtil.IS_WINDOWS) {
            // Node doesn't provide a delete operation, only an unlink function. This means that if the file is being used by another
            // program (e.g. antivirus), it won't be deleted. To address this, we shell out the work to rd/del.
            try {
                if (yield ioUtil.isDirectory(inputPath, true)) {
                    yield exec(`rd /s /q "${inputPath}"`);
                }
                else {
                    yield exec(`del /f /a "${inputPath}"`);
                }
            }
            catch (err) {
                // if you try to delete a file that doesn't exist, desired result is achieved
                // other errors are valid
                if (err.code !== 'ENOENT')
                    throw err;
            }
            // Shelling out fails to remove a symlink folder with missing source, this unlink catches that
            try {
                yield ioUtil.unlink(inputPath);
            }
            catch (err) {
                // if you try to delete a file that doesn't exist, desired result is achieved
                // other errors are valid
                if (err.code !== 'ENOENT')
                    throw err;
            }
        }
        else {
            let isDir = false;
            try {
                isDir = yield ioUtil.isDirectory(inputPath);
            }
            catch (err) {
                // if you try to delete a file that doesn't exist, desired result is achieved
                // other errors are valid
                if (err.code !== 'ENOENT')
                    throw err;
                return;
            }
            if (isDir) {
                yield exec(`rm -rf "${inputPath}"`);
            }
            else {
                yield ioUtil.unlink(inputPath);
            }
        }
    });
}
exports.rmRF = rmRF;
/**
 * Make a directory.  Creates the full path with folders in between
 * Will throw if it fails
 *
 * @param   fsPath        path to create
 * @returns Promise<void>
 */
function mkdirP(fsPath) {
    return __awaiter(this, void 0, void 0, function* () {
        yield ioUtil.mkdirP(fsPath);
    });
}
exports.mkdirP = mkdirP;
/**
 * Returns path of a tool had the tool actually been invoked.  Resolves via paths.
 * If you check and the tool does not exist, it will throw.
 *
 * @param     tool              name of the tool
 * @param     check             whether to check if tool exists
 * @returns   Promise<string>   path to tool
 */
function which(tool, check) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!tool) {
            throw new Error("parameter 'tool' is required");
        }
        // recursive when check=true
        if (check) {
            const result = yield which(tool, false);
            if (!result) {
                if (ioUtil.IS_WINDOWS) {
                    throw new Error(`Unable to locate executable file: ${tool}. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also verify the file has a valid extension for an executable file.`);
                }
                else {
                    throw new Error(`Unable to locate executable file: ${tool}. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also check the file mode to verify the file is executable.`);
                }
            }
        }
        try {
            // build the list of extensions to try
            const extensions = [];
            if (ioUtil.IS_WINDOWS && process.env.PATHEXT) {
                for (const extension of process.env.PATHEXT.split(path.delimiter)) {
                    if (extension) {
                        extensions.push(extension);
                    }
                }
            }
            // if it's rooted, return it if exists. otherwise return empty.
            if (ioUtil.isRooted(tool)) {
                const filePath = yield ioUtil.tryGetExecutablePath(tool, extensions);
                if (filePath) {
                    return filePath;
                }
                return '';
            }
            // if any path separators, return empty
            if (tool.includes('/') || (ioUtil.IS_WINDOWS && tool.includes('\\'))) {
                return '';
            }
            // build the list of directories
            //
            // Note, technically "where" checks the current directory on Windows. From a toolkit perspective,
            // it feels like we should not do this. Checking the current directory seems like more of a use
            // case of a shell, and the which() function exposed by the toolkit should strive for consistency
            // across platforms.
            const directories = [];
            if (process.env.PATH) {
                for (const p of process.env.PATH.split(path.delimiter)) {
                    if (p) {
                        directories.push(p);
                    }
                }
            }
            // return the first match
            for (const directory of directories) {
                const filePath = yield ioUtil.tryGetExecutablePath(directory + path.sep + tool, extensions);
                if (filePath) {
                    return filePath;
                }
            }
            return '';
        }
        catch (err) {
            throw new Error(`which failed with message ${err.message}`);
        }
    });
}
exports.which = which;
function readCopyOptions(options) {
    const force = options.force == null ? true : options.force;
    const recursive = Boolean(options.recursive);
    return { force, recursive };
}
function cpDirRecursive(sourceDir, destDir, currentDepth, force) {
    return __awaiter(this, void 0, void 0, function* () {
        // Ensure there is not a run away recursive copy
        if (currentDepth >= 255)
            return;
        currentDepth++;
        yield mkdirP(destDir);
        const files = yield ioUtil.readdir(sourceDir);
        for (const fileName of files) {
            const srcFile = `${sourceDir}/${fileName}`;
            const destFile = `${destDir}/${fileName}`;
            const srcFileStat = yield ioUtil.lstat(srcFile);
            if (srcFileStat.isDirectory()) {
                // Recurse
                yield cpDirRecursive(srcFile, destFile, currentDepth, force);
            }
            else {
                yield copyFile(srcFile, destFile, force);
            }
        }
        // Change the mode for the newly created directory
        yield ioUtil.chmod(destDir, (yield ioUtil.stat(sourceDir)).mode);
    });
}
// Buffered file copy
function copyFile(srcFile, destFile, force) {
    return __awaiter(this, void 0, void 0, function* () {
        if ((yield ioUtil.lstat(srcFile)).isSymbolicLink()) {
            // unlink/re-link it
            try {
                yield ioUtil.lstat(destFile);
                yield ioUtil.unlink(destFile);
            }
            catch (e) {
                // Try to override file permission
                if (e.code === 'EPERM') {
                    yield ioUtil.chmod(destFile, '0666');
                    yield ioUtil.unlink(destFile);
                }
                // other errors = it doesn't exist, no work to do
            }
            // Copy over symlink
            const symlinkFull = yield ioUtil.readlink(srcFile);
            yield ioUtil.symlink(symlinkFull, destFile, ioUtil.IS_WINDOWS ? 'junction' : null);
        }
        else if (!(yield ioUtil.exists(destFile)) || force) {
            yield ioUtil.copyFile(srcFile, destFile);
        }
    });
}
//# sourceMappingURL=io.js.map

/***/ }),

/***/ 9:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

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
const os = __importStar(__webpack_require__(87));
const events = __importStar(__webpack_require__(614));
const child = __importStar(__webpack_require__(129));
const path = __importStar(__webpack_require__(622));
const io = __importStar(__webpack_require__(1));
const ioUtil = __importStar(__webpack_require__(672));
/* eslint-disable @typescript-eslint/unbound-method */
const IS_WINDOWS = process.platform === 'win32';
/*
 * Class for running command line tools. Handles quoting and arg parsing in a platform agnostic way.
 */
class ToolRunner extends events.EventEmitter {
    constructor(toolPath, args, options) {
        super();
        if (!toolPath) {
            throw new Error("Parameter 'toolPath' cannot be null or empty.");
        }
        this.toolPath = toolPath;
        this.args = args || [];
        this.options = options || {};
    }
    _debug(message) {
        if (this.options.listeners && this.options.listeners.debug) {
            this.options.listeners.debug(message);
        }
    }
    _getCommandString(options, noPrefix) {
        const toolPath = this._getSpawnFileName();
        const args = this._getSpawnArgs(options);
        let cmd = noPrefix ? '' : '[command]'; // omit prefix when piped to a second tool
        if (IS_WINDOWS) {
            // Windows + cmd file
            if (this._isCmdFile()) {
                cmd += toolPath;
                for (const a of args) {
                    cmd += ` ${a}`;
                }
            }
            // Windows + verbatim
            else if (options.windowsVerbatimArguments) {
                cmd += `"${toolPath}"`;
                for (const a of args) {
                    cmd += ` ${a}`;
                }
            }
            // Windows (regular)
            else {
                cmd += this._windowsQuoteCmdArg(toolPath);
                for (const a of args) {
                    cmd += ` ${this._windowsQuoteCmdArg(a)}`;
                }
            }
        }
        else {
            // OSX/Linux - this can likely be improved with some form of quoting.
            // creating processes on Unix is fundamentally different than Windows.
            // on Unix, execvp() takes an arg array.
            cmd += toolPath;
            for (const a of args) {
                cmd += ` ${a}`;
            }
        }
        return cmd;
    }
    _processLineBuffer(data, strBuffer, onLine) {
        try {
            let s = strBuffer + data.toString();
            let n = s.indexOf(os.EOL);
            while (n > -1) {
                const line = s.substring(0, n);
                onLine(line);
                // the rest of the string ...
                s = s.substring(n + os.EOL.length);
                n = s.indexOf(os.EOL);
            }
            strBuffer = s;
        }
        catch (err) {
            // streaming lines to console is best effort.  Don't fail a build.
            this._debug(`error processing line. Failed with error ${err}`);
        }
    }
    _getSpawnFileName() {
        if (IS_WINDOWS) {
            if (this._isCmdFile()) {
                return process.env['COMSPEC'] || 'cmd.exe';
            }
        }
        return this.toolPath;
    }
    _getSpawnArgs(options) {
        if (IS_WINDOWS) {
            if (this._isCmdFile()) {
                let argline = `/D /S /C "${this._windowsQuoteCmdArg(this.toolPath)}`;
                for (const a of this.args) {
                    argline += ' ';
                    argline += options.windowsVerbatimArguments
                        ? a
                        : this._windowsQuoteCmdArg(a);
                }
                argline += '"';
                return [argline];
            }
        }
        return this.args;
    }
    _endsWith(str, end) {
        return str.endsWith(end);
    }
    _isCmdFile() {
        const upperToolPath = this.toolPath.toUpperCase();
        return (this._endsWith(upperToolPath, '.CMD') ||
            this._endsWith(upperToolPath, '.BAT'));
    }
    _windowsQuoteCmdArg(arg) {
        // for .exe, apply the normal quoting rules that libuv applies
        if (!this._isCmdFile()) {
            return this._uvQuoteCmdArg(arg);
        }
        // otherwise apply quoting rules specific to the cmd.exe command line parser.
        // the libuv rules are generic and are not designed specifically for cmd.exe
        // command line parser.
        //
        // for a detailed description of the cmd.exe command line parser, refer to
        // http://stackoverflow.com/questions/4094699/how-does-the-windows-command-interpreter-cmd-exe-parse-scripts/7970912#7970912
        // need quotes for empty arg
        if (!arg) {
            return '""';
        }
        // determine whether the arg needs to be quoted
        const cmdSpecialChars = [
            ' ',
            '\t',
            '&',
            '(',
            ')',
            '[',
            ']',
            '{',
            '}',
            '^',
            '=',
            ';',
            '!',
            "'",
            '+',
            ',',
            '`',
            '~',
            '|',
            '<',
            '>',
            '"'
        ];
        let needsQuotes = false;
        for (const char of arg) {
            if (cmdSpecialChars.some(x => x === char)) {
                needsQuotes = true;
                break;
            }
        }
        // short-circuit if quotes not needed
        if (!needsQuotes) {
            return arg;
        }
        // the following quoting rules are very similar to the rules that by libuv applies.
        //
        // 1) wrap the string in quotes
        //
        // 2) double-up quotes - i.e. " => ""
        //
        //    this is different from the libuv quoting rules. libuv replaces " with \", which unfortunately
        //    doesn't work well with a cmd.exe command line.
        //
        //    note, replacing " with "" also works well if the arg is passed to a downstream .NET console app.
        //    for example, the command line:
        //          foo.exe "myarg:""my val"""
        //    is parsed by a .NET console app into an arg array:
        //          [ "myarg:\"my val\"" ]
        //    which is the same end result when applying libuv quoting rules. although the actual
        //    command line from libuv quoting rules would look like:
        //          foo.exe "myarg:\"my val\""
        //
        // 3) double-up slashes that precede a quote,
        //    e.g.  hello \world    => "hello \world"
        //          hello\"world    => "hello\\""world"
        //          hello\\"world   => "hello\\\\""world"
        //          hello world\    => "hello world\\"
        //
        //    technically this is not required for a cmd.exe command line, or the batch argument parser.
        //    the reasons for including this as a .cmd quoting rule are:
        //
        //    a) this is optimized for the scenario where the argument is passed from the .cmd file to an
        //       external program. many programs (e.g. .NET console apps) rely on the slash-doubling rule.
        //
        //    b) it's what we've been doing previously (by deferring to node default behavior) and we
        //       haven't heard any complaints about that aspect.
        //
        // note, a weakness of the quoting rules chosen here, is that % is not escaped. in fact, % cannot be
        // escaped when used on the command line directly - even though within a .cmd file % can be escaped
        // by using %%.
        //
        // the saving grace is, on the command line, %var% is left as-is if var is not defined. this contrasts
        // the line parsing rules within a .cmd file, where if var is not defined it is replaced with nothing.
        //
        // one option that was explored was replacing % with ^% - i.e. %var% => ^%var^%. this hack would
        // often work, since it is unlikely that var^ would exist, and the ^ character is removed when the
        // variable is used. the problem, however, is that ^ is not removed when %* is used to pass the args
        // to an external program.
        //
        // an unexplored potential solution for the % escaping problem, is to create a wrapper .cmd file.
        // % can be escaped within a .cmd file.
        let reverse = '"';
        let quoteHit = true;
        for (let i = arg.length; i > 0; i--) {
            // walk the string in reverse
            reverse += arg[i - 1];
            if (quoteHit && arg[i - 1] === '\\') {
                reverse += '\\'; // double the slash
            }
            else if (arg[i - 1] === '"') {
                quoteHit = true;
                reverse += '"'; // double the quote
            }
            else {
                quoteHit = false;
            }
        }
        reverse += '"';
        return reverse
            .split('')
            .reverse()
            .join('');
    }
    _uvQuoteCmdArg(arg) {
        // Tool runner wraps child_process.spawn() and needs to apply the same quoting as
        // Node in certain cases where the undocumented spawn option windowsVerbatimArguments
        // is used.
        //
        // Since this function is a port of quote_cmd_arg from Node 4.x (technically, lib UV,
        // see https://github.com/nodejs/node/blob/v4.x/deps/uv/src/win/process.c for details),
        // pasting copyright notice from Node within this function:
        //
        //      Copyright Joyent, Inc. and other Node contributors. All rights reserved.
        //
        //      Permission is hereby granted, free of charge, to any person obtaining a copy
        //      of this software and associated documentation files (the "Software"), to
        //      deal in the Software without restriction, including without limitation the
        //      rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
        //      sell copies of the Software, and to permit persons to whom the Software is
        //      furnished to do so, subject to the following conditions:
        //
        //      The above copyright notice and this permission notice shall be included in
        //      all copies or substantial portions of the Software.
        //
        //      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
        //      IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
        //      FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
        //      AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
        //      LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
        //      FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
        //      IN THE SOFTWARE.
        if (!arg) {
            // Need double quotation for empty argument
            return '""';
        }
        if (!arg.includes(' ') && !arg.includes('\t') && !arg.includes('"')) {
            // No quotation needed
            return arg;
        }
        if (!arg.includes('"') && !arg.includes('\\')) {
            // No embedded double quotes or backslashes, so I can just wrap
            // quote marks around the whole thing.
            return `"${arg}"`;
        }
        // Expected input/output:
        //   input : hello"world
        //   output: "hello\"world"
        //   input : hello""world
        //   output: "hello\"\"world"
        //   input : hello\world
        //   output: hello\world
        //   input : hello\\world
        //   output: hello\\world
        //   input : hello\"world
        //   output: "hello\\\"world"
        //   input : hello\\"world
        //   output: "hello\\\\\"world"
        //   input : hello world\
        //   output: "hello world\\" - note the comment in libuv actually reads "hello world\"
        //                             but it appears the comment is wrong, it should be "hello world\\"
        let reverse = '"';
        let quoteHit = true;
        for (let i = arg.length; i > 0; i--) {
            // walk the string in reverse
            reverse += arg[i - 1];
            if (quoteHit && arg[i - 1] === '\\') {
                reverse += '\\';
            }
            else if (arg[i - 1] === '"') {
                quoteHit = true;
                reverse += '\\';
            }
            else {
                quoteHit = false;
            }
        }
        reverse += '"';
        return reverse
            .split('')
            .reverse()
            .join('');
    }
    _cloneExecOptions(options) {
        options = options || {};
        const result = {
            cwd: options.cwd || process.cwd(),
            env: options.env || process.env,
            silent: options.silent || false,
            windowsVerbatimArguments: options.windowsVerbatimArguments || false,
            failOnStdErr: options.failOnStdErr || false,
            ignoreReturnCode: options.ignoreReturnCode || false,
            delay: options.delay || 10000
        };
        result.outStream = options.outStream || process.stdout;
        result.errStream = options.errStream || process.stderr;
        return result;
    }
    _getSpawnOptions(options, toolPath) {
        options = options || {};
        const result = {};
        result.cwd = options.cwd;
        result.env = options.env;
        result['windowsVerbatimArguments'] =
            options.windowsVerbatimArguments || this._isCmdFile();
        if (options.windowsVerbatimArguments) {
            result.argv0 = `"${toolPath}"`;
        }
        return result;
    }
    /**
     * Exec a tool.
     * Output will be streamed to the live console.
     * Returns promise with return code
     *
     * @param     tool     path to tool to exec
     * @param     options  optional exec options.  See ExecOptions
     * @returns   number
     */
    exec() {
        return __awaiter(this, void 0, void 0, function* () {
            // root the tool path if it is unrooted and contains relative pathing
            if (!ioUtil.isRooted(this.toolPath) &&
                (this.toolPath.includes('/') ||
                    (IS_WINDOWS && this.toolPath.includes('\\')))) {
                // prefer options.cwd if it is specified, however options.cwd may also need to be rooted
                this.toolPath = path.resolve(process.cwd(), this.options.cwd || process.cwd(), this.toolPath);
            }
            // if the tool is only a file name, then resolve it from the PATH
            // otherwise verify it exists (add extension on Windows if necessary)
            this.toolPath = yield io.which(this.toolPath, true);
            return new Promise((resolve, reject) => {
                this._debug(`exec tool: ${this.toolPath}`);
                this._debug('arguments:');
                for (const arg of this.args) {
                    this._debug(`   ${arg}`);
                }
                const optionsNonNull = this._cloneExecOptions(this.options);
                if (!optionsNonNull.silent && optionsNonNull.outStream) {
                    optionsNonNull.outStream.write(this._getCommandString(optionsNonNull) + os.EOL);
                }
                const state = new ExecState(optionsNonNull, this.toolPath);
                state.on('debug', (message) => {
                    this._debug(message);
                });
                const fileName = this._getSpawnFileName();
                const cp = child.spawn(fileName, this._getSpawnArgs(optionsNonNull), this._getSpawnOptions(this.options, fileName));
                const stdbuffer = '';
                if (cp.stdout) {
                    cp.stdout.on('data', (data) => {
                        if (this.options.listeners && this.options.listeners.stdout) {
                            this.options.listeners.stdout(data);
                        }
                        if (!optionsNonNull.silent && optionsNonNull.outStream) {
                            optionsNonNull.outStream.write(data);
                        }
                        this._processLineBuffer(data, stdbuffer, (line) => {
                            if (this.options.listeners && this.options.listeners.stdline) {
                                this.options.listeners.stdline(line);
                            }
                        });
                    });
                }
                const errbuffer = '';
                if (cp.stderr) {
                    cp.stderr.on('data', (data) => {
                        state.processStderr = true;
                        if (this.options.listeners && this.options.listeners.stderr) {
                            this.options.listeners.stderr(data);
                        }
                        if (!optionsNonNull.silent &&
                            optionsNonNull.errStream &&
                            optionsNonNull.outStream) {
                            const s = optionsNonNull.failOnStdErr
                                ? optionsNonNull.errStream
                                : optionsNonNull.outStream;
                            s.write(data);
                        }
                        this._processLineBuffer(data, errbuffer, (line) => {
                            if (this.options.listeners && this.options.listeners.errline) {
                                this.options.listeners.errline(line);
                            }
                        });
                    });
                }
                cp.on('error', (err) => {
                    state.processError = err.message;
                    state.processExited = true;
                    state.processClosed = true;
                    state.CheckComplete();
                });
                cp.on('exit', (code) => {
                    state.processExitCode = code;
                    state.processExited = true;
                    this._debug(`Exit code ${code} received from tool '${this.toolPath}'`);
                    state.CheckComplete();
                });
                cp.on('close', (code) => {
                    state.processExitCode = code;
                    state.processExited = true;
                    state.processClosed = true;
                    this._debug(`STDIO streams have closed for tool '${this.toolPath}'`);
                    state.CheckComplete();
                });
                state.on('done', (error, exitCode) => {
                    if (stdbuffer.length > 0) {
                        this.emit('stdline', stdbuffer);
                    }
                    if (errbuffer.length > 0) {
                        this.emit('errline', errbuffer);
                    }
                    cp.removeAllListeners();
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(exitCode);
                    }
                });
                if (this.options.input) {
                    if (!cp.stdin) {
                        throw new Error('child process missing stdin');
                    }
                    cp.stdin.end(this.options.input);
                }
            });
        });
    }
}
exports.ToolRunner = ToolRunner;
/**
 * Convert an arg string to an array of args. Handles escaping
 *
 * @param    argString   string of arguments
 * @returns  string[]    array of arguments
 */
function argStringToArray(argString) {
    const args = [];
    let inQuotes = false;
    let escaped = false;
    let arg = '';
    function append(c) {
        // we only escape double quotes.
        if (escaped && c !== '"') {
            arg += '\\';
        }
        arg += c;
        escaped = false;
    }
    for (let i = 0; i < argString.length; i++) {
        const c = argString.charAt(i);
        if (c === '"') {
            if (!escaped) {
                inQuotes = !inQuotes;
            }
            else {
                append(c);
            }
            continue;
        }
        if (c === '\\' && escaped) {
            append(c);
            continue;
        }
        if (c === '\\' && inQuotes) {
            escaped = true;
            continue;
        }
        if (c === ' ' && !inQuotes) {
            if (arg.length > 0) {
                args.push(arg);
                arg = '';
            }
            continue;
        }
        append(c);
    }
    if (arg.length > 0) {
        args.push(arg.trim());
    }
    return args;
}
exports.argStringToArray = argStringToArray;
class ExecState extends events.EventEmitter {
    constructor(options, toolPath) {
        super();
        this.processClosed = false; // tracks whether the process has exited and stdio is closed
        this.processError = '';
        this.processExitCode = 0;
        this.processExited = false; // tracks whether the process has exited
        this.processStderr = false; // tracks whether stderr was written to
        this.delay = 10000; // 10 seconds
        this.done = false;
        this.timeout = null;
        if (!toolPath) {
            throw new Error('toolPath must not be empty');
        }
        this.options = options;
        this.toolPath = toolPath;
        if (options.delay) {
            this.delay = options.delay;
        }
    }
    CheckComplete() {
        if (this.done) {
            return;
        }
        if (this.processClosed) {
            this._setResult();
        }
        else if (this.processExited) {
            this.timeout = setTimeout(ExecState.HandleTimeout, this.delay, this);
        }
    }
    _debug(message) {
        this.emit('debug', message);
    }
    _setResult() {
        // determine whether there is an error
        let error;
        if (this.processExited) {
            if (this.processError) {
                error = new Error(`There was an error when attempting to execute the process '${this.toolPath}'. This may indicate the process failed to start. Error: ${this.processError}`);
            }
            else if (this.processExitCode !== 0 && !this.options.ignoreReturnCode) {
                error = new Error(`The process '${this.toolPath}' failed with exit code ${this.processExitCode}`);
            }
            else if (this.processStderr && this.options.failOnStdErr) {
                error = new Error(`The process '${this.toolPath}' failed because one or more lines were written to the STDERR stream`);
            }
        }
        // clear the timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.done = true;
        this.emit('done', error, this.processExitCode);
    }
    static HandleTimeout(state) {
        if (state.done) {
            return;
        }
        if (!state.processClosed && state.processExited) {
            const message = `The STDIO streams did not close within ${state.delay /
                1000} seconds of the exit event from process '${state.toolPath}'. This may indicate a child process inherited the STDIO streams and has not yet exited.`;
            state._debug(message);
        }
        state._setResult();
    }
}
//# sourceMappingURL=toolrunner.js.map

/***/ }),

/***/ 86:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(__webpack_require__(622));
const utils = __importStar(__webpack_require__(163));
const io = __importStar(__webpack_require__(1));
/**
 * Cache json files for problem matchers
 */
async function addMatchers() {
    const config_path = path.join(__dirname, '..', 'src', 'configs');
    const runner_dir = await utils.getInput('RUNNER_TOOL_CACHE', false);
    await io.cp(path.join(config_path, 'phpunit.json'), runner_dir);
    await io.cp(path.join(config_path, 'php.json'), runner_dir);
}
exports.addMatchers = addMatchers;


/***/ }),

/***/ 87:
/***/ (function(module) {

module.exports = require("os");

/***/ }),

/***/ 129:
/***/ (function(module) {

module.exports = require("child_process");

/***/ }),

/***/ 163:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(__webpack_require__(747));
const path = __importStar(__webpack_require__(622));
const core = __importStar(__webpack_require__(470));
/**
 * Function to get inputs from both with and env annotations.
 *
 * @param name
 * @param mandatory
 */
async function getInput(name, mandatory) {
    const input = process.env[name];
    switch (input) {
        case '':
        case undefined:
            return core.getInput(name, { required: mandatory });
        default:
            return input;
    }
}
exports.getInput = getInput;
/**
 * Async foreach loop
 *
 * @author https://github.com/Atinux
 * @param array
 * @param callback
 */
async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}
exports.asyncForEach = asyncForEach;
/**
 * Get color index
 *
 * @param type
 */
async function color(type) {
    switch (type) {
        case 'error':
            return '31';
        default:
        case 'success':
            return '32';
        case 'warning':
            return '33';
    }
}
exports.color = color;
/**
 * Log to console
 *
 * @param message
 * @param os_version
 * @param log_type
 */
async function log(message, os_version, log_type) {
    switch (os_version) {
        case 'win32':
            return ('printf "\\033[' +
                (await color(log_type)) +
                ';1m' +
                message +
                ' \\033[0m"');
        case 'linux':
        case 'darwin':
        default:
            return ('echo "\\033[' + (await color(log_type)) + ';1m' + message + '\\033[0m"');
    }
}
exports.log = log;
/**
 * Function to log a step
 *
 * @param message
 * @param os_version
 */
async function stepLog(message, os_version) {
    switch (os_version) {
        case 'win32':
            return 'Step-Log "' + message + '"';
        case 'linux':
        case 'darwin':
            return 'step_log "' + message + '"';
        default:
            return await log('Platform ' + os_version + ' is not supported', os_version, 'error');
    }
}
exports.stepLog = stepLog;
/**
 * Function to log a result
 * @param mark
 * @param subject
 * @param message
 * @param os_version
 */
async function addLog(mark, subject, message, os_version) {
    switch (os_version) {
        case 'win32':
            return 'Add-Log "' + mark + '" "' + subject + '" "' + message + '"';
        case 'linux':
        case 'darwin':
            return 'add_log "' + mark + '" "' + subject + '" "' + message + '"';
        default:
            return await log('Platform ' + os_version + ' is not supported', os_version, 'error');
    }
}
exports.addLog = addLog;
/**
 * Read the scripts
 *
 * @param filename
 */
async function readScript(filename) {
    return fs.readFileSync(path.join(__dirname, '../src/scripts/' + filename), 'utf8');
}
exports.readScript = readScript;
/**
 * Write final script which runs
 *
 * @param filename
 * @param script
 */
async function writeScript(filename, script) {
    const runner_dir = await getInput('RUNNER_TOOL_CACHE', false);
    const script_path = path.join(runner_dir, filename);
    fs.writeFileSync(script_path, script, { mode: 0o755 });
    return script_path;
}
exports.writeScript = writeScript;
/**
 * Function to break extension csv into an array
 *
 * @param extension_csv
 */
async function extensionArray(extension_csv) {
    switch (extension_csv) {
        case '':
        case ' ':
            return [];
        default:
            return extension_csv
                .split(',')
                .map(function (extension) {
                return extension
                    .trim()
                    .toLowerCase()
                    .replace('php-', '')
                    .replace('php_', '');
            })
                .filter(Boolean);
    }
}
exports.extensionArray = extensionArray;
/**
 * Function to break csv into an array
 *
 * @param values_csv
 * @constructor
 */
async function CSVArray(values_csv) {
    switch (values_csv) {
        case '':
        case ' ':
            return [];
        default:
            return values_csv
                .split(',')
                .map(function (value) {
                return value.trim();
            })
                .filter(Boolean);
    }
}
exports.CSVArray = CSVArray;
/**
 * Function to get prefix required to load an extension.
 *
 * @param extension
 */
async function getExtensionPrefix(extension) {
    const zend = ['xdebug', 'opcache', 'ioncube', 'eaccelerator'];
    switch (zend.indexOf(extension)) {
        case 0:
        case 1:
            return 'zend_extension';
        case -1:
        default:
            return 'extension';
    }
}
exports.getExtensionPrefix = getExtensionPrefix;
/**
 * Function to get the suffix to suppress console output
 *
 * @param os_version
 */
async function suppressOutput(os_version) {
    switch (os_version) {
        case 'win32':
            return ' >$null 2>&1';
        case 'linux':
        case 'darwin':
            return ' >/dev/null 2>&1';
        default:
            return await log('Platform ' + os_version + ' is not supported', os_version, 'error');
    }
}
exports.suppressOutput = suppressOutput;


/***/ }),

/***/ 357:
/***/ (function(module) {

module.exports = require("assert");

/***/ }),

/***/ 431:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(__webpack_require__(87));
/**
 * Commands
 *
 * Command Format:
 *   ::name key=value,key=value::message
 *
 * Examples:
 *   ::warning::This is the message
 *   ::set-env name=MY_VAR::some value
 */
function issueCommand(command, properties, message) {
    const cmd = new Command(command, properties, message);
    process.stdout.write(cmd.toString() + os.EOL);
}
exports.issueCommand = issueCommand;
function issue(name, message = '') {
    issueCommand(name, {}, message);
}
exports.issue = issue;
const CMD_STRING = '::';
class Command {
    constructor(command, properties, message) {
        if (!command) {
            command = 'missing.command';
        }
        this.command = command;
        this.properties = properties;
        this.message = message;
    }
    toString() {
        let cmdStr = CMD_STRING + this.command;
        if (this.properties && Object.keys(this.properties).length > 0) {
            cmdStr += ' ';
            let first = true;
            for (const key in this.properties) {
                if (this.properties.hasOwnProperty(key)) {
                    const val = this.properties[key];
                    if (val) {
                        if (first) {
                            first = false;
                        }
                        else {
                            cmdStr += ',';
                        }
                        cmdStr += `${key}=${escapeProperty(val)}`;
                    }
                }
            }
        }
        cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
        return cmdStr;
    }
}
/**
 * Sanitizes an input into a string so it can be passed into issueCommand safely
 * @param input input to sanitize into a string
 */
function toCommandValue(input) {
    if (input === null || input === undefined) {
        return '';
    }
    else if (typeof input === 'string' || input instanceof String) {
        return input;
    }
    return JSON.stringify(input);
}
exports.toCommandValue = toCommandValue;
function escapeData(s) {
    return toCommandValue(s)
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A');
}
function escapeProperty(s) {
    return toCommandValue(s)
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A')
        .replace(/:/g, '%3A')
        .replace(/,/g, '%2C');
}
//# sourceMappingURL=command.js.map

/***/ }),

/***/ 470:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

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
const command_1 = __webpack_require__(431);
const os = __importStar(__webpack_require__(87));
const path = __importStar(__webpack_require__(622));
/**
 * The code to exit an action
 */
var ExitCode;
(function (ExitCode) {
    /**
     * A code indicating that the action was successful
     */
    ExitCode[ExitCode["Success"] = 0] = "Success";
    /**
     * A code indicating that the action was a failure
     */
    ExitCode[ExitCode["Failure"] = 1] = "Failure";
})(ExitCode = exports.ExitCode || (exports.ExitCode = {}));
//-----------------------------------------------------------------------
// Variables
//-----------------------------------------------------------------------
/**
 * Sets env variable for this action and future actions in the job
 * @param name the name of the variable to set
 * @param val the value of the variable. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportVariable(name, val) {
    const convertedVal = command_1.toCommandValue(val);
    process.env[name] = convertedVal;
    command_1.issueCommand('set-env', { name }, convertedVal);
}
exports.exportVariable = exportVariable;
/**
 * Registers a secret which will get masked from logs
 * @param secret value of the secret
 */
function setSecret(secret) {
    command_1.issueCommand('add-mask', {}, secret);
}
exports.setSecret = setSecret;
/**
 * Prepends inputPath to the PATH (for this action and future actions)
 * @param inputPath
 */
function addPath(inputPath) {
    command_1.issueCommand('add-path', {}, inputPath);
    process.env['PATH'] = `${inputPath}${path.delimiter}${process.env['PATH']}`;
}
exports.addPath = addPath;
/**
 * Gets the value of an input.  The value is also trimmed.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string
 */
function getInput(name, options) {
    const val = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
    if (options && options.required && !val) {
        throw new Error(`Input required and not supplied: ${name}`);
    }
    return val.trim();
}
exports.getInput = getInput;
/**
 * Sets the value of an output.
 *
 * @param     name     name of the output to set
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setOutput(name, value) {
    command_1.issueCommand('set-output', { name }, value);
}
exports.setOutput = setOutput;
/**
 * Enables or disables the echoing of commands into stdout for the rest of the step.
 * Echoing is disabled by default if ACTIONS_STEP_DEBUG is not set.
 *
 */
function setCommandEcho(enabled) {
    command_1.issue('echo', enabled ? 'on' : 'off');
}
exports.setCommandEcho = setCommandEcho;
//-----------------------------------------------------------------------
// Results
//-----------------------------------------------------------------------
/**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */
function setFailed(message) {
    process.exitCode = ExitCode.Failure;
    error(message);
}
exports.setFailed = setFailed;
//-----------------------------------------------------------------------
// Logging Commands
//-----------------------------------------------------------------------
/**
 * Gets whether Actions Step Debug is on or not
 */
function isDebug() {
    return process.env['RUNNER_DEBUG'] === '1';
}
exports.isDebug = isDebug;
/**
 * Writes debug message to user log
 * @param message debug message
 */
function debug(message) {
    command_1.issueCommand('debug', {}, message);
}
exports.debug = debug;
/**
 * Adds an error issue
 * @param message error issue message. Errors will be converted to string via toString()
 */
function error(message) {
    command_1.issue('error', message instanceof Error ? message.toString() : message);
}
exports.error = error;
/**
 * Adds an warning issue
 * @param message warning issue message. Errors will be converted to string via toString()
 */
function warning(message) {
    command_1.issue('warning', message instanceof Error ? message.toString() : message);
}
exports.warning = warning;
/**
 * Writes info to log with console.log.
 * @param message info message
 */
function info(message) {
    process.stdout.write(message + os.EOL);
}
exports.info = info;
/**
 * Begin an output group.
 *
 * Output until the next `groupEnd` will be foldable in this group
 *
 * @param name The name of the output group
 */
function startGroup(name) {
    command_1.issue('group', name);
}
exports.startGroup = startGroup;
/**
 * End an output group.
 */
function endGroup() {
    command_1.issue('endgroup');
}
exports.endGroup = endGroup;
/**
 * Wrap an asynchronous function call in a group.
 *
 * Returns the same type as the function itself.
 *
 * @param name The name of the group
 * @param fn The function to wrap in the group
 */
function group(name, fn) {
    return __awaiter(this, void 0, void 0, function* () {
        startGroup(name);
        let result;
        try {
            result = yield fn();
        }
        finally {
            endGroup();
        }
        return result;
    });
}
exports.group = group;
//-----------------------------------------------------------------------
// Wrapper action state
//-----------------------------------------------------------------------
/**
 * Saves state for current action, the state can only be retrieved by this action's post job execution.
 *
 * @param     name     name of the state to store
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveState(name, value) {
    command_1.issueCommand('save-state', { name }, value);
}
exports.saveState = saveState;
/**
 * Gets the value of an state set by this action's main execution.
 *
 * @param     name     name of the state to get
 * @returns   string
 */
function getState(name) {
    return process.env[`STATE_${name}`] || '';
}
exports.getState = getState;
//# sourceMappingURL=core.js.map

/***/ }),

/***/ 534:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(__webpack_require__(163));
/**
 * Function to get command to setup tools
 *
 * @param os_version
 * @param suffix
 */
async function getCommand(os_version, suffix) {
    switch (os_version) {
        case 'linux':
        case 'darwin':
            return 'add_' + suffix + ' ';
        case 'win32':
            return 'Add-' + suffix.charAt(0).toUpperCase() + suffix.slice(1) + ' ';
        default:
            return await utils.log('Platform ' + os_version + ' is not supported', os_version, 'error');
    }
}
exports.getCommand = getCommand;
/**
 * Function to get tool version
 *
 * @param version
 */
async function getToolVersion(version) {
    // semver_regex - https://semver.org/
    const semver_regex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    version = version.replace(/[><=^]*/, '');
    switch (true) {
        case semver_regex.test(version):
            return version;
        default:
            return 'latest';
    }
}
exports.getToolVersion = getToolVersion;
/**
 * Function to parse tool:version
 *
 * @param release
 */
async function parseTool(release) {
    const parts = release.split(':');
    const tool = parts[0];
    const version = parts[1];
    switch (version) {
        case undefined:
            return {
                name: tool,
                version: 'latest'
            };
        default:
            return {
                name: tool,
                version: await getToolVersion(parts[1])
            };
    }
}
exports.parseTool = parseTool;
/**
 * Function to get the url of tool with the given version
 *
 * @param tool
 * @param extension
 * @param version
 * @param prefix
 * @param version_prefix
 * @param verb
 */
async function getUri(tool, extension, version, prefix, version_prefix, verb) {
    switch (version) {
        case 'latest':
            return [prefix, version, verb, tool + extension]
                .filter(Boolean)
                .join('/');
        default:
            return [prefix, verb, version_prefix + version, tool + extension]
                .filter(Boolean)
                .join('/');
    }
}
exports.getUri = getUri;
/**
 * Helper function to get the codeception url
 *
 * @param version
 * @param suffix
 */
async function getCodeceptionUriBuilder(version, suffix) {
    return ['releases', version, suffix, 'codecept.phar']
        .filter(Boolean)
        .join('/');
}
exports.getCodeceptionUriBuilder = getCodeceptionUriBuilder;
/**
 * Function to get the codeception url
 *
 * @param version
 * @param php_version
 */
async function getCodeceptionUri(version, php_version) {
    const codecept = await getCodeceptionUriBuilder(version, '');
    const codecept54 = await getCodeceptionUriBuilder(version, 'php54');
    const codecept56 = await getCodeceptionUriBuilder(version, 'php56');
    // Refer to https://codeception.com/builds
    switch (true) {
        case /latest/.test(version):
            switch (true) {
                case /5\.6|7\.[0|1]/.test(php_version):
                    return 'php56/codecept.phar';
                case /7\.[2-4]/.test(php_version):
                default:
                    return 'codecept.phar';
            }
        case /(^[4-9]|\d{2,})\..*/.test(version):
            switch (true) {
                case /5\.6|7\.[0|1]/.test(php_version):
                    return codecept56;
                case /7\.[2-4]/.test(php_version):
                default:
                    return codecept;
            }
        case /(^2\.[4-5]\.\d+|^3\.[0-1]\.\d+).*/.test(version):
            switch (true) {
                case /5\.6/.test(php_version):
                    return codecept54;
                case /7\.[0-4]/.test(php_version):
                default:
                    return codecept;
            }
        case /^2\.3\.\d+.*/.test(version):
            switch (true) {
                case /5\.[4-6]/.test(php_version):
                    return codecept54;
                case /^7\.[0-4]$/.test(php_version):
                default:
                    return codecept;
            }
        case /(^2\.(1\.([6-9]|\d{2,}))|^2\.2\.\d+).*/.test(version):
            switch (true) {
                case /5\.[4-5]/.test(php_version):
                    return codecept54;
                case /5.6|7\.[0-4]/.test(php_version):
                default:
                    return codecept;
            }
        case /(^2\.(1\.[0-5]|0\.\d+)|^1\.[6-8]\.\d+).*/.test(version):
            return codecept;
        default:
            return codecept;
    }
}
exports.getCodeceptionUri = getCodeceptionUri;
/**
 * Helper function to get script to setup phive
 *
 * @param version
 * @param os_version
 */
async function addPhive(version, os_version) {
    switch (version) {
        case 'latest':
            return ((await getCommand(os_version, 'tool')) +
                'https://phar.io/releases/phive.phar phive');
        default:
            return ((await getCommand(os_version, 'tool')) +
                'https://github.com/phar-io/phive/releases/download/' +
                version +
                '/phive-' +
                version +
                '.phar phive');
    }
}
exports.addPhive = addPhive;
/**
 * Function to get the phar url in domain/tool-version.phar format
 *
 * @param domain
 * @param tool
 * @param prefix
 * @param version
 */
async function getPharUrl(domain, tool, prefix, version) {
    switch (version) {
        case 'latest':
            return domain + '/' + tool + '.phar';
        default:
            return domain + '/' + tool + '-' + prefix + version + '.phar';
    }
}
exports.getPharUrl = getPharUrl;
/**
 * Function to get the Deployer url
 *
 * @param version
 */
async function getDeployerUrl(version) {
    const deployer = 'https://deployer.org';
    switch (version) {
        case 'latest':
            return deployer + '/deployer.phar';
        default:
            return deployer + '/releases/v' + version + '/deployer.phar';
    }
}
exports.getDeployerUrl = getDeployerUrl;
/**
 * Function to get the Deployer url
 *
 * @param version
 * @param os_version
 */
async function getSymfonyUri(version, os_version) {
    let filename = '';
    switch (os_version) {
        case 'linux':
        case 'darwin':
            filename = 'symfony_' + os_version + '_amd64';
            break;
        case 'win32':
            filename = 'symfony_windows_amd64.exe';
            break;
        default:
            return await utils.log('Platform ' + os_version + ' is not supported', os_version, 'error');
    }
    switch (version) {
        case 'latest':
            return 'releases/latest/download/' + filename;
        default:
            return 'releases/download/v' + version + '/' + filename;
    }
}
exports.getSymfonyUri = getSymfonyUri;
/**
 * Function to get the WP-CLI url
 *
 * @param version
 */
async function getWpCliUrl(version) {
    switch (version) {
        case 'latest':
            return 'wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true';
        default:
            return await getUri('wp-cli', '-' + version + '.phar', version, 'wp-cli/wp-cli/releases', 'v', 'download');
    }
}
exports.getWpCliUrl = getWpCliUrl;
/**
 * Function to add/move composer in the tools list
 *
 * @param tools_list
 */
async function addComposer(tools_list) {
    const regex = /^composer($|:.*)/;
    const composer = tools_list.filter(tool => regex.test(tool))[0];
    switch (composer) {
        case undefined:
            break;
        default:
            tools_list = tools_list.filter(tool => !regex.test(tool));
            break;
    }
    tools_list.unshift('composer');
    return tools_list;
}
exports.addComposer = addComposer;
/**
 * Function to get Tools list after cleanup
 *
 * @param tools_csv
 */
async function getCleanedToolsList(tools_csv) {
    let tools_list = await utils.CSVArray(tools_csv);
    tools_list = await addComposer(tools_list);
    tools_list = tools_list
        .map(function (extension) {
        return extension
            .trim()
            .replace(/symfony\/|laravel\/|robmorgan\/|hirak\/|narrowspark\/automatic-/, '');
    })
        .filter(Boolean);
    return [...new Set(tools_list)];
}
exports.getCleanedToolsList = getCleanedToolsList;
/**
 * Helper function to get script to setup a tool using a phar url
 *
 * @param tool
 * @param version
 * @param url
 * @param os_version
 */
async function addArchive(tool, version, url, os_version) {
    return (await getCommand(os_version, 'tool')) + url + ' ' + tool;
}
exports.addArchive = addArchive;
/**
 * Function to get the script to setup php-config and phpize
 *
 * @param tool
 * @param os_version
 */
async function addDevTools(tool, os_version) {
    switch (os_version) {
        case 'linux':
            return ('add_devtools' +
                '\n' +
                (await utils.addLog('$tick', tool, 'Added', 'linux')));
        case 'darwin':
            return await utils.addLog('$tick', tool, 'Added', 'darwin');
        case 'win32':
            return await utils.addLog('$cross', tool, tool + ' is not a windows tool', 'win32');
        default:
            return await utils.log('Platform ' + os_version + ' is not supported', os_version, 'error');
    }
}
exports.addDevTools = addDevTools;
/**
 * Helper function to get script to setup a tool using composer
 *
 * @param tool
 * @param release
 * @param prefix
 * @param os_version
 */
async function addPackage(tool, release, prefix, os_version) {
    const tool_command = await getCommand(os_version, 'composertool');
    return tool_command + tool + ' ' + release + ' ' + prefix;
}
exports.addPackage = addPackage;
/**
 * Setup tools
 *
 * @param tools_csv
 * @param php_version
 * @param os_version
 */
async function addTools(tools_csv, php_version, os_version) {
    let script = '\n' + (await utils.stepLog('Setup Tools', os_version));
    const tools_list = await getCleanedToolsList(tools_csv);
    await utils.asyncForEach(tools_list, async function (release) {
        const tool_data = await parseTool(release);
        const tool = tool_data.name;
        const version = tool_data.version;
        const github = 'https://github.com/';
        let uri = await getUri(tool, '.phar', version, 'releases', '', 'download');
        script += '\n';
        let url = '';
        switch (tool) {
            case 'blackfire':
            case 'blackfire-agent':
                script += await getCommand(os_version, 'blackfire');
                break;
            case 'blackfire-player':
                url = await getPharUrl('https://get.blackfire.io', tool, 'v', version);
                script += await addArchive(tool, version, url, os_version);
                break;
            case 'cs2pr':
                uri = await getUri(tool, '', version, 'releases', '', 'download');
                url = github + 'staabm/annotate-pull-request-from-checkstyle/' + uri;
                script += await addArchive(tool, version, url, os_version);
                break;
            case 'infection':
                url = github + 'infection/infection/' + uri;
                script += await addArchive(tool, version, url, os_version);
                break;
            case 'php-cs-fixer':
                uri = await getUri(tool, '.phar', version, 'releases', 'v', 'download');
                url = github + 'FriendsOfPHP/PHP-CS-Fixer/' + uri;
                script += await addArchive(tool, version, url, os_version);
                break;
            case 'phpcs':
            case 'phpcbf':
                url = github + 'squizlabs/PHP_CodeSniffer/' + uri;
                script += await addArchive(tool, version, url, os_version);
                break;
            case 'phive':
                script += await addPhive(version, os_version);
                break;
            case 'phpstan':
                url = github + 'phpstan/phpstan/' + uri;
                script += await addArchive(tool, version, url, os_version);
                break;
            case 'phpmd':
                url = github + 'phpmd/phpmd/' + uri;
                script += await addArchive(tool, version, url, os_version);
                break;
            case 'psalm':
                url = github + 'vimeo/psalm/' + uri;
                script += await addArchive(tool, version, url, os_version);
                break;
            case 'composer':
                // If RC is released as latest release, switch to getcomposer.
                // Prefered source is GitHub as it is faster.
                // url = github + 'composer/composer/releases/latest/download/composer.phar';
                url = 'https://getcomposer.org/composer-stable.phar';
                script += await addArchive(tool, version, url, os_version);
                break;
            case 'codeception':
                url =
                    'https://codeception.com/' +
                        (await getCodeceptionUri(version, php_version));
                script += await addArchive(tool, version, url, os_version);
                break;
            case 'phpcpd':
            case 'phpunit':
                url = await getPharUrl('https://phar.phpunit.de', tool, '', version);
                script += await addArchive(tool, version, url, os_version);
                break;
            case 'deployer':
                url = await getDeployerUrl(version);
                script += await addArchive(tool, version, url, os_version);
                break;
            case 'flex':
                script += await addPackage(tool, release, 'symfony/', os_version);
                break;
            case 'phinx':
                script += await addPackage(tool, release, 'robmorgan/', os_version);
                break;
            case 'prestissimo':
                script += await addPackage(tool, release, 'hirak/', os_version);
                break;
            case 'vapor-cli':
                script += await addPackage(tool, release, 'laravel/', os_version);
                break;
            case 'composer-prefetcher':
                script += await addPackage(tool, release, 'narrowspark/automatic-', os_version);
                break;
            case 'pecl':
                script += await getCommand(os_version, 'pecl');
                break;
            case 'php-config':
            case 'phpize':
                script += await addDevTools(tool, os_version);
                break;
            case 'symfony':
            case 'symfony-cli':
                uri = await getSymfonyUri(version, os_version);
                url = github + 'symfony/cli/' + uri;
                script += await addArchive('symfony', version, url, os_version);
                break;
            case 'wp-cli':
                url = github + (await getWpCliUrl(version));
                script += await addArchive(tool, version, url, os_version);
                break;
            default:
                script += await utils.addLog('$cross', tool, 'Tool ' + tool + ' is not supported', os_version);
                break;
        }
    });
    return script;
}
exports.addTools = addTools;


/***/ }),

/***/ 614:
/***/ (function(module) {

module.exports = require("events");

/***/ }),

/***/ 622:
/***/ (function(module) {

module.exports = require("path");

/***/ }),

/***/ 635:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(__webpack_require__(163));
const extensions = __importStar(__webpack_require__(911));
const config = __importStar(__webpack_require__(641));
/**
 * Function to setup Xdebug
 *
 * @param version
 * @param os_version
 * @param pipe
 */
async function addCoverageXdebug(version, os_version, pipe) {
    switch (version) {
        case '8.0':
            return ('\n' +
                (await utils.addLog('$cross', 'xdebug', 'Xdebug currently only supports PHP 7.4 or lower', os_version)));
        case '7.4':
        default:
            return ((await extensions.addExtension('xdebug', version, os_version, true)) +
                pipe +
                '\n' +
                (await utils.addLog('$tick', 'xdebug', 'Xdebug enabled as coverage driver', os_version)));
    }
}
exports.addCoverageXdebug = addCoverageXdebug;
/**
 * Function to setup PCOV
 *
 * @param version
 * @param os_version
 * @param pipe
 */
async function addCoveragePCOV(version, os_version, pipe) {
    let script = '\n';
    switch (true) {
        default:
            script +=
                (await extensions.addExtension('pcov', version, os_version, true)) +
                    pipe +
                    '\n';
            script +=
                (await config.addINIValues('pcov.enabled=1', os_version, true)) + '\n';
            // add command to disable xdebug and enable pcov
            switch (os_version) {
                case 'linux':
                case 'darwin':
                    script += 'remove_extension xdebug' + pipe + '\n';
                    break;
                case 'win32':
                    script += 'Remove-Extension xdebug' + pipe + '\n';
                    break;
            }
            // success
            script += await utils.addLog('$tick', 'coverage: pcov', 'PCOV enabled as coverage driver', os_version);
            // version is not supported
            break;
        case /5\.[3-6]|7\.0/.test(version):
            script += await utils.addLog('$cross', 'pcov', 'PHP 7.1 or newer is required', os_version);
            break;
    }
    return script;
}
exports.addCoveragePCOV = addCoveragePCOV;
/**
 * Function to disable Xdebug and PCOV
 *
 * @param version
 * @param os_version
 * @param pipe
 */
async function disableCoverage(version, os_version, pipe) {
    let script = '\n';
    switch (os_version) {
        case 'linux':
        case 'darwin':
            script += 'remove_extension xdebug' + pipe + '\n';
            script += 'remove_extension pcov' + pipe + '\n';
            break;
        case 'win32':
            script += 'Remove-Extension xdebug' + pipe + '\n';
            script += 'Remove-Extension pcov' + pipe + '\n';
            break;
    }
    script += await utils.addLog('$tick', 'none', 'Disabled Xdebug and PCOV', os_version);
    return script;
}
exports.disableCoverage = disableCoverage;
/**
 * Function to set coverage driver
 *
 * @param coverage_driver
 * @param version
 * @param os_version
 */
async function addCoverage(coverage_driver, version, os_version) {
    coverage_driver = coverage_driver.toLowerCase();
    const script = '\n' + (await utils.stepLog('Setup Coverage', os_version));
    const pipe = await utils.suppressOutput(os_version);
    switch (coverage_driver) {
        case 'pcov':
            return script + (await addCoveragePCOV(version, os_version, pipe));
        case 'xdebug':
            return script + (await addCoverageXdebug(version, os_version, pipe));
        case 'none':
            return script + (await disableCoverage(version, os_version, pipe));
        default:
            return '';
    }
}
exports.addCoverage = addCoverage;


/***/ }),

/***/ 641:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(__webpack_require__(163));
/**
 * Add script to set custom ini values for unix
 *
 * @param ini_values_csv
 */
async function addINIValuesUnix(ini_values_csv) {
    const ini_values = await utils.CSVArray(ini_values_csv);
    let script = '\n';
    await utils.asyncForEach(ini_values, async function (line) {
        script +=
            (await utils.addLog('$tick', line, 'Added to php.ini', 'linux')) + '\n';
    });
    return 'echo "' + ini_values.join('\n') + '" >> $ini_file' + script;
}
exports.addINIValuesUnix = addINIValuesUnix;
/**
 * Add script to set custom ini values for windows
 *
 * @param ini_values_csv
 */
async function addINIValuesWindows(ini_values_csv) {
    const ini_values = await utils.CSVArray(ini_values_csv);
    let script = '\n';
    await utils.asyncForEach(ini_values, async function (line) {
        script +=
            (await utils.addLog('$tick', line, 'Added to php.ini', 'win32')) + '\n';
    });
    return ('Add-Content C:\\tools\\php\\php.ini "' +
        ini_values.join('\n') +
        '"' +
        script);
}
exports.addINIValuesWindows = addINIValuesWindows;
/**
 * Function to add custom ini values
 *
 * @param ini_values_csv
 * @param os_version
 * @param no_step
 */
async function addINIValues(ini_values_csv, os_version, no_step = false) {
    let script = '\n';
    switch (no_step) {
        case true:
            script +=
                (await utils.stepLog('Add php.ini values', os_version)) +
                    (await utils.suppressOutput(os_version)) +
                    '\n';
            break;
        case false:
        default:
            script += (await utils.stepLog('Add php.ini values', os_version)) + '\n';
            break;
    }
    switch (os_version) {
        case 'win32':
            return script + (await addINIValuesWindows(ini_values_csv));
        case 'darwin':
        case 'linux':
            return script + (await addINIValuesUnix(ini_values_csv));
        default:
            return await utils.log('Platform ' + os_version + ' is not supported', os_version, 'error');
    }
}
exports.addINIValues = addINIValues;


/***/ }),

/***/ 655:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const exec_1 = __webpack_require__(986);
const core = __importStar(__webpack_require__(470));
const config = __importStar(__webpack_require__(641));
const coverage = __importStar(__webpack_require__(635));
const extensions = __importStar(__webpack_require__(911));
const tools = __importStar(__webpack_require__(534));
const utils = __importStar(__webpack_require__(163));
const matchers = __importStar(__webpack_require__(86));
/**
 * Build the script
 *
 * @param filename
 * @param version
 * @param os_version
 */
async function build(filename, version, os_version) {
    // taking inputs
    const extension_csv = (await utils.getInput('extensions', false)) ||
        (await utils.getInput('extension', false));
    const ini_values_csv = await utils.getInput('ini-values', false);
    const coverage_driver = await utils.getInput('coverage', false);
    const pecl = await utils.getInput('pecl', false);
    let tools_csv = await utils.getInput('tools', false);
    if (pecl == 'true' ||
        /.*-(beta|alpha|devel|snapshot).*/.test(extension_csv) ||
        /.*-(\d+\.\d+\.\d+).*/.test(extension_csv)) {
        tools_csv = 'pecl, ' + tools_csv;
    }
    let script = await utils.readScript(filename);
    script += await tools.addTools(tools_csv, version, os_version);
    if (extension_csv) {
        script += await extensions.addExtension(extension_csv, version, os_version);
    }
    if (ini_values_csv) {
        script += await config.addINIValues(ini_values_csv, os_version);
    }
    if (coverage_driver) {
        script += await coverage.addCoverage(coverage_driver, version, os_version);
    }
    return await utils.writeScript(filename, script);
}
exports.build = build;
/**
 * Run the script
 */
async function run() {
    try {
        let version = await utils.getInput('php-version', true);
        version = version.length > 1 ? version.slice(0, 3) : version + '.0';
        const os_version = process.platform;
        // check the os version and run the respective script
        let script_path = '';
        switch (os_version) {
            case 'darwin':
            case 'linux':
                script_path = await build(os_version + '.sh', version, os_version);
                await exec_1.exec('bash ' + script_path + ' ' + version + ' ' + __dirname);
                break;
            case 'win32':
                script_path = await build('win32.ps1', version, os_version);
                await exec_1.exec('pwsh ' + script_path + ' ' + version + ' ' + __dirname);
                break;
        }
        await matchers.addMatchers();
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
exports.run = run;
// call the run function
run();


/***/ }),

/***/ 669:
/***/ (function(module) {

module.exports = require("util");

/***/ }),

/***/ 672:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __webpack_require__(357);
const fs = __webpack_require__(747);
const path = __webpack_require__(622);
_a = fs.promises, exports.chmod = _a.chmod, exports.copyFile = _a.copyFile, exports.lstat = _a.lstat, exports.mkdir = _a.mkdir, exports.readdir = _a.readdir, exports.readlink = _a.readlink, exports.rename = _a.rename, exports.rmdir = _a.rmdir, exports.stat = _a.stat, exports.symlink = _a.symlink, exports.unlink = _a.unlink;
exports.IS_WINDOWS = process.platform === 'win32';
function exists(fsPath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exports.stat(fsPath);
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                return false;
            }
            throw err;
        }
        return true;
    });
}
exports.exists = exists;
function isDirectory(fsPath, useStat = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const stats = useStat ? yield exports.stat(fsPath) : yield exports.lstat(fsPath);
        return stats.isDirectory();
    });
}
exports.isDirectory = isDirectory;
/**
 * On OSX/Linux, true if path starts with '/'. On Windows, true for paths like:
 * \, \hello, \\hello\share, C:, and C:\hello (and corresponding alternate separator cases).
 */
function isRooted(p) {
    p = normalizeSeparators(p);
    if (!p) {
        throw new Error('isRooted() parameter "p" cannot be empty');
    }
    if (exports.IS_WINDOWS) {
        return (p.startsWith('\\') || /^[A-Z]:/i.test(p) // e.g. \ or \hello or \\hello
        ); // e.g. C: or C:\hello
    }
    return p.startsWith('/');
}
exports.isRooted = isRooted;
/**
 * Recursively create a directory at `fsPath`.
 *
 * This implementation is optimistic, meaning it attempts to create the full
 * path first, and backs up the path stack from there.
 *
 * @param fsPath The path to create
 * @param maxDepth The maximum recursion depth
 * @param depth The current recursion depth
 */
function mkdirP(fsPath, maxDepth = 1000, depth = 1) {
    return __awaiter(this, void 0, void 0, function* () {
        assert_1.ok(fsPath, 'a path argument must be provided');
        fsPath = path.resolve(fsPath);
        if (depth >= maxDepth)
            return exports.mkdir(fsPath);
        try {
            yield exports.mkdir(fsPath);
            return;
        }
        catch (err) {
            switch (err.code) {
                case 'ENOENT': {
                    yield mkdirP(path.dirname(fsPath), maxDepth, depth + 1);
                    yield exports.mkdir(fsPath);
                    return;
                }
                default: {
                    let stats;
                    try {
                        stats = yield exports.stat(fsPath);
                    }
                    catch (err2) {
                        throw err;
                    }
                    if (!stats.isDirectory())
                        throw err;
                }
            }
        }
    });
}
exports.mkdirP = mkdirP;
/**
 * Best effort attempt to determine whether a file exists and is executable.
 * @param filePath    file path to check
 * @param extensions  additional file extensions to try
 * @return if file exists and is executable, returns the file path. otherwise empty string.
 */
function tryGetExecutablePath(filePath, extensions) {
    return __awaiter(this, void 0, void 0, function* () {
        let stats = undefined;
        try {
            // test file exists
            stats = yield exports.stat(filePath);
        }
        catch (err) {
            if (err.code !== 'ENOENT') {
                // eslint-disable-next-line no-console
                console.log(`Unexpected error attempting to determine if executable file exists '${filePath}': ${err}`);
            }
        }
        if (stats && stats.isFile()) {
            if (exports.IS_WINDOWS) {
                // on Windows, test for valid extension
                const upperExt = path.extname(filePath).toUpperCase();
                if (extensions.some(validExt => validExt.toUpperCase() === upperExt)) {
                    return filePath;
                }
            }
            else {
                if (isUnixExecutable(stats)) {
                    return filePath;
                }
            }
        }
        // try each extension
        const originalFilePath = filePath;
        for (const extension of extensions) {
            filePath = originalFilePath + extension;
            stats = undefined;
            try {
                stats = yield exports.stat(filePath);
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    // eslint-disable-next-line no-console
                    console.log(`Unexpected error attempting to determine if executable file exists '${filePath}': ${err}`);
                }
            }
            if (stats && stats.isFile()) {
                if (exports.IS_WINDOWS) {
                    // preserve the case of the actual file (since an extension was appended)
                    try {
                        const directory = path.dirname(filePath);
                        const upperName = path.basename(filePath).toUpperCase();
                        for (const actualName of yield exports.readdir(directory)) {
                            if (upperName === actualName.toUpperCase()) {
                                filePath = path.join(directory, actualName);
                                break;
                            }
                        }
                    }
                    catch (err) {
                        // eslint-disable-next-line no-console
                        console.log(`Unexpected error attempting to determine the actual case of the file '${filePath}': ${err}`);
                    }
                    return filePath;
                }
                else {
                    if (isUnixExecutable(stats)) {
                        return filePath;
                    }
                }
            }
        }
        return '';
    });
}
exports.tryGetExecutablePath = tryGetExecutablePath;
function normalizeSeparators(p) {
    p = p || '';
    if (exports.IS_WINDOWS) {
        // convert slashes on Windows
        p = p.replace(/\//g, '\\');
        // remove redundant slashes
        return p.replace(/\\\\+/g, '\\');
    }
    // remove redundant slashes
    return p.replace(/\/\/+/g, '/');
}
// on Mac/Linux, test the execute bit
//     R   W  X  R  W X R W X
//   256 128 64 32 16 8 4 2 1
function isUnixExecutable(stats) {
    return ((stats.mode & 1) > 0 ||
        ((stats.mode & 8) > 0 && stats.gid === process.getgid()) ||
        ((stats.mode & 64) > 0 && stats.uid === process.getuid()));
}
//# sourceMappingURL=io-util.js.map

/***/ }),

/***/ 747:
/***/ (function(module) {

module.exports = require("fs");

/***/ }),

/***/ 911:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(__webpack_require__(622));
const utils = __importStar(__webpack_require__(163));
/**
 * Install and enable extensions for darwin
 *
 * @param extension_csv
 * @param version
 * @param pipe
 */
async function addExtensionDarwin(extension_csv, version, pipe) {
    const extensions = await utils.extensionArray(extension_csv);
    let add_script = '\n';
    let remove_script = '\n';
    await utils.asyncForEach(extensions, async function (extension) {
        const version_extension = version + extension;
        const [ext_name, ext_version] = extension.split('-');
        const ext_prefix = await utils.getExtensionPrefix(ext_name);
        const command_prefix = 'sudo pecl install -f ';
        let command = '';
        switch (true) {
            // match :extension
            case /^:/.test(ext_name):
                remove_script += '\nremove_extension ' + ext_name.slice(1);
                return;
            // match 5.3blackfire...5.6blackfire, 7.0blackfire...7.4blackfire
            // match 5.3blackfire-1.31.0...5.6blackfire-1.31.0, 7.0blackfire-1.31.0...7.4blackfire-1.31.0
            case /^(5\.[3-6]|7\.[0-4])blackfire(-\d+\.\d+\.\d+)?$/.test(version_extension):
                command =
                    'bash ' +
                        path.join(__dirname, '../src/scripts/ext/blackfire_darwin.sh') +
                        ' ' +
                        version +
                        ' ' +
                        extension;
                break;
            // match pre-release versions. For example - xdebug-beta
            case /.*-(beta|alpha|devel|snapshot)/.test(version_extension):
                add_script +=
                    '\nadd_unstable_extension ' +
                        ext_name +
                        ' ' +
                        ext_version +
                        ' ' +
                        ext_prefix;
                return;
            // match semver
            case /.*-\d+\.\d+\.\d+.*/.test(version_extension):
                add_script +=
                    '\nadd_pecl_extension ' +
                        ext_name +
                        ' ' +
                        ext_version +
                        ' ' +
                        ext_prefix;
                return;
            // match 5.3xdebug
            case /5\.3xdebug/.test(version_extension):
                command = command_prefix + 'xdebug-2.2.7' + pipe;
                break;
            // match 5.4xdebug
            case /5\.4xdebug/.test(version_extension):
                command = command_prefix + 'xdebug-2.4.1' + pipe;
                break;
            // match 5.5xdebug and 5.6xdebug
            case /5\.[5-6]xdebug/.test(version_extension):
                command = command_prefix + 'xdebug-2.5.5' + pipe;
                break;
            // match 7.0redis
            case /7\.0xdebug/.test(version_extension):
                command = command_prefix + 'xdebug-2.9.0' + pipe;
                break;
            // match 5.6redis
            case /5\.6redis/.test(version_extension):
                command = command_prefix + 'redis-2.2.8' + pipe;
                break;
            // match imagick
            case /^imagick$/.test(extension):
                command =
                    'brew install pkg-config imagemagick' +
                        pipe +
                        ' && ' +
                        command_prefix +
                        'imagick' +
                        pipe;
                break;
            // match sqlite
            case /^sqlite$/.test(extension):
                extension = 'sqlite3';
                command = command_prefix + extension + pipe;
                break;
            // match 7.0phalcon3...7.3phalcon3 and 7.2phalcon4...7.4phalcon4
            case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
                add_script +=
                    'sh ' +
                        path.join(__dirname, '../src/scripts/ext/phalcon_darwin.sh') +
                        ' ' +
                        extension +
                        ' ' +
                        version;
                return;
            default:
                command = command_prefix + extension + pipe;
                break;
        }
        add_script +=
            '\nadd_extension ' + ext_name + ' "' + command + '" ' + ext_prefix;
    });
    return add_script + remove_script;
}
exports.addExtensionDarwin = addExtensionDarwin;
/**
 * Install and enable extensions for windows
 *
 * @param extension_csv
 * @param version
 */
async function addExtensionWindows(extension_csv, version) {
    const extensions = await utils.extensionArray(extension_csv);
    let add_script = '\n';
    let remove_script = '\n';
    await utils.asyncForEach(extensions, async function (extension) {
        const [ext_name, ext_version] = extension.split('-');
        const version_extension = version + extension;
        let matches;
        switch (true) {
            // Match :extension
            case /^:/.test(ext_name):
                remove_script += '\nRemove-Extension ' + ext_name.slice(1);
                return;
            // match 5.4blackfire...5.6blackfire, 7.0blackfire...7.4blackfire
            // match 5.4blackfire-1.31.0...5.6blackfire-1.31.0, 7.0blackfire-1.31.0...7.4blackfire-1.31.0
            case /^(5\.[4-6]|7\.[0-4])blackfire(-\d+\.\d+\.\d+)?$/.test(version_extension):
                add_script +=
                    '\n& ' +
                        path.join(__dirname, '../src/scripts/ext/blackfire.ps1') +
                        ' ' +
                        version +
                        ' ' +
                        extension;
                return;
            // match pre-release versions. For example - xdebug-beta
            case /.*-(beta|alpha|devel|snapshot)/.test(version_extension):
                add_script += '\nAdd-Extension ' + ext_name + ' ' + ext_version;
                break;
            // match semver without state
            case /.*-\d+\.\d+\.\d+$/.test(version_extension):
                add_script += '\nAdd-Extension ' + ext_name + ' stable ' + ext_version;
                return;
            // match semver with state
            case /.*-(\d+\.\d+\.\d)(beta|alpha|devel|snapshot)\d*/.test(version_extension):
                matches = /.*-(\d+\.\d+\.\d)(beta|alpha|devel|snapshot)\d*/.exec(version_extension);
                add_script +=
                    '\nAdd-Extension ' + ext_name + ' ' + matches[2] + ' ' + matches[1];
                return;
            // match 5.3mysql..5.6mysql
            // match 5.3mysqli..5.6mysqli
            // match 5.3mysqlnd..5.6mysqlnd
            case /^5\.\d(mysql|mysqli|mysqlnd)$/.test(version_extension):
                add_script +=
                    '\nAdd-Extension mysql\nAdd-Extension mysqli\nAdd-Extension mysqlnd';
                break;
            // match 7.0mysql..8.0mysql
            // match 7.0mysqli..8.0mysqli
            // match 7.0mysqlnd..8.0mysqlnd
            case /[7-8]\.\d(mysql|mysqli|mysqlnd)$/.test(version_extension):
                add_script += '\nAdd-Extension mysqli\nAdd-Extension mysqlnd';
                break;
            // match sqlite
            case /^sqlite$/.test(extension):
                extension = 'sqlite3';
                add_script += '\nAdd-Extension ' + extension;
                break;
            // match 7.0phalcon3...7.3phalcon3 and 7.2phalcon4...7.4phalcon4
            case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
                add_script +=
                    '\n& ' +
                        path.join(__dirname, '../src/scripts/ext/phalcon.ps1') +
                        ' ' +
                        extension +
                        ' ' +
                        version +
                        '\n';
                break;
            default:
                add_script += '\nAdd-Extension ' + ext_name;
                break;
        }
    });
    return add_script + remove_script;
}
exports.addExtensionWindows = addExtensionWindows;
/**
 * Install and enable extensions for linux
 *
 * @param extension_csv
 * @param version
 * @param pipe
 */
async function addExtensionLinux(extension_csv, version, pipe) {
    const extensions = await utils.extensionArray(extension_csv);
    let add_script = '\n';
    let remove_script = '\n';
    await utils.asyncForEach(extensions, async function (extension) {
        const version_extension = version + extension;
        const [ext_name, ext_version] = extension.split('-');
        const ext_prefix = await utils.getExtensionPrefix(ext_name);
        const command_prefix = 'sudo $debconf_fix apt-get install -y php';
        let command = '';
        switch (true) {
            // Match :extension
            case /^:/.test(ext_name):
                remove_script += '\nremove_extension ' + ext_name.slice(1);
                return;
            // match 5.3blackfire...5.6blackfire, 7.0blackfire...7.4blackfire
            // match 5.3blackfire-{semver}...5.6blackfire-{semver}, 7.0blackfire-{semver}...7.4blackfire-{semver}
            case /^(5\.[3-6]|7\.[0-4])blackfire(-\d+\.\d+\.\d+)?$/.test(version_extension):
                command =
                    'bash ' +
                        path.join(__dirname, '../src/scripts/ext/blackfire.sh') +
                        ' ' +
                        version +
                        ' ' +
                        extension;
                break;
            // match pre-release versions. For example - xdebug-beta
            case /.*-(beta|alpha|devel|snapshot)/.test(version_extension):
                add_script +=
                    '\nadd_unstable_extension ' +
                        ext_name +
                        ' ' +
                        ext_version +
                        ' ' +
                        ext_prefix;
                return;
            // match semver versions
            case /.*-\d+\.\d+\.\d+.*/.test(version_extension):
                add_script +=
                    '\nadd_pecl_extension ' +
                        ext_name +
                        ' ' +
                        ext_version +
                        ' ' +
                        ext_prefix;
                return;
            // match 5.6gearman..7.4gearman
            case /^((5\.6)|(7\.[0-4]))gearman$/.test(version_extension):
                command =
                    'sh ' +
                        path.join(__dirname, '../src/scripts/ext/gearman.sh') +
                        ' ' +
                        version +
                        pipe;
                break;
            // match 7.0phalcon3...7.3phalcon3 or 7.2phalcon4...7.4phalcon4
            case /^7\.[0-3]phalcon3$|^7\.[2-4]phalcon4$/.test(version_extension):
                add_script +=
                    '\nsh ' +
                        path.join(__dirname, '../src/scripts/ext/phalcon.sh') +
                        ' ' +
                        extension +
                        ' ' +
                        version;
                return;
            // match 7.1xdebug..7.4xdebug
            case /^7\.[1-4]xdebug$/.test(version_extension):
                add_script +=
                    '\nupdate_extension xdebug 2.9.3' +
                        pipe +
                        '\n' +
                        (await utils.addLog('$tick', 'xdebug', 'Enabled', 'linux'));
                return;
            // match pdo extensions
            case /.*pdo[_-].*/.test(version_extension):
                extension = extension.replace('pdo_', '').replace('pdo-', '');
                add_script += '\nadd_pdo_extension ' + extension;
                return;
            // match ast and uopz
            case /^(ast|uopz)$/.test(extension):
                command = command_prefix + '-' + extension + pipe;
                break;
            // match sqlite
            case /^sqlite$/.test(extension):
                extension = 'sqlite3';
                command = command_prefix + version + '-' + extension + pipe;
                break;
            default:
                command = command_prefix + version + '-' + extension + pipe;
                break;
        }
        add_script +=
            '\nadd_extension ' + ext_name + ' "' + command + '" ' + ext_prefix;
    });
    return add_script + remove_script;
}
exports.addExtensionLinux = addExtensionLinux;
/**
 * Install and enable extensions
 *
 * @param extension_csv
 * @param version
 * @param os_version
 * @param no_step
 */
async function addExtension(extension_csv, version, os_version, no_step = false) {
    const pipe = await utils.suppressOutput(os_version);
    let script = '\n';
    switch (no_step) {
        case true:
            script += (await utils.stepLog('Setup Extensions', os_version)) + pipe;
            break;
        case false:
        default:
            script += await utils.stepLog('Setup Extensions', os_version);
            break;
    }
    switch (os_version) {
        case 'win32':
            return script + (await addExtensionWindows(extension_csv, version));
        case 'darwin':
            return script + (await addExtensionDarwin(extension_csv, version, pipe));
        case 'linux':
            return script + (await addExtensionLinux(extension_csv, version, pipe));
        default:
            return await utils.log('Platform ' + os_version + ' is not supported', os_version, 'error');
    }
}
exports.addExtension = addExtension;


/***/ }),

/***/ 986:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

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
const tr = __importStar(__webpack_require__(9));
/**
 * Exec a command.
 * Output will be streamed to the live console.
 * Returns promise with return code
 *
 * @param     commandLine        command to execute (can include additional args). Must be correctly escaped.
 * @param     args               optional arguments for tool. Escaping is handled by the lib.
 * @param     options            optional exec options.  See ExecOptions
 * @returns   Promise<number>    exit code
 */
function exec(commandLine, args, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const commandArgs = tr.argStringToArray(commandLine);
        if (commandArgs.length === 0) {
            throw new Error(`Parameter 'commandLine' cannot be null or empty.`);
        }
        // Path to tool to execute should be first arg
        const toolPath = commandArgs[0];
        args = commandArgs.slice(1).concat(args || []);
        const runner = new tr.ToolRunner(toolPath, args, options);
        return runner.exec();
    });
}
exports.exec = exec;
//# sourceMappingURL=exec.js.map

/***/ })

/******/ });