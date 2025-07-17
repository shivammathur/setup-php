import * as fs from 'fs';
import * as tools from '../src/tools';

interface IData {
  tool: string;
  version?: string;
  domain?: string;
  extension?: string;
  os?: string;
  php_version?: string;
  release?: string;
  repository?: string;
  scope?: string;
  type?: string;
  fetch_latest?: string;
  version_parameter?: string;
  version_prefix?: string;
}

function getData(data: IData): Record<string, string> {
  return {
    tool: data.tool,
    version: data.version || '',
    domain: data.domain || 'https://example.com',
    extension: data.extension || '.phar',
    os: data.os || 'linux',
    php_version: data.php_version || '7.4',
    release: data.release || [data.tool, data.version].join(':'),
    repository: data.repository || '',
    scope: data.scope || 'global',
    type: data.type || 'phar',
    fetch_latest: data.fetch_latest || 'false',
    version_parameter: data.version_parameter || '-V',
    version_prefix: data.version_prefix || '',
    github: 'https://github.com',
    prefix: 'releases',
    verb: 'download'
  };
}

/**
 * Mock fetch.ts
 */
jest.mock('../src/fetch', () => ({
  fetch: jest
    .fn()
    .mockImplementation(
      async (url: string, token?: string): Promise<Record<string, string>> => {
        if (url.includes('deployer')) {
          return {
            data: '[{"version": "1.2.3", "url": "https://deployer.org/releases/v1.2.3/deployer.phar"}]'
          };
        } else if (url.includes('atom') && !url.includes('no-')) {
          return {
            data: '"releases/tag/1.2.3", "releases/tag/3.2.1", "releases/tag/2.3.1"'
          };
        } else if (url.includes('no-data')) {
          return {};
        } else if (url.includes('no-release')) {
          return {data: 'no-release'};
        } else if (!token || token === 'valid_token') {
          return {data: `[{"ref": "refs/tags/1.2.3", "url": "${url}"}]`};
        } else if (token === 'beta_token') {
          return {data: `[{"ref": "refs/tags/1.2.3-beta1", "url": "${url}"}]`};
        } else if (token === 'no_data') {
          return {data: '[]'};
        } else {
          return {error: 'Invalid token'};
        }
      }
    )
}));

jest.mock('../src/packagist', () => ({
  search: jest
    .fn()
    .mockImplementation(
      async (
        package_name: string,
        php_version: string
      ): Promise<string | null> => {
        if (package_name === 'phpunit/phpunit') {
          return php_version + '.0';
        }
        return null;
      }
    )
}));

