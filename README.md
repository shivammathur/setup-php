<p align="center">
  <a href="https://github.com/marketplace/actions/setup-php-action" target="_blank">
    <img src="https://repository-images.githubusercontent.com/206578964/e0a18480-dc65-11e9-8dd3-b9ffbf5575fe" alt="Setup PHP in GitHub Actions" width="400">
  </a>
</p>

<h1 align="center">Setup PHP in GitHub Actions</h1>

<p align="center">
  <a href="https://github.com/shivammathur/setup-php" title="GitHub action to setup PHP"><img alt="GitHub Actions status" src="https://github.com/shivammathur/setup-php/workflows/Main%20workflow/badge.svg"></a>
  <a href="https://codecov.io/gh/shivammathur/setup-php" title="Code coverage"><img alt="Codecov Code Coverage" src="https://codecov.io/gh/shivammathur/setup-php/branch/master/graph/badge.svg"></a>
  <a href="https://github.com/shivammathur/setup-php/blob/master/LICENSE" title="license"><img alt="LICENSE" src="https://img.shields.io/badge/license-MIT-428f7e.svg"></a>
  <a href="#tada-php-support" title="PHP Versions Supported"><img alt="PHP Versions Supported" src="https://img.shields.io/badge/php-%3E%3D%205.3-8892BF.svg"></a>
</p>

