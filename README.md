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

Setup PHP with required extensions, php.ini configuration, code-coverage support and composer in [GitHub Actions](https://github.com/features/actions "GitHub Actions"). This action gives you a cross platform interface to setup the PHP environment you need to test your application. Refer to [Usage](#memo-usage "How to use this") section and [examples](#examples "Examples of use") to see how to use this.

## Contents

- [PHP Support](#tada-php-support)
- [OS/Platform Support](#cloud-osplatform-support)
- [PHP Extension Support](#wrench-php-extension-support)
- [Coverage support](#signal_strength-coverage-support)
  - [Xdebug](#xdebug)
  - [PCOV](#pcov)
  - [Disable coverage](#disable-coverage)
- [Usage](#memo-usage)
  - [Basic Setup](#basic-setup)
  - [Matrix Setup](#matrix-setup)
  - [Experimental Setup](#experimental-setup)  
  - [Cache dependencies](#cache-dependencies)
  - [Problem Matchers](#problem-matchers)
  - [Examples](#examples)
- [License](#scroll-license)
- [Contributions](#1-contributions)
- [Support this project](#sparkling_heart-support-this-project)
- [This action uses the following works](#bookmark-this-action-uses-the-following-works)
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
|8.0|`Experimental`|`In development`|

**Note:** Specifying `8.0` in `php-version` input installs a nightly build of `PHP 8.0.0-dev` with `PHP JIT` support. See [experimental setup](#experimental-setup) for more information.

## :cloud: OS/Platform Support

|Virtual environment|matrix.operating-system|
|--- |--- |
|Windows Server 2019|`windows-latest` or `windows-2019`|
|Ubuntu 18.04|`ubuntu-latest` or `ubuntu-18.04`|
|Ubuntu 16.04|`ubuntu-16.04`|
|macOS X Catalina 10.15|`macOS-latest` or `macOS-10.15`|

## :wrench: PHP Extension Support
- On `ubuntu` by default extensions which are available as a package can be installed. If the extension is not available as a package but it is on `PECL`, it can be installed by specifying `pecl: true`. 
- On `windows` extensions which have `windows` binary on `PECL` can be installed.
- On `macOS` extensions which are on `PECL` can be installed.
- Extensions which are installed along with PHP if specified are enabled.
- Extensions which cannot be installed gracefully leave an error message in the logs, the action is not interrupted.

## :signal_strength: Coverage support

### Xdebug

Specify `coverage: xdebug` to use `Xdebug`.  
Runs on all [PHP versions supported](#tada-php-support "List of PHP versions supported on this GitHub Action") except `8.0`.

```yaml
uses: shivammathur/setup-php@v1
with:
  php-version: '7.4'  
  coverage: xdebug
```

### PCOV

Specify `coverage: pcov` to use `PCOV`.  
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

### Disable coverage

Specify `coverage: none` to disable both `Xdebug` and `PCOV`.
Consider disabling the coverage using this PHP action for these reasons.

- You are not generating coverage reports while testing.
- It will disable `Xdebug`, which will have a positive impact on PHP performance.
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
- pecl `optional`

See [action.yml](action.yml "Metadata for this GitHub Action") and usage below for more info.

### Basic Setup 

> Setup a particular PHP version.

```yaml
steps:
- name: Checkout
  uses: actions/checkout@v1

- name: Setup PHP
  uses: shivammathur/setup-php@v1
  with:
    php-version: '7.4'
    extensions: mbstring, intl #optional, setup extensions
    ini-values: post_max_size=256M, short_open_tag=On #optional, setup php.ini configuration
    coverage: xdebug #optional, setup coverage driver
    pecl: false #optional, setup PECL
```

### Matrix Setup

> Setup multiple PHP versions on multiple operating systems.

```yaml
jobs:
  run:    
    runs-on: ${{ matrix.operating-system }}
    strategy:      
      matrix:
        operating-system: [ubuntu-latest, windows-latest, macOS-latest]
        php-versions: ['5.6', '7.0', '7.1', '7.2', '7.3', '7.4']
    name: PHP ${{ matrix.php-versions }} Test on ${{ matrix.operating-system }}
    steps:
    - name: Checkout
      uses: actions/checkout@v1

    - name: Setup PHP
      uses: shivammathur/setup-php@v1
      with:
        php-version: ${{ matrix.php-versions }}
        extensions: mbstring, intl #optional, setup extensions
        ini-values: post_max_size=256M, short_open_tag=On #optional, setup php.ini configuration
        coverage: xdebug #optional, setup coverage driver
        pecl: false #optional, setup PECL
```

### Experimental Setup 

> Setup a nightly build of `PHP 8.0.0-dev` from the [master branch](https://github.com/php/php-src/tree/master "Master branch on PHP source repository") of PHP.

- This version is currently in development and is an experimental feature on this action.
- `PECL` is installed by default with this version on `ubuntu`.
- Some extensions might not support this version currently.
- Refer to this [RFC](https://wiki.php.net/rfc/jit "PHP JIT RFC configuration") for configuring `PHP JIT` on this version.

```yaml
steps:
- name: Checkout
  uses: actions/checkout@v1

- name: Setup PHP
  uses: shivammathur/setup-php@v1
  with:
    php-version: '8.0'
    extensions: mbstring #optional, setup extensions
    ini-values: opcache.jit_buffer_size=256M, opcache.jit=1235, pcre.jit=1 #optional, setup php.ini configuration
    coverage: pcov #optional, setup PCOV, Xdebug does not support this version yet.    
```

### Cache dependencies

You can persist composer's internal cache directory using the [`action/cache`](https://github.com/actions/cache "GitHub Action to cache files") GitHub Action. Dependencies cached are loaded directly instead of downloading them while installation. The files cached are available across check-runs and will reduce the workflow execution time.

**Note:** Please do not cache `vendor` directory using `action/cache` as that will have side-effects.

```yaml
- name: Get Composer Cache Directory
  id: composer-cache
  run: echo "::set-output name=dir::$(composer config cache-files-dir)"

- name: Cache dependencies  
  uses: actions/cache@v1
  with:
    path: ${{ steps.composer-cache.outputs.dir }}
    key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.lock') }}
    restore-keys: ${{ runner.os }}-composer-

- name: Install Dependencies
  run: composer install --prefer-dist
```

### Problem Matchers

You can setup problem matchers for your `PHPUnit` output. This will scan the errors in your tests and surface that information prominently in the GitHub Actions UI by creating annotations and log file decorations.

```yaml
- name: Setup Problem Matchers for PHPUnit
  run: echo "::add-matcher::${{ runner.tool_cache }}/phpunit.json"
```

### Examples

Examples for setting up this GitHub Action with different PHP Frameworks/Packages.

|Framework/Package|Runs on|Workflow|
|--- |--- |--- |
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

The scripts and documentation in this project are released under the [MIT License](LICENSE "License for shivammathur/setup-php"). This project has multiple [dependencies](https://github.com/shivammathur/setup-php/network/dependencies "Dependencies for this PHP Action") and uses [various works](#bookmark-this-action-uses-the-following-works "Tools used by this action"). Their licenses can be found in their respective repositories.

## :+1: Contributions

Contributions are welcome! See [Contributor's Guide](.github/CONTRIBUTING.md "shivammathur/setup-php contribution guide"). If you face any issues while using this or want to suggest a feature/improvement, create an issue [here](https://github.com/shivammathur/setup-php/issues "Issues reported").

## :sparkling_heart: Support this project

If this action helped you.

- Please star the project and share it, this helps reach more people.
- If you blog, write about your experience using this.
- Support this project on <a href="https://www.patreon.com/shivammathur"><img alt="Patreon" src="https://shivammathur.com/badges/patreon.svg"></a> or using <a href="https://www.paypal.me/shivammathur"><img alt="Paypal" src="https://shivammathur.com/badges/paypal.svg"></a>.
- If you need any help using this, reach out here <a href="https://www.codementor.io/shivammathur?utm_source=github&utm_medium=button&utm_term=shivammathur&utm_campaign=github" title="Contact Shivam Mathur on Codementor"><img alt="Contact me on Codementor" src="https://cdn.codementor.io/badges/contact_me_github.svg"></a>

## :bookmark: This action uses the following works

- [ppa:ondrej/php](https://launchpad.net/~ondrej/+archive/ubuntu/php "Pre-compiled ubuntu packages")
- [shivammathur/php-builder](https://github.com/shivammathur/php-builder "Pre-compiled nightly PHP builds")
- [mlocati/powershell-phpmanager](https://github.com/mlocati/powershell-phpmanager "Package to handle PHP on windows")
- [shivammathur/homebrew-php](https://github.com/shivammathur/homebrew-php "Tap for PHP builds for MacOS")

## :bookmark_tabs: Further Reading

- [About GitHub Actions](https://github.com/features/actions "GitHub Actions")
- [GitHub Actions Syntax](https://help.github.com/en/articles/workflow-syntax-for-github-actions "GitHub Actions Syntax")
- [Other Awesome Actions](https://github.com/sdras/awesome-actions "List of Awesome GitHub Actions")
