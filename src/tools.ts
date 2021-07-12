import * as utils from './utils';

type RS = Record<string, string>;
type RSRS = Record<string, RS>;

interface IRef {
  ref: string;
  node_id: string;
  url: string;
  object: RS;
}

/**
 * Function to get version in semver format.
 *
 * @param data
 */
export async function getSemverVersion(data: RS): Promise<string> {
  const search: string = data['version_prefix'] + data['version'];
  const url = `https://api.github.com/repos/${data['repository']}/git/matching-refs/tags%2F${search}.`;
  const token: string = await utils.readEnv('COMPOSER_TOKEN');
  const response: RS = await utils.fetch(url, token);
  if (response.error || response.data === '[]') {
    data['error'] = response.error ?? `No version found with prefix ${search}.`;
    return data['version'];
  } else {
    const refs = JSON.parse(response['data']).reverse();
    const ref = refs.find((i: IRef) => /.*\d+.\d+.\d+$/.test(i['ref']));
    const tag: string = (ref || refs[0])['ref'].split('/').pop();
    return tag.replace(/^v(\d)/, '$1');
  }
}

/**
 * Function to get tool version
 *
 * @param version
 * @param data
 */
export async function getVersion(version: string, data: RS): Promise<string> {
  // semver_regex - https://semver.org/
  const semver_regex =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  const composer_regex = /^composer:(stable|preview|snapshot|[1|2])$/;
  const constraint_regex = /[><=^~]+.*/;
  const major_minor_regex = /^\d+(\.\d+)?$/;
  data['version'] = version.replace(/v?(\d)/, '$1').replace(/\.x/, '');
  switch (true) {
    case composer_regex.test(data['release']):
    case semver_regex.test(data['version']):
    case constraint_regex.test(data['version']) && data['type'] === 'composer':
      return data['version'];
    case major_minor_regex.test(data['version']) && data['type'] === 'composer':
      data['release'] = `${data['tool']}:${data['version']}.*`;
      return `${data['version']}.*`;
    case data['repository'] && major_minor_regex.test(data['version']):
      return await getSemverVersion(data);
    default:
      return data['version'].replace(/[><=^~]*/, '');
  }
}

/**
 * Function to parse the release tool:version
 *
 * @param release
 * @param data
 */
