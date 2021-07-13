import * as utils from './utils';

/**
 * Function to get command to setup tools
 *
 * @param os_version
 * @param suffix
 */
export async function getCommand(
  os_version: string,
  suffix: string
): Promise<string> {
  switch (os_version) {
    case 'linux':
    case 'darwin':
      return 'add_' + suffix + ' ';
    case 'win32':
      return 'Add-' + suffix.charAt(0).toUpperCase() + suffix.slice(1) + ' ';
    default:
      return await utils.log(
        'Platform ' + os_version + ' is not supported',
        os_version,
        'error'
      );
  }
}

/**
 * Function to get tool version
 *
 * @param version
 */
export async function getToolVersion(version: string): Promise<string> {
  // semver_regex - https://semver.org/
  const semver_regex =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  const composer_regex = /^stable$|^preview$|^snapshot$|^[1|2]$/;
  version = version.replace(/[><=^]*/, '').replace(/^v(\d)/, '$1');
  switch (true) {
    case composer_regex.test(version):
    case semver_regex.test(version):
      return version;
    default:
      return 'latest';
  }
}

/**
 * Function to parse tool:version
 *
 * @param release
 */
export async function parseTool(
  release: string
): Promise<{name: string; version: string}> {
  const parts: string[] = release.split(':');
  const tool: string = parts[0];
  const version: string | undefined = parts[1];
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
export async function getUri(
  tool: string,
  extension: string,
  version: string,
  prefix: string,
  version_prefix: string,
  verb: string
): Promise<string> {
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

/**
 * Helper function to get script to setup phive
 *
 * @param version
 * @param php_version
 * @param os_version
 */
export async function addPhive(
  version: string,
  php_version: string,
  os_version: string
): Promise<string> {
  switch (true) {
    case /5\.6|7\.0/.test(php_version):
      version = version.replace('latest', '0.12.1');
      break;
    case /7\.1/.test(php_version):
      version = version.replace('latest', '0.13.5');
      break;
  }
  switch (version) {
    case 'latest':
      return (
        (await getCommand(os_version, 'tool')) +
        'https://phar.io/releases/phive.phar phive'
      );
    default:
      return (
        (await getCommand(os_version, 'tool')) +
        'https://github.com/phar-io/phive/releases/download/' +
        version +
        '/phive-' +
        version +
        '.phar phive'
      );
  }
}

/**
 * Function to get the phar url in domain/tool-version.phar format
 *
 * @param domain
 * @param tool
 * @param prefix
 * @param version
 */
export async function getPharUrl(
  domain: string,
  tool: string,
  prefix: string,
  version: string
): Promise<string> {
  switch (version) {
    case 'latest':
      return domain + '/' + tool + '.phar';
    default:
      return domain + '/' + tool + '-' + prefix + version + '.phar';
  }
}

/**
 * Function to get the Deployer url
 *
 * @param version
 */
export async function getDeployerUrl(version: string): Promise<string> {
  const deployer = 'https://deployer.org';
  switch (version) {
    case 'latest':
      return deployer + '/deployer.phar';
    default:
      return deployer + '/releases/v' + version + '/deployer.phar';
  }
}

/**
 * Function to get the Deployer url
 *
 * @param version
 * @param os_version
 */
export async function getSymfonyUri(
  version: string,
  os_version: string
): Promise<string> {
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
      return await utils.log(
        'Platform ' + os_version + ' is not supported',
        os_version,
        'error'
      );
  }
  switch (version) {
    case 'latest':
      return 'releases/latest/download/' + filename;
    default:
      return 'releases/download/v' + version + '/' + filename;
  }
}

/**
 * Function to add/move composer in the tools list
 *
 * @param tools_list
 */
export async function addComposer(tools_list: string[]): Promise<string[]> {
  const regex_any = /^composer($|:.*)/;
  const regex_valid =
    /^composer:?($|preview$|snapshot$|v?[1-2]$|v?\d+\.\d+\.\d+[\w-]*$)/;
  const regex_composer1_tools =
    /hirak|prestissimo|narrowspark|composer-prefetcher/;
  const matches: string[] = tools_list.filter(tool => regex_valid.test(tool));
  let composer = 'composer';
  tools_list = tools_list.filter(tool => !regex_any.test(tool));
  switch (true) {
    case regex_composer1_tools.test(tools_list.join(' ')):
      composer = 'composer:1';
      break;
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
 * Function to get composer URL for a given version
 *
 * @param version
 */
export async function getComposerUrl(version: string): Promise<string> {
  let cache_url = `https://github.com/shivammathur/composer-cache/releases/latest/download/composer-${version.replace(
    'latest',
    'stable'
  )}.phar`;
  switch (true) {
    case /^snapshot$/.test(version):
      return `${cache_url},https://getcomposer.org/composer.phar`;
    case /^preview$|^[1-2]$/.test(version):
      return `${cache_url},https://getcomposer.org/composer-${version}.phar`;
    case /^\d+\.\d+\.\d+[\w-]*$/.test(version):
      cache_url = `https://github.com/composer/composer/releases/download/${version}/composer.phar`;
      return `${cache_url},https://getcomposer.org/composer-${version}.phar`;
    default:
      return `${cache_url},https://getcomposer.org/composer-stable.phar`;
  }
}

/**
 * Function to get Tools list after cleanup
 *
 * @param tools_csv
 */
export async function getCleanedToolsList(
  tools_csv: string
): Promise<string[]> {
  let tools_list: string[] = await utils.CSVArray(tools_csv);
  tools_list = await addComposer(tools_list);
  tools_list = tools_list
    .map(function (extension: string) {
      return extension
        .trim()
        .replace(
          /codeception\/|hirak\/|robmorgan\/|narrowspark\/automatic-/,
          ''
        );
    })
    .filter(Boolean);
  return [...new Set(tools_list)];
}

/**
 * Helper function to get script to setup a tool using a phar url
 *
 * @param tool
 * @param url
 * @param os_version
 */
export async function addArchive(
  tool: string,
  url: string,
  os_version: string
): Promise<string> {
  return (await getCommand(os_version, 'tool')) + url + ' ' + tool;
}

/**
 * Function to get the script to setup php-config and phpize
 *
 * @param tool
 * @param os_version
 */
export async function addDevTools(
  tool: string,
  os_version: string
): Promise<string> {
  switch (os_version) {
    case 'linux':
      return (
        'add_devtools' +
        '\n' +
        (await utils.addLog('$tick', tool, 'Added', 'linux'))
      );
    case 'darwin':
      return await utils.addLog('$tick', tool, 'Added', 'darwin');
    case 'win32':
      return await utils.addLog(
        '$cross',
        tool,
        tool + ' is not a windows tool',
        'win32'
      );
    default:
      return await utils.log(
        'Platform ' + os_version + ' is not supported',
        os_version,
        'error'
      );
  }
}

/**
 * Helper function to get script to setup a tool using composer
 *
 * @param tool
 * @param release
 * @param prefix
 * @param os_version
 */
export async function addPackage(
  tool: string,
  release: string,
  prefix: string,
  os_version: string
): Promise<string> {
  const tool_command = await getCommand(os_version, 'composertool');
  return tool_command + tool + ' ' + release + ' ' + prefix;
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
  let script = '\n' + (await utils.stepLog('Setup Tools', os_version));
  const tools_list: Array<string> = await getCleanedToolsList(tools_csv);
  await utils.asyncForEach(tools_list, async function (release: string) {
    const tool_data: {name: string; version: string} = await parseTool(release);
    const tool: string = tool_data.name;
    const version: string = tool_data.version;
    const github = 'https://github.com/';
    let uri: string = await getUri(
      tool,
      '.phar',
      version,
      'releases',
      '',
      'download'
    );
    script += '\n';
    let url = '';
    switch (tool) {
      case 'cs2pr':
        uri = await getUri(tool, '', version, 'releases', '', 'download');
        url = github + 'staabm/annotate-pull-request-from-checkstyle/' + uri;
        script += await addArchive(tool, url, os_version);
        break;
      case 'php-cs-fixer':
        uri = await getUri(tool, '.phar', version, 'releases', 'v', 'download');
        url = github + 'FriendsOfPHP/PHP-CS-Fixer/' + uri;
        script += await addArchive(tool, url, os_version);
        break;
      case 'phpcs':
      case 'phpcbf':
        url = github + 'squizlabs/PHP_CodeSniffer/' + uri;
        script += await addArchive(tool, url, os_version);
        break;
      case 'phive':
        script += await addPhive(version, php_version, os_version);
        break;
      case 'phpstan':
        url = github + 'phpstan/phpstan/' + uri;
        script += await addArchive(tool, url, os_version);
        break;
      case 'phpmd':
        url = github + 'phpmd/phpmd/' + uri;
        script += await addArchive(tool, url, os_version);
        break;
      case 'psalm':
        url = github + 'vimeo/psalm/' + uri;
        script += await addArchive(tool, url, os_version);
        break;
      case 'composer':
        url = await getComposerUrl(version);
        script += await addArchive('composer', url, os_version);
        break;
      case 'codeception':
        script += await addPackage(tool, release, 'codeception/', os_version);
        break;
      case 'phpcpd':
      case 'phpunit':
        url = await getPharUrl('https://phar.phpunit.de', tool, '', version);
        script += await addArchive(tool, url, os_version);
        break;
      case 'deployer':
        url = await getDeployerUrl(version);
        script += await addArchive(tool, url, os_version);
        break;
      case 'phinx':
        script += await addPackage(tool, release, 'robmorgan/', os_version);
        break;
      case 'prestissimo':
        script += await addPackage(tool, release, 'hirak/', os_version);
        break;
      case 'composer-prefetcher':
        script += await addPackage(
          tool,
          release,
          'narrowspark/automatic-',
          os_version
        );
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
        script += await addArchive('symfony', url, os_version);
        break;
      default:
        script += await utils.addLog(
          '$cross',
          tool,
          'Tool ' + tool + ' is not supported',
          os_version
        );
        break;
    }
  });

  return script;
}
