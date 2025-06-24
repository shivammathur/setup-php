import fs from 'fs';
import * as path from 'path';
import * as fetch from './fetch'; // Now uses the node-fetch based version

let yargs_argv: Record<string, any> | null = null;

/**
 * Initialize yargs arguments for utils to use.
 * Call this from local_installer.ts after parsing argv.
 */
export function initYargs(argv: Record<string, any>): void {
  yargs_argv = argv;
}

/**
 * Function to read environment variable and return a string value.
 */
export async function readEnv(property: string): Promise<string> {
  const property_lc: string = property.toLowerCase();
  const property_uc: string = property.toUpperCase();
  // Check specific env var first, then the yargs-provided one if it maps to an env-like name
  const envValue =
    process.env[property] ||
    process.env[property_lc] ||
    process.env[property_uc] ||
    process.env[property_lc.replace(/-/g, '_')] || // for vars like fail-fast
    process.env[property_uc.replace(/-/g, '_')];

  if (envValue !== undefined) {
    return envValue;
  }

  // Fallback to checking yargs if it's initialized (for env vars that might be passed as CLI flags)
  if (yargs_argv) {
    const yargsValue = yargs_argv[property.toLowerCase().replace(/_/g, '')]; // e.g. PHPTS -> phpts
    if (yargsValue !== undefined) {
      return String(yargsValue);
    }
  }
  return '';
}

/**
 * Mock for core.getInput or read from process.env / yargs
 * This is crucial for sub-modules that call utils.getInput()
 */
export async function getInput(name: string, mandatory: boolean = false): Promise<string> {
  // Try yargs first if available (for direct CLI parameters)
  if (yargs_argv) {
    const yargsValue = yargs_argv[name.replace(/-/g, '')]; // yargs uses camelCase for kebab-case
    if (yargsValue !== undefined) {
      return String(yargsValue);
    }
  }
  // Then try environment variables (local_installer.ts sets these)
  const env_input = await readEnv(name);
  if (env_input) {
    return env_input;
  }

  if (mandatory) {
    throw new Error(`Input required and not supplied: ${name}`);
  }
  return '';
}

/**
 * Function to get manifest URL
 */
export async function getManifestURLS(): Promise<string[]> {
  return [
    'https://setup-php.com/php-versions.json',
    'https://raw.githubusercontent.com/shivammathur/setup-php/develop/src/configs/php-versions.json'
  ];
}

/**
 * Function to parse PHP version.
 * @param versionInput The version string from CLI or default
 */
export async function parseVersion(versionInput: string): Promise<string> {
  const version = versionInput.trim();
  if (/^(latest|lowest|highest|nightly|\d+\.x)$/.test(version)) {
    for (const manifestURL of await getManifestURLS()) {
      try {
        const fetchResult = await fetch.fetch(manifestURL);
        if (fetchResult.data && fetchResult.statusCode === 200) {
          const manifest = JSON.parse(fetchResult.data);
          if (manifest[version]) {
            return manifest[version];
          }
        } else {
          console.warn(`Warning: Failed to fetch manifest from ${manifestURL}, status: ${fetchResult.statusCode}`);
        }
      } catch (error: any) {
        console.warn(`Warning: Could not fetch PHP version manifest from ${manifestURL}: ${error.message}`);
      }
    }
    console.warn(`Warning: Could not resolve version alias '${version}' from any manifest.`);
    // Provide some fallback for critical aliases if all manifests fail
    if (version === 'latest' || version === 'highest') return '8.2'; // Example fallback
    if (version === 'lowest') return '5.6'; // Example fallback
    throw new Error(`Could not resolve version alias '${version}' from PHP version manifest after trying all sources.`);
  } else {
    if (/^\d+$/.test(version)) return version + '.0';
    if (/^\d+\.\d+$/.test(version)) return version;
    if (/^\d+\.\d+\.\d+.*$/.test(version)) {
      const parts = version.split('.');
      return parts[0] + '.' + parts[1];
    }
    return version; // Return as is if not a known alias or simple pattern
  }
}