export async function getRelease(release: string, data: RS): Promise<string> {
  release = release.includes('/') ? release.split('/')[1] : release;
  return release.includes(':')
    ? [data['tool'], release.split(':')[1]].join(':')
    : data['tool'];
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
      composer = matches[matches.length - 1].replace(/v(\d\S*)/, '$1');
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
export async function getUrl(data: RS): Promise<string> {
  if (data['version'] === 'latest') {
    return [
      data['domain'],
      data['repository'],
      data['prefix'],
      data['version'],
      data['verb'],
      data['tool'] + data['extension']
    ]
      .filter(Boolean)
      .join('/');
  } else {
    return [
      data['domain'],
      data['repository'],
      data['prefix'],
      data['verb'],
      data['version_prefix'] + data['version'],
      data['tool'] + data['extension']
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
export async function getPharUrl(data: RS): Promise<string> {
  if (data['version'] === 'latest') {
    return data['domain'] + '/' + data['tool'] + '.phar';
  } else {
    return (
      data['domain'] +
      '/' +
      data['tool'] +
      '-' +
      data['version_prefix'] +
      data['version'] +
      '.phar'
    );
  }
}

/**
 * Helper function to get script to setup a tool using a phar url
 *
 * @param data
 */
export async function addArchive(data: RS): Promise<string> {
  return (
    (await utils.getCommand(data['os_version'], 'tool')) +
    (await utils.joins(data['url'], data['tool'], data['version_parameter']))
  );
}

/**
 * Helper function to get script to setup a tool using composer
 *
 * @param data
 */
export async function addPackage(data: RS): Promise<string> {
  const command = await utils.getCommand(data['os_version'], 'composertool');
  const parts: string[] = data['repository'].split('/');
  return command + parts[1] + ' ' + data['release'] + ' ' + parts[0] + '/';
}

/**
 * Function to add blackfire-player
 *
 * @param data
 */
export async function addBlackfirePlayer(data: RS): Promise<string> {
  if (
    /5\.[5-6]|7\.0/.test(data['php_version']) &&
    data['version'] == 'latest'
  ) {
    data['version'] = '1.9.3';
  }
  data['url'] = await getPharUrl(data);
  return addArchive(data);
}

/**
 * Function to add composer
 *
 * @param data
 */
export async function addComposer(data: RS): Promise<string> {
  const github = data['github'];
  const getcomposer = data['domain'];
  let cache_url = `${github}/shivammathur/composer-cache/releases/latest/download/composer-${data[
    'version'
  ].replace('latest', 'stable')}.phar`;
  let source_url = `${getcomposer}/composer.phar`;
  switch (true) {
    case /^snapshot$/.test(data['version']):
      break;
    case /^preview$|^[1-2]$/.test(data['version']):
      source_url = `${getcomposer}/composer-${data['version']}.phar`;
      break;
    case /^\d+\.\d+\.\d+[\w-]*$/.test(data['version']):
      cache_url = `${github}/${data['repository']}/releases/download/${data['version']}/composer.phar`;
      source_url = `${getcomposer}/composer-${data['version']}.phar`;
      break;
    default:
      source_url = `${getcomposer}/composer-stable.phar`;
  }
  data['url'] = `${cache_url},${source_url}`;
  data['version_parameter'] = data['version'];
  return await addArchive(data);
}

/**
 * Function to add Deployer
 *
 * @param data
 */
export async function addDeployer(data: RS): Promise<string> {
  if (data['version'] === 'latest') {
    data['url'] = data['domain'] + '/deployer.phar';
  } else {
    data['url'] =
      data['domain'] + '/releases/v' + data['version'] + '/deployer.phar';
  }
  return await addArchive(data);
}

/**
 * Function to add php-config and phpize
 *
 * @param data
 */
export async function addDevTools(data: RS): Promise<string> {
  switch (data['os_version']) {
    case 'linux':
    case 'darwin':
      return 'add_devtools ' + data['tool'];
    case 'win32':
      return await utils.addLog(
        '$tick',
        data['tool'],
        data['tool'] + ' is not a windows tool',
        'win32'
      );
    default:
      return await utils.log(
        'Platform ' + data['os_version'] + ' is not supported',
        data['os_version'],
        'error'
      );
  }
}

/**
 * Function to add PECL
 *
 * @param data
 */
export async function addPECL(data: RS): Promise<string> {
  return await utils.getCommand(data['os_version'], 'pecl');
}

/**
 * Function to add Phing
 *
 * @param data
 */
export async function addPhing(data: RS): Promise<string> {
  data['url'] =
    data['domain'] + '/get/phing-' + data['version'] + data['extension'];
  return await addArchive(data);
}

/**
 * Helper function to add Phive
 *
 * @param data
 */
export async function addPhive(data: RS): Promise<string> {
  switch (true) {
    case /5\.[3-5]/.test(data['php_version']):
      return await utils.addLog(
        '$cross',
        'phive',
        'Phive is not supported on PHP ' + data['php_version'],
        data['os_version']
      );
    case /5\.6|7\.0/.test(data['php_version']):
      data['version'] = data['version'].replace('latest', '0.12.1');
      break;
    case /7\.1/.test(data['php_version']):
      data['version'] = data['version'].replace('latest', '0.13.5');
      break;
  }
  if (data['version'] === 'latest') {
    data['domain'] = data['domain'] + '/releases';
  } else {
    data['domain'] = [
      data['github'],
      data['repository'],
      'releases/download',
      data['version']
    ].join('/');
  }
  data['url'] = await getPharUrl(data);
  return await addArchive(data);
}

/**
 * Function to add PHPUnit and related tools
 *
 * @param data
 */
export async function addPHPUnitTools(data: RS): Promise<string> {
  data['url'] = await getPharUrl(data);
  return await addArchive(data);
}

/**
 * Function to add Symfony
 *
 * @param data
 */
export async function addSymfony(data: RS): Promise<string> {
  let filename: string;
  switch (data['os_version']) {
    case 'linux':
    case 'darwin':
      filename = 'symfony_' + data['os_version'] + '_amd64';
      break;
    case 'win32':
      filename = 'symfony_windows_amd64.exe';
      break;
    default:
      return await utils.log(
        'Platform ' + data['os_version'] + ' is not supported',
        data['os_version'],
        'error'
      );
  }
  if (data['version'] === 'latest') {
    data['uri'] = ['releases/latest/download', filename].join('/');
  } else {
    data['uri'] = ['releases/download', 'v' + data['version'], filename].join(
      '/'
    );
  }
  data['url'] = [data['domain'], data['repository'], data['uri']].join('/');
  return await addArchive(data);
}

/**
 * Function to add WP-CLI
 *
 * @param data
 */
export async function addWPCLI(data: RS): Promise<string> {
  if (data['version'] === 'latest') {
    data['uri'] = 'wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true';
    data['url'] = [data['domain'], data['uri']].join('/');
  } else {
    data['extension'] = '-' + data['version'] + data['extension'];
    data['url'] = await getUrl(data);
  }
  return await addArchive(data);
}

/**
 * Function to get information about a tool
 *
 * @param release
 * @param php_version
 * @param os_version
 */
export async function getData(
  release: string,
  php_version: string,
  os_version: string
): Promise<RS> {
  const json_file: string = await utils.readFile('tools.json', 'src/configs');
  const json_objects: RSRS = JSON.parse(json_file);
  release = release.replace(/\s+/g, '');
  const parts: string[] = release.split(':');
  const tool = parts[0];
  const version = parts[1];
  let data: RS;
  if (Object.keys(json_objects).includes(tool)) {
    data = json_objects[tool];
    data['tool'] = tool;
  } else {
    const key: string | undefined = Object.keys(json_objects).find(
      (key: string) => {
        return json_objects[key]['alias'] == tool;
      }
    );
    if (key) {
      data = json_objects[key];
      data['tool'] = key;
    } else {
      data = {
        tool: tool.split('/')[1],
        repository: tool,
        type: 'composer'
      };
      data = !tool.includes('/') ? {tool: tool} : data;
    }
  }
  data['github'] = 'https://github.com';
  data['domain'] ??= data['github'];
  data['extension'] ??= '.phar';
  data['os_version'] = os_version;
  data['php_version'] = php_version;
  data['prefix'] = data['github'] === data['domain'] ? 'releases' : '';
  data['verb'] = data['github'] === data['domain'] ? 'download' : '';
  data['version_parameter'] = JSON.stringify(data['version_parameter']) || '';
  data['version_prefix'] ??= '';
  data['release'] = await getRelease(release, data);
  data['version'] = version ? await getVersion(version, data) : 'latest';
  return data;
}

export const functionRecord: Record<string, (data: RS) => Promise<string>> = {
  composer: addComposer,
  deployer: addDeployer,
  dev_tools: addDevTools,
  phive: addPhive,
  blackfire_player: addBlackfirePlayer,
  pecl: addPECL,
  phing: addPhing,
  phpunit: addPHPUnitTools,
  phpcpd: addPHPUnitTools,
  symfony: addSymfony,
  wp_cli: addWPCLI
};

/**
 * Setup tools
 *
 * @param tools_csv
 * @param php_version
 * @param os_version
 */
export async function addTools(
  tools_csv: string,
  php_version: string,
  os_version: string
): Promise<string> {
  let script = '\n';
  if (tools_csv === 'none') {
    return '';
  } else {
    script += await utils.stepLog('Setup Tools', os_version);
  }
  const tools_list = await filterList(await utils.CSVArray(tools_csv));
  await utils.asyncForEach(tools_list, async function (release: string) {
    const data: RS = await getData(release, php_version, os_version);
    script += '\n';
    switch (true) {
      case data['error'] !== undefined:
        script += await utils.addLog(
          '$cross',
          data['tool'],
          data['error'],
          data['os_version']
        );
        break;
      case 'phar' === data['type']:
        data['url'] = await getUrl(data);
        script += await addArchive(data);
        break;
      case 'composer' === data['type']:
        script += await addPackage(data);
        break;
      case 'custom-package' === data['type']:
        script += await utils.customPackage(
          data['tool'].split('-')[0],
          'tools',
          data['version'],
          data['os_version']
        );
        break;
      case 'custom-function' === data['type']:
        script += await functionRecord[data['function']](data);
        break;
      case /^none$/.test(data['tool']):
        break;
      default:
        script += await utils.addLog(
          '$cross',
          data['tool'],
          'Tool ' + data['tool'] + ' is not supported',
          data['os_version']
        );
        break;
    }
  });

  return script;
}
