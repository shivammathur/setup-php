import path from 'path';
import fs from 'fs';
import * as cv from 'compare-versions';
import * as fetch from './fetch';
import * as packagist from './packagist';
import * as utils from './utils';

/**
 * Valid function names for custom tool handlers
 */
type ToolFunction =
  | 'castor'
  | 'composer'
  | 'deployer'
  | 'dev_tools'
  | 'phive'
  | 'blackfire_player'
  | 'pecl'
  | 'phing'
  | 'phpunit'
  | 'phpcpd'
  | 'wp_cli';

/**
 * Tool data interface containing all properties for tool installation
 */
export interface ToolData {
  tool: string;
  version: string;
  os: string;
  php_version: string;
  github: string;
  domain: string;
  extension: string;
  repository: string;
  prefix: string;
  verb: string;
  fetch_latest: 'true' | 'false';
  scope: string;
  version_parameter: string;
  version_prefix: string;
  release: string;
  packagist: string;
  type?: string;
  function?: ToolFunction;
  alias?: string;
  url: string;
  uri?: string;
  error?: string;
}

/**
 * Input type for functions that may receive partial/unresolved tool data
 * Used by getUrl, getLatestVersion etc. before version is fully resolved
 */
export type ToolInput = Omit<ToolData, 'version' | 'url'> & {version?: string};

/**
 * Partial tool data from tools.json configuration
 */
interface ToolConfig {
  tool?: string;
  repository?: string;
  type?: string;
  function?: ToolFunction;
  alias?: string;
  domain?: string;
  extension?: string;
  fetch_latest?: 'true' | 'false';
  scope?: string;
  version_parameter?: string;
  version_prefix?: string;
  packagist?: string;
}

/**
 * GitHub reference object from API response
 */
interface GitHubRef {
  ref: string;
  node_id: string;
  url: string;
  object: {
    sha: string;
    type: string;
    url: string;
  };
}

/**
 * Deployer manifest entry
 */
interface DeployerManifestEntry {
  version: string;
  url: string;
}

/**
 * Function to get version in semver format.
 *
 * @param data
 */
export async function getSemverVersion(data: ToolData): Promise<string> {
  const fixSemver = (t: string): string => {
    if (/^\d+\.\d+\.\d+(-|$)/.test(t)) return t;
    const m = t.match(/^(\d+\.\d+\.\d+)([A-Za-z]+[0-9A-Za-z.]+)$/);
    return m ? `${m[1]}-${m[2]}` : t;
  };
  const search: string = data['version_prefix'] + data['version'];
  const url = `https://api.github.com/repos/${data['repository']}/git/matching-refs/tags%2F${search}.`;
  const github_token: string =
    (await utils.readEnv('GITHUB_TOKEN')) ||
    (await utils.readEnv('COMPOSER_TOKEN'));
  const response = await fetch.fetch(url, github_token);
  if (response.error || response.data === '[]') {
    data.error = response.error ?? `No version found with prefix ${search}.`;
    return data.version;
  } else {
    const refs: GitHubRef[] = JSON.parse(response.data);
    const tags = refs
      .map((i: GitHubRef) =>
        (i.ref?.split('/').pop() ?? '').replace(/^v(?=\d)/, '')
      )
      .filter((t: string) => t.length > 0);
    const fixedToOriginal = new Map<string, string>();
    const fixed = tags.map(t => {
      const f = fixSemver(t);
      fixedToOriginal.set(f, t);
      return f;
    });
    const sorted = fixed.toSorted((a, b) => {
      try {
        return cv.compareVersions(b, a);
      } catch {
        return b.localeCompare(a, 'en', {numeric: true, sensitivity: 'base'});
      }
    });
    return fixedToOriginal.get(sorted[0]) ?? sorted[0];
  }
}

/**
 * Function to get latest version from releases.atom
 *
 * @param data
 */
