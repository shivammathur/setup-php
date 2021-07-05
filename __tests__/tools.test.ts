import * as tools from '../src/tools';

function getData(
  tool: string,
  version: string,
  php_version: string,
  os_version: string
): Record<string, string> {
  return {
    tool: tool,
    version: version,
    extension: '.phar',
    prefix: 'releases',
    repository: 'user/tool',
    version_prefix: '',
    verb: 'download',
    php_version: php_version,
    os_version: os_version,
    domain: 'https://example.com',
    github: 'https://github.com'
  };
}

describe('Tools tests', () => {
  it('checking getToolVersion', async () => {
    expect(await tools.getToolVersion('tool', 'latest')).toBe('latest');
    expect(await tools.getToolVersion('tool', '1.2.3')).toBe('1.2.3');
    expect(await tools.getToolVersion('tool', '^1.2.3')).toBe('1.2.3');
    expect(await tools.getToolVersion('tool', '>=1.2.3')).toBe('1.2.3');
    expect(await tools.getToolVersion('tool', '>1.2.3')).toBe('1.2.3');
    expect(await tools.getToolVersion('tool', '1.2.3-ALPHA')).toBe(
      '1.2.3-ALPHA'
    );
    expect(await tools.getToolVersion('tool', '1.2.3-alpha')).toBe(
      '1.2.3-alpha'
    );
    expect(await tools.getToolVersion('tool', '1.2.3-beta')).toBe('1.2.3-beta');
    expect(await tools.getToolVersion('tool', '1.2.3-rc')).toBe('1.2.3-rc');
    expect(await tools.getToolVersion('tool', '1.2.3-dev')).toBe('1.2.3-dev');
    expect(await tools.getToolVersion('tool', '1.2.3-alpha1')).toBe(
      '1.2.3-alpha1'
    );
    expect(await tools.getToolVersion('tool', '1.2.3-alpha.1')).toBe(
      '1.2.3-alpha.1'
    );
  });

  it('checking parseRelease', async () => {
    const data = getData('tool', 'latest', '7.4', 'linux');
    expect(await tools.parseRelease('tool', data)).toStrictEqual({
      release: 'tool',
      version: 'latest'
    });
    expect(await tools.parseRelease('alias:1.2.3', data)).toStrictEqual({
      release: 'tool:1.2.3',
      version: '1.2.3'
    });
    expect(await tools.parseRelease('tool:1.2.3', data)).toStrictEqual({
      release: 'tool:1.2.3',
      version: '1.2.3'
    });
    expect(await tools.parseRelease('tool:^1.2.3', data)).toStrictEqual({
      release: 'tool:^1.2.3',
      version: '1.2.3'
    });
    expect(await tools.parseRelease('tool:>=1.2.3', data)).toStrictEqual({
      release: 'tool:>=1.2.3',
      version: '1.2.3'
    });
    expect(await tools.parseRelease('tool:>1.2.3', data)).toStrictEqual({
      release: 'tool:>1.2.3',
      version: '1.2.3'
    });
    expect(await tools.parseRelease('tool:1.2.3-ALPHA', data)).toStrictEqual({
      release: 'tool:1.2.3-ALPHA',
      version: '1.2.3-ALPHA'
    });
    expect(await tools.parseRelease('tool:1.2.3-beta', data)).toStrictEqual({
      release: 'tool:1.2.3-beta',
      version: '1.2.3-beta'
    });
    expect(await tools.parseRelease('tool:1.2.3-rc', data)).toStrictEqual({
      release: 'tool:1.2.3-rc',
      version: '1.2.3-rc'
    });
    expect(await tools.parseRelease('tool:1.2.3-dev', data)).toStrictEqual({
      release: 'tool:1.2.3-dev',
      version: '1.2.3-dev'
    });
    expect(await tools.parseRelease('tool:1.2.3-alpha1', data)).toStrictEqual({
      release: 'tool:1.2.3-alpha1',
      version: '1.2.3-alpha1'
    });
    expect(await tools.parseRelease('tool:1.2.3-alpha.1', data)).toStrictEqual({
      release: 'tool:1.2.3-alpha.1',
      version: '1.2.3-alpha.1'
    });
    expect(await tools.parseRelease('user/tool:^1.2.3', data)).toStrictEqual({
      release: 'tool:^1.2.3',
      version: '^1.2.3'
    });
  });

  it('checking getUrl', async () => {
    const data = getData('tool', 'latest', '7.4', 'linux');
    expect(await tools.getUrl(data)).toBe(
      'https://example.com/user/tool/releases/latest/download/tool.phar'
    );
    data['version'] = '1.2.3';
    expect(await tools.getUrl(data)).toBe(
      'https://example.com/user/tool/releases/download/1.2.3/tool.phar'
    );
    data['version_prefix'] = 'v';
    expect(await tools.getUrl(data)).toBe(
      'https://example.com/user/tool/releases/download/v1.2.3/tool.phar'
    );
  });

  it('checking addPhive', async () => {
    const data = getData('phive', '1.2.3', '7.4', 'linux');
    data['domain'] = 'https://phar.io';
    data['repository'] = 'phar-io/phive';
    data['version_parameter'] = 'status';

    let script: string = await tools.addPhive(data);
    expect(script).toContain(
      'add_tool https://github.com/phar-io/phive/releases/download/1.2.3/phive-1.2.3.phar phive'
    );

    data['version'] = 'latest';
    data['php_version'] = '5.5';
    data['os_version'] = 'win32';
    script = await tools.addPhive(data);
    expect(script).toContain('Phive is not supported on PHP 5.5');

    data['php_version'] = '5.6';
    script = await tools.addPhive(data);
    expect(script).toContain(
      'Add-Tool https://github.com/phar-io/phive/releases/download/0.12.1/phive-0.12.1.phar phive'
    );

    data['php_version'] = '7.1';
    data['version'] = 'latest';
    script = await tools.addPhive(data);
    expect(script).toContain(
      'Add-Tool https://github.com/phar-io/phive/releases/download/0.13.5/phive-0.13.5.phar phive'
    );
  });

  it('checking getPharUrl', async () => {
    const data = getData('tool', 'latest', '7.4', 'linux');
    data['version_prefix'] = '';
    expect(await tools.getPharUrl(data)).toBe('https://example.com/tool.phar');
    data['version'] = '1.2.3';
    data['version_prefix'] = 'v';
    expect(await tools.getPharUrl(data)).toBe(
      'https://example.com/tool-v1.2.3.phar'
    );
  });

  it('checking addBlackfirePlayer', async () => {
    const data = getData('blackfire-player', 'latest', '7.4', 'linux');
    data['domain'] = 'https://get.blackfire.io';
    data['version_prefix'] = 'v';
    expect(await tools.addBlackfirePlayer(data)).toContain(
      'https://get.blackfire.io/blackfire-player.phar'
    );
    data['php_version'] = '5.5';
    expect(await tools.addBlackfirePlayer(data)).toContain(
      'https://get.blackfire.io/blackfire-player-v1.9.3.phar'
    );
    data['php_version'] = '7.0';
    expect(await tools.addBlackfirePlayer(data)).toContain(
      'https://get.blackfire.io/blackfire-player-v1.9.3.phar'
    );
    data['version'] = '1.2.3';
    expect(await tools.addBlackfirePlayer(data)).toContain(
      'https://get.blackfire.io/blackfire-player-v1.2.3.phar'
    );
  });

  it('checking addDeployer', async () => {
    const data = getData('deployer', 'latest', '7.4', 'linux');
    data['domain'] = 'https://deployer.org';
    expect(await tools.addDeployer(data)).toContain(
      'https://deployer.org/deployer.phar'
    );
    data['version'] = '1.2.3';
    expect(await tools.addDeployer(data)).toContain(
      'https://deployer.org/releases/v1.2.3/deployer.phar'
    );
  });

  it('checking filterList', async () => {
    expect(await tools.filterList(['a', 'b'])).toStrictEqual([
      'composer',
      'a',
      'b'
    ]);
    expect(await tools.filterList(['a', 'b', 'composer'])).toStrictEqual([
      'composer',
      'a',
      'b'
    ]);
    expect(await tools.filterList(['a', 'b', 'composer:1.2'])).toStrictEqual([
      'composer',
      'a',
      'b'
    ]);
    expect(await tools.filterList(['a', 'b', 'composer:1.2.3'])).toStrictEqual([
      'composer:1.2.3',
      'a',
      'b'
    ]);
    expect(await tools.filterList(['a', 'b', 'composer:v1.2.3'])).toStrictEqual(
      ['composer:1.2.3', 'a', 'b']
    );
    expect(
      await tools.filterList(['a', 'b', 'composer:snapshot'])
    ).toStrictEqual(['composer:snapshot', 'a', 'b']);
    expect(
      await tools.filterList(['a', 'b', 'composer:preview'])
    ).toStrictEqual(['composer:preview', 'a', 'b']);
    expect(await tools.filterList(['a', 'b', 'c', 'composer:1'])).toStrictEqual(
      ['composer:1', 'a', 'b', 'c']
    );
    expect(await tools.filterList(['a', 'b', 'c', 'composer:2'])).toStrictEqual(
      ['composer:2', 'a', 'b', 'c']
    );
    expect(
      await tools.filterList(['a', 'b', 'c', 'composer:v1'])
    ).toStrictEqual(['composer:1', 'a', 'b', 'c']);
    expect(
      await tools.filterList(['a', 'b', 'c', 'composer:v2'])
    ).toStrictEqual(['composer:2', 'a', 'b', 'c']);
  });

  it('checking addComposer', async () => {
    const data = getData('composer', 'latest', '7.4', 'linux');
    data['domain'] = 'https://getcomposer.org';
    data['repository'] = 'composer/composer';
    expect(await tools.addComposer(data)).toContain(
      'https://getcomposer.org/composer-stable.phar'
    );
    data['version'] = 'stable';
    expect(await tools.addComposer(data)).toContain(
      'https://getcomposer.org/composer-stable.phar'
    );
    data['version'] = 'snapshot';
    expect(await tools.addComposer(data)).toContain(
      'https://getcomposer.org/composer.phar'
    );
    data['version'] = 'preview';
    expect(await tools.addComposer(data)).toContain(
      'https://getcomposer.org/composer-preview.phar'
    );
    data['version'] = '1';
    expect(await tools.addComposer(data)).toContain(
      'https://getcomposer.org/composer-1.phar'
    );
    data['version'] = '2';
    expect(await tools.addComposer(data)).toContain(
      'https://getcomposer.org/composer-2.phar'
    );
    data['version'] = '1.7.2';
    expect(await tools.addComposer(data)).toContain(
      'https://github.com/composer/composer/releases/download/1.7.2/composer.phar'
    );
    expect(await tools.addComposer(data)).toContain(
      'https://getcomposer.org/composer-1.7.2.phar'
    );
    data['version'] = '2.0.0-RC2';
    expect(await tools.addComposer(data)).toContain(
      'https://github.com/composer/composer/releases/download/2.0.0-RC2/composer.phar'
    );
    expect(await tools.addComposer(data)).toContain(
      'https://getcomposer.org/composer-2.0.0-RC2.phar'
    );
    data['version'] = 'wrong';
    expect(await tools.addComposer(data)).toContain(
      'https://getcomposer.org/composer-stable.phar'
    );
  });

  it('checking addSymfony', async () => {
    const data = getData('symfony', 'latest', '7.4', 'linux');
    expect(await tools.addSymfony(data)).toContain(
      'releases/latest/download/symfony_linux_amd64'
    );
    data['version'] = '1.2.3';
    expect(await tools.addSymfony(data)).toContain(
      'releases/download/v1.2.3/symfony_linux_amd64'
    );
    data['version'] = 'latest';
    data['os_version'] = 'darwin';
    expect(await tools.addSymfony(data)).toContain(
      'releases/latest/download/symfony_darwin_amd64'
    );
    data['version'] = '1.2.3';
    expect(await tools.addSymfony(data)).toContain(
      'releases/download/v1.2.3/symfony_darwin_amd64'
    );
    data['version'] = 'latest';
    data['os_version'] = 'win32';
    expect(await tools.addSymfony(data)).toContain(
      'releases/latest/download/symfony_windows_amd64'
    );
    data['version'] = '1.2.3';
    expect(await tools.addSymfony(data)).toContain(
      'releases/download/v1.2.3/symfony_windows_amd64'
    );
    data['os_version'] = 'openbsd';
    expect(await tools.addSymfony(data)).toContain(
      'Platform openbsd is not supported'
    );
  });

  it('checking addWPCLI', async () => {
    const data = getData('wp-cli', 'latest', '7.4', 'linux');
    data['repository'] = 'wp-cli/wp-cli';
    data['version_prefix'] = 'v';
    expect(await tools.addWPCLI(data)).toContain(
      'wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true'
    );
    data['version'] = '2.4.0';
    expect(await tools.addWPCLI(data)).toContain(
      'wp-cli/wp-cli/releases/download/v2.4.0/wp-cli-2.4.0.phar'
    );
  });

  it('checking addArchive', async () => {
    const data = getData('tool', 'latest', '7.4', 'linux');
    data['url'] = 'https://example.com/tool.phar';
    data['version_parameter'] = JSON.stringify('-v');
    let script: string = await tools.addArchive(data);
    expect(script).toContain(
      'add_tool https://example.com/tool.phar tool "-v"'
    );
    data['os_version'] = 'darwin';
    script = await tools.addArchive(data);
    expect(script).toContain(
      'add_tool https://example.com/tool.phar tool "-v"'
    );
    data['os_version'] = 'win32';
    script = await tools.addArchive(data);
    expect(script).toContain(
      'Add-Tool https://example.com/tool.phar tool "-v"'
    );

    data['os_version'] = 'openbsd';
    script = await tools.addArchive(data);
    expect(script).toContain('Platform openbsd is not supported');
  });

  it('checking addDevTools', async () => {
    const data = getData('phpize', 'latest', '7.4', 'linux');
    let script: string = await tools.addDevTools(data);
    expect(script).toContain('add_devtools phpize');

    data['tool'] = 'php-config';
    script = await tools.addDevTools(data);
    expect(script).toContain('add_devtools php-config');

    data['tool'] = 'phpize';
    data['os_version'] = 'darwin';
    script = await tools.addDevTools(data);
    expect(script).toContain('add_devtools phpize');

    data['tool'] = 'php-config';
    script = await tools.addDevTools(data);
    expect(script).toContain('add_devtools php-config');

    data['tool'] = 'phpize';
    data['os_version'] = 'win32';
    script = await tools.addDevTools(data);
    expect(script).toContain(
      'Add-Log "$tick" "phpize" "phpize is not a windows tool"'
    );

    data['tool'] = 'php-config';
    script = await tools.addDevTools(data);
    expect(script).toContain(
      'Add-Log "$tick" "php-config" "php-config is not a windows tool"'
    );

    data['os_version'] = 'openbsd';
    script = await tools.addDevTools(data);
    expect(script).toContain('Platform openbsd is not supported');
  });

  it('checking addPackage', async () => {
    const data = getData('tool', '1.2.3', '7.4', 'linux');
    data['release'] = 'tool:1.2.3';
    let script: string = await tools.addPackage(data);
    expect(script).toContain('add_composertool tool tool:1.2.3 user/');

    data['os_version'] = 'darwin';
    script = await tools.addPackage(data);
    expect(script).toContain('add_composertool tool tool:1.2.3 user/');

    data['os_version'] = 'win32';
    script = await tools.addPackage(data);
    expect(script).toContain('Add-Composertool tool tool:1.2.3 user/');

    data['os_version'] = 'openbsd';
    script = await tools.addPackage(data);
    expect(script).toContain('Platform openbsd is not supported');
  });

  it('checking addTools on linux', async () => {
    const script: string = await tools.addTools(
      'blackfire, blackfire-player, cs2pr, flex, grpc_php_plugin, php-cs-fixer, phplint, phpstan, phpunit, pecl, phing, phinx, phinx:1.2.3, phive, php-config, phpize, protoc, symfony, vapor, wp',
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
      'add_tool https://phar.io/releases/phive.phar phive "status"'
    );
    expect(script).toContain(
      'add_tool https://phar.phpunit.de/phpunit.phar phpunit "--version"'
    );
    expect(script).toContain(
      'add_tool https://github.com/symfony/cli/releases/latest/download/symfony_linux_amd64 symfony-cli "version"'
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
    expect(script).toContain('add_composertool vapor-cli vapor-cli laravel/');
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
      'add_tool https://github.com/symfony/cli/releases/latest/download/symfony_darwin_amd64 symfony-cli "version"'
    );
    expect(script).toContain(
      'add_tool https://github.com/symfony/cli/releases/download/v1.2.3/symfony_darwin_amd64 symfony-cli "version"'
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
      'Add-Tool https://github.com/phar-io/phive/releases/download/0.13.2/phive-0.13.2.phar phive "status"'
    );
    expect(script).toContain(
      'Add-Tool https://github.com/symfony/cli/releases/latest/download/symfony_windows_amd64.exe symfony-cli "version"'
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