/**
 * Function to parse ini file.
 */
export async function parseIniFile(ini_file: string): Promise<string> {
  if (/^(production|development|none)$/.test(ini_file)) return ini_file;
  if (/php\.ini-(production|development)$/.test(ini_file)) return ini_file.split('-')[1];
  return 'production';
}

/**
 * Read php version from input or file
 */
export async function readPHPVersion(versionArg: string, versionFileArg: string): Promise<string> {
  if (versionArg && versionArg.toLowerCase() !== 'latest') {
    return versionArg;
  }

  const versionFileToUse = versionFileArg || '.php-version';
  if (fs.existsSync(versionFileToUse)) {
    const contents: string = fs.readFileSync(versionFileToUse, 'utf8');
    const match: RegExpMatchArray | null = contents.match(/(?:php\s*)?(\d+\.\d+(?:\.\d+)?(?:[\w.-]*))/m);
    if (match && match[1]) return match[1].trim();
    const trimmedContents = contents.trim();
    if (trimmedContents) return trimmedContents;
  } else if (versionFileArg && versionFileArg !== '.php-version') {
    console.warn(`Warning: Specified --php-version-file '${versionFileArg}' not found.`);
  }

  const composerProjectDir = await readEnv('COMPOSER_PROJECT_DIR') || process.cwd();
  const composerLock = path.join(composerProjectDir, 'composer.lock');
  if (fs.existsSync(composerLock)) {
    try {
      const lockFileContents = JSON.parse(fs.readFileSync(composerLock, 'utf8'));
      if (lockFileContents?.['platform-overrides']?.['php']) {
        return lockFileContents['platform-overrides']['php'];
      }
    } catch (e: any) { console.warn(`Warning: Could not parse ${composerLock}: ${e.message}`); }
  }

  const composerJson = path.join(composerProjectDir, 'composer.json');
  if (fs.existsSync(composerJson)) {
    try {
      const composerFileContents = JSON.parse(fs.readFileSync(composerJson, 'utf8'));
      if (composerFileContents?.['config']?.['platform']?.['php']) {
        return composerFileContents['config']['platform']['php'];
      }
    } catch (e: any) { console.warn(`Warning: Could not parse ${composerJson}: ${e.message}`); }
  }

  return versionArg || 'latest'; // Return original arg if it was 'latest', or 'latest' if it was empty
}

/**
 * Function to join strings with space
 */
export async function joins(...str: string[]): Promise<string> {
  return [...str].join(' ');
}

/**
 * Function to get script extensions
 */
export async function scriptExtension(os: string): Promise<string> {
  if (os === 'win32') return '.ps1';
  if (os === 'linux' || os === 'darwin') return '.sh';
  throw new Error('Platform ' + os + ' is not supported');
}

// Logging utilities - these generate script snippets that call shell functions
export async function stepLog(message: string, os: string): Promise<string> {
  // The shell scripts (unix.sh, win32.ps1) define step_log / Step-Log
  if (os === 'win32') return `Step-Log "${message}"`;
  return `step_log "${message}"`; // For linux/darwin
}

export async function addLog(mark: string, subject: string, message: string, os: string): Promise<string> {
  // The shell scripts (unix.sh, win32.ps1) define add_log / Add-Log
  // The $tick / $cross are shell variables defined in unix.sh
  if (os === 'win32') return `Add-Log "${mark}" "${subject}" "${message}"`;
  return `add_log "${mark}" "${subject}" "${message}"`; // For linux/darwin
}

// Other utilities used by modules like extensions.ts, tools.ts
export async function suppressOutput(os: string): Promise<string> {
  if (os === 'win32') return ' >$null 2>&1';
  return ' >/dev/null 2>&1';
}

export async function getCommand(os: string, suffix: string): Promise<string> {
  if (os === 'linux' || os === 'darwin') return 'add_' + suffix + ' ';
  if (os === 'win32') {
    return ('Add-' + suffix.split('_').map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join('') + ' ');
  }
  throw new Error('Platform ' + os + ' is not supported for getCommand');
}

