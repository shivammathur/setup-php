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
  <a href="#tada-php-support" title="PHP Versions Supported"><img alt="PHP Versions Supported" src="https://img.shields.io/badge/php-%3E%3D%205.6-8892BF.svg"></a>
</p>

Setup PHP with required extensions, php.ini configuration, code-coverage support and various tools like composer in [GitHub Actions](https://github.com/features/actions "GitHub Actions"). This action gives you a cross platform interface to setup the PHP environment you need to test your application. Refer to [Usage](#memo-usage "How to use this") section and [examples](#examples "Examples of use") to see how to use this.

## Contents

- [PHP Support](#tada-php-support)
- [GitHub-Hosted Runner Support](#cloud-github-hosted-runner-support)
- [PHP Extension Support](#heavy_plus_sign-php-extension-support)
- [Tools Support](#wrench-tools-support)
- [Coverage Support](#signal_strength-coverage-support)
  - [Xdebug](#xdebug)
  - [PCOV](#pcov)
  - [Disable coverage](#disable-coverage)
- [Usage](#memo-usage)
  - [Basic Setup](#basic-setup)
  - [Matrix Setup](#matrix-setup)
  - [Nightly Build Setup](#nightly-build-setup)
  - [Thread Safe Setup](#thread-safe-setup)  
  - [Cache Dependencies](#cache-dependencies)
  - [Composer GitHub OAuth](#composer-github-oauth)  
  - [Problem Matchers](#problem-matchers)
  - [Examples](#examples)
- [License](#scroll-license)
- [Contributions](#1-contributions)
- [Support This project](#sparkling_heart-support-this-project)
- [Dependencies](#bookmark-dependencies)
- [Further Reading](#bookmark_tabs-further-reading)

## :tada: PHP Support

|PHP Version|Stability|Release Support|
|--- |--- |--- |
|5.6|`Stable`|`End of life`|
|7.0|`Stable`|`End of life`|
|7.1|`Stable`|`End of life`|
|7.2|`Stable`|`Security fixes only`|
|7.3|`Stable`|`Active`|
|7.4|`Stable`|`Active`|
|8.0|`Nightly`|`In development`|

**Note:** Specifying `8.0` in `php-version` input installs a nightly build of `PHP 8.0.0-dev` with `PHP JIT`, `Union Types v2` and other [new features](https://wiki.php.net/rfc#php_80 "New features implemented in PHP 8"). See [nightly build setup](#nightly-build-setup) for more information.

## :cloud: GitHub-Hosted Runner Support

|Virtual environment|YAML workflow label|Pre-installed PHP|
|--- |--- |--- |
|Ubuntu 16.04|`ubuntu-16.04`|`PHP 5.6` to `PHP 7.4`|
|Ubuntu 18.04|`ubuntu-latest` or `ubuntu-18.04`|`PHP 7.1` to `PHP 7.4`|
|Ubuntu 20.04|`ubuntu-20.04`|`PHP 7.4`|
|Windows Server 2019|`windows-latest` or `windows-2019`|`PHP 7.4`|
|macOS 10.15 Catalina|`macos-latest` or `macos-10.15`|`PHP 7.4`|

## :heavy_plus_sign: PHP Extension Support
- On `ubuntu` by default extensions which are available as a package can be installed. If the extension is not available as a package but it is on `PECL`, it can be installed by specifying `pecl` in the tools input.
- On `windows` extensions which have `windows` binary on `PECL` can be installed.
- On `macOS` extensions which are on `PECL` can be installed.
- Extensions which are installed along with PHP if specified are enabled.
- Extensions on `PECL` which do not have a latest stable version, their pre-release versions can be installed by suffixing the extension with its state i.e `alpha`, `beta`, `devel` or `snapshot` separated by a `-` like `msgpack-beta`.
- Extensions which cannot be installed gracefully leave an error message in the logs, the action is not interrupted.

## :wrench: Tools Support

These tools can be setup globally using the `tools` input.

`codeception`, `composer`, `composer-prefetcher`, `cs2pr`, `deployer`, `pecl`, `phinx`, `phive`, `phpcbf`, `phpcpd`, `php-config`, `php-cs-fixer`, `phpcs`, `phpize`, `phpmd`, `phpstan`, `phpunit`, `prestissimo`, `psalm`, `symfony`

```yaml
uses: shivammathur/setup-php@v1
with:
  php-version: '7.4'
  tools: php-cs-fixer, phpunit
```

To setup a particular version of a tool, specify it in the form `tool:version`.  
Latest stable version of `composer` is setup by default and accepts `v1`, `v2`, `snapshot` and `preview` as versions.

```yaml
uses: shivammathur/setup-php@v1
with:
  php-version: '7.4'
  tools: composer:v2
```

Version for other tools should be in `semver` format and a valid release of the tool.

```yaml
uses: shivammathur/setup-php@v1
with:
  php-version: '7.4'
  tools: php-cs-fixer:2.16.2, phpunit:8.5.1
```

Tools which cannot be installed gracefully leave an error message in the logs, the action is not interrupted.

## :signal_strength: Coverage Support

### Xdebug

Specify `coverage: xdebug` to use `Xdebug`.  
Runs on all [PHP versions supported](#tada-php-support "List of PHP versions supported on this GitHub Action").

```yaml
uses: shivammathur/setup-php@v1
with:
  php-version: '7.4'
  coverage: xdebug
```

### PCOV

Specify `coverage: pcov` to use `PCOV` and disable `Xdebug`.  
It is much faster than `Xdebug`.  
`PCOV` needs `PHP >= 7.1`.  
If your source code directory is other than `src`, `lib` or, `app`, specify `pcov.directory` using the `ini-values` input.  


```yaml
uses: shivammathur/setup-php@v1
with:
  php-version: '7.4'
  ini-values: pcov.directory=api #optional, see above for usage.
  coverage: pcov
```

### Disable Coverage

Specify `coverage: none` to disable both `Xdebug` and `PCOV`.  
Consider disabling the coverage using this PHP action for these reasons.

- You are not generating coverage reports while testing.
- It will remove `Xdebug`, which will have a positive impact on PHP performance.
- You are using `phpdbg` for running your tests.

```yaml
uses: shivammathur/setup-php@v1
with:
  php-version: '7.4'
  coverage: none
```

## :memo: Usage

Inputs supported by this GitHub Action.

- php-version `required`
- extensions `optional`
- ini-values `optional`
- coverage `optional`
- tools `optional`

See [action.yml](action.yml "Metadata for this GitHub Action") and usage below for more info.

### Basic Setup

> Setup a particular PHP version.

```yaml
steps:
- name: Checkout
  uses: actions/checkout@v2

- name: Setup PHP
  uses: shivammathur/setup-php@v1
  with:
    php-version: '7.4'
    extensions: mbstring, intl #optional, setup extensions
    ini-values: post_max_size=256M, short_open_tag=On #optional, setup php.ini configuration
    coverage: xdebug #optional, setup coverage driver
    tools: php-cs-fixer, phpunit #optional, setup tools globally
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
      uses: shivammathur/setup-php@v1
      with:
        php-version: ${{ matrix.php-versions }}
        extensions: mbstring, intl #optional, setup extensions
        ini-values: post_max_size=256M, short_open_tag=On #optional, setup php.ini configuration
        coverage: xdebug #optional, setup coverage driver
        tools: php-cs-fixer, phpunit #optional, setup tools globally
```

### Nightly Build Setup

> Setup a nightly build of `PHP 8.0.0-dev` from the [master branch](https://github.com/php/php-src/tree/master "Master branch on PHP source repository") of PHP.

- `PECL` is installed by default with this version on `Ubuntu` and `macOS`.
- Some extensions might not support this version currently.
- Refer to this [RFC](https://wiki.php.net/rfc/jit "PHP JIT RFC configuration") for configuring `PHP JIT` on this version.
- Refer to this [list of RFCs](https://wiki.php.net/rfc#php_80 "List of RFCs implemented in PHP8") implemented in this version.

```yaml
steps:
- name: Checkout
  uses: actions/checkout@v2

- name: Setup PHP
  uses: shivammathur/setup-php@v1
  with:
    php-version: '8.0'
    extensions: mbstring #optional, setup extensions
    ini-values: opcache.jit_buffer_size=256M, opcache.jit=1235, pcre.jit=1 #optional, setup php.ini configuration
    coverage: pcov #optional, setup PCOV, Xdebug does not support this version yet.
    tools: php-cs-fixer, phpunit #optional, setup tools globally    
```

### Thread Safe Setup

- `NTS` versions are setup by default.
- On `ubuntu` and `macOS` only NTS versions are supported.
- On `windows` both `TS` and `NTS` versions are supported.

```yaml
jobs:
  run:
    runs-on: windows-latest
    name: Setup PHP TS on Windows
    steps:
    - name: Checkout
      uses: actions/checkout@v2

    - name: Setup PHP
      uses: shivammathur/setup-php@v1
      with:
        php-version: '7.4'
      env:
        phpts: ts # specify ts or nts
```

### Cache Dependencies

You can persist composer's internal cache directory using the [`action/cache`](https://github.com/actions/cache "GitHub Action to cache files") GitHub Action. Dependencies cached are loaded directly instead of downloading them while installation. The files cached are available across check-runs and will reduce the workflow execution time.

**Note:** Please do not cache `vendor` directory using `action/cache` as that will have side-effects.

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

- name: Install Dependencies
  run: composer install --prefer-dist
```

In the above example, if you support a range of `composer` dependencies and do not commit `composer.lock`, you can use the hash of `composer.json` as the key for your cache.

```yaml
key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.json') }} 
```

### Composer GitHub OAuth

If you have a number of workflows which setup multiple tools or have many composer dependencies, you might hit the GitHub's rate limit for composer. To avoid that you can add a `OAuth` token to the composer's config by setting `COMPOSER_TOKEN` environment variable. You can use [`GITHUB_TOKEN`](https://help.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token "GITHUB_TOKEN documentation") secret for this purpose.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
  env:
    COMPOSER_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Problem Matchers

Problem matchers are `json` configurations which identify errors and warnings in your logs and surface that information prominently in the GitHub Actions UI by highlighting them and creating code annotations.

#### PHP

Setup problem matchers for your `PHP` output by adding this step after the `setup-php` step.

```yaml
- name: Setup problem matchers for PHP
  run: echo "::add-matcher::${{ runner.tool_cache }}/php.json"
```

#### PHPUnit

Setup problem matchers for your `PHPUnit` output by adding this step after the `setup-php` step.

```yaml
- name: Setup problem matchers for PHPUnit
  run: echo "::add-matcher::${{ runner.tool_cache }}/phpunit.json"
```

#### PHPStan

PHPStan supports error reporting in GitHub Actions, so no problem matchers are required.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    tools: phpstan

- name: Run PHPStan
  run: phpstan analyse src
```

#### Psalm

Psalm supports error reporting in GitHub Actions with an output format `github`.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    tools: psalm

- name: Run Psalm
  run: psalm --output-format=github
```

#### Tools with checkstyle support

For tools that support `checkstyle` reporting like `phpstan`, `psalm`, `php-cs-fixer` and `phpcs` you can use `cs2pr` to annotate your code.  
For examples refer to [cs2pr documentation](https://github.com/staabm/annotate-pull-request-from-checkstyle).   

> Here is an example with `phpcs`.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    tools: cs2pr, phpcs

- name: Run phpcs
  run: phpcs -q --report=checkstyle src | cs2pr
```

### Examples

Examples for setting up this GitHub Action with different PHP Frameworks/Packages.

|Framework/Package|Runs on|Workflow|
|--- |--- |--- |
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

## :scroll: License

- The scripts and documentation in this project are released under the [MIT License](LICENSE "License for shivammathur/setup-php"). 
- This project has multiple [dependencies](#bookmark-dependencies "Dependencies for this PHP Action"). Their licenses can be found in their respective repositories.
- The logo for `setup-php` is a derivative work of [php.net logo](https://www.php.net/download-logos.php) and is licensed under the [CC BY-SA 4.0 License](https://creativecommons.org/licenses/by-sa/4.0/ "Creative Commons License").

## :+1: Contributions

Contributions are welcome! See [Contributor's Guide](.github/CONTRIBUTING.md "shivammathur/setup-php contribution guide"). If you face any issues while using this or want to suggest a feature/improvement, create an issue [here](https://github.com/shivammathur/setup-php/issues "Issues reported").

## :sparkling_heart: Support This Project

If this action helped you.

- Sponsor the project by subscribing on [Patreon](https://www.patreon.com/shivammathur "Shivam Mathur Patreon") or by contributing using [Paypal](https://www.paypal.me/shivammathur "Shivam Mathur PayPal"). This project is also available as part of the [Tidelift Subscription](https://tidelift.com/subscription/pkg/npm-setup-php?utm_source=npm-setup-php&utm_medium=referral&utm_campaign=enterprise&utm_term=repo "Tidelift Subscription for setup-php") to support delivering enterprise-level maintenance.
- Please star the project and dependencies. If you blog, please share your experience of using this action with the community.

## :bookmark: Dependencies

- [Node.js dependencies](https://github.com/shivammathur/setup-php/network/dependencies "Node.js dependencies")
- [mlocati/powershell-phpmanager](https://github.com/mlocati/powershell-phpmanager "Package to handle PHP on windows")
- [ppa:ondrej/php](https://launchpad.net/~ondrej/+archive/ubuntu/php "Packaging active PHP packages")
- [shivammathur/homebrew-php](https://github.com/shivammathur/homebrew-php "Tap for PHP builds for MacOS")
- [shivammathur/homebrew-extensions](https://github.com/shivammathur/homebrew-extensions "Tap for PHP extensions for MacOS")
- [shivammathur/php-builder](https://github.com/shivammathur/php-builder "Nightly PHP package")

## :bookmark_tabs: Further Reading

- [About GitHub Actions](https://github.com/features/actions "GitHub Actions")
- [GitHub Actions Syntax](https://help.github.com/en/articles/workflow-syntax-for-github-actions "GitHub Actions Syntax")
- [Other Awesome Actions](https://github.com/sdras/awesome-actions "List of Awesome GitHub Actions")