Setup PHP with required extensions, php.ini configuration, code-coverage support and various tools like composer in [GitHub Actions](https://github.com/features/actions "GitHub Actions"). This action gives you a cross platform interface to setup the PHP environment you need to test your application. Refer to [Usage](#memo-usage "How to use this") section and [examples](#examples "Examples of use") to see how to use this.

## Contents

- [PHP Support](#tada-php-support)
- [OS/Platform Support](#cloud-osplatform-support)
  - [GitHub-Hosted Runners](#github-hosted-runners)
  - [Self-Hosted Runners](#self-hosted-runners)
- [PHP Extension Support](#heavy_plus_sign-php-extension-support)
- [Tools Support](#wrench-tools-support)
- [Coverage Support](#signal_strength-coverage-support)
  - [Xdebug](#xdebug)
  - [PCOV](#pcov)
  - [Disable Coverage](#disable-coverage)
- [Usage](#memo-usage)
  - [Inputs](#inputs)
  - [Basic Setup](#basic-setup)
  - [Matrix Setup](#matrix-setup)
  - [Nightly Build Setup](#nightly-build-setup)
  - [Self Hosted Setup](#self-hosted-setup)
  - [Local Testing Setup](#local-testing-setup)
  - [Thread Safe Setup](#thread-safe-setup)
  - [Force Update](#force-update)
  - [Verbose Setup](#verbose-setup)
  - [Cache Extensions](#cache-extensions)
  - [Cache Composer Dependencies](#cache-composer-dependencies)
  - [Cache Node.js Dependencies](#cache-nodejs-dependencies)
  - [Composer GitHub OAuth](#composer-github-oauth)
  - [Problem Matchers](#problem-matchers)
  - [Examples](#examples)
- [Versioning](#bookmark-versioning)
- [License](#scroll-license)
- [Contributions](#1-contributions)
- [Support This Project](#sparkling_heart-support-this-project)
- [Dependencies](#package-dependencies)
- [Further Reading](#bookmark_tabs-further-reading)

## :tada: PHP Support

|PHP Version|Stability|Release Support|Runner Support|
|--- |--- |--- |--- |
|`5.3`|`Stable`|`End of life`|`GitHub-hosted`|
|`5.4`|`Stable`|`End of life`|`GitHub-hosted`|
|`5.5`|`Stable`|`End of life`|`GitHub-hosted`|
|`5.6`|`Stable`|`End of life`|`GitHub-hosted`, `self-hosted`|
|`7.0`|`Stable`|`End of life`|`GitHub-hosted`, `self-hosted`|
|`7.1`|`Stable`|`End of life`|`GitHub-hosted`, `self-hosted`|
|`7.2`|`Stable`|`Security fixes only`|`GitHub-hosted`, `self-hosted`|
|`7.3`|`Stable`|`Active`|`GitHub-hosted`, `self-hosted`|
|`7.4`|`Stable`|`Active`|`GitHub-hosted`, `self-hosted`|
|`8.0`|`Nightly`|`In development`|`GitHub-hosted`, `self-hosted`|

**Note:** Specifying `8.0` in `php-version` input installs a nightly build of `PHP 8.0.0-dev` with `PHP JIT`, `Union Types v2` and other [new features](https://wiki.php.net/rfc#php_80 "New features implemented in PHP 8"). See [nightly build setup](#nightly-build-setup) for more information.

## :cloud: OS/Platform Support

Both `GitHub-hosted` runners and `self-hosted` runners are supported on the following operating systems.

### GitHub-Hosted Runners

|Virtual environment|YAML workflow label|Pre-installed PHP|
|--- |--- |--- |
|Ubuntu 16.04|`ubuntu-16.04`|`PHP 5.6` to `PHP 7.4`|
|Ubuntu 18.04|`ubuntu-latest` or `ubuntu-18.04`|`PHP 7.1` to `PHP 7.4`|
|Ubuntu 20.04|`ubuntu-20.04`|`PHP 7.4`|
|Windows Server 2019|`windows-latest` or `windows-2019`|`PHP 7.4`|
|macOS Catalina 10.15|`macos-latest` or `macos-10.15`|`PHP 7.4`|

### Self-Hosted Runners

|Host OS/Virtual environment|YAML workflow label|
|--- |--- |
|Ubuntu 16.04|`self-hosted` or `Linux`|
|Ubuntu 18.04|`self-hosted` or `Linux`|
|Ubuntu 20.04|`self-hosted` or `Linux`|
|Windows 7 and newer|`self-hosted` or `Windows`|
|Windows Server 2012 R2 and newer|`self-hosted` or `Windows`|
|macOS Catalina 10.15|`self-hosted` or `macOS`|

- Refer to the [self-hosted setup](#self-hosted-setup) to use the action on self-hosted runners.

## :heavy_plus_sign: PHP Extension Support

- On `ubuntu` by default extensions which are available as a package can be installed. PECL extensions if not available as a package can be installed by specifying `pecl` in the tools input.

```yaml
uses: shivammathur/setup-php@v2
with:
  php-version: '7.4'
  tools: pecl
  extensions: swoole
```

- On `windows` PECL extensions which have the `DLL` binary can be installed.

- On `macOS` PECL extensions can be installed.

- Extensions installed along with PHP if specified are enabled.

- Specific versions of PECL extensions can be installed by suffixing the version. This is useful for installing old versions of extensions which support end of life PHP versions.

```yaml
uses: shivammathur/setup-php@v2
with:
  php-version: '5.4'
  tools: pecl
  extensions: swoole-1.9.3
```

- Pre-release versions of PECL extensions can be setup by suffixing the extension with its state i.e `alpha`, `beta`, `devel` or `snapshot`.

```yaml
uses: shivammathur/setup-php@v2
with:
  php-version: '7.4'
  tools: pecl
  extensions: xdebug-beta
```

- Shared extensions can be removed by prefixing them with a `:`.

```yaml
uses: shivammathur/setup-php@v2
with:
  php-version: '7.4'  
  extensions: :opcache
```

- Extensions which cannot be added or removed gracefully leave an error message in the logs, the action is not interrupted.

- These extensions have custom support - `gearman` on `Ubuntu`, `blackfire`, `ioncube`, `oci8`, `pdo_oci`, `phalcon3` and `phalcon4` on all supported OS.

## :wrench: Tools Support

These tools can be setup globally using the `tools` input.

`blackfire`, `blackfire-player`, `codeception`, `composer`, `composer-normalize`, `composer-prefetcher`, `composer-require-checker`, `composer-unused`, `cs2pr`, `deployer`, `flex`, `grpc_php_plugin`, `infection`, `pecl`, `phan`, `phinx`, `phive`, `phpcbf`, `phpcpd`, `php-config`, `php-cs-fixer`, `phpcs`, `phpize`, `phpmd`, `phpstan`, `phpunit`, `prestissimo`, `protoc`, `psalm`, `symfony`, `vapor-cli`

```yaml
uses: shivammathur/setup-php@v2
with:
  php-version: '7.4'
  tools: php-cs-fixer, phpunit
```

To setup a particular version of a tool, specify it in the form `tool:version`.  
Latest stable version of `composer` is setup by default. You can setup the required version by specifying `v1`, `v2`, `snapshot` or `preview` as version.

```yaml
uses: shivammathur/setup-php@v2
with:
  php-version: '7.4'
  tools: composer:v2
```

Version for other tools should be in `semver` format and a valid release of the tool.

```yaml
uses: shivammathur/setup-php@v2
with:
  php-version: '7.4'
  tools: php-cs-fixer:2.16.2, phpunit:8.5.1
```

**Notes**
- Both agent `blackfire-agent` and client `blackfire` are setup when `blackfire` is specified in tools input.
- Tools which cannot be setup gracefully leave an error message in the logs, the action is not interrupted.

## :signal_strength: Coverage Support

### Xdebug

Specify `coverage: xdebug` to use `Xdebug`.  
Runs on all [PHP versions supported](#tada-php-support "List of PHP versions supported on this GitHub Action").

```yaml
uses: shivammathur/setup-php@v2
with:
  php-version: '7.4'
  coverage: xdebug
```

### PCOV

Specify `coverage: pcov` to use `PCOV` and disable `Xdebug`.  
`PCOV` supports `PHP 7.1` and newer PHP versions.  
Tests with `PCOV` run much faster than with `Xdebug`.  
If your source code directory is other than `src`, `lib` or, `app`, specify `pcov.directory` using the `ini-values` input.  

```yaml
uses: shivammathur/setup-php@v2
with:
  php-version: '7.4'
  ini-values: pcov.directory=api #optional, see above for usage.
  coverage: pcov
```

### Disable Coverage

Specify `coverage: none` to remove both `Xdebug` and `PCOV`.  
Consider disabling the coverage using this PHP action for these reasons.

- You are not generating coverage reports while testing.
- It will remove `Xdebug`, which will have a positive impact on PHP performance.
- You are using `phpdbg` for running your tests.
- You are profiling your code using `blackfire`.

```yaml
uses: shivammathur/setup-php@v2
with:
  php-version: '7.4'
  coverage: none
```

## :memo: Usage

### Inputs

#### `php-version` (required)

- Specify the PHP version you want to setup.
- Accepts a `string`. For example `'7.4'`.
- See [PHP support](#tada-php-support) for supported PHP versions.

#### `extensions` (optional)

- Specify the extensions you want to add or remove.
- Accepts a `string` in csv-format. For example `mbstring, :opcache`.
- Non-default extensions prefixed with `:` are removed.
- See [PHP extension support](#heavy_plus_sign-php-extension-support) for more info.

#### `ini-values` (optional)

- Specify the values you want to add to `php.ini`.
- Accepts a `string` in csv-format. For example `post_max_size=256M, short_open_tag=On`.

#### `coverage` (optional)

- Specify the code coverage driver you want to setup.
- Accepts `xdebug`, `pcov` or `none`.
- See [coverage support](#signal_strength-coverage-support) for more info.

#### `tools` (optional)

- Specify the tools you want to setup.
- Accepts a `string` in csv-format. For example `phpunit, phpcs`
- See [tools Support](#wrench-tools-support) for tools supported.

See below for more info.

### Basic Setup

> Setup a particular PHP version.

```yaml
steps:
- name: Checkout
  uses: actions/checkout@v2

- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    extensions: mbstring, intl
    ini-values: post_max_size=256M, short_open_tag=On
    coverage: xdebug    
    tools: php-cs-fixer, phpunit
```

### Matrix Setup

> Setup multiple PHP versions on multiple operating systems.

```yaml
jobs:
  run:
    runs-on: ${{ matrix.operating-system }}
    strategy:
      matrix:
        operating-system: [ubuntu-latest, windows-latest, macos-latest]
        php-versions: ['5.6', '7.0', '7.1', '7.2', '7.3', '7.4']
    name: PHP ${{ matrix.php-versions }} Test on ${{ matrix.operating-system }}
    steps:
    - name: Checkout
      uses: actions/checkout@v2

    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: ${{ matrix.php-versions }}
        extensions: mbstring, intl
        ini-values: post_max_size=256M, short_open_tag=On
        coverage: xdebug        
        tools: php-cs-fixer, phpunit
```

### Nightly Build Setup

> Setup a nightly build of `PHP 8.0.0-dev` from the [master branch](https://github.com/php/php-src/tree/master "Master branch on PHP source repository") of PHP.

- This version is currently in development.
- `PECL` is installed by default with this version on `ubuntu` and `macOS`.
- Some extensions might not support this version currently.
- Refer to this [RFC](https://wiki.php.net/rfc/jit "PHP JIT RFC configuration") for configuring `PHP JIT` on this version.
- Refer to this [list of RFCs](https://wiki.php.net/rfc#php_80 "List of RFCs implemented in PHP8") implemented in this version.

```yaml
steps:
- name: Checkout
  uses: actions/checkout@v2

- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.0'
    extensions: mbstring
    ini-values: opcache.jit_buffer_size=256M, opcache.jit=1235, pcre.jit=1
    coverage: pcov
    tools: php-cs-fixer, phpunit
```

### Self Hosted Setup

> Setup PHP on a self-hosted runner.

- To setup a dockerized self-hosted runner, refer to this [guide](https://github.com/shivammathur/setup-php/wiki/Dockerized-self-hosted-runner-on-Ubuntu) to setup in an `Ubuntu` container and refer to this [guide](https://github.com/shivammathur/setup-php/wiki/Dockerized-self-hosted-runner-on-Windows) to setup in a `Windows` container.
- To setup the runner directly on the host OS or in a virtual machine, follow this [requirements guide](https://github.com/shivammathur/setup-php/wiki/Requirements-for-self-hosted-runners "Requirements guide for self-hosted runner to run setup-php") before setting up the self-hosted runner.
- If your workflow uses [services](https://help.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idservices "GitHub Actions Services"), then setup the runner on a Linux host or in a Linux virtual machine. GitHub Actions does not support nested virtualization on Linux, so services will not work in a dockerized container.

Specify the environment variable `runner` with the value `self-hosted`. Without this your workflow will fail.

```yaml
jobs:
  run:
    runs-on: self-hosted
    strategy:
      matrix:        
        php-versions: ['5.6', '7.0', '7.1', '7.2', '7.3', '7.4', '8.0']
    name: PHP ${{ matrix.php-versions }}
    steps:
    - name: Checkout
      uses: actions/checkout@v2

    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: ${{ matrix.php-versions }}
      env:
        runner: self-hosted # Specify the runner.
```

### Local Testing Setup

> Test your `Ubuntu` workflow locally using [`nektos/act`](https://github.com/nektos/act "Project to test GitHub Actions locally").

```yaml
jobs:
  run:
    runs-on: ubuntu-latest
    name: PHP 7.4 Test
    steps:
    - name: Checkout
      uses: actions/checkout@v2

    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: 7.4
```

Run the workflow locally with `act` using [`shivammathur/node`](https://github.com/shivammathur/node-docker "Docker image to run setup-php") docker image.

```bash
# For runs-on: ubuntu-latest
act -P ubuntu-latest=shivammathur/node:latest

# For runs-on: ubuntu-20.04
act -P ubuntu-20.04=shivammathur/node:focal

# For runs-on: ubuntu-18.04
act -P ubuntu-18.04=shivammathur/node:bionic

# For runs-on: ubuntu-16.04
act -P ubuntu-16.04=shivammathur/node:xenial
```

### Thread Safe Setup

> Setup both `TS` and `NTS` PHP on `Windows`.

- `NTS` versions are setup by default.
- On `Ubuntu` and `macOS` only `NTS` versions are supported.
- On `Windows` both `TS` and `NTS` versions are supported.

```yaml
jobs:
  run:
    runs-on: windows-latest
    name: Setup PHP TS on Windows
    steps:
    - name: Checkout
      uses: actions/checkout@v2

    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: '7.4'
      env:
        phpts: ts # specify ts or nts
```

### Force Update

> Update to latest patch of PHP versions.

- Pre-installed PHP versions on the GitHub Actions runner are not updated to their latest patch release by default.
- You can specify the `update` environment variable to `true` to force update to the latest release.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
  env:
    update: true # specify true or false
```

### Verbose Setup

> Debug your workflow

To debug any issues, you can use the `verbose` tag instead of `v2`.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@verbose
  with:
    php-version: '7.4'
```

### Cache Extensions

You can cache PHP extensions using [`shivammathur/cache-extensions`](https://github.com/shivammathur/cache-extensions "GitHub Action to cache php extensions") and [`action/cache`](https://github.com/actions/cache "GitHub Action to cache files") GitHub Actions. Extensions which take very long to setup when cached are available in the next workflow run and are enabled directly. This reduces the workflow execution time.

```yaml
runs-on: ${{ matrix.operating-system }}
strategy:
  matrix:
    operating-system: [ubuntu-latest, windows-latest, macos-latest]
    php-versions: ['7.2', '7.3', '7.4']
name: PHP ${{ matrix.php-versions }} Test on ${{ matrix.operating-system }}
env:
  extensions: intl, pcov
  key: cache-v1 # can be any string, change to clear the extension cache.
steps:
- name: Checkout
  uses: actions/checkout@v2

- name: Setup cache environment
  id: extcache
  uses: shivammathur/cache-extensions@v1
  with:
    php-version: ${{ matrix.php-versions }}
    extensions: ${{ env.extensions }}
    key: ${{ env.key }}

- name: Cache extensions
  uses: actions/cache@v2
  with:
    path: ${{ steps.extcache.outputs.dir }}
    key: ${{ steps.extcache.outputs.key }}
    restore-keys: ${{ steps.extcache.outputs.key }}

- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: ${{ matrix.php-versions }}
    extensions: ${{ env.extensions }}
```

**Note:** If you setup both `TS` and `NTS` PHP versions on `windows`, add `${{ env.phpts }}` to `key` and `restore-keys` inputs in `actions/cache` step.

### Cache Composer Dependencies

If your project uses composer, you can persist composer's internal cache directory. Dependencies cached are loaded directly instead of downloading them while installation. The files cached are available across check-runs and will reduce the workflow execution time.

```yaml
- name: Get composer cache directory
  id: composercache
  run: echo "::set-output name=dir::$(composer config cache-files-dir)"

- name: Cache dependencies
  uses: actions/cache@v2
  with:
    path: ${{ steps.composercache.outputs.dir }}
    key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.lock') }}
    restore-keys: ${{ runner.os }}-composer-

- name: Install dependencies
  run: composer install --prefer-dist
```

**Notes**
- Please do not cache `vendor` directory using `action/cache` as that will have side-effects.
- In the above example, if you support a range of `composer` dependencies and do not commit `composer.lock`, you can use the hash of `composer.json` as the key for your cache.

```yaml
key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.json') }}
```

### Cache Node.js Dependencies

If your project has node.js dependencies, you can persist npm's or yarn's cache directory. The cached files are available across check-runs and will reduce the workflow execution time.

```yaml
- name: Get node.js cache directory
  id: nodecache
  run: echo "::set-output name=dir::$(npm config get cache)" # Use $(yarn cache dir) for yarn

- name: Cache dependencies
  uses: actions/cache@v2
  with:
    path: ${{ steps.nodecache.outputs.dir }}
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }} # Use '**/yarn.lock' for yarn
    restore-keys: ${{ runner.os }}-node-
```

**Note:** Please do not cache `node_modules` directory as that will have side-effects.

### Composer GitHub OAuth

If you have a number of workflows which setup multiple tools or have many composer dependencies, you might hit the GitHub's rate limit for composer. To avoid that you can add an `OAuth` token to the composer's config by setting `COMPOSER_TOKEN` environment variable. You can use [`GITHUB_TOKEN`](https://help.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token "GITHUB_TOKEN documentation") secret for this purpose.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
  env:
    COMPOSER_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Problem Matchers

#### PHP

Setup problem matchers for your `PHP` output by adding this step after the `setup-php` step. This will scan the logs for PHP errors and warnings, and surface them prominently in the GitHub Actions UI by creating annotations and log file decorations.

```yaml
- name: Setup problem matchers for PHP
  run: echo "::add-matcher::${{ runner.tool_cache }}/php.json"
```

#### PHPUnit

Setup problem matchers for your `PHPUnit` output by adding this step after the `setup-php` step. This will scan the logs for failing tests and surface that information prominently in the GitHub Actions UI by creating annotations and log file decorations.

```yaml
- name: Setup problem matchers for PHPUnit
  run: echo "::add-matcher::${{ runner.tool_cache }}/phpunit.json"
```

#### Other Tools

For tools that support `checkstyle` reporting like `phpstan`, `psalm`, `php-cs-fixer` and `phpcs` you can use `cs2pr` to annotate your code.  
For examples refer to [cs2pr documentation](https://github.com/staabm/annotate-pull-request-from-checkstyle).  

> Here is an example with `phpstan`.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    tools: cs2pr, phpstan

- name: PHPStan
  run: phpstan analyse src --error-format=checkstyle | cs2pr
```

### Examples

Examples of using `setup-php` with various PHP Frameworks and Packages.

|Framework/Package|Runs on|Workflow|
|--- |--- |--- |
|Blackfire|`macOS`, `ubuntu` and `windows`|[blackfire.yml](./examples/blackfire.yml "GitHub Action using Blackfire")|
|Blackfire Player|`macOS`, `ubuntu` and `windows`|[blackfire-player.yml](./examples/blackfire-player.yml "GitHub Action using Blackfire Player")|
|CakePHP with `MySQL` and `Redis`|`ubuntu`|[cakephp-mysql.yml](./examples/cakephp-mysql.yml "GitHub Action for CakePHP with MySQL and Redis")|
|CakePHP with `PostgreSQL` and `Redis`|`ubuntu`|[cakephp-postgres.yml](./examples/cakephp-postgres.yml "GitHub Action for CakePHP with Postgres and Redis")|
|CakePHP without services|`macOS`, `ubuntu` and `windows`|[cakephp.yml](./examples/cakephp.yml "GitHub Action for CakePHP without services")|
|CodeIgniter|`macOS`, `ubuntu` and `windows`|[codeigniter.yml](./examples/codeigniter.yml "GitHub Action for CodeIgniter")|
|Laravel with `MySQL` and `Redis`|`ubuntu`|[laravel-mysql.yml](./examples/laravel-mysql.yml "GitHub Action for Laravel with MySQL and Redis")|
|Laravel with `PostgreSQL` and `Redis`|`ubuntu`|[laravel-postgres.yml](./examples/laravel-postgres.yml "GitHub Action for Laravel with PostgreSQL and Redis")|
|Laravel without services|`macOS`, `ubuntu` and `windows`|[laravel.yml](./examples/laravel.yml "GitHub Action for Laravel without services")|
|Lumen with `MySQL` and `Redis`|`ubuntu`|[lumen-mysql.yml](./examples/lumen-mysql.yml "GitHub Action for Lumen with MySQL and Redis")|
|Lumen with `PostgreSQL` and `Redis`|`ubuntu`|[lumen-postgres.yml](./examples/lumen-postgres.yml "GitHub Action for Lumen with PostgreSQL and Redis")|
|Lumen without services|`macOS`, `ubuntu` and `windows`|[lumen.yml](./examples/lumen.yml "GitHub Action for Lumen without services")|
|Phalcon with `MySQL`|`ubuntu`|[phalcon-mysql.yml](./examples/phalcon-mysql.yml "GitHub Action for Phalcon with MySQL")|
|Phalcon with `PostgreSQL`|`ubuntu`|[phalcon-postgres.yml](./examples/phalcon-postgres.yml "GitHub Action for Phalcon with PostgreSQL")|
|Roots/bedrock|`ubuntu`|[bedrock.yml](./examples/bedrock.yml "GitHub Action for Wordpress Development using @roots/bedrock")|
|Roots/sage|`ubuntu`|[sage.yml](./examples/sage.yml "GitHub Action for Wordpress Development using @roots/sage")|
|Slim Framework|`macOS`, `ubuntu` and `windows`|[slim-framework.yml](./examples/slim-framework.yml "GitHub Action for Slim Framework")|
|Symfony with `MySQL`|`ubuntu`|[symfony-mysql.yml](./examples/symfony-mysql.yml "GitHub Action for Symfony with MySQL")|
|Symfony with `PostgreSQL`|`ubuntu`|[symfony-postgres.yml](./examples/symfony-postgres.yml "GitHub Action for Symfony with PostgreSQL")|
|Symfony without services|`macOS`, `ubuntu` and `windows`|[symfony.yml](./examples/symfony.yml "GitHub Action for Symfony without services")|
|Yii2 Starter Kit with `MySQL`|`ubuntu`|[yii2-mysql.yml](./examples/yii2-mysql.yml "GitHub Action for Yii2 Starter Kit with MySQL")|
|Yii2 Starter Kit with `PostgreSQL`|`ubuntu`|[yii2-postgres.yml](./examples/yii2-postgres.yml "GitHub Action for Yii2 Starter Kit with PostgreSQL")|
|Zend Framework|`macOS`, `ubuntu` and `windows`|[zend-framework.yml](./examples/zend-framework.yml "GitHub Action for Zend Framework")|

## :bookmark: Versioning

- It is highly recommended to use the `v2` tag as `setup-php` version. It is a rolling tag and is synced with latest minor and patch releases. With `v2` you automatically get the bug fixes, new features and support for latest PHP releases. For debugging any issues `verbose` tag can be used temporarily. It outputs all the logs and is also synced with the latest releases.
- Semantic release versions can also be used. It is recommended to [use dependabot](https://docs.github.com/en/github/administering-a-repository/keeping-your-actions-up-to-date-with-github-dependabot "Setup Dependabot with GitHub Actions") with semantic versioning to keep the actions in your workflows up to date.
- Commit SHA can also be used, but are not recommended. They have to be updated with every release manually, without which you will not get any bug fixes or new features. 
- Using the `master` branch as version is highly discouraged, it might break your workflow after major releases as they have breaking changes.
- If you are using the `v1` tag or a `1.x.y` version, it is recommended that you [switch to v2](https://github.com/shivammathur/setup-php/wiki/Switch-to-v2 "Guide for switching from setup-php v1 to v2") as `v1` only gets critical bug fixes. Maintenance support for `v1` will be dropped with the last `PHP 8.0` release.

## :scroll: License

- The scripts and documentation in this project are released under the [MIT License](LICENSE "License for shivammathur/setup-php"). 
- This project has multiple [dependencies](#package-dependencies "Dependencies for this PHP Action"). Their licenses can be found in their respective repositories.
- The logo for `setup-php` is a derivative work of [php.net logo](https://www.php.net/download-logos.php) and is licensed under the [CC BY-SA 4.0 License](https://creativecommons.org/licenses/by-sa/4.0/ "Creative Commons License").

## :+1: Contributions

> Contributions are welcome!

- See [Contributor's Guide](.github/CONTRIBUTING.md "shivammathur/setup-php contribution guide") before you start.
- If you face any issues while using this or want to suggest a feature/improvement, create an issue [here](https://github.com/shivammathur/setup-php/issues "Issues reported").

## :sparkling_heart: Support This Project

If this action helped you.

- Sponsor the project by subscribing on [Patreon](https://www.patreon.com/shivammathur "Shivam Mathur Patreon") or by contributing using [Paypal](https://www.paypal.me/shivammathur "Shivam Mathur PayPal"). This project is also available as part of the [Tidelift Subscription](https://tidelift.com/subscription/pkg/npm-setup-php?utm_source=npm-setup-php&utm_medium=referral&utm_campaign=enterprise&utm_term=repo "Tidelift Subscription for setup-php") to support delivering enterprise-level maintenance.
- Please star the project and dependencies. If you blog, please share your experience of using this action with the community.

## :package: Dependencies

- [Node.js dependencies](https://github.com/shivammathur/setup-php/network/dependencies "Node.js dependencies")
- [gplessis/dotdeb-php](https://github.com/gplessis/dotdeb-php "Packaging for end of life PHP versions")
- [mlocati/powershell-phpmanager](https://github.com/mlocati/powershell-phpmanager "Package to handle PHP on windows")
- [ppa:ondrej/php](https://launchpad.net/~ondrej/+archive/ubuntu/php "Packaging active PHP packages")
- [shivammathur/cache-extensions](https://github.com/shivammathur/cache-extensions "GitHub action to help with caching PHP extensions")
- [shivammathur/homebrew-php](https://github.com/shivammathur/homebrew-php "Tap for PHP builds on MacOS")
- [shivammathur/homebrew-extensions](https://github.com/shivammathur/homebrew-extensions "Tap for PHP extensions on MacOS")
- [shivammathur/php-builder](https://github.com/shivammathur/php-builder "Nightly PHP package")
- [shivammathur/php5-darwin](https://github.com/shivammathur/php5-darwin "Scripts to setup PHP5 versions on darwin")
- [shivammathur/php5-ubuntu](https://github.com/shivammathur/php5-ubuntu "Scripts to setup PHP5 versions on ubuntu")

## :bookmark_tabs: Further Reading

- [About GitHub Actions](https://github.com/features/actions "GitHub Actions")
- [GitHub Actions Syntax](https://help.github.com/en/articles/workflow-syntax-for-github-actions "GitHub Actions Syntax")
- [Other Awesome Actions](https://github.com/sdras/awesome-actions "List of Awesome GitHub Actions")