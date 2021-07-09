import * as utils from './utils';

export async function getToolSemver(
  data: Record<string, string>
): Promise<string> {
  const ref: string = data['version_prefix'] + data['version'];
  const url = `https://api.github.com/repos/${data['repository']}/git/matching-refs/tags%2F${ref}.`;
  const token: string = await utils.readEnv('COMPOSER_TOKEN');
  const response: Record<string, string> = await utils.fetch(url, token);
  if (response.error || response.data === '[]') {
    data['error'] = response.error ?? `No version found with prefix ${ref}.`;
    return data['version'];
  } else {
    return JSON.parse(response['data']).pop()['ref'].split('/').pop();
  }
}

/**
 * Function to get tool version
 *
 * @param data
 */
export async function getToolVersion(
  data: Record<string, string>
): Promise<string> {
  // semver_regex - https://semver.org/
  const semver_regex =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  const composer_regex = /^stable$|^preview$|^snapshot$|^v?[1|2]$/;
  const major_minor_regex = /^v?\d+(\.\d+)?$/;
  const version = data['version']
    .replace(/[><=^]*/, '')
    .replace(/^v(\d)/, '$1');
  switch (true) {
    case data['tool'] === 'composer' && composer_regex.test(version):
      return version;
    case data['repository'] && major_minor_regex.test(version):
      return await getToolSemver(data);
    case semver_regex.test(version):
      return version;
    default:
      return 'latest';
  }
}

/**
 * Function to parse the release tool:version
 *
 * @param release
 * @param data
 */
export async function parseRelease(
  release: string,
  data: Record<string, string>
): Promise<Record<string, string>> {
  const parts: string[] = release.split(':');
  const tool: string = parts[0];
  const version: string | undefined = parts[1];
  release = release.includes('/')
    ? release.split('/')[1].replace(/\s+/, '')
    : release;
  release = release.includes(':')
    ? [data['tool'], release.split(':')[1]].join(':')
    : data['tool'];
  switch (true) {
    case version === undefined:
      data['release'] = release;
      data['version'] = 'latest';
      break;
    case /^[\w.-]+\/[\w.-]+$/.test(tool):
      data['release'] = release;
      data['version'] = version;
      break;
    default:
      data['release'] = release;
      data['version'] = version;
      data['version'] = await getToolVersion(data);
      break;
  }
  return data;
}

/**
 * Function to add/move composer in the tools list
 *
 * @param tools_list
 */
export async function filterList(tools_list: string[]): Promise<string[]> {
  const regex_any = /^composer($|:.*)/;
  const regex_valid =
    /^composer:?($|preview$|snapshot$|v?[1-2]$|v?\d+\.\d+\.\d+[\w-]*$)/;
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
export async function getUrl(data: Record<string, string>): Promise<string> {
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
export async function getPharUrl(
  data: Record<string, string>
): Promise<string> {
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
export async function addArchive(
  data: Record<string, string>
): Promise<string> {
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
export async function addPackage(
  data: Record<string, string>
): Promise<string> {
  const command = await utils.getCommand(data['os_version'], 'composertool');
  const parts: string[] = data['repository'].split('/');
  return command + parts[1] + ' ' + data['release'] + ' ' + parts[0] + '/';
}

/**
 * Function to add blackfire-player
 *
 * @param data
 */
export async function addBlackfirePlayer(
  data: Record<string, string>
): Promise<string> {
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
export async function addComposer(
  data: Record<string, string>
): Promise<string> {
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
export async function addDeployer(
  data: Record<string, string>
): Promise<string> {
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
export async function addDevTools(
  data: Record<string, string>
): Promise<string> {
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
export async function addPECL(data: Record<string, string>): Promise<string> {
  return await utils.getCommand(data['os_version'], 'pecl');
}

/**
 * Function to add Phing
 *
 * @param data
 */
export async function addPhing(data: Record<string, string>): Promise<string> {
  data['url'] =
    data['domain'] + '/get/phing-' + data['version'] + data['extension'];
  return await addArchive(data);
}

/**
 * Helper function to add Phive
 *
 * @param data
 */
export async function addPhive(data: Record<string, string>): Promise<string> {
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
export async function addPHPUnitTools(
  data: Record<string, string>
): Promise<string> {
  data['url'] = await getPharUrl(data);
  return await addArchive(data);
}

/**
 * Function to add Symfony
 *
 * @param data
 */
export async function addSymfony(
  data: Record<string, string>
): Promise<string> {
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
export async function addWPCLI(data: Record<string, string>): Promise<string> {
  if (data['version'] === 'latest') {
    data['uri'] = 'wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true';
    data['url'] = [data['domain'], data['uri']].join('/');
  } else {
    data['extension'] = '-' + data['version'] + data['extension'];
    data['url'] = await getUrl(data);
  }
  return await addArchive(data);
}

export const functionRecord: Record<
  string,
  (data: Record<string, string>) => Promise<string>
> = {
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
 * Function to initialize common data for the tool
 *
 * @param data
 * @param release
 * @param php_version
 * @param os_version
 */
export async function initToolData(
  data: Record<string, string>,
  release: string,
  php_version: string,
  os_version: string
): Promise<Record<string, string>> {
  data = await parseRelease(release, data);
  data['version_parameter'] = JSON.stringify(data['version_parameter']);
  data['os_version'] = os_version;
  data['php_version'] = php_version;
  data['github'] = 'https://github.com';
  if (data['github'] === data['domain']) {
    data['prefix'] = 'releases';
    data['verb'] = 'download';
  }
  return data;
}

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
    const data: Record<string, string> = await initToolData(
      await utils.getToolData(release.split(':')[0]),
      release,
      php_version,
      os_version
    );
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
      case /^[\w.-]+\/[\w.-]+$/.test(data['tool']):
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
