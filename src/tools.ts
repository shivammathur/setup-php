import * as utils from './utils';
import * as httpm from '@actions/http-client';
import {IHttpClientResponse as hcr} from '@actions/http-client/interfaces';
import * as path from 'path';

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
  const semver_regex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  const composer_regex = /^stable$|^preview$|^snapshot$|^v?[1|2]$/;
  version = version.replace(/[><=^]*/, '');
  switch (true) {
    case version.charAt(0) == 'v':
      return version.replace('v', '');
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
 * Helper function to get the codeception url
 *
 * @param version
 * @param suffix
 */
export async function getCodeceptionUriBuilder(
  version: string,
  suffix: string
): Promise<string> {
  return ['releases', version, suffix, 'codecept.phar']
    .filter(Boolean)
    .join('/');
}

/**
 * Function to get the codeception url
 *
 * @param version
 * @param php_version
 */
export async function getCodeceptionUri(
  version: string,
  php_version: string
): Promise<string> {
  const codecept: string = await getCodeceptionUriBuilder(version, '');
  const codecept54: string = await getCodeceptionUriBuilder(version, 'php54');
  const codecept56: string = await getCodeceptionUriBuilder(version, 'php56');
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

/**
 * Helper function to get script to setup phive
 *
 * @param version
 * @param os_version
 */
export async function addPhive(
  version: string,
  os_version: string
): Promise<string> {
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
 * Function to get the WP-CLI url
 *
 * @param version
 */
export async function getWpCliUrl(version: string): Promise<string> {
  switch (version) {
    case 'latest':
      return 'wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true';
    default:
      return await getUri(
        'wp-cli',
        '-' + version + '.phar',
        version,
        'wp-cli/wp-cli/releases',
        'v',
        'download'
      );
  }
}

/**
 * Function to add/move composer in the tools list
 *
 * @param tools_list
 */
export async function addComposer(tools_list: string[]): Promise<string[]> {
  const regex_any = /^composer($|:.*)/;
  const regex_valid = /^composer:?($|preview$|snapshot$|v?[1-2]$)/;
  const matches: string[] = tools_list.filter(tool => regex_valid.test(tool));
  let composer = 'composer';
  tools_list = tools_list.filter(tool => !regex_any.test(tool));
  switch (matches[0]) {
    case undefined:
      break;
    default:
      composer = matches[matches.length - 1].replace(/v([1-2])/, '$1');
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
  const getComposerUrlHelper = async function (
    version: string
  ): Promise<string> {
    const client: httpm.HttpClient = new httpm.HttpClient('setup-php');
    const response: hcr = await client.get('https://getcomposer.org/versions');
    const data = JSON.parse(await response.readBody());
    return 'https://getcomposer.org' + data[version][0]['path'];
  };
  switch (version) {
    case 'snapshot':
      return 'https://getcomposer.org/composer.phar';
    case 'preview':
    case '1':
    case '2':
      return await getComposerUrlHelper(version);
    default:
      return 'https://getcomposer.org/composer-stable.phar';
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
          /-agent|hirak\/|laravel\/|narrowspark\/automatic-|overtrue\/|robmorgan\/|symfony\//,
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
 * @param version
 * @param url
 * @param os_version
 */
export async function addArchive(
  tool: string,
  version: string,
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
 * Function to get script to add tools with custom support.
 *
 * @param tool
 * @param version
 * @param os_version
 */
export async function addCustomTool(
  tool: string,
  version: string,
  os_version: string
): Promise<string> {
  const script_extension: string = await utils.scriptExtension(os_version);
  const script: string = path.join(
    __dirname,
    '../src/scripts/tools/' + tool + script_extension
  );
  const command: string = await getCommand(os_version, tool);
  return '. ' + script + '\n' + command + version;
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
      case 'blackfire':
      case 'grpc_php_plugin':
      case 'protoc':
        script += await addCustomTool(tool, version, os_version);
        break;
      case 'blackfire-player':
        url = await getPharUrl('https://get.blackfire.io', tool, 'v', version);
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'codeception':
        url =
          'https://codeception.com/' +
          (await getCodeceptionUri(version, php_version));
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'composer':
        url = await getComposerUrl(version);
        script += await addArchive('composer', version, url, os_version);
        break;
      case 'composer-normalize':
        uri = await getUri(tool, '.phar', version, 'releases', '', 'download');
        url = github + 'ergebnis/composer-normalize/' + uri;
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'composer-prefetcher':
        script += await addPackage(
          tool,
          release,
          'narrowspark/automatic-',
          os_version
        );
        break;
      case 'composer-require-checker':
        uri = await getUri(tool, '.phar', version, 'releases', '', 'download');
        url = github + 'maglnet/ComposerRequireChecker/' + uri;
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'composer-unused':
        uri = await getUri(tool, '.phar', version, 'releases', '', 'download');
        url = github + 'composer-unused/composer-unused/' + uri;
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'cs2pr':
        uri = await getUri(tool, '', version, 'releases', '', 'download');
        url = github + 'staabm/annotate-pull-request-from-checkstyle/' + uri;
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'deployer':
        url = await getDeployerUrl(version);
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'flex':
        script += await addPackage(tool, release, 'symfony/', os_version);
        break;
      case 'infection':
        url = github + 'infection/infection/' + uri;
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'pecl':
        script += await getCommand(os_version, 'pecl');
        break;
      case 'phan':
        url = github + 'phan/phan/' + uri;
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'phinx':
        script += await addPackage(tool, release, 'robmorgan/', os_version);
        break;
      case 'phive':
        script += await addPhive(version, os_version);
        break;
      case 'php-config':
      case 'phpize':
        script += await addDevTools(tool, os_version);
        break;
      case 'php-cs-fixer':
        uri = await getUri(tool, '.phar', version, 'releases', 'v', 'download');
        url = github + 'FriendsOfPHP/PHP-CS-Fixer/' + uri;
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'phpcbf':
      case 'phpcs':
        url = github + 'squizlabs/PHP_CodeSniffer/' + uri;
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'phpcpd':
      case 'phpunit':
        url = await getPharUrl('https://phar.phpunit.de', tool, '', version);
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'phplint':
        script += await addPackage(tool, release, 'overtrue/', os_version);
        break;
      case 'phpmd':
        url = github + 'phpmd/phpmd/' + uri;
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'phpstan':
        url = github + 'phpstan/phpstan/' + uri;
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'prestissimo':
        script += await addPackage(tool, release, 'hirak/', os_version);
        break;
      case 'psalm':
        url = github + 'vimeo/psalm/' + uri;
        script += await addArchive(tool, version, url, os_version);
        break;
      case 'symfony':
      case 'symfony-cli':
        uri = await getSymfonyUri(version, os_version);
        url = github + 'symfony/cli/' + uri;
        script += await addArchive('symfony', version, url, os_version);
        break;
      case 'vapor-cli':
        script += await addPackage(tool, release, 'laravel/', os_version);
        break;
      case 'wp-cli':
        url = github + (await getWpCliUrl(version));
        script += await addArchive(tool, version, url, os_version);
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
