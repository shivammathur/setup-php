import * as tools from '../src/tools';

describe('Tools tests', () => {
  it('checking parseToolVersion', async () => {
    expect(await tools.getToolVersion('latest')).toBe('latest');
    expect(await tools.getToolVersion('1.2.3')).toBe('1.2.3');
    expect(await tools.getToolVersion('^1.2.3')).toBe('1.2.3');
    expect(await tools.getToolVersion('>=1.2.3')).toBe('1.2.3');
    expect(await tools.getToolVersion('>1.2.3')).toBe('1.2.3');
    expect(await tools.getToolVersion('1.2.3-ALPHA')).toBe('1.2.3-ALPHA');
    expect(await tools.getToolVersion('1.2.3-alpha')).toBe('1.2.3-alpha');
    expect(await tools.getToolVersion('1.2.3-beta')).toBe('1.2.3-beta');
    expect(await tools.getToolVersion('1.2.3-rc')).toBe('1.2.3-rc');
    expect(await tools.getToolVersion('1.2.3-dev')).toBe('1.2.3-dev');
    expect(await tools.getToolVersion('1.2.3-alpha1')).toBe('1.2.3-alpha1');
    expect(await tools.getToolVersion('1.2.3-alpha.1')).toBe('1.2.3-alpha.1');
  });

  it('checking parseTool', async () => {
    expect(await tools.parseTool('phpunit')).toStrictEqual({
      name: 'phpunit',
      version: 'latest'
    });
    expect(await tools.parseTool('phpunit:1.2.3')).toStrictEqual({
      name: 'phpunit',
      version: '1.2.3'
    });
    expect(await tools.parseTool('phpunit:^1.2.3')).toStrictEqual({
      name: 'phpunit',
      version: '1.2.3'
    });
    expect(await tools.parseTool('phpunit:>=1.2.3')).toStrictEqual({
      name: 'phpunit',
      version: '1.2.3'
    });
    expect(await tools.parseTool('phpunit:>1.2.3')).toStrictEqual({
      name: 'phpunit',
      version: '1.2.3'
    });
    expect(await tools.parseTool('phpunit:1.2.3-ALPHA')).toStrictEqual({
      name: 'phpunit',
      version: '1.2.3-ALPHA'
    });
    expect(await tools.parseTool('phpunit:1.2.3-alpha')).toStrictEqual({
      name: 'phpunit',
      version: '1.2.3-alpha'
    });
    expect(await tools.parseTool('phpunit:1.2.3-beta')).toStrictEqual({
      name: 'phpunit',
      version: '1.2.3-beta'
    });
    expect(await tools.parseTool('phpunit:1.2.3-rc')).toStrictEqual({
      name: 'phpunit',
      version: '1.2.3-rc'
    });
    expect(await tools.parseTool('phpunit:1.2.3-dev')).toStrictEqual({
      name: 'phpunit',
      version: '1.2.3-dev'
    });
    expect(await tools.parseTool('phpunit:1.2.3-alpha1')).toStrictEqual({
      name: 'phpunit',
      version: '1.2.3-alpha1'
    });
    expect(await tools.parseTool('phpunit:1.2.3-alpha.1')).toStrictEqual({
      name: 'phpunit',
      version: '1.2.3-alpha.1'
    });
    expect(await tools.parseTool('phpunit/phpunit:^1.2.3')).toStrictEqual({
      name: 'phpunit/phpunit',
      version: '^1.2.3'
    });
  });

  it('checking getUri', async () => {
    expect(
      await tools.getUri('tool', '.phar', 'latest', 'releases', '', 'download')
    ).toBe('releases/latest/download/tool.phar');
    expect(
      await tools.getUri('tool', '.phar', '1.2.3', 'releases', '', 'download')
    ).toBe('releases/download/1.2.3/tool.phar');
    expect(
      await tools.getUri('tool', '.phar', '1.2.3', 'releases', 'v', 'download')
    ).toBe('releases/download/v1.2.3/tool.phar');
  });

  it('checking addPhive', async () => {
    let script: string = await tools.addPhive('1.2.3', '7.4', 'linux');
    expect(script).toContain(
      'add_tool https://github.com/phar-io/phive/releases/download/1.2.3/phive-1.2.3.phar phive'
    );

    script = await tools.addPhive('latest', '5.5', 'win32');
    expect(script).toContain('Phive is not supported on PHP 5.5');

    script = await tools.addPhive('latest', '5.6', 'win32');
    expect(script).toContain(
      'Add-Tool https://github.com/phar-io/phive/releases/download/0.12.1/phive-0.12.1.phar phive'
    );

    script = await tools.addPhive('latest', '7.1', 'win32');
    expect(script).toContain(
      'Add-Tool https://github.com/phar-io/phive/releases/download/0.13.5/phive-0.13.5.phar phive'
    );
  });

  it('checking getPharUri', async () => {
    expect(await tools.getPharUrl('domain', 'tool', '', 'latest')).toBe(
      'domain/tool.phar'
    );
    expect(await tools.getPharUrl('domain', 'tool', 'v', '1.2.3')).toBe(
      'domain/tool-v1.2.3.phar'
    );
  });

  it('checking getBlackfirePlayerUrl', async () => {
    expect(await tools.getBlackfirePlayerUrl('latest', '7.4')).toBe(
      'https://get.blackfire.io/blackfire-player.phar'
    );
    expect(await tools.getBlackfirePlayerUrl('latest', '5.5')).toBe(
      'https://get.blackfire.io/blackfire-player-v1.9.3.phar'
    );
    expect(await tools.getBlackfirePlayerUrl('latest', '7.0')).toBe(
      'https://get.blackfire.io/blackfire-player-v1.9.3.phar'
    );
    expect(await tools.getBlackfirePlayerUrl('1.2.3', '7.0')).toBe(
      'https://get.blackfire.io/blackfire-player-v1.2.3.phar'
    );
  });

  it('checking getDeployerUri', async () => {
    expect(await tools.getDeployerUrl('latest')).toBe(
      'https://deployer.org/deployer.phar'
    );
    expect(await tools.getDeployerUrl('1.2.3')).toBe(
      'https://deployer.org/releases/v1.2.3/deployer.phar'
    );
  });

  it('checking addComposer', async () => {
    expect(await tools.addComposer(['a', 'b'])).toStrictEqual([
      'composer',
      'a',
      'b'
    ]);
    expect(await tools.addComposer(['a', 'b', 'composer'])).toStrictEqual([
      'composer',
      'a',
      'b'
    ]);
    expect(await tools.addComposer(['a', 'b', 'composer:1.2'])).toStrictEqual([
      'composer',
      'a',
      'b'
    ]);
    expect(
      await tools.addComposer(['a', 'b', 'composer:1.2.3'])
    ).toStrictEqual(['composer:1.2.3', 'a', 'b']);
    expect(
      await tools.addComposer(['a', 'b', 'composer:v1.2.3'])
    ).toStrictEqual(['composer:1.2.3', 'a', 'b']);
    expect(
      await tools.addComposer(['a', 'b', 'composer:snapshot'])
    ).toStrictEqual(['composer:snapshot', 'a', 'b']);
    expect(
      await tools.addComposer(['a', 'b', 'composer:preview'])
    ).toStrictEqual(['composer:preview', 'a', 'b']);
    expect(
      await tools.addComposer(['a', 'b', 'c', 'composer:1'])
    ).toStrictEqual(['composer:1', 'a', 'b', 'c']);
    expect(
      await tools.addComposer(['a', 'b', 'c', 'composer:2'])
    ).toStrictEqual(['composer:2', 'a', 'b', 'c']);
    expect(
      await tools.addComposer(['a', 'b', 'c', 'composer:v1'])
    ).toStrictEqual(['composer:1', 'a', 'b', 'c']);
    expect(
      await tools.addComposer(['a', 'b', 'c', 'composer:v2'])
    ).toStrictEqual(['composer:2', 'a', 'b', 'c']);
  });

  it('checking getComposerUrl', async () => {
    expect(await tools.getComposerUrl('latest')).toContain(
      'https://getcomposer.org/composer-stable.phar'
    );
    expect(await tools.getComposerUrl('stable')).toContain(
      'https://getcomposer.org/composer-stable.phar'
    );
    expect(await tools.getComposerUrl('snapshot')).toContain(
      'https://getcomposer.org/composer.phar'
    );
    expect(await tools.getComposerUrl('preview')).toContain(
      'https://getcomposer.org/composer-preview.phar'
    );
    expect(await tools.getComposerUrl('1')).toContain(
      'https://getcomposer.org/composer-1.phar'
    );
    expect(await tools.getComposerUrl('2')).toContain(
      'https://getcomposer.org/composer-2.phar'
    );
    expect(await tools.getComposerUrl('1.7.2')).toContain(
      'https://github.com/composer/composer/releases/download/1.7.2/composer.phar'
    );
    expect(await tools.getComposerUrl('1.7.2')).toContain(
      'https://getcomposer.org/composer-1.7.2.phar'
    );
    expect(await tools.getComposerUrl('2.0.0-RC2')).toContain(
      'https://github.com/composer/composer/releases/download/2.0.0-RC2/composer.phar'
    );
    expect(await tools.getComposerUrl('2.0.0-RC2')).toContain(
      'https://getcomposer.org/composer-2.0.0-RC2.phar'
    );
    expect(await tools.getComposerUrl('wrong')).toContain(
      'https://getcomposer.org/composer-stable.phar'
    );
  });

  it('checking getSymfonyUri', async () => {
    expect(await tools.getSymfonyUri('latest', 'linux')).toContain(
      'releases/latest/download/symfony_linux_amd64'
    );
    expect(await tools.getSymfonyUri('1.2.3', 'linux')).toContain(
      'releases/download/v1.2.3/symfony_linux_amd64'
    );
    expect(await tools.getSymfonyUri('latest', 'darwin')).toContain(
      'releases/latest/download/symfony_darwin_amd64'
    );
    expect(await tools.getSymfonyUri('1.2.3', 'darwin')).toContain(
      'releases/download/v1.2.3/symfony_darwin_amd64'
    );
    expect(await tools.getSymfonyUri('latest', 'win32')).toContain(
      'releases/latest/download/symfony_windows_amd64'
    );
    expect(await tools.getSymfonyUri('1.2.3', 'win32')).toContain(
      'releases/download/v1.2.3/symfony_windows_amd64'
    );
    expect(await tools.getSymfonyUri('1.2.3', 'openbsd')).toContain(
      'Platform openbsd is not supported'
    );
  });

  it('checking getWpCliUri', async () => {
    expect(await tools.getWpCliUrl('latest')).toBe(
      'wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true'
    );
    expect(await tools.getWpCliUrl('2.4.0')).toBe(
      'wp-cli/wp-cli/releases/download/v2.4.0/wp-cli-2.4.0.phar'
    );
  });

  it('checking addArchive', async () => {
    let script: string = await tools.addArchive(
      'tool',
      'https://tool.com/tool.phar',
      'linux',
      '-v'
    );
    expect(script).toContain('add_tool https://tool.com/tool.phar tool');
    script = await tools.addArchive(
      'tool',
      'https://tool.com/tool.phar',
      'darwin',
      '-v'
    );
    expect(script).toContain('add_tool https://tool.com/tool.phar tool');
    script = await tools.addArchive(
      'tool',
      'https://tool.com/tool.phar',
      'win32',
      '-v'
    );
    expect(script).toContain('Add-Tool https://tool.com/tool.phar tool');

    script = await tools.addArchive(
      'tool',
      'https://tool.com/tool.phar',
      'openbsd',
      '-v'
    );
    expect(script).toContain('Platform openbsd is not supported');
  });

  it('checking addDevTools', async () => {
    let script: string = await tools.addDevTools('phpize', 'linux');
    expect(script).toContain('add_devtools phpize');

    script = await tools.addDevTools('php-config', 'linux');
    expect(script).toContain('add_devtools php-config');

    script = await tools.addDevTools('phpize', 'darwin');
    expect(script).toContain('add_devtools phpize');

    script = await tools.addDevTools('php-config', 'darwin');
    expect(script).toContain('add_devtools php-config');

    script = await tools.addDevTools('phpize', 'win32');
    expect(script).toContain(
      'Add-Log "$tick" "phpize" "phpize is not a windows tool"'
    );

    script = await tools.addDevTools('php-config', 'win32');
    expect(script).toContain(
      'Add-Log "$tick" "php-config" "php-config is not a windows tool"'
    );

    script = await tools.addDevTools('tool', 'openbsd');
    expect(script).toContain('Platform openbsd is not supported');
  });

  it('checking addPackage', async () => {
    let script: string = await tools.addPackage(
      'tool',
      'tool:1.2.3',
      'user/',
      'linux'
    );
    expect(script).toContain('add_composertool tool tool:1.2.3 user/');

    script = await tools.addPackage('tool', 'tool:1.2.3', 'user/', 'darwin');
    expect(script).toContain('add_composertool tool tool:1.2.3 user/');

    script = await tools.addPackage('tool', 'tool:1.2.3', 'user/', 'win32');
    expect(script).toContain('Add-Composertool tool tool:1.2.3 user/');

    script = await tools.addPackage('tool', 'tool:1.2.3', 'user/', 'openbsd');
    expect(script).toContain('Platform openbsd is not supported');
  });

  it('checking addTools on linux', async () => {
    const script: string = await tools.addTools(
      'blackfire, blackfire-player, cs2pr, flex, grpc_php_plugin, php-cs-fixer, phplint, phpstan, phpunit, pecl, phing, phinx, phinx:1.2.3, phive, php-config, phpize, protoc, symfony, wp-cli',
      '7.4',
      'linux'
    );
    expect(script).toContain('add_blackfire');
    expect(script).toContain(
      'add_tool https://get.blackfire.io/blackfire-player.phar blackfire-player "-V"'
    );
    expect(script).toContain(
      'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-stable.phar,https://getcomposer.org/composer-stable.phar composer'
    );
    expect(script).toContain(
      'add_tool https://github.com/staabm/annotate-pull-request-from-checkstyle/releases/latest/download/cs2pr cs2pr "-V"'
    );
    expect(script).toContain(
      'add_tool https://github.com/FriendsOfPHP/PHP-CS-Fixer/releases/latest/download/php-cs-fixer.phar php-cs-fixer "-V"'
    );
    expect(script).toContain(
      'add_tool https://github.com/phpstan/phpstan/releases/latest/download/phpstan.phar phpstan "-V"'
    );
    expect(script).toContain(
      'add_tool https://www.phing.info/get/phing-latest.phar phing "-v"'
    );
    expect(script).toContain(
      'add_tool https://phar.io/releases/phive.phar phive status'
    );
    expect(script).toContain(
      'add_tool https://phar.phpunit.de/phpunit.phar phpunit "--version"'
    );
    expect(script).toContain(
      'add_tool https://github.com/symfony/cli/releases/latest/download/symfony_linux_amd64 symfony version'
    );
    expect(script).toContain(
      'add_tool https://github.com/wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true wp-cli "--version"'
    );
    expect(script).toContain('add_protoc latest');
    expect(script).toContain('add_grpc_php_plugin latest');
    expect(script).toContain('add_pecl');
    expect(script).toContain('add_composertool flex flex symfony/');
    expect(script).toContain('add_composertool phinx phinx robmorgan/');
    expect(script).toContain('add_composertool phplint phplint overtrue/');
    expect(script).toContain('add_composertool phinx phinx:1.2.3 robmorgan/');
    expect(script).toContain('add_devtools php-config');
    expect(script).toContain('add_devtools phpize');
  });
  it('checking addTools on darwin', async () => {
    const listOfTools = [
      'behat',
      'blackfire',
      'blackfire-player',
      'composer-normalize',
      'composer-require-checker',
      'composer-unused',
      'cs2pr:1.2.3',
      'flex',
      'grpc_php_plugin:1.2.3',
      'infection',
      'phan',
      'phan:2.7.2',
      'phing:1.2.3',
      'phinx',
      'phive:1.2.3',
      'php-config',
      'phpcbf',
      'phpcpd',
      'phpcs',
      'phpize',
      'phpmd',
      'phpspec',
      'protoc:v1.2.3',
      'psalm',
      'symfony-cli',
      'symfony:1.2.3',
      'vapor-cli',
      'wp-cli'
    ];

    const script: string = await tools.addTools(
      listOfTools.join(', '),
      '7.4',
      'darwin'
    );

    expect(script).toContain('add_blackfire');
    expect(script).toContain(
      'add_tool https://get.blackfire.io/blackfire-player.phar blackfire-player "-V"'
    );
    expect(script).toContain(
      'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-stable.phar,https://getcomposer.org/composer-stable.phar composer'
    );
    expect(script).toContain(
      'add_tool https://github.com/ergebnis/composer-normalize/releases/latest/download/composer-normalize.phar composer-normalize "-V"'
    );
    expect(script).toContain(
      'add_tool https://github.com/maglnet/ComposerRequireChecker/releases/latest/download/composer-require-checker.phar composer-require-checker "-V"'
    );
    expect(script).toContain(
      'add_tool https://github.com/staabm/annotate-pull-request-from-checkstyle/releases/download/1.2.3/cs2pr cs2pr "-V"'
    );
    expect(script).toContain(
      'add_tool https://github.com/infection/infection/releases/latest/download/infection.phar infection "-V"'
    );
    expect(script).toContain(
      'add_tool https://github.com/phan/phan/releases/latest/download/phan.phar phan "-v"'
    );
    expect(script).toContain(
      'add_tool https://www.phing.info/get/phing-1.2.3.phar phing "-v"'
    );
    expect(script).toContain(
      'add_tool https://github.com/squizlabs/PHP_CodeSniffer/releases/latest/download/phpcs.phar phpcs "--version"'
    );
    expect(script).toContain(
      'add_tool https://github.com/squizlabs/PHP_CodeSniffer/releases/latest/download/phpcbf.phar phpcbf "--version"'
    );
    expect(script).toContain(
      'add_tool https://phar.phpunit.de/phpcpd.phar phpcpd "--version"'
    );
    expect(script).toContain(
      'add_tool https://github.com/phpmd/phpmd/releases/latest/download/phpmd.phar phpmd "--version"'
    );
    expect(script).toContain(
      'https://github.com/vimeo/psalm/releases/latest/download/psalm.phar psalm "-v"'
    );
    expect(script).toContain('add_grpc_php_plugin 1.2.3');
    expect(script).toContain('add_protoc 1.2.3');
    expect(script).toContain('add_composertool behat behat behat/');
    expect(script).toContain('add_composertool phpspec phpspec phpspec/');
    expect(script).toContain('add_composertool vapor-cli vapor-cli laravel/');
    expect(script).toContain('add_composertool flex flex symfony/');
    expect(script).toContain('add_composertool phinx phinx robmorgan/');
    expect(script).toContain(
      'add_tool https://github.com/phan/phan/releases/download/2.7.2/phan.phar phan "-v"'
    );
    expect(script).toContain(
      'add_tool https://github.com/phar-io/phive/releases/download/1.2.3/phive-1.2.3.phar phive'
    );
    expect(script).toContain(
      'add_composertool composer-unused composer-unused icanhazstring/'
    );
    expect(script).toContain(
      'add_tool https://github.com/symfony/cli/releases/latest/download/symfony_darwin_amd64 symfony version'
    );
    expect(script).toContain(
      'add_tool https://github.com/symfony/cli/releases/download/v1.2.3/symfony_darwin_amd64 symfony version'
    );
    expect(script).toContain(
      'add_tool https://github.com/wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true wp-cli "--version"'
    );
    expect(script).toContain('add_devtools phpize');
    expect(script).toContain('add_devtools php-config');
  });
  it('checking addTools on windows', async () => {
    const listOfTools = [
      'blackfire',
      'blackfire-player:1.8.1',
      'cs2pr',
      'deployer',
      'does_not_exist',
      'flex',
      'phinx',
      'phive:0.13.2',
      'php-config',
      'phpize',
      'phpmd',
      'symfony',
      'wp'
    ];

    const script: string = await tools.addTools(
      listOfTools.join(', '),
      '7.4',
      'win32'
    );

    expect(script).toContain('Add-Blackfire');
    expect(script).toContain(
      'Add-Tool https://get.blackfire.io/blackfire-player-v1.8.1.phar blackfire-player "-V"'
    );
    expect(script).toContain(
      'Add-Tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-stable.phar,https://getcomposer.org/composer-stable.phar composer'
    );
    expect(script).toContain(
      'Add-Tool https://github.com/staabm/annotate-pull-request-from-checkstyle/releases/latest/download/cs2pr cs2pr "-V"'
    );
    expect(script).toContain('Add-Composertool flex flex symfony/');
    expect(script).toContain(
      'Add-Tool https://deployer.org/deployer.phar deployer "-V"'
    );
    expect(script).toContain(
      'Add-Tool https://github.com/phpmd/phpmd/releases/latest/download/phpmd.phar phpmd "--version"'
    );
    expect(script).toContain('Add-Composertool phinx phinx robmorgan/');
    expect(script).toContain(
      'Add-Tool https://github.com/phar-io/phive/releases/download/0.13.2/phive-0.13.2.phar phive status'
    );
    expect(script).toContain(
      'Add-Tool https://github.com/symfony/cli/releases/latest/download/symfony_windows_amd64.exe symfony version'
    );
    expect(script).toContain(
      'Add-Tool https://github.com/wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true wp-cli "--version"'
    );
    expect(script).toContain('phpize is not a windows tool');
    expect(script).toContain('php-config is not a windows tool');
    expect(script).toContain('Tool does_not_exist is not supported');
  });
  it('checking addTools with composer tool using user/tool as input', async () => {
    const listOfTools = [
      'composer:v1',
      'codeception/codeception',
      'prestissimo',
      'hirak/prestissimo',
      'composer-prefetcher',
      'narrowspark/automatic-composer-prefetcher',
      'robmorgan/phinx: ^1.2'
    ];

    const script: string = await tools.addTools(
      listOfTools.join(', '),
      '7.4',
      'win32'
    );

    expect(script).toContain(
      'Add-Tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-1.phar,https://getcomposer.org/composer-1.phar composer'
    );
    expect(script).toContain('Add-Composertool prestissimo prestissimo hirak/');
    expect(script).toContain('Add-Composertool phinx phinx:^1.2 robmorgan/');
    expect(script).toContain(
      'Add-Composertool automatic-composer-prefetcher automatic-composer-prefetcher narrowspark/'
    );
  });
  it('checking composer setup', async () => {
    const listOfTools = ['composer', 'composer:v1'];

    let script: string = await tools.addTools(
      listOfTools.join(', '),
      '7.4',
      'linux'
    );

    expect(script).toContain(
      'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-1.phar,https://getcomposer.org/composer-1.phar composer'
    );

    script = await tools.addTools('composer:preview', '7.4', 'linux');
    expect(script).toContain(
      'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-preview.phar,https://getcomposer.org/composer-preview.phar composer preview'
    );
    script = await tools.addTools(
      'composer:v1, composer:preview, composer:snapshot',
      '7.4',
      'linux'
    );
    expect(script).toContain(
      'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-snapshot.phar,https://getcomposer.org/composer.phar composer snapshot'
    );

    script = await tools.addTools('none', '7.4', 'linux');
    expect(script).toStrictEqual('');

    script = await tools.addTools('none, phpunit', '7.4', 'linux');
    expect(script).toStrictEqual(
      '\nstep_log "Setup Tools"' +
        '\nadd_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-stable.phar,https://getcomposer.org/composer-stable.phar composer latest\n' +
        '\nadd_tool https://phar.phpunit.de/phpunit.phar phpunit "--version"'
    );
  });
});