export async function getExtensionPrefix(extension: string): Promise<string> {
  return /xdebug([2-3])?$|opcache|ioncube|eaccelerator/.test(extension) ? 'zend_extension' : 'extension';
}

export async function extensionArray(extension_csv: string): Promise<Array<string>> {
  if (!extension_csv?.trim()) return [];
  return [
    extension_csv.match(/(^|,\s?)none(\s?,|$)/) ? 'none' : '',
    ...extension_csv.split(',').map(ext => {
      if (/.+-.+\/.+@.+/.test(ext)) return ext; // For source extensions
      return ext.trim().toLowerCase().replace(/^(:)?(php[-_]|none|zend )|(-[^-]*)-/, '$1$3');
    })
  ].filter(Boolean);
}

export async function CSVArray(values_csv: string): Promise<Array<string>> {
  if (!values_csv?.trim()) return [];
  return values_csv
    .split(/,(?=(?:(?:[^"']*["']){2})*[^"']*$)/)
    .map(value => value.trim().replace(/^["']|["']$|(?<==)["']/g, '').replace(/=(((?!E_).)*[?{}|&~![()^]+((?!E_).)+)/, "='$1'").replace(/=(.*?)(=.*)/, "='$1$2'").replace(/:\s*["'](.*?)/g, ':$1'))
    .filter(Boolean);
}

export async function getUnsupportedLog(extension: string, version: string, os: string): Promise<string> {
  return ('\n' + (await addLog('$cross', extension, `${extension} is not supported on PHP ${version}`, os)) + '\n');
}

export async function customPackage(pkg: string, type: string, version: string, os: string): Promise<string> {
  const pkg_name: string = pkg.replace(/\d+|(pdo|pecl)[_-]/, '');
  const ext: string = await scriptExtension(os);
  // __dirname in local_utils.ts will be .../src/ or .../dist/
  // The scripts are in ../src/scripts relative to install.ts/local_installer.ts
  // or ../scripts relative to local_utils.ts if it's in the same dir as local_installer.ts
  const scriptPath = path.resolve(__dirname, '../src/scripts', type, `${pkg_name}${ext}`);
  if (!fs.existsSync(scriptPath)) {
    // Fallback if src/scripts is not found relative to utils (e.g. if utils is in dist)
    const altScriptPath = path.resolve(__dirname, '../../src/scripts', type, `${pkg_name}${ext}`);
    if (fs.existsSync(altScriptPath)) {
       return `\n. ${altScriptPath}\n${await getCommand(os, pkg_name)}${version}`;
    }
    console.warn(`Script not found for custom package: ${scriptPath} or ${altScriptPath}`);
    return `\necho "Error: Script for ${pkg_name} not found."\n`;
  }
  return `\n. ${scriptPath}\n${await getCommand(os, pkg_name)}${version}`;
}

export async function parseExtensionSource(extension: string, prefix: string): Promise<string> {
  const regex = /(\w+)-(\w+:\/\/.{1,253}(?:[.:][^:/\s]{2,63})+\/)?([\w.-]+)\/([\w.-]+)@(.+)/;
  const matches = regex.exec(extension) as RegExpExecArray;
  if (!matches) throw new Error(`Invalid extension source format: ${extension}`);
  matches[2] = matches[2] ? matches[2].slice(0, -1) : 'https://github.com';
  return await joins('\nadd_extension_from_source', ...matches.slice(1), prefix);
}

export async function setVariable(variable: string, command: string, os: string): Promise<string> {
  if (os === 'win32') return `\n$${variable} = ${command}\n`;
  return `\n${variable}="$(${command})"\n`; // For linux/darwin
}

// It's important that local_installer.ts calls initYargs(argv)
// so that getInput can access the parsed command line arguments.
console.log('local_utils.ts loaded. Ensure initYargs is called from local_installer.ts.');
