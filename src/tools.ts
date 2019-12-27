import * as utils from './utils';

export async function getToolCommand(os_version: string): Promise<string> {
  switch (os_version) {
    case 'linux':
    case 'darwin':
      return 'add_tool ';
    case 'win32':
      return 'Add-Tool ';
    default:
      return await utils.log(
        'Platform ' + os_version + ' is not supported',
        os_version,
        'error'
      );
  }
}

export async function getPECLCommand(os_version: string): Promise<string> {
  switch (os_version) {
    case 'linux':
    case 'darwin':
      return 'add_pecl ';
    case 'win32':
      return 'Add-PECL ';
    default:
      return await utils.log(
        'Platform ' + os_version + ' is not supported',
        os_version,
        'error'
      );
  }
}

/**
 * Setup tools
 *
 * @param tool_csv
 * @param os_version
 */
export async function addTools(
  tools_csv: string,
  os_version: string
): Promise<string> {
  let script = await utils.stepLog('Setup Tools', os_version);
  let tools: Array<string> = await utils.CSVArray(tools_csv);
  tools = tools.filter(tool => tool !== 'composer');
  tools.unshift('composer');
  await utils.asyncForEach(tools, async function(tool: string) {
    script += '\n';
    switch (tool) {
      case 'php-cs-fixer':
        script +=
          (await getToolCommand(os_version)) +
          'https://github.com/FriendsOfPHP/PHP-CS-Fixer/releases/latest/download/php-cs-fixer.phar' +
          ' ' +
          'php-cs-fixer';
        break;
      case 'phpcs':
        script +=
          (await getToolCommand(os_version)) +
          'https://github.com/squizlabs/PHP_CodeSniffer/releases/latest/download/phpcs.phar' +
          ' ' +
          'phpcs';
        break;
      case 'phpcbf':
        script +=
          (await getToolCommand(os_version)) +
          'https://github.com/squizlabs/PHP_CodeSniffer/releases/latest/download/phpcbf.phar' +
          ' ' +
          'phpcbf';
        break;
      case 'phpcpd':
        script +=
          (await getToolCommand(os_version)) +
          'https://github.com/sebastianbergmann/phpcpd/releases/latest/download/phpcpd.phar' +
          ' ' +
          'phpcpd';
        break;
      case 'phpstan':
        script +=
          (await getToolCommand(os_version)) +
          'https://github.com/phpstan/phpstan/releases/latest/download/phpstan.phar' +
          ' ' +
          'phpstan';
        break;
      case 'phpmd':
        script +=
          (await getToolCommand(os_version)) +
          'https://github.com/phpmd/phpmd/releases/latest/download/phpmd.phar' +
          ' ' +
          'phpmd';
        break;
      case 'composer':
        script +=
          (await getToolCommand(os_version)) +
          'https://getcomposer.org/composer.phar' +
          ' ' +
          'composer';
        break;
      case 'codeception':
        script +=
          (await getToolCommand(os_version)) +
          'https://codeception.com/codecept.phar' +
          ' ' +
          'codeception';
        break;
      case 'phpunit':
        script +=
          (await getToolCommand(os_version)) +
          'https://phar.phpunit.de/phpunit.phar' +
          ' ' +
          'phpunit';
        break;
      case 'deployer':
        script +=
          (await getToolCommand(os_version)) +
          'https://deployer.org/deployer.phar' +
          ' ' +
          'deployer';
        break;
      case 'prestissimo':
        script +=
          'composer global require hirak/prestissimo' +
          (await utils.suppressOutput(os_version));
        break;
      case 'pecl':
        script += await getPECLCommand(os_version);
        break;
      default:
        script += await utils.log(
          'Tool ' + tool + ' is not supported',
          os_version,
          'error'
        );
        break;
    }
  });

  return script;
}
