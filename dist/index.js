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
Object.defineProperty(exports, "__esModule", { value: true });
const os = __webpack_require__(87);
const events = __webpack_require__(614);
const child = __webpack_require__(129);
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
const fs = __importStar(__webpack_require__(747));
const path = __importStar(__webpack_require__(622));
const core = __importStar(__webpack_require__(470));
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
 * Function to read the PHP version.
 */
function getVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        const version = yield getInput('php-version', true);
        switch (version) {
            case '8.0':
            case '8.0-dev':
            case '7.4':
            case '7.4snapshot':
            case '7.4nightly':
            case 'nightly':
                return '7.4';
            default:
                return version;
        }
    });
}
exports.getVersion = getVersion;
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


/***/ }),

/***/ 431:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const os = __webpack_require__(87);
/**
 * Commands
 *
 * Command Format:
 *   ##[name key=value;key=value]message
 *
 * Examples:
 *   ##[warning]This is the user warning message
 *   ##[set-secret name=mypassword]definitelyNotAPassword!
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
            for (const key in this.properties) {
                if (this.properties.hasOwnProperty(key)) {
                    const val = this.properties[key];
                    if (val) {
                        // safely append the val - avoid blowing up when attempting to
                        // call .replace() if message is not a string for some reason
                        cmdStr += `${key}=${escape(`${val || ''}`)},`;
                    }
                }
            }
        }
        cmdStr += CMD_STRING;
        // safely append the message - avoid blowing up when attempting to
        // call .replace() if message is not a string for some reason
        const message = `${this.message || ''}`;
        cmdStr += escapeData(message);
        return cmdStr;
    }
}
function escapeData(s) {
    return s.replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}
function escape(s) {
    return s
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A')
        .replace(/]/g, '%5D')
        .replace(/;/g, '%3B');
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
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = __webpack_require__(431);
const os = __webpack_require__(87);
const path = __webpack_require__(622);
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
 * @param val the value of the variable
 */
function exportVariable(name, val) {
    process.env[name] = val;
    command_1.issueCommand('set-env', { name }, val);
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
 * @param     value    value to store
 */
function setOutput(name, value) {
    command_1.issueCommand('set-output', { name }, value);
}
exports.setOutput = setOutput;
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
 * Writes debug message to user log
 * @param message debug message
 */
function debug(message) {
    command_1.issueCommand('debug', {}, message);
}
exports.debug = debug;
/**
 * Adds an error issue
 * @param message error issue message
 */
function error(message) {
    command_1.issue('error', message);
}
exports.error = error;
/**
 * Adds an warning issue
 * @param message warning issue message
 */
function warning(message) {
    command_1.issue('warning', message);
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
 * @param     value    value to store
 */
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
const utils = __importStar(__webpack_require__(163));
const extensions = __importStar(__webpack_require__(911));
const config = __importStar(__webpack_require__(641));
/**
 * Function to setup Xdebug
 *
 * @param version
 * @param os_version
 */
function addCoverageXdebug(version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        return ((yield extensions.addExtension('xdebug', version, os_version, true)) +
            (yield utils.suppressOutput(os_version)) +
            '\n' +
            (yield utils.addLog('$tick', 'xdebug', 'Xdebug enabled as coverage driver', os_version)));
    });
}
exports.addCoverageXdebug = addCoverageXdebug;
/**
 * Function to setup PCOV
 *
 * @param version
 * @param os_version
 */
function addCoveragePCOV(version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        let script = '\n';
        switch (version) {
            default:
                script +=
                    (yield extensions.addExtension('pcov', version, os_version, true)) +
                        (yield utils.suppressOutput(os_version)) +
                        '\n';
                script +=
                    (yield config.addINIValues('pcov.enabled=1', os_version, true)) + '\n';
                // add command to disable xdebug and enable pcov
                switch (os_version) {
                    case 'linux':
                        script +=
                            'if [ -e /etc/php/' +
                                version +
                                '/mods-available/xdebug.ini ]; then sudo phpdismod -v ' +
                                version +
                                ' xdebug; fi\n';
                        script += 'sudo sed -i "/xdebug/d" $ini_file\n';
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
                script += yield utils.addLog('$tick', 'coverage: pcov', 'PCOV enabled as coverage driver', os_version);
                // version is not supported
                break;
            case '5.6':
            case '7.0':
                script += yield utils.addLog('$cross', 'pcov', 'PHP 7.1 or newer is required', os_version);
                break;
        }
        return script;
    });
}
exports.addCoveragePCOV = addCoveragePCOV;
/**
 * Function to disable Xdebug and PCOV
 *
 * @param version
 * @param os_version
 */
