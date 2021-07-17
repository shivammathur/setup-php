import * as tools from '../src/tools';
import * as utils from '../src/utils';

interface IData {
  tool: string;
  version: string;
  domain?: string;
  extension?: string;
  os_version?: string;
  php_version?: string;
  release?: string;
  repository?: string;
  type?: string;
  version_parameter?: string;
  version_prefix?: string;
}

function getData(data: IData): Record<string, string> {
  return {
    tool: data.tool,
    version: data.version,
    domain: data.domain || 'https://example.com',
    extension: data.extension || '.phar',
    os_version: data.os_version || 'linux',
    php_version: data.php_version || '7.4',
    release: data.release || [data.tool, data.version].join(':'),
    repository: data.repository || '',
    type: data.type || 'phar',
    version_parameter: data.version_parameter || '-V',
    version_prefix: data.version_prefix || '',
    github: 'https://github.com',
    prefix: 'releases',
    verb: 'download'
  };
}

jest
  .spyOn(utils, 'fetch')
  .mockImplementation(
    async (url: string, token?: string): Promise<Record<string, string>> => {
      if (!token || token === 'valid_token') {
        return {data: `[{"ref": "refs/tags/1.2.3", "url": "${url}"}]`};
      } else if (token === 'beta_token') {
        return {data: `[{"ref": "refs/tags/1.2.3-beta1", "url": "${url}"}]`};
      } else if (token === 'no_data') {
        return {data: '[]'};
      } else {
        return {error: 'Invalid token'};
      }
    }
  );