export async function getLatestVersion(data: ToolInput): Promise<string> {
  if (!data.version && data.fetch_latest === 'false') {
    return 'latest';
  }
  if (data.fetch_latest === 'true' && !data.repository) {
    return 'latest';
  }
  const resp = await fetch.fetch(
    `${data.github}/${data.repository}/releases.atom`
  );
  if (resp.data) {
    const releases: string[] = [
      ...resp.data.matchAll(/releases\/tag\/([a-zA-Z]*)?(\d+\.\d+\.\d+)"/g)
    ].map(match => match[2]);

    const sorted = releases.toSorted((a: string, b: string) =>
      a.localeCompare(b, undefined, {numeric: true})
    );
    return sorted.at(-1) || 'latest';
  }
  return 'latest';
}

/**
 * Function to get tool version
 *
 * @param version
 * @param data
 */
export async function getVersion(
  version: string,
  data: ToolData
): Promise<string> {
  // semver_regex - https://semver.org/
  const semver_regex =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  const composer_regex = /^composer:(stable|preview|snapshot|[12])$/;
  const constraint_regex = /[><=^~]+.*/;
  const major_minor_regex = /^\d+(\.\d+)?$/;
  data.version = version.replace(/v?(\d)/, '$1').replace(/\.x/, '');
  switch (true) {
    case composer_regex.test(data.release):
    case semver_regex.test(data.version):
    case constraint_regex.test(data.version) && data.type === 'composer':
      return data.version;
    case major_minor_regex.test(data.version) && data.type === 'composer':
      data.release = `${data.tool}:${data.version}.*`;
      return `${data.version}.*`;
    case !!data.repository && major_minor_regex.test(data.version):
      return await getSemverVersion(data);
    default:
      return data.version.replace(/[><=^~]*/, '');
  }
}

/**
 * Function to parse the release tool:version
 *
 * @param release
 * @param data
 */
export async function getRelease(
  release: string,
  data: ToolData
): Promise<string> {
  release = release.includes('/') ? release.split('/')[1] : release;
  return release.includes(':')
    ? [data.tool, release.split(':')[1]].join(':')
    : data.tool;
}

/**
 * Function to add/move composer in the tools list
 *
 * @param tools_list
 */
export async function filterList(tools_list: string[]): Promise<string[]> {
  const regex_any = /^composer($|:.*)/;
  const regex_valid =
    /^composer:?($|preview$|snapshot$|v?\d+(\.\d+)?$|v?\d+\.\d+\.\d+[\w-]*$)/;
  const matches: string[] = tools_list.filter(tool => regex_valid.test(tool));
  let composer = 'composer';
  tools_list = tools_list.filter(tool => !regex_any.test(tool));
  switch (true) {
    case matches[0] == undefined:
      break;
    default:
      composer = matches.at(-1)!.replace(/v(\d\S*)/, '$1');
      break;
  }
  tools_list.unshift(composer);
  return tools_list;
}

/**
 * Function to get the url of tool with the given version
 *
 * @param data
 */
export async function getUrl(data: ToolInput): Promise<string> {
  const version = data.version ?? 'latest';
  if (version === 'latest' || version === '') {
    return [
      data.domain,
      data.repository,
      data.prefix,
      'latest',
      data.verb,
      data.tool + data.extension
    ]
      .filter(Boolean)
      .join('/');
  } else {
    return [
      data.domain,
      data.repository,
      data.prefix,
      data.verb,
      data.version_prefix + data.version,
      data.tool + data.extension
    ]
      .filter(Boolean)
      .join('/');
  }
}

/**
 * Function to get the phar url in domain/tool-version.phar format
 *
 * @param data
 */
export async function getPharUrl(data: ToolData): Promise<string> {
  if (data.version === 'latest') {
    return data.domain + '/' + data.tool + '.phar';
  } else {
    return (
      data.domain +
      '/' +
      data.tool +
      '-' +
      data.version_prefix +
      data.version +
      '.phar'
    );
  }
}

/**
 * Helper function to get script to setup a tool using a phar url
 *
 * @param data
 */
export async function addArchive(data: ToolData): Promise<string> {
  return (
    (await utils.getCommand(data.os, 'tool')) +
    (await utils.joins(data.url, data.tool, data.version_parameter))
  );
}

/**
 * Helper function to get script to setup a tool using composer
 *
 * @param data
 */
export async function addPackage(data: ToolData): Promise<string> {
  const command = await utils.getCommand(data.os, 'composer_tool');
  const parts: string[] = data.repository.split('/');
  const args: string = await utils.joins(
    parts[1],
    data.release,
    parts[0] + '/',
    data.scope
  );
  return command + args;
}

/**
 * Function to add blackfire-player
 *
 * @param data
 */
export async function addBlackfirePlayer(data: ToolData): Promise<string> {
  switch (data.os) {
    case 'win32':
      return await utils.addLog(
        '$cross',
        data.tool,
        data.tool + ' is not a windows tool',
        'win32'
      );
    default:
      if (data.version == 'latest') {
        if (/5\.[5-6]|7\.0/.test(data.php_version)) {
          data.version = '1.9.3';
        } else if (/7\.[1-4]|8\.0/.test(data.php_version)) {
          data.version = '1.22.0';
        }
      }
      data.url = await getPharUrl(data);
      return addArchive(data);
  }
}

/**
 * Function to add Castor
 *
 * @param data
 */
export async function addCastor(data: ToolData): Promise<string> {
  data.tool = 'castor.' + data.os.replace('win32', 'windows') + '-amd64';
  data.url = await getUrl(data);
  data.tool = 'castor';
  data.version_parameter = fs.existsSync('castor.php')
    ? data.version_parameter
    : '';
  return await addArchive(data);
}

/**
 * Function to add composer
 *
 * @param data
 */
export async function addComposer(data: ToolData): Promise<string> {
  const channel = data.version.replace('latest', 'stable');
  const github = data.github;
  const getcomposer = data.domain;
  const cds = 'https://dl.cloudsmith.io';
  const spc = 'https://artifacts.setup-php.com';
  const filename = `composer-${data.php_version}-${channel}.phar`;
  const releases_url = `${github}/shivammathur/composer-cache/releases/latest/download/${filename}`;
  const cds_url = `${cds}/public/shivammathur/composer-cache/raw/files/${filename}`;
  const spc_url = `${spc}/composer/${filename}`;
  const lts_url = `${getcomposer}/download/latest-2.2.x/composer.phar`;
  const is_lts = /^5\.[3-6]$|^7\.[0-1]$/.test(data.php_version);
  const channel_source_url = `${getcomposer}/composer-${channel}.phar`;
  const version_source_url = `${getcomposer}/download/${channel}/composer.phar`;
  let cache_url = `${releases_url},${spc_url},${cds_url}`;
  let source_url = `${getcomposer}/composer.phar`;
  switch (true) {
    case /^snapshot$/.test(channel):
      source_url = is_lts ? lts_url : source_url;
      break;
    case /^preview$|^2$/.test(channel):
      source_url = is_lts ? lts_url : channel_source_url;
      break;
    case /^1$/.test(channel):
      source_url = channel_source_url;
      break;
    case /^\d+\.\d+\.\d+[\w-]*$/.test(data.version):
      cache_url = `${github}/${data.repository}/releases/download/${data.version}/composer.phar`;
      source_url = version_source_url;
      break;
    default:
      source_url = is_lts ? lts_url : channel_source_url;
  }
  const use_cache: boolean = (await utils.readEnv('NO_TOOLS_CACHE')) !== 'true';
  data.url = use_cache ? `${cache_url},${source_url}` : source_url;
  data.version_parameter = data.version;
  return await addArchive(data);
}

/**
 * Function to add Deployer
 *
 * @param data
 */
export async function addDeployer(data: ToolData): Promise<string> {
  if (data.version === 'latest') {
    data.url = data.domain + '/deployer.phar';
  } else {
    const manifest = await fetch.fetch('https://deployer.org/manifest.json');
    const version_data: Record<string, DeployerManifestEntry> = JSON.parse(
      manifest.data
    );
    const version_key: string | undefined = Object.keys(version_data).find(
      (key: string) => {
        return version_data[key].version === data.version;
      }
    );
    if (version_key) {
      data.url = version_data[version_key].url;
    } else {
      return await utils.addLog(
        '$cross',
        'deployer',
        'Version missing in deployer manifest',
        data.os
      );
    }
  }
  return await addArchive(data);
}

/**
 * Function to add php-config and phpize
 *
 * @param data
 */
export async function addDevTools(data: ToolData): Promise<string> {
  switch (data.os) {
    case 'linux':
    case 'darwin':
      return 'add_devtools ' + data.tool;
    case 'win32':
      return await utils.addLog(
        '$tick',
        data.tool,
        data.tool + ' is not a windows tool',
        'win32'
      );
    default:
      return await utils.log(
        'Platform ' + data.os + ' is not supported',
        data.os,
        'error'
      );
  }
}

/**
 * Function to add PECL
 *
 * @param data
 */
export async function addPECL(data: ToolData): Promise<string> {
  return await utils.getCommand(data.os, 'pecl');
}

/**
 * Function to add Phing
 *
 * @param data
 */
export async function addPhing(data: ToolData): Promise<string> {
  data.url = data.domain + '/get/phing-' + data.version + data.extension;
  if (data.version != 'latest') {
    [data.prefix, data.verb] = ['releases', 'download'];
    data.domain = data.github;
    data.extension = '-' + data.version + data.extension;
    data.url += ',' + (await getUrl(data));
  }
  return await addArchive(data);
}

/**
 * Helper function to add Phive
 *
 * @param data
 */
export async function addPhive(data: ToolData): Promise<string> {
  switch (true) {
    case /5\.[3-5]/.test(data.php_version):
      return await utils.addLog(
        '$cross',
        'phive',
        'Phive is not supported on PHP ' + data.php_version,
        data.os
      );
    case /5\.6|7\.0/.test(data.php_version):
      data.version = '0.12.1';
      break;
    case /7\.1/.test(data.php_version):
      data.version = '0.13.5';
      break;
    case /7\.2/.test(data.php_version):
      data.version = '0.14.5';
      break;
    case /7\.3|7\.4/.test(data.php_version):
      data.version = '0.15.3';
      break;
    case /^latest$/.test(data.version):
      data.version = await getLatestVersion(data);
      break;
  }
  data.extension = '-' + data.version + data.extension;
  data.url = await getUrl(data);
  return await addArchive(data);
}

/**
 * Function to add PHPUnit and related tools
 *
 * @param data
 */
export async function addPHPUnitTools(data: ToolData): Promise<string> {
  /* istanbul ignore next */
  if (data.version === 'latest') {
    data.version =
      (await packagist.search(data.packagist, data.php_version)) ?? 'latest';
  }
  data.url = await getPharUrl(data);
  if (data.url.match(/-\d+/)) {
    data.url += ',' + data.url.replace(/-(\d+)\.\d+\.\d+/, '-$1');
  }
  return await addArchive(data);
}

/**
 * Function to add WP-CLI
 *
 * @param data
 */
export async function addWPCLI(data: ToolData): Promise<string> {
  if (data.version === 'latest') {
    data.uri = 'wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true';
    data.url = [data.domain, data.uri].join('/');
  } else {
    data.extension = '-' + data.version + data.extension;
    data.url = await getUrl(data);
  }
  return await addArchive(data);
}

/**
 * Function to get information about a tool
 *
 * @param release
 * @param php_version
 * @param os
 */
export async function getData(
  release: string,
  php_version: string,
  os: string
): Promise<ToolData> {
  const json_file_path = path.join(__dirname, '../src/configs/tools.json');
  const json_file: string = fs.readFileSync(json_file_path, 'utf8');
  const json_objects: Record<string, ToolConfig> = JSON.parse(json_file);
  release = release.replace(/\s+/g, '');
  const parts: string[] = release.split(':');
  const tool = parts[0];
  const version = parts[1];
  let config: ToolConfig & {tool: string};
  if (Object.hasOwn(json_objects, tool)) {
    config = {...json_objects[tool], tool};
  } else {
    const key: string | undefined = Object.keys(json_objects).find(
      (key: string) => {
        return json_objects[key].alias == tool;
      }
    );
    if (key) {
      config = {...json_objects[key], tool: key};
    } else if (tool.includes('/')) {
      config = {
        tool: tool.split('/')[1],
        repository: tool,
        type: 'composer'
      };
    } else {
      config = {tool};
    }
  }
  const github = 'https://github.com';
  const domain = config.domain ?? github;
  const data: ToolData = {
    tool: config.tool,
    version: '',
    url: '',
    os,
    php_version,
    github,
    domain,
    extension: config.extension ?? '.phar',
    repository: config.repository ?? '',
    prefix: domain === github ? 'releases' : '',
    verb: domain === github ? 'download' : '',
    fetch_latest: config.fetch_latest ?? 'false',
    scope: config.scope ?? 'global',
    version_parameter:
      config.version_parameter != null
        ? JSON.stringify(config.version_parameter)
        : '',
    version_prefix: config.version_prefix ?? '',
    release: '',
    packagist: config.packagist ?? config.repository ?? '',
    type: config.type,
    function: config.function,
    alias: config.alias
  };
  data.release = await getRelease(release, data);
  data.version = version
    ? await getVersion(version, data)
    : await getLatestVersion(data);
  data.url = await getUrl(data);
  return data;
}

export const functionRecord: Record<
  ToolFunction,
  (data: ToolData) => Promise<string>
> = {
  castor: addCastor,
  composer: addComposer,
  deployer: addDeployer,
  dev_tools: addDevTools,
  phive: addPhive,
  blackfire_player: addBlackfirePlayer,
  pecl: addPECL,
  phing: addPhing,
  phpunit: addPHPUnitTools,
  phpcpd: addPHPUnitTools,
  wp_cli: addWPCLI
};

/**
 * Setup tools
 *
 * @param tools_csv
 * @param php_version
 * @param os
 */
export async function addTools(
  tools_csv: string,
  php_version: string,
  os: string
): Promise<string> {
  let script = '\n';
  if (tools_csv === 'none') {
    return '';
  } else {
    script += await utils.stepLog('Setup Tools', os);
  }
  const tools_list = await filterList(await utils.CSVArray(tools_csv));
  await utils.asyncForEach(tools_list, async function (release: string) {
    const data: ToolData = await getData(release, php_version, os);
    script += '\n';
    switch (true) {
      case data.error !== undefined:
        script += await utils.addLog('$cross', data.tool, data.error, data.os);
        break;
      case 'phar' === data.type:
        script += await addArchive(data);
        break;
      case 'composer' === data.type:
        script += await addPackage(data);
        break;
      case 'custom-package' === data.type:
        script += await utils.customPackage(
          data.tool.split('-')[0],
          'tools',
          data.version,
          data.os
        );
        break;
      case 'custom-function' === data.type:
        if (!data.function) {
          script += await utils.addLog(
            '$cross',
            data.tool,
            data.tool + ' has no function defined. Please report this issue.',
            data.os
          );
        } else {
          script += await functionRecord[data.function](data);
        }
        break;
      case /^none$/.test(data.tool):
        break;
      default:
        script += await utils.addLog(
          '$cross',
          data.tool,
          'Tool ' + data.tool + ' is not supported',
          data.os
        );
        break;
    }
  });

  return script;
}