function disableCoverage(version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        let script = '\n';
        switch (os_version) {
            case 'linux':
                script +=
                    'if [ -e /etc/php/' +
                        version +
                        '/mods-available/xdebug.ini ]; then sudo phpdismod -v ' +
                        version +
                        ' xdebug; fi\n';
                script +=
                    'if [ -e /etc/php/' +
                        version +
                        '/mods-available/pcov.ini ]; then sudo phpdismod -v ' +
                        version +
                        ' pcov; fi\n';
                script += 'sudo sed -i "/xdebug/d" $ini_file\n';
                script += 'sudo sed -i "/pcov/d" $ini_file\n';
                break;
            case 'darwin':
                script += 'sudo sed -i \'\' "/xdebug/d" $ini_file\n';
                script += 'sudo sed -i \'\' "/pcov/d" $ini_file\n';
                break;
            case 'win32':
                script +=
                    'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug C:\\tools\\php }\n';
                script +=
                    'if(php -m | findstr -i pcov) { Disable-PhpExtension pcov C:\\tools\\php }\n';
                break;
        }
        script += yield utils.addLog('$tick', 'none', 'Disabled Xdebug and PCOV', os_version);
        return script;
    });
}
exports.disableCoverage = disableCoverage;
/**
 * Function to set coverage driver
 *
 * @param coverage_driver
 * @param version
 * @param os_version
 */
function addCoverage(coverage_driver, version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        coverage_driver.toLowerCase();
        const script = '\n' + (yield utils.stepLog('Setup Coverage', os_version));
        switch (coverage_driver) {
            case 'pcov':
                return script + (yield addCoveragePCOV(version, os_version));
            case 'xdebug':
                return script + (yield addCoverageXdebug(version, os_version));
            case 'none':
                return script + (yield disableCoverage(version, os_version));
            default:
                return '';
        }
    });
}
exports.addCoverage = addCoverage;


/***/ }),

/***/ 641:
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
const utils = __importStar(__webpack_require__(163));
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


/***/ }),

/***/ 655:
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
const exec_1 = __webpack_require__(986);
const core = __importStar(__webpack_require__(470));
const config = __importStar(__webpack_require__(641));
const coverage = __importStar(__webpack_require__(635));
const extensions = __importStar(__webpack_require__(911));
const utils = __importStar(__webpack_require__(163));
/**
 * Build the script
 *
 * @param filename
 * @param version
 * @param os_version
 */
function build(filename, version, os_version) {
    return __awaiter(this, void 0, void 0, function* () {
        // taking inputs
        const extension_csv = yield utils.getInput('extension-csv', false);
        const ini_values_csv = yield utils.getInput('ini-values-csv', false);
        const coverage_driver = yield utils.getInput('coverage', false);
        let script = yield utils.readScript(filename, version, os_version);
        if (extension_csv) {
            script += yield extensions.addExtension(extension_csv, version, os_version);
        }
        if (ini_values_csv) {
            script += yield config.addINIValues(ini_values_csv, os_version);
        }
        if (coverage_driver) {
            script += yield coverage.addCoverage(coverage_driver, version, os_version);
        }
        return yield utils.writeScript(filename, script);
    });
}
exports.build = build;
/**
 * Run the script
 */
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const os_version = process.platform;
            const version = yield utils.getVersion();
            // check the os version and run the respective script
            let script_path = '';
            switch (os_version) {
                case 'darwin':
                    script_path = yield build(os_version + '.sh', version, os_version);
                    yield exec_1.exec('sh ' + script_path + ' ' + version + ' ' + __dirname);
                    break;
                case 'linux': {
                    const pecl = yield utils.getInput('pecl', false);
                    script_path = yield build(os_version + '.sh', version, os_version);
                    yield exec_1.exec('sh ' + script_path + ' ' + version + ' ' + pecl);
                    break;
                }
                case 'win32':
                    script_path = yield build('win32.ps1', version, os_version);
                    yield exec_1.exec('pwsh ' + script_path + ' -version ' + version + ' -dir ' + __dirname);
                    break;
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
exports.run = run;
// call the run function
run();


/***/ }),

/***/ 747:
/***/ (function(module) {

module.exports = require("fs");

/***/ }),

/***/ 911:
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
const path = __importStar(__webpack_require__(622));
const utils = __importStar(__webpack_require__(163));
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
Object.defineProperty(exports, "__esModule", { value: true });
const tr = __webpack_require__(9);
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