describe('Tools tests', () => {
  it.each`
    token              | version
    ${'invalid_token'} | ${'1.2'}
    ${'valid_token'}   | ${'1.2.3'}
    ${'beta_token'}    | ${'1.2.3-beta1'}
    ${''}              | ${'1.2.3'}
  `('checking getSemverVersion: $token', async ({token, version}) => {
    process.env['COMPOSER_TOKEN'] = token;
    expect(
      await tools.getSemverVersion(getData({tool: 'tool', version: '1.2'}))
    ).toBe(version);
  });

  it.each`
    version            | tool          | type          | expected
    ${'latest'}        | ${'tool'}     | ${'phar'}     | ${'latest'}
    ${'1'}             | ${'composer'} | ${'phar'}     | ${'1'}
    ${'1.2'}           | ${'tool'}     | ${'composer'} | ${'1.2.*'}
    ${'^1.2.3'}        | ${'tool'}     | ${'phar'}     | ${'1.2.3'}
    ${'>=1.2.3'}       | ${'tool'}     | ${'phar'}     | ${'1.2.3'}
    ${'>1.2.3'}        | ${'tool'}     | ${'phar'}     | ${'1.2.3'}
    ${'1.2.3-ALPHA'}   | ${'tool'}     | ${'phar'}     | ${'1.2.3-ALPHA'}
    ${'1.2.3-alpha'}   | ${'tool'}     | ${'phar'}     | ${'1.2.3-alpha'}
    ${'1.2.3-beta'}    | ${'tool'}     | ${'phar'}     | ${'1.2.3-beta'}
    ${'1.2.3-rc'}      | ${'tool'}     | ${'phar'}     | ${'1.2.3-rc'}
    ${'1.2.3-dev'}     | ${'tool'}     | ${'phar'}     | ${'1.2.3-dev'}
    ${'1.2.3-alpha1'}  | ${'tool'}     | ${'phar'}     | ${'1.2.3-alpha1'}
    ${'1.2.3-alpha.1'} | ${'tool'}     | ${'phar'}     | ${'1.2.3-alpha.1'}
  `(
    'checking getVersion: $version, $tool, $type',
    async ({version, tool, type, expected}) => {
      expect(
        await tools.getVersion(
          version,
          getData({tool: tool, version: version, type: type})
        )
      ).toBe(expected);
    }
  );

  it.each`
    input                   | expected
    ${'tool'}               | ${'tool'}
    ${'alias:1.2.3'}        | ${'tool:1.2.3'}
    ${'tool:1.2.3'}         | ${'tool:1.2.3'}
    ${'tool:^1.2.3'}        | ${'tool:^1.2.3'}
    ${'tool:>=1.2.3'}       | ${'tool:>=1.2.3'}
    ${'tool:>1.2.3'}        | ${'tool:>1.2.3'}
    ${'tool:1.2.3-ALPHA'}   | ${'tool:1.2.3-ALPHA'}
    ${'tool:1.2.3-beta'}    | ${'tool:1.2.3-beta'}
    ${'tool:1.2.3-rc'}      | ${'tool:1.2.3-rc'}
    ${'tool:1.2.3-dev'}     | ${'tool:1.2.3-dev'}
    ${'tool:1.2.3-alpha1'}  | ${'tool:1.2.3-alpha1'}
    ${'tool:1.2.3-alpha.1'} | ${'tool:1.2.3-alpha.1'}
    ${'user/tool:^1.2.3'}   | ${'tool:^1.2.3'}
  `('checking getRelease: $input', async ({input, expected}) => {
    expect(
      await tools.getRelease(input, getData({tool: 'tool', version: 'latest'}))
    ).toBe(expected);
  });

  it.each`
    input_list                   | filtered_list
    ${'a, b'}                    | ${'composer, a, b'}
    ${'a, b, composer'}          | ${'composer, a, b'}
    ${'a, b, composer:1.2.3'}    | ${'composer:1.2.3, a, b'}
    ${'a, b, composer:v1.2.3'}   | ${'composer:1.2.3, a, b'}
    ${'a, b, composer:snapshot'} | ${'composer:snapshot, a, b'}
    ${'a, b, composer:preview'}  | ${'composer:preview, a, b'}
    ${'a, b, composer:1'}        | ${'composer:1, a, b'}
    ${'a, b, composer:2'}        | ${'composer:2, a, b'}
    ${'a, b, composer:v1'}       | ${'composer:1, a, b'}
    ${'a, b, composer:v2'}       | ${'composer:2, a, b'}
  `('checking filterList $input_list', async ({input_list, filtered_list}) => {
    expect(await tools.filterList(input_list.split(', '))).toStrictEqual(
      filtered_list.split(', ')
    );
  });

  it.each`
    version     | version_prefix | url_suffix
    ${'latest'} | ${'v'}         | ${'latest/download/tool.phar'}
    ${'1.2.3'}  | ${'v'}         | ${'download/v1.2.3/tool.phar'}
    ${'1.2.3'}  | ${''}          | ${'download/1.2.3/tool.phar'}
  `(
    'checking getUrl: $version_prefix$version',
    async ({version, version_prefix, url_suffix}) => {
      const data = getData({
        tool: 'tool',
        version: version,
        version_prefix: version_prefix
      });
      expect(await tools.getUrl(data)).toContain(url_suffix);
    }
  );

  it.each`
    version     | version_prefix | url
    ${'latest'} | ${''}          | ${'https://example.com/tool.phar'}
    ${'1.2.3'}  | ${'v'}         | ${'https://example.com/tool-v1.2.3.phar'}
  `(
    'checking getPharUrl: $version_prefix$version',
    async ({version, version_prefix, url}) => {
      const data = getData({
        tool: 'tool',
        version: version,
        version_prefix: version_prefix
      });
      expect(await tools.getPharUrl(data)).toBe(url);
    }
  );

  it.each`
    os_version   | script
    ${'linux'}   | ${'add_tool https://example.com/tool.phar tool "-v"'}
    ${'darwin'}  | ${'add_tool https://example.com/tool.phar tool "-v"'}
    ${'win32'}   | ${'Add-Tool https://example.com/tool.phar tool "-v"'}
    ${'openbsd'} | ${'Platform openbsd is not supported'}
  `('checking addArchive: $os_version', async ({os_version, script}) => {
    const data = getData({
      tool: 'tool',
      version: 'latest',
      version_parameter: JSON.stringify('-v'),
      os_version: os_version
    });
    data['url'] = 'https://example.com/tool.phar';
    expect(await tools.addArchive(data)).toContain(script);
  });

  it.each`
    os_version   | script
    ${'linux'}   | ${'add_composertool tool tool:1.2.3 user/'}
    ${'darwin'}  | ${'add_composertool tool tool:1.2.3 user/'}
    ${'win32'}   | ${'Add-Composertool tool tool:1.2.3 user/'}
    ${'openbsd'} | ${'Platform openbsd is not supported'}
  `('checking addPackage: $os_version', async ({os_version, script}) => {
    const data = getData({
      tool: 'tool',
      version: '1.2.3',
      repository: 'user/tool',
      os_version: os_version
    });
    data['release'] = [data['tool'], data['version']].join(':');
    expect(await tools.addPackage(data)).toContain(script);
  });

  it.each`
    version     | php_version | os_version  | script
    ${'latest'} | ${'7.4'}    | ${'linux'}  | ${'add_tool https://phar.io/releases/phive.phar phive'}
    ${'1.2.3'}  | ${'7.4'}    | ${'darwin'} | ${'add_tool https://github.com/phar-io/phive/releases/download/1.2.3/phive-1.2.3.phar phive'}
    ${'1.2.3'}  | ${'7.1'}    | ${'win32'}  | ${'Add-Tool https://github.com/phar-io/phive/releases/download/0.13.5/phive-0.13.5.phar phive'}
    ${'latest'} | ${'5.6'}    | ${'win32'}  | ${'Add-Tool https://github.com/phar-io/phive/releases/download/0.12.1/phive-0.12.1.phar phive'}
    ${'latest'} | ${'5.5'}    | ${'win32'}  | ${'Phive is not supported on PHP 5.5'}
  `(
    'checking addPhive: $version, $php_version, $os_version',
    async ({version, php_version, os_version, script}) => {
      const data = getData({
        tool: 'phive',
        domain: 'https://phar.io',
        repository: 'phar-io/phive',
        version_parameter: 'status',
        version: version,
        php_version: php_version,
        os_version: os_version
      });
      script = await tools.addPhive(data);
      expect(script).toContain(script);
    }
  );

  it.each`
    version     | php_version | url
    ${'latest'} | ${'7.4'}    | ${'https://get.blackfire.io/blackfire-player.phar'}
    ${'1.2.3'}  | ${'7.4'}    | ${'https://get.blackfire.io/blackfire-player-v1.2.3.phar'}
    ${'latest'} | ${'5.5'}    | ${'https://get.blackfire.io/blackfire-player-v1.9.3.phar'}
    ${'latest'} | ${'7.0'}    | ${'https://get.blackfire.io/blackfire-player-v1.9.3.phar'}
  `(
    'checking addBlackfirePlayer: $version, $php_version',
    async ({version, php_version, url}) => {
      const data = getData({
        tool: 'blackfire-player',
        domain: 'https://get.blackfire.io',
        version_prefix: 'v',
        version: version,
        php_version: php_version
      });
      expect(await tools.addBlackfirePlayer(data)).toContain(url);
    }
  );

  it.each`
    version     | url
    ${'latest'} | ${'https://deployer.org/deployer.phar'}
    ${'1.2.3'}  | ${'https://deployer.org/releases/v1.2.3/deployer.phar'}
  `('checking addDeployer: $version', async ({version, url}) => {
    const data = getData({
      tool: 'deployer',
      domain: 'https://deployer.org',
      version: version
    });
    expect(await tools.addDeployer(data)).toContain(url);
  });

  it.each`
    version        | cache_url                                                                                           | source_url
    ${'latest'}    | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-stable.phar'}   | ${'https://getcomposer.org/composer-stable.phar'}
    ${'stable'}    | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-stable.phar'}   | ${'https://getcomposer.org/composer-stable.phar'}
    ${'snapshot'}  | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-snapshot.phar'} | ${'https://getcomposer.org/composer.phar'}
    ${'preview'}   | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-preview.phar'}  | ${'https://getcomposer.org/composer-preview.phar'}
    ${'1'}         | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-1.phar'}        | ${'https://getcomposer.org/composer-1.phar'}
    ${'2'}         | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-2.phar'}        | ${'https://getcomposer.org/composer-2.phar'}
    ${'1.2.3'}     | ${'https://github.com/composer/composer/releases/download/1.2.3/composer.phar'}                     | ${'https://getcomposer.org/composer-1.2.3.phar'}
    ${'1.2.3-RC1'} | ${'https://github.com/composer/composer/releases/download/1.2.3-RC1/composer.phar'}                 | ${'https://getcomposer.org/composer-1.2.3-RC1.phar'}
  `(
    'checking addComposer: $version',
    async ({version, cache_url, source_url}) => {
      const data = getData({
        tool: 'composer',
        domain: 'https://getcomposer.org',
        repository: 'composer/composer',
        version: version
      });
      expect(await tools.addComposer(data)).toContain(cache_url);
      expect(await tools.addComposer(data)).toContain(source_url);
    }
  );

  it.each`
    version     | os_version   | uri
    ${'latest'} | ${'linux'}   | ${'releases/latest/download/symfony_linux_amd64'}
    ${'1.2.3'}  | ${'linux'}   | ${'releases/download/v1.2.3/symfony_linux_amd64'}
    ${'latest'} | ${'darwin'}  | ${'releases/latest/download/symfony_darwin_amd64'}
    ${'1.2.3'}  | ${'darwin'}  | ${'releases/download/v1.2.3/symfony_darwin_amd64'}
    ${'latest'} | ${'win32'}   | ${'releases/latest/download/symfony_windows_amd64.exe'}
    ${'1.2.3'}  | ${'win32'}   | ${'releases/download/v1.2.3/symfony_windows_amd64.exe'}
    ${'latest'} | ${'openbsd'} | ${'Platform openbsd is not supported'}
  `(
    'checking addSymfony: $version, $os_version',
    async ({version, os_version, uri}) => {
      const data = getData({
        tool: 'symfony',
        php_version: '7.4',
        version: version,
        os_version: os_version
      });
      expect(await tools.addSymfony(data)).toContain(uri);
    }
  );

  it.each`
    version     | uri
    ${'latest'} | ${'wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true'}
    ${'1.2.3'}  | ${'wp-cli/wp-cli/releases/download/v1.2.3/wp-cli-1.2.3.phar'}
  `('checking addWPCLI: $version', async ({version, uri}) => {
    const data = getData({
      tool: 'wp-cli',
      repository: 'wp-cli/wp-cli',
      php_version: '7.4',
      version_prefix: 'v',
      version: version
    });
    expect(await tools.addWPCLI(data)).toContain(uri);
  });

  it.each`
    tool            | os_version   | script
    ${'phpize'}     | ${'linux'}   | ${'add_devtools phpize'}
    ${'php-config'} | ${'linux'}   | ${'add_devtools php-config'}
    ${'phpize'}     | ${'darwin'}  | ${'add_devtools phpize'}
    ${'php-config'} | ${'darwin'}  | ${'add_devtools php-config'}
    ${'phpize'}     | ${'win32'}   | ${'Add-Log "$tick" "phpize" "phpize is not a windows tool"'}
    ${'php-config'} | ${'win32'}   | ${'Add-Log "$tick" "php-config" "php-config is not a windows tool"'}
    ${'phpize'}     | ${'openbsd'} | ${'Platform openbsd is not supported'}
  `(
    'checking addDevTools: $tool, $os_version',
    async ({tool, os_version, script}) => {
      const data = getData({
        version: '7.4',
        tool: tool,
        os_version: os_version
      });
      expect(await tools.addDevTools(data)).toContain(script);
    }
  );

  it.each([
    [
      'blackfire, blackfire-player, cs2pr, flex, grpc_php_plugin, php-cs-fixer, phplint, phpstan, phpunit, pecl, phing, phinx, phinx:1.2.3, phive, phpunit-bridge, php-config, phpize, protoc, symfony, vapor, wp',
      [
        'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-stable.phar,https://getcomposer.org/composer-stable.phar composer',
        'add_blackfire',
        'add_tool https://get.blackfire.io/blackfire-player.phar blackfire-player "-V"',
        'add_tool https://github.com/staabm/annotate-pull-request-from-checkstyle/releases/latest/download/cs2pr cs2pr "-V"',
        'add_composertool flex flex symfony/',
        'add_grpc_php_plugin latest',
        'add_tool https://github.com/FriendsOfPHP/PHP-CS-Fixer/releases/latest/download/php-cs-fixer.phar php-cs-fixer "-V"',
        'add_composertool phplint phplint overtrue/',
        'add_tool https://github.com/phpstan/phpstan/releases/latest/download/phpstan.phar phpstan "-V"',
        'add_tool https://phar.phpunit.de/phpunit.phar phpunit "--version"',
        'add_pecl',
        'add_tool https://www.phing.info/get/phing-latest.phar phing "-v"',
        'add_composertool phinx phinx robmorgan/',
        'add_composertool phinx phinx:1.2.3 robmorgan/',
        'add_tool https://phar.io/releases/phive.phar phive "status"',
        'add_composertool phpunit-bridge phpunit-bridge symfony/',
        'add_devtools php-config',
        'add_devtools phpize',
        'add_protoc latest',
        'add_tool https://github.com/symfony/cli/releases/latest/download/symfony_linux_amd64 symfony-cli "version"',
        'add_composertool vapor-cli vapor-cli laravel/',
        'add_tool https://github.com/wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true wp-cli "--version"'
      ]
    ]
  ])('checking addTools on linux', async (tools_csv, scripts) => {
    const expected = await tools.addTools(tools_csv, '7.4', 'linux');
    scripts.forEach(script => {
      expect(expected).toContain(script);
    });
  });

  it.each([
    [
      'behat, blackfire, blackfire-player, composer-normalize, composer-require-checker, composer-unused, cs2pr:1.2.3, flex, grpc_php_plugin:1.2.3, infection, phan, phan:1.2.3, phing:1.2.3, phinx, phive:1.2.3, php-config, phpcbf, phpcpd, phpcs, phpize, phpmd, phpspec, phpunit-bridge:5.6, protoc:v1.2.3, psalm, symfony-cli, symfony:1.2.3, vapor-cli, wp-cli',
      [
        'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-stable.phar,https://getcomposer.org/composer-stable.phar composer',
        'add_composertool behat behat behat/',
        'add_blackfire',
        'add_tool https://get.blackfire.io/blackfire-player.phar blackfire-player "-V"',
        'add_tool https://github.com/ergebnis/composer-normalize/releases/latest/download/composer-normalize.phar composer-normalize "-V"',
        'add_composertool composer-require-checker composer-require-checker maglnet/',
        'add_composertool composer-unused composer-unused icanhazstring/',
        'add_tool https://github.com/staabm/annotate-pull-request-from-checkstyle/releases/download/1.2.3/cs2pr cs2pr "-V"',
        'add_composertool flex flex symfony/',
        'add_grpc_php_plugin 1.2.3',
        'add_tool https://github.com/infection/infection/releases/latest/download/infection.phar infection "-V"',
        'add_tool https://github.com/phan/phan/releases/latest/download/phan.phar phan "-v"',
        'add_tool https://github.com/phan/phan/releases/download/1.2.3/phan.phar phan "-v"',
        'add_tool https://www.phing.info/get/phing-1.2.3.phar phing "-v"',
        'add_composertool phinx phinx robmorgan/',
        'add_tool https://github.com/phar-io/phive/releases/download/1.2.3/phive-1.2.3.phar phive',
        'add_devtools php-config',
        'add_tool https://github.com/squizlabs/PHP_CodeSniffer/releases/latest/download/phpcbf.phar phpcbf "--version"',
        'add_tool https://phar.phpunit.de/phpcpd.phar phpcpd "--version"',
        'add_tool https://github.com/squizlabs/PHP_CodeSniffer/releases/latest/download/phpcs.phar phpcs "--version"',
        'add_devtools phpize',
        'add_tool https://github.com/phpmd/phpmd/releases/latest/download/phpmd.phar phpmd "--version"',
        'add_composertool phpspec phpspec phpspec/',
        'add_composertool phpunit-bridge phpunit-bridge:5.6.* symfony/',
        'add_protoc 1.2.3',
        'add_tool https://github.com/vimeo/psalm/releases/latest/download/psalm.phar psalm "-v"',
        'add_tool https://github.com/symfony/cli/releases/latest/download/symfony_darwin_amd64 symfony-cli "version"',
        'add_tool https://github.com/symfony/cli/releases/download/v1.2.3/symfony_darwin_amd64 symfony-cli "version"',
        'add_composertool vapor-cli vapor-cli laravel/',
        'add_tool https://github.com/wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true wp-cli "--version"'
      ]
    ]
  ])('checking addTools on darwin', async (tools_csv, scripts) => {
    const expected = await tools.addTools(tools_csv, '7.4', 'darwin');
    scripts.forEach(script => {
      expect(expected).toContain(script);
    });
  });

  it.each([
    [
      'blackfire, blackfire-player:1.2.3, cs2pr, deployer, does_not_exist, flex, phinx, phive:0.13.2, php-config, phpize, phpmd, simple-phpunit, symfony, wp',
      [
        'Add-Tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-stable.phar,https://getcomposer.org/composer-stable.phar composer',
        'Add-Blackfire',
        'Add-Tool https://get.blackfire.io/blackfire-player-v1.2.3.phar blackfire-player "-V"',
        'Add-Tool https://github.com/staabm/annotate-pull-request-from-checkstyle/releases/latest/download/cs2pr cs2pr "-V"',
        'Add-Tool https://deployer.org/deployer.phar deployer "-V"',
        'Tool does_not_exist is not supported',
        'Add-Composertool flex flex symfony/',
        'Add-Composertool phinx phinx robmorgan/',
        'Add-Tool https://github.com/phar-io/phive/releases/download/0.13.2/phive-0.13.2.phar phive "status"',
        'php-config is not a windows tool',
        'phpize is not a windows tool',
        'Add-Tool https://github.com/phpmd/phpmd/releases/latest/download/phpmd.phar phpmd "--version"',
        'Add-Composertool phpunit-bridge phpunit-bridge symfony/',
        'Add-Tool https://github.com/symfony/cli/releases/latest/download/symfony_windows_amd64.exe symfony-cli "version"',
        'Add-Tool https://github.com/wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true wp-cli "--version"'
      ]
    ]
  ])('checking addTools on Windows', async (tools_csv, scripts) => {
    const expected = await tools.addTools(tools_csv, '7.4', 'win32');
    scripts.forEach(script => {
      expect(expected).toContain(script);
    });
  });

  it.each([
    [
      'composer:v1, codeception/codeception, prestissimo, hirak/prestissimo, composer-prefetcher, narrowspark/automatic-composer-prefetcher, phinx: 1.2, robmorgan/phinx: ^1.2, user/tool:1.2.3, user/tool:~1.2',
      [
        'Add-Tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-1.phar,https://getcomposer.org/composer-1.phar composer',
        'Add-Composertool codeception codeception codeception/',
        'Add-Composertool prestissimo prestissimo hirak/',
        'Add-Composertool automatic-composer-prefetcher automatic-composer-prefetcher narrowspark/',
        'Add-Composertool phinx phinx:1.2.* robmorgan/',
        'Add-Composertool phinx phinx:^1.2 robmorgan/',
        'Add-Composertool tool tool:1.2.3 user/',
        'Add-Composertool tool tool:~1.2 user/'
      ]
    ]
  ])(
    'checking addTools with composer tool using user/tool as input',
    async (tools_csv, scripts) => {
      const expected = await tools.addTools(tools_csv, '7.4', 'win32');
      scripts.forEach(script => {
        expect(expected).toContain(script);
      });
    }
  );

  it.each`
    tools_csv                                             | script
    ${'none'}                                             | ${''}
    ${'none, phpunit'}                                    | ${'\nstep_log "Setup Tools"\nadd_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-stable.phar,https://getcomposer.org/composer-stable.phar composer latest\n\nadd_tool https://phar.phpunit.de/phpunit.phar phpunit "--version"'}
    ${'composer:preview'}                                 | ${'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-preview.phar,https://getcomposer.org/composer-preview.phar composer preview'}
    ${'composer, composer:v1'}                            | ${'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-1.phar,https://getcomposer.org/composer-1.phar composer'}
    ${'composer:v1, composer:preview, composer:snapshot'} | ${'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-snapshot.phar,https://getcomposer.org/composer.phar composer snapshot'}
  `('checking composer setup: $tools_csv', async ({tools_csv, script}) => {
    expect(await tools.addTools(tools_csv, '7.4', 'linux')).toContain(script);
  });

  it.each`
    tools_csv        | token              | script
    ${'cs2pr:1.2'}   | ${'invalid_token'} | ${'add_log "$cross" "cs2pr" "Invalid token"'}
    ${'phpunit:1.2'} | ${'invalid_token'} | ${'add_log "$cross" "phpunit" "Invalid token"'}
    ${'phpunit:0.1'} | ${'no_data'}       | ${'add_log "$cross" "phpunit" "No version found with prefix 0.1."'}
  `('checking error: $tools_csv', async ({tools_csv, token, script}) => {
    process.env['COMPOSER_TOKEN'] = token;
    expect(await tools.addTools(tools_csv, '7.4', 'linux')).toContain(script);
  });
});