describe('Tools tests', () => {
  it.each`
    token              | version
    ${'invalid_token'} | ${'1.2'}
    ${'valid_token'}   | ${'1.2.3'}
    ${'beta_token'}    | ${'1.2.3-beta1'}
    ${''}              | ${'1.2.3'}
  `('checking getSemverVersion: $token', async ({token, version}) => {
    process.env['GITHUB_TOKEN'] = token;
    expect(
      await tools.getSemverVersion(getData({tool: 'tool', version: '1.2'}))
    ).toBe(version);
  });

  it.each`
    tool                 | fetch_latest | version
    ${'tool'}            | ${'true'}    | ${'3.2.1'}
    ${'tool-no-data'}    | ${'true'}    | ${'latest'}
    ${'tool-no-release'} | ${'true'}    | ${'latest'}
    ${'tool'}            | ${'false'}   | ${'latest'}
  `(
    'checking getLatestVersion: $tool, $fetch_latest, $version',
    async ({tool, fetch_latest, version}) => {
      expect(
        await tools.getLatestVersion(
          getData({
            tool: tool,
            repository: 'user/' + tool,
            fetch_latest: fetch_latest
          })
        )
      ).toBe(version);
    }
  );

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
    os           | script
    ${'linux'}   | ${'add_tool https://example.com/tool.phar tool "-v"'}
    ${'darwin'}  | ${'add_tool https://example.com/tool.phar tool "-v"'}
    ${'win32'}   | ${'Add-Tool https://example.com/tool.phar tool "-v"'}
    ${'openbsd'} | ${'Platform openbsd is not supported'}
  `('checking addArchive: $os', async ({os, script}) => {
    const data = getData({
      tool: 'tool',
      version: 'latest',
      version_parameter: JSON.stringify('-v'),
      os: os
    });
    data['url'] = 'https://example.com/tool.phar';
    expect(await tools.addArchive(data)).toContain(script);
  });

  it.each`
    os           | script                                              | scope
    ${'linux'}   | ${'add_composer_tool tool tool:1.2.3 user/ global'} | ${'global'}
    ${'darwin'}  | ${'add_composer_tool tool tool:1.2.3 user/ scoped'} | ${'scoped'}
    ${'win32'}   | ${'Add-ComposerTool tool tool:1.2.3 user/ scoped'}  | ${'scoped'}
    ${'openbsd'} | ${'Platform openbsd is not supported'}              | ${'global'}
  `('checking addPackage: $os, $scope', async ({os, script, scope}) => {
    const data = getData({
      tool: 'tool',
      version: '1.2.3',
      repository: 'user/tool',
      os: os,
      scope: scope
    });
    data['release'] = [data['tool'], data['version']].join(':');
    expect(await tools.addPackage(data)).toContain(script);
  });

  it.each`
    version     | php_version | os          | script
    ${'latest'} | ${'8.0'}    | ${'linux'}  | ${'add_tool https://github.com/phar-io/phive/releases/download/3.2.1/phive-3.2.1.phar phive'}
    ${'1.2.3'}  | ${'8.0'}    | ${'darwin'} | ${'add_tool https://github.com/phar-io/phive/releases/download/1.2.3/phive-1.2.3.phar phive'}
    ${'1.2.3'}  | ${'7.4'}    | ${'win32'}  | ${'Add-Tool https://github.com/phar-io/phive/releases/download/0.15.3/phive-0.15.3.phar phive'}
    ${'1.2.3'}  | ${'7.2'}    | ${'win32'}  | ${'Add-Tool https://github.com/phar-io/phive/releases/download/0.14.5/phive-0.14.5.phar phive'}
    ${'1.2.3'}  | ${'7.1'}    | ${'win32'}  | ${'Add-Tool https://github.com/phar-io/phive/releases/download/0.13.5/phive-0.13.5.phar phive'}
    ${'latest'} | ${'5.6'}    | ${'win32'}  | ${'Add-Tool https://github.com/phar-io/phive/releases/download/0.12.1/phive-0.12.1.phar phive'}
    ${'latest'} | ${'5.5'}    | ${'win32'}  | ${'Phive is not supported on PHP 5.5'}
  `(
    'checking addPhive: $version, $php_version, $os',
    async ({version, php_version, os, script}) => {
      const data = getData({
        tool: 'phive',
        repository: 'phar-io/phive',
        version_parameter: 'status',
        version: version,
        php_version: php_version,
        os: os
      });
      script = await tools.addPhive(data);
      expect(script).toContain(script);
    }
  );

  it.each`
    os         | version     | php_version | url
    ${'linux'} | ${'latest'} | ${'8.1'}    | ${'https://get.blackfire.io/blackfire-player.phar'}
    ${'linux'} | ${'1.2.3'}  | ${'7.4'}    | ${'https://get.blackfire.io/blackfire-player-v1.2.3.phar'}
    ${'linux'} | ${'latest'} | ${'7.4'}    | ${'https://get.blackfire.io/blackfire-player-v1.22.0.phar'}
    ${'linux'} | ${'latest'} | ${'5.5'}    | ${'https://get.blackfire.io/blackfire-player-v1.9.3.phar'}
    ${'linux'} | ${'latest'} | ${'7.0'}    | ${'https://get.blackfire.io/blackfire-player-v1.9.3.phar'}
    ${'win32'} | ${'latest'} | ${'7.0'}    | ${'blackfire-player is not a windows tool'}
  `(
    'checking addBlackfirePlayer: $os, $version, $php_version',
    async ({os, version, php_version, url}) => {
      const data = getData({
        os: os,
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
    ${'3.2.1'}  | ${'Version missing in deployer manifest'}
  `('checking addDeployer: $version', async ({version, url}) => {
    const data = getData({
      tool: 'deployer',
      domain: 'https://deployer.org',
      version: version
    });
    expect(await tools.addDeployer(data)).toContain(url);
  });

  it.each`
    version        | php_version | no_tool_cache | cache_url                                                                                               | source_url
    ${'latest'}    | ${'7.4'}    | ${'true'}     | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-stable.phar'}   | ${'https://getcomposer.org/composer-stable.phar'}
    ${'stable'}    | ${'7.4'}    | ${'true'}     | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-stable.phar'}   | ${'https://getcomposer.org/composer-stable.phar'}
    ${'snapshot'}  | ${'7.4'}    | ${'true'}     | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-snapshot.phar'} | ${'https://getcomposer.org/composer.phar'}
    ${'preview'}   | ${'7.4'}    | ${'true'}     | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-preview.phar'}  | ${'https://getcomposer.org/composer-preview.phar'}
    ${'1'}         | ${'7.4'}    | ${'false'}    | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-1.phar'}        | ${'https://getcomposer.org/composer-1.phar'}
    ${'2'}         | ${'7.4'}    | ${'false'}    | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-2.phar'}        | ${'https://getcomposer.org/composer-2.phar'}
    ${'latest'}    | ${'7.4'}    | ${'true'}     | ${'https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-stable.phar'}     | ${'https://getcomposer.org/composer-stable.phar'}
    ${'stable'}    | ${'7.4'}    | ${'true'}     | ${'https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-stable.phar'}     | ${'https://getcomposer.org/composer-stable.phar'}
    ${'snapshot'}  | ${'7.4'}    | ${'true'}     | ${'https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-snapshot.phar'}   | ${'https://getcomposer.org/composer.phar'}
    ${'preview'}   | ${'7.4'}    | ${'true'}     | ${'https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-preview.phar'}    | ${'https://getcomposer.org/composer-preview.phar'}
    ${'1'}         | ${'7.4'}    | ${'false'}    | ${'https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-1.phar'}          | ${'https://getcomposer.org/composer-1.phar'}
    ${'2'}         | ${'7.4'}    | ${'false'}    | ${'https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-2.phar'}          | ${'https://getcomposer.org/composer-2.phar'}
    ${'latest'}    | ${'7.1'}    | ${'true'}     | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.1-stable.phar'}   | ${'https://getcomposer.org/download/latest-2.2.x/composer.phar'}
    ${'stable'}    | ${'7.1'}    | ${'true'}     | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.1-stable.phar'}   | ${'https://getcomposer.org/download/latest-2.2.x/composer.phar'}
    ${'snapshot'}  | ${'7.1'}    | ${'true'}     | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.1-snapshot.phar'} | ${'https://getcomposer.org/download/latest-2.2.x/composer.phar'}
    ${'preview'}   | ${'7.1'}    | ${'true'}     | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.1-preview.phar'}  | ${'https://getcomposer.org/download/latest-2.2.x/composer.phar'}
    ${'1'}         | ${'7.1'}    | ${'false'}    | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.1-1.phar'}        | ${'https://getcomposer.org/composer-1.phar'}
    ${'2'}         | ${'7.1'}    | ${'false'}    | ${'https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.1-2.phar'}        | ${'https://getcomposer.org/download/latest-2.2.x/composer.phar'}
    ${'1.2.3'}     | ${'7.4'}    | ${'false'}    | ${'https://github.com/composer/composer/releases/download/1.2.3/composer.phar'}                         | ${'https://getcomposer.org/composer-1.2.3.phar'}
    ${'1.2.3-RC1'} | ${'7.4'}    | ${'false'}    | ${'https://github.com/composer/composer/releases/download/1.2.3-RC1/composer.phar'}                     | ${'https://getcomposer.org/composer-1.2.3-RC1.phar'}
  `(
    'checking addComposer: $version, $php_version, $no_tool_cache',
    async ({version, php_version, no_tool_cache, cache_url, source_url}) => {
      const data = getData({
        tool: 'composer',
        php_version: php_version,
        domain: 'https://getcomposer.org',
        repository: 'composer/composer',
        version: version
      });
      process.env['no_tools_cache'] = no_tool_cache;
      expect(await tools.addComposer(data)).toContain(source_url);
      if (no_tool_cache !== 'true') {
        expect(await tools.addComposer(data)).toContain(cache_url);
      }
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
    tool            | os           | script
    ${'phpize'}     | ${'linux'}   | ${'add_devtools phpize'}
    ${'php-config'} | ${'linux'}   | ${'add_devtools php-config'}
    ${'phpize'}     | ${'darwin'}  | ${'add_devtools phpize'}
    ${'php-config'} | ${'darwin'}  | ${'add_devtools php-config'}
    ${'phpize'}     | ${'win32'}   | ${'Add-Log "$tick" "phpize" "phpize is not a windows tool"'}
    ${'php-config'} | ${'win32'}   | ${'Add-Log "$tick" "php-config" "php-config is not a windows tool"'}
    ${'phpize'}     | ${'openbsd'} | ${'Platform openbsd is not supported'}
  `('checking addDevTools: $tool, $os', async ({tool, os, script}) => {
    const data = getData({
      version: '7.4',
      tool: tool,
      os: os
    });
    expect(await tools.addDevTools(data)).toContain(script);
  });

  it.each([
    [
      'blackfire, blackfire-player, box, churn, cs2pr, flex, grpc_php_plugin, mago, name-collision-detector, parallel-lint, php-cs-fixer, php-scoper, phpDocumentor, phplint, phpstan, phpunit, pecl, phing, phinx, phinx:1.2.3, phive, phpunit-bridge, phpunit-polyfills, pint, php-config, phpize, protoc, symfony, vapor, wp, pie',
      [
        'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-stable.phar,https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-stable.phar,https://getcomposer.org/composer-stable.phar composer',
        'add_blackfire',
        'add_tool https://get.blackfire.io/blackfire-player-v1.22.0.phar blackfire-player "-V"',
        'add_tool https://github.com/box-project/box/releases/latest/download/box.phar box "--version"',
        'add_tool https://github.com/bmitch/churn-php/releases/latest/download/churn.phar churn "-V"',
        'add_tool https://github.com/staabm/annotate-pull-request-from-checkstyle/releases/latest/download/cs2pr cs2pr "-V"',
        'add_composer_tool flex flex symfony/ global',
        'add_grpc_php_plugin latest',
        'add_mago',
        'add_composer_tool name-collision-detector name-collision-detector shipmonk/ scoped',
        'add_tool https://github.com/php-parallel-lint/PHP-Parallel-Lint/releases/latest/download/parallel-lint.phar parallel-lint "--version"',
        'add_tool https://github.com/PHP-CS-Fixer/PHP-CS-Fixer/releases/download/v3.2.1/php-cs-fixer.phar php-cs-fixer "-V"',
        'add_tool https://github.com/humbug/php-scoper/releases/latest/download/php-scoper.phar php-scoper "--version"',
        'add_tool https://github.com/phpDocumentor/phpDocumentor/releases/latest/download/phpDocumentor.phar phpDocumentor "--version"',
        'add_composer_tool phplint phplint overtrue/',
        'add_tool https://github.com/phpstan/phpstan/releases/latest/download/phpstan.phar phpstan "-V"',
        'add_tool https://phar.phpunit.de/phpunit-7.4.0.phar,https://phar.phpunit.de/phpunit-7.phar phpunit "--version"',
        'add_pecl',
        'add_tool https://www.phing.info/get/phing-latest.phar phing "-v"',
        'add_composer_tool phinx phinx robmorgan/ scoped',
        'add_composer_tool phinx phinx:1.2.3 robmorgan/ scoped',
        'add_tool https://github.com/phar-io/phive/releases/download/0.15.3/phive-0.15.3.phar phive "status"',
        'add_composer_tool phpunit-bridge phpunit-bridge symfony/ global',
        'add_composer_tool phpunit-polyfills phpunit-polyfills yoast/ global',
        'add_tool https://github.com/laravel/pint/releases/latest/download/pint.phar pint "-V"',
        'add_devtools php-config',
        'add_devtools phpize',
        'add_protoc latest',
        'add_symfony latest',
        'add_composer_tool vapor-cli vapor-cli laravel/ scoped',
        'add_tool https://github.com/wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true wp-cli "--version"',
        'add_tool https://github.com/php/pie/releases/latest/download/pie.phar pie "-V"'
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
      'backward-compatibility-check, behat, blackfire, blackfire-player, churn, composer-dependency-analyser, composer-normalize, composer-require-checker, composer-unused, cs2pr:1.2.3, ecs, flex, grpc_php_plugin:1.2.3, infection, mago:0.26.1, name-collision-detector, phan, phan:1.2.3, phing:1.2.3, phinx, phive:1.2.3, php-config, phpcbf, phpcpd, phpcs, phpdoc, phpize, phpmd, phpspec, phpunit-bridge:5.6, phpunit-polyfills:1.0.1, protoc:v1.2.3, psalm, rector, symfony-cli, vapor-cli, wp-cli, pie',
      [
        'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-stable.phar,https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-stable.phar,https://getcomposer.org/composer-stable.phar composer',
        'add_composer_tool behat behat behat/ scoped',
        'add_blackfire',
        'add_tool https://get.blackfire.io/blackfire-player-v1.22.0.phar blackfire-player "-V"',
        'add_tool https://github.com/bmitch/churn-php/releases/latest/download/churn.phar churn "-V"',
        'add_tool https://github.com/ergebnis/composer-normalize/releases/latest/download/composer-normalize.phar composer-normalize "diagnose"',
        'add_composer_tool composer-dependency-analyser composer-dependency-analyser shipmonk/ scoped',
        'add_composer_tool composer-require-checker composer-require-checker maglnet/ scoped',
        'add_tool https://github.com/composer-unused/composer-unused/releases/latest/download/composer-unused.phar composer-unused "-V"',
        'add_tool https://github.com/staabm/annotate-pull-request-from-checkstyle/releases/download/1.2.3/cs2pr cs2pr "-V"',
        'add_composer_tool flex flex symfony/ global',
        'add_grpc_php_plugin 1.2.3',
        'add_tool https://github.com/infection/infection/releases/latest/download/infection.phar infection "-V"',
        'add_mago 0.26.1',
        'add_composer_tool name-collision-detector name-collision-detector shipmonk/ scoped',
        'add_tool https://github.com/phan/phan/releases/latest/download/phan.phar phan "-v"',
        'add_tool https://github.com/phan/phan/releases/download/1.2.3/phan.phar phan "-v"',
        'add_tool https://www.phing.info/get/phing-1.2.3.phar,https://github.com/phingofficial/phing/releases/download/1.2.3/phing-1.2.3.phar phing "-v"',
        'add_composer_tool phinx phinx robmorgan/ scoped',
        'add_tool https://github.com/phar-io/phive/releases/download/0.15.3/phive-0.15.3.phar phive',
        'add_devtools php-config',
        'add_tool https://github.com/PHPCSStandards/PHP_CodeSniffer/releases/latest/download/phpcbf.phar phpcbf "--version"',
        'add_tool https://phar.phpunit.de/phpcpd.phar phpcpd "--version"',
        'add_tool https://github.com/PHPCSStandards/PHP_CodeSniffer/releases/latest/download/phpcs.phar phpcs "--version"',
        'add_tool https://github.com/phpDocumentor/phpDocumentor/releases/latest/download/phpDocumentor.phar phpDocumentor "--version"',
        'add_devtools phpize',
        'add_tool https://github.com/phpmd/phpmd/releases/latest/download/phpmd.phar phpmd "--version"',
        'add_tool https://github.com/phpspec/phpspec/releases/latest/download/phpspec.phar phpspec "-V"',
        'add_composer_tool phpunit-bridge phpunit-bridge:5.6.* symfony/ global',
        'add_composer_tool phpunit-polyfills phpunit-polyfills:1.0.1 yoast/ global',
        'add_protoc 1.2.3',
        'add_tool https://github.com/vimeo/psalm/releases/latest/download/psalm.phar psalm "-v"',
        'add_composer_tool rector rector rector/ scoped',
        'add_composer_tool backward-compatibility-check backward-compatibility-check roave/ scoped',
        'add_symfony latest',
        'add_composer_tool vapor-cli vapor-cli laravel/ scoped',
        'add_tool https://github.com/wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true wp-cli "--version"',
        'add_composer_tool easy-coding-standard easy-coding-standard symplify/ scoped',
        'add_tool https://github.com/php/pie/releases/latest/download/pie.phar pie "-V"'
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
      'blackfire, blackfire-player:1.2.3, cs2pr, churn, deployer, does_not_exist, flex, mago, name-collision-detector, phinx, phive:0.13.2, php-config, phpize, phpmd, simple-phpunit, symfony, wp, pie',
      [
        'Add-Tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-stable.phar,https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-stable.phar,https://getcomposer.org/composer-stable.phar composer',
        'Add-Blackfire',
        'blackfire-player is not a windows tool',
        'Add-Tool https://github.com/staabm/annotate-pull-request-from-checkstyle/releases/latest/download/cs2pr cs2pr "-V"',
        'Add-Tool https://github.com/bmitch/churn-php/releases/latest/download/churn.phar churn "-V"',
        'Add-Tool https://deployer.org/deployer.phar deployer "-V"',
        'Tool does_not_exist is not supported',
        'Add-ComposerTool flex flex symfony/ global',
        'Add-Mago',
        'Add-ComposerTool name-collision-detector name-collision-detector shipmonk/ scoped',
        'Add-ComposerTool phinx phinx robmorgan/ scoped',
        'Add-Tool https://github.com/phar-io/phive/releases/download/0.15.3/phive-0.15.3.phar phive "status"',
        'php-config is not a windows tool',
        'phpize is not a windows tool',
        'Add-Tool https://github.com/phpmd/phpmd/releases/latest/download/phpmd.phar phpmd "--version"',
        'Add-ComposerTool phpunit-bridge phpunit-bridge symfony/ global',
        'Add-Symfony',
        'Add-Tool https://github.com/wp-cli/builds/blob/gh-pages/phar/wp-cli.phar?raw=true wp-cli "--version"',
        'Add-Tool https://github.com/php/pie/releases/latest/download/pie.phar pie "-V"'
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
        'Add-Tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-1.phar,https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-1.phar,https://getcomposer.org/composer-1.phar composer',
        'Add-ComposerTool codeception codeception codeception/ global',
        'Add-ComposerTool prestissimo prestissimo hirak/ global',
        'Add-ComposerTool automatic-composer-prefetcher automatic-composer-prefetcher narrowspark/ global',
        'Add-ComposerTool phinx phinx:1.2.* robmorgan/ scoped',
        'Add-ComposerTool phinx phinx:^1.2 robmorgan/ global',
        'Add-ComposerTool tool tool:1.2.3 user/ global',
        'Add-ComposerTool tool tool:~1.2 user/ global'
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
    version     | os           | uri
    ${'latest'} | ${'linux'}   | ${'releases/latest/download/castor.linux-amd64.phar'}
    ${'0.5.1'}  | ${'linux'}   | ${'releases/download/v0.5.1/castor.linux-amd64.phar'}
    ${'latest'} | ${'darwin'}  | ${'releases/latest/download/castor.darwin-amd64.phar'}
    ${'0.5.1'}  | ${'darwin'}  | ${'releases/download/v0.5.1/castor.darwin-amd64.phar'}
    ${'latest'} | ${'win32'}   | ${'releases/latest/download/castor.windows-amd64.phar'}
    ${'0.5.1'}  | ${'win32'}   | ${'releases/download/v0.5.1/castor.windows-amd64.phar castor -V'}
    ${'latest'} | ${'openbsd'} | ${'Platform openbsd is not supported'}
  `('checking addCastor: $version, $os', async ({version, os, uri}) => {
    const data = getData({
      tool: 'castor',
      php_version: '8.1',
      version_prefix: 'v',
      version: version,
      os: os
    });
    if (os === 'win32' && version === '0.5.1') {
      fs.writeFileSync('castor.php', '');
      expect(await tools.addCastor(data)).toContain(uri);
      fs.unlinkSync('castor.php');
    } else {
      expect(await tools.addCastor(data)).toContain(uri);
    }
  });

  it.each`
    tools_csv                                             | script
    ${'none'}                                             | ${''}
    ${'none, phpunit'}                                    | ${'\nstep_log "Setup Tools"\nadd_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-stable.phar,https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-stable.phar,https://getcomposer.org/composer-stable.phar composer latest\n\nadd_tool https://phar.phpunit.de/phpunit-7.4.0.phar,https://phar.phpunit.de/phpunit-7.phar phpunit "--version"'}
    ${'composer:preview'}                                 | ${'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-preview.phar,https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-preview.phar,https://getcomposer.org/composer-preview.phar composer preview'}
    ${'composer, composer:v1'}                            | ${'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-1.phar,https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-1.phar,https://getcomposer.org/composer-1.phar composer'}
    ${'composer:v1, composer:preview, composer:snapshot'} | ${'add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-7.4-snapshot.phar,https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-7.4-snapshot.phar,https://getcomposer.org/composer.phar composer snapshot'}
  `('checking composer setup: $tools_csv', async ({tools_csv, script}) => {
    expect(await tools.addTools(tools_csv, '7.4', 'linux')).toContain(script);
  });

  it.each`
    tools_csv        | token              | script
    ${'cs2pr:1.2'}   | ${'invalid_token'} | ${'add_log "$cross" "cs2pr" "Invalid token"'}
    ${'phpunit:1.2'} | ${'invalid_token'} | ${'add_log "$cross" "phpunit" "Invalid token"'}
    ${'phpunit:0.1'} | ${'no_data'}       | ${'add_log "$cross" "phpunit" "No version found with prefix 0.1."'}
  `('checking error: $tools_csv', async ({tools_csv, token, script}) => {
    process.env['GITHUB_TOKEN'] = token;
    expect(await tools.addTools(tools_csv, '7.4', 'linux')).toContain(script);
  });

  it.each`
    tools_csv        | token              | script
    ${'cs2pr:1.2'}   | ${'invalid_token'} | ${'add_log "$cross" "cs2pr" "Invalid token"'}
    ${'phpunit:1.2'} | ${'invalid_token'} | ${'add_log "$cross" "phpunit" "Invalid token"'}
    ${'phpunit:0.1'} | ${'no_data'}       | ${'add_log "$cross" "phpunit" "No version found with prefix 0.1."'}
  `('checking error: $tools_csv', async ({tools_csv, token, script}) => {
    process.env['GITHUB_TOKEN'] = token;
    expect(await tools.addTools(tools_csv, '7.4', 'linux')).toContain(script);
  });

  it.each`
    tools_csv    | php_version | resolved
    ${'phpunit'} | ${'8.2'}    | ${'/phpunit-8.2.0.phar'}
    ${'phpunit'} | ${'8.1'}    | ${'/phpunit-8.1.0.phar'}
    ${'phpunit'} | ${'8.0'}    | ${'/phpunit-8.0.0.phar'}
    ${'phpunit'} | ${'7.3'}    | ${'/phpunit-7.3.0.phar'}
    ${'phpunit'} | ${'7.2'}    | ${'/phpunit-7.2.0.phar'}
    ${'phpunit'} | ${'7.1'}    | ${'/phpunit-7.1.0.phar'}
    ${'phpunit'} | ${'7.0'}    | ${'/phpunit-7.0.0.phar'}
  `(
    'checking error: $tools_csv',
    async ({tools_csv, php_version, resolved}) => {
      expect(await tools.addTools(tools_csv, php_version, 'linux')).toContain(
        resolved
      );
    }
  );
});
