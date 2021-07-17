<p align="center">
  <a href="https://github.com/marketplace/actions/setup-php-action" target="_blank">
    <img src="https://repository-images.githubusercontent.com/206578964/e0a18480-dc65-11e9-8dd3-b9ffbf5575fe" alt="Setup PHP in GitHub Actions" width="400">
  </a>
</p>

<h1 align="center">Setup PHP in GitHub Actions</h1>

<p align="center">
  <a href="https://github.com/shivammathur/setup-php" title="GitHub action to setup PHP"><img alt="GitHub Actions status" src="https://github.com/shivammathur/setup-php/workflows/Main%20workflow/badge.svg"></a>
  <a href="https://codecov.io/gh/shivammathur/setup-php" title="Code coverage"><img alt="Codecov Code Coverage" src="https://img.shields.io/codecov/c/github/shivammathur/setup-php?logo=codecov"></a>
  <a href="https://github.com/shivammathur/setup-php/blob/master/LICENSE" title="license"><img alt="LICENSE" src="https://img.shields.io/badge/license-MIT-428f7e.svg?logo=open%20source%20initiative&logoColor=white&labelColor=555555"></a>
  <a href="#tada-php-support" title="PHP Versions Supported"><img alt="PHP Versions Supported" src="https://img.shields.io/badge/php-5.3%20to%208.1-777bb3.svg?logo=php&logoColor=white&labelColor=555555"></a>  
</p>
<p align="center">
  <a href="https://reddit.com/r/setup_php" title="setup-php reddit"><img alt="setup-php reddit" src="https://img.shields.io/badge/reddit-join-FF5700?logo=reddit&logoColor=FF5700&labelColor=555555"></a>
  <a href="https://twitter.com/setup_php" title="setup-php twitter"><img alt="setup-php twitter" src="https://img.shields.io/badge/twitter-follow-1DA1F2?logo=twitter&logoColor=1DA1F2&labelColor=555555"></a>
  <a href="https://status.setup-php.com" title="setup-php status"><img alt="setup-php status" src="https://img.shields.io/badge/status-subscribe-28A745?logo=statuspage&logoColor=28A745&labelColor=555555"></a>
</p>

Setup PHP with required extensions, php.ini configuration, code-coverage support and various tools like composer in [GitHub Actions](https://github.com/features/actions "GitHub Actions"). This action gives you a cross platform interface to set up the PHP environment you need to test your application. Refer to [Usage](#memo-usage "How to use this") section and [examples](#examples "Examples of use") to see how to use this.

## Contents

- [OS/Platform Support](#cloud-osplatform-support)
  - [GitHub-Hosted Runners](#github-hosted-runners)
  - [Self-Hosted Runners](#self-hosted-runners)
- [PHP Support](#tada-php-support)  
- [PHP Extension Support](#heavy_plus_sign-php-extension-support)
- [Tools Support](#wrench-tools-support)
- [Coverage Support](#signal_strength-coverage-support)
  - [Xdebug](#xdebug)
  - [PCOV](#pcov)
  - [Disable Coverage](#disable-coverage)
- [Usage](#memo-usage)
  - [Inputs](#inputs)
  - [Outputs](#outputs)
  - [Flags](#flags)
  - [Basic Setup](#basic-setup)
  - [Matrix Setup](#matrix-setup)  
  - [Nightly Build Setup](#nightly-build-setup)
  - [Thread Safe Setup](#thread-safe-setup)
  - [Force Update Setup](#force-update-setup)
  - [Verbose Setup](#verbose-setup)  
  - [Multi-Arch Setup](#multi-arch-setup)
  - [Self Hosted Setup](#self-hosted-setup)
  - [Local Testing Setup](#local-testing-setup)
  - [JIT Configuration](#jit-configuration)
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

## :cloud: OS/Platform Support

Both `GitHub-hosted` and `self-hosted` runners are suppported by `setup-php` on the following OS/Platforms.

### GitHub-Hosted Runners

|Virtual environment|YAML workflow label|Pre-installed PHP|
|--- |--- |--- |
|Ubuntu 16.04 [(deprecated)](https://setup-php.com/i/452)|`ubuntu-16.04`|`PHP 5.6` to `PHP 8.0`|
|Ubuntu 18.04|`ubuntu-18.04`|`PHP 7.1` to `PHP 8.0`|
|Ubuntu 20.04|`ubuntu-latest` or `ubuntu-20.04`|`PHP 7.4` to `PHP 8.0`|
|Windows Server 2019|`windows-latest` or `windows-2019`|`PHP 8.0`|
|macOS Catalina 10.15|`macos-latest` or `macos-10.15`|`PHP 8.0`|
|macOS Big Sur 11.x|`macos-11.0`|`PHP 8.0`|

### Self-Hosted Runners

|Host OS/Virtual environment|YAML workflow label|
|--- |--- |
|Ubuntu 18.04|`self-hosted` or `Linux`|
|Ubuntu 20.04|`self-hosted` or `Linux`|
|Windows 7 and newer|`self-hosted` or `Windows`|
|Windows Server 2012 R2 and newer|`self-hosted` or `Windows`|
|macOS Catalina 10.15|`self-hosted` or `macOS`|
|macOS Big Sur 11.x x86_64/arm64|`self-hosted` or `macOS`|

- Refer to the [self-hosted setup](#self-hosted-setup) to use the action on self-hosted runners.
- If the requested PHP version is pre-installed, `setup-php` switches to it, otherwise it installs the PHP version.

## :tada: PHP Support

On all supported OS/Platforms the following PHP versions are supported as per the runner.

- PHP 5.3 to PHP 8.1 on GitHub-hosted runners.
- PHP 5.6 to PHP 8.1 on self-hosted runners.

|PHP Version|Stability|Release Support|Runner Support|
|--- |--- |--- |--- |
|`5.3`|`Stable`|`End of life`|`GitHub-hosted`|
|`5.4`|`Stable`|`End of life`|`GitHub-hosted`|
|`5.5`|`Stable`|`End of life`|`GitHub-hosted`|
|`5.6`|`Stable`|`End of life`|`GitHub-hosted`, `self-hosted`|
|`7.0`|`Stable`|`End of life`|`GitHub-hosted`, `self-hosted`|
|`7.1`|`Stable`|`End of life`|`GitHub-hosted`, `self-hosted`|
|`7.2`|`Stable`|`End of life`|`GitHub-hosted`, `self-hosted`|
|`7.3`|`Stable`|`Security fixes only`|`GitHub-hosted`, `self-hosted`|
|`7.4`|`Stable`|`Active`|`GitHub-hosted`, `self-hosted`|
|`8.0`|`Stable`|`Active`|`GitHub-hosted`, `self-hosted`|
|`8.1`|`Nightly`|`In development`|`GitHub-hosted`, `self-hosted`|

**Notes:** 
- Specifying `8.1` in `php-version` input installs a nightly build of `PHP 8.1.0-dev`. See [nightly build setup](#nightly-build-setup) for more information.
- To use JIT on `PHP 8.0` and `PHP 8.1` refer to the [JIT configuration](#jit-configuration) section.

## :heavy_plus_sign: PHP Extension Support

PHP extensions can be setup using the `extensions` input. It accepts a `string` in csv-format.

- On `Ubuntu`, extensions which are available as a package, available on `PECL` or a git repository can be set up.

```yaml
- name: Setup PHP with PECL extension
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    extensions: imagick, swoole
```

- On `Windows`, extensions available on `PECL` which have the `DLL` binary can be set up.

- On `macOS`, extensions available on `PECL` or a git repository can be set up.

- On `Ubuntu` and `macOS` to compile and install an extension from a git repository follow this [guide](https://github.com/shivammathur/setup-php/wiki/Add-extension-from-source "Guide to compile and install PHP extensions in setup-php").

- Extensions installed along with PHP if specified are enabled.

- Specific versions of extensions available on `PECL` can be setup by suffixing the extension's name with the version. This is useful for installing old versions of extensions which support end of life PHP versions.

```yaml
- name: Setup PHP with specific version of PECL extension
  uses: shivammathur/setup-php@v2
  with:
    php-version: '5.4'
    extensions: swoole-1.9.3
```

- Pre-release versions extensions available on `PECL` can be setup by suffixing the extension's name with its state i.e `alpha`, `beta`, `devel` or `snapshot`.

```yaml
- name: Setup PHP with pre-release PECL extension
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    extensions: xdebug-beta
```

- Shared extensions can be removed by prefixing them with a `:`.

```yaml
- name: Setup PHP and remove shared extension
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'  
    extensions: :opcache
```

- Extension `intl` can be setup with specific `ICU` version for `PHP 5.6` and above in `Ubuntu` workflows by suffixing `intl` with the `ICU` version. `ICU 50.2` and newer versions are supported. Refer to [`ICU builds`](https://github.com/shivammathur/icu-intl#icu4c-builds) for the specific versions supported.

```yaml
- name: Setup PHP with intl
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    extensions: intl-69.1
```

- Extensions loaded by default after `setup-php` runs can be found on the [wiki](https://github.com/shivammathur/setup-php/wiki).

- These extensions have custom support:
  - `cubrid`, `pdo_cubrid` and `gearman` on `Ubuntu`.
  - `geos` on `Ubuntu` and `macOS`.
  - `blackfire`, `couchbase`, `ioncube`, `oci8`, `pdo_firebird`, `pdo_oci`, `pecl_http`, `phalcon3` and `phalcon4` on all supported OS.

- By default, extensions which cannot be added or removed gracefully leave an error message in the logs, the action is not interrupted. To change this behaviour you can set `fail-fast` flag to `true`. 

```yaml
- name: Setup PHP with fail-fast
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    extensions: oci8
  env:
    fail-fast: true
```

## :wrench: Tools Support

These tools can be setup globally using the `tools` input. It accepts a string in csv-format.

`behat`, `blackfire`, `blackfire-player`, `codeception`, `composer`, `composer-normalize`, `composer-prefetcher`, `composer-require-checker`, `composer-unused`, `cs2pr`, `deployer`, `flex`, `grpc_php_plugin`, `infection`, `pecl`, `phan`, `phing`, `phinx`, `phive`, `php-config`, `php-cs-fixer`, `phpcbf`, `phpcpd`, `phpcs`, `phpize`, `phplint`, `phpmd`, `phpspec`, `phpstan`, `phpunit`, `phpunit-bridge`, `prestissimo`, `protoc`, `psalm`, `symfony` or `symfony-cli`, `vapor` or `vapor-cli`, `wp` or `wp-cli`

```yaml
- name: Setup PHP with tools
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    tools: php-cs-fixer, phpunit
```

- In addition to above tools any composer tool or package can also be set up globally by specifying it as `vendor/package` matching the listing on Packagist. This format accepts the same [version constraints](https://getcomposer.org/doc/articles/versions.md#writing-version-constraints "Composer version constraints") as `composer`.

```yaml
- name: Setup PHP with tools
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    tools: vimeo/psalm
```

- To set up a particular version of a tool, specify it in the form `tool:version`.
  
  Version can be in the following format:
    - Semver. For example `tool:1.2.3` or `tool:1.2.3-beta1`.
    - Major version. For example `tool:1` or `tool:1.x`.
    - Major and minor version. For example `tool:1.2` or `tool:1.2.x`.
  
  When you specify just the major version or the version in `major.minor` format, the latest patch version matching the input will be setup. 

  Except for major versions of `composer`, For other tools when you specify only the `major` version or the version in `major.minor` format for any tool you can get rate limited by GitHub's API. To avoid this, it is recommended to provide a [`GitHub` OAuth token](https://github.com/shivammathur/setup-php#composer-github-oauth "Composer GitHub OAuth"). You can do that by setting `COMPOSER_TOKEN` environment variable.

```yaml
- name: Setup PHP with tools
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    tools: php-cs-fixer:3, phpunit:8.5
  env:
    COMPOSER_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- The latest stable version of `composer` is set up by default. You can set up the required `composer` version by specifying the major version `v1` or `v2`, or the version in `major.minor` or `semver` format, Additionally for composer `snapshot` and `preview` can also be specified to set up the respective releases.

```yaml
- name: Setup PHP with composer v2
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    tools: composer:v2
```

- If you do not use composer in your workflow, you can specify `tools: none` to skip it.

```yaml
- name: Setup PHP without composer
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    tools: none
```

- Scripts `phpize` and `php-config` are set up with the same version as of the input PHP version.

- The latest versions of both agent `blackfire-agent` and client `blackfire` are set up when `blackfire` is specified in tools input. Please refer to the [official documentation](https://blackfire.io/docs/integrations/ci/github-actions "Blackfire.io documentation for GitHub Actions") for using `blackfire` with GitHub Actions.

- Tools `prestissimo` and `composer-prefetcher` will be skipped unless `composer:v1` is also specified in tools input. It is recommended to drop `prestissimo` and use `composer v2`.

- By default, tools which cannot be set up gracefully leave an error message in the logs, the action is not interrupted. To change this behaviour you can set `fail-fast` flag to `true`.

```yaml
- name: Setup PHP with fail-fast
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    tools: deployer
  env:
    fail-fast: true
```

**Notes**
- Input `tools` is useful to set up tools which you only use in GitHub Actions, thus keeping your `composer.json` tidy.
- If you do not want to use all your dev-dependencies in GitHub Actions workflow, you can run composer with `--no-dev` and install required tools using `tools` input to speed up your workflow.
- If you have a tool in your `composer.json`, do not set up it with `tools` input as the two instances of the tool might conflict.

## :signal_strength: Coverage Support

### Xdebug

Specify `coverage: xdebug` to use `Xdebug` and disable `PCOV`.  
Runs on all [PHP versions supported](#tada-php-support "List of PHP versions supported on this GitHub Action").

```yaml
- name: Setup PHP with Xdebug
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    coverage: xdebug
```

- The latest version of Xdebug compatible with the PHP version is set up by default.
- If you need Xdebug 2.x on PHP 7.2, 7.3 or 7.4, you can specify `coverage: xdebug2`.

```yaml
- name: Setup PHP with Xdebug 2.x
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    coverage: xdebug2
```

### PCOV

Specify `coverage: pcov` to use `PCOV` and disable `Xdebug`.  
Runs on PHP 7.1 and newer PHP versions.

- If your source code directory is other than `src`, `lib` or, `app`, specify `pcov.directory` using the `ini-values` input.  

```yaml
- name: Setup PHP with PCOV
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    ini-values: pcov.directory=api #optional, see above for usage.
    coverage: pcov
```

- PHPUnit 8.x and above supports PCOV out of the box.  
- If you are using PHPUnit 5.x, 6.x or 7.x, you need to set up `pcov/clobber` before executing your tests.

```yaml
- name: Setup PCOV
  run: |
    composer require pcov/clobber
    vendor/bin/pcov clobber
```

### Disable Coverage

Specify `coverage: none` to remove both `Xdebug` and `PCOV`.

Disable coverage for these reasons:

- You are not generating coverage reports while testing.
- It will remove `Xdebug`, which will have a positive impact on PHP performance.
- You are using `phpdbg` for running your tests.
- You are profiling your code using `blackfire`.
- You are using PHP in JIT mode. Please refer to [JIT configuration](#jit-configuration) section for more details.

```yaml
- name: Setup PHP with no coverage driver
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    coverage: none
```

## :memo: Usage

### Inputs

> Specify using `with` keyword

#### `php-version` (required)

- Specify the PHP version you want to set up.
- Accepts a `string`. For example `'7.4'`.
- Accepts `latest` to set up the latest stable PHP version.
- Accepts the format `d.x`, where `d` is the major version. For example `5.x`, `7.x` and `8.x`.  
- See [PHP support](#tada-php-support) for supported PHP versions.

#### `extensions` (optional)

- Specify the extensions you want to add or remove.
- Accepts a `string` in csv-format. For example `mbstring, :opcache`.
- Non-default extensions prefixed with `:` are removed.
- See [PHP extension support](#heavy_plus_sign-php-extension-support) for more info.

#### `ini-values` (optional)

- Specify the values you want to add to `php.ini`. 
- Accepts a `string` in csv-format. For example `post_max_size=256M, max_execution_time=180`.
- Accepts ini values with commas if wrapped in quotes. For example `xdebug.mode="develop,coverage"`.  

#### `coverage` (optional)

- Specify the code coverage driver you want to set up.
- Accepts `xdebug`, `pcov` or `none`.
- See [coverage support](#signal_strength-coverage-support) for more info.

#### `tools` (optional)

- Specify the tools you want to set up.
- Accepts a `string` in csv-format. For example: `phpunit, phpcs`
- See [tools Support](#wrench-tools-support) for tools supported.

### Outputs

#### `php-version`

To use outputs, give the `setup-php` step an `id`, you can use the same to get the outputs in a later step.

- Provides the PHP version in semver format.

```yml
- name: Setup PHP
  id: setup-php
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'

- name: Print PHP version
  run: echo ${{ steps.setup-php.outputs.php-version }}
```

### Flags

> Specify using `env` keyword

#### `fail-fast` (optional)

- Specify to mark the workflow as failed if an extension or tool fails to set up.
- This changes the default mode from graceful warnings to fail-fast.
- By default, it is set to `false`.
- Accepts `true` and `false`.

#### `phpts` (optional)

- Specify to set up thread-safe version of PHP on Windows.
- Accepts `ts` and `nts`.
- By default, it is set to `nts`.
- See [thread safe setup](#thread-safe-setup) for more info.

#### `update` (optional)

- Specify to update PHP on the runner to the latest patch version.
- Accepts `true` and `false`.
- By default, it is set to `false`.
- See [force update setup](#force-update-setup) for more info.

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
    ini-values: post_max_size=256M, max_execution_time=180
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
        operating-system: ['ubuntu-latest', 'windows-latest', 'macos-latest']
        php-versions: ['7.3', '7.4']
        phpunit-versions: ['latest']
        include:
        - operating-system: 'ubuntu-latest'
          php-versions: '7.2'
          phpunit-versions: '8.5.13'    
    steps:
    - name: Checkout
      uses: actions/checkout@v2

    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: ${{ matrix.php-versions }}
        extensions: mbstring, intl
        ini-values: post_max_size=256M, max_execution_time=180
        coverage: xdebug        
        tools: php-cs-fixer, phpunit:${{ matrix.phpunit-versions }}
```

### Nightly Build Setup

> Setup a nightly build of `PHP 8.1`. 

- This version is currently in development.
- Some user space extensions might not support this version currently.

```yaml
steps:
- name: Checkout
  uses: actions/checkout@v2

- name: Setup nightly PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.1'
    extensions: mbstring
    ini-values: post_max_size=256M, max_execution_time=180
    coverage: xdebug
    tools: php-cs-fixer, phpunit
```

### Thread Safe Setup

> Setup `TS` or `NTS` PHP on `Windows`.

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

### Force Update Setup

> Update to the latest patch of PHP versions.

- Pre-installed PHP versions on the GitHub Actions images are not updated to their latest patch release by default.
- You can specify the `update` environment variable to `true` for updating to the latest release.

```yaml
- name: Setup PHP with latest versions
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
- name: Setup PHP with logs
  uses: shivammathur/setup-php@verbose
  with:
    php-version: '7.4'
```

### Multi-Arch Setup

> Setup PHP on multiple architecture on Ubuntu GitHub Runners.

- `PHP 5.6` to `PHP 8.0` are supported by `setup-php` on multiple architecture on `Ubuntu`.
- For this, you can use `shivammathur/node` images as containers. These have compatible `Nodejs` and `spc` utility.
- Using `spc` you can run `setup-php` on both `i386` and `amd64` containers as opposed to [default syntax](#basic-setup), which only supports `amd64`.
- Currently, for `Arm` based setup, you will need [self-hosted runners](#self-hosted-setup).

```yaml
jobs:
  run:
    runs-on: ubuntu-latest
    container: shivammathur/node:latest-${{ matrix.arch }}
    strategy:
      matrix:
        arch: ["amd64", "i386"]
    steps:
      - name: Install PHP
        run: |
          # Update spc (See https://github.com/shivammathur/spc for options)
          spc -U

          # Install PHP
          spc --php-version "7.4" \
              --extensions "mbstring, intl" \
              --ini-values "post_max_size=256M, max_execution_time=180" \
              --coverage "xdebug" \
              --tools "php-cs-fixer, phpunit"
```

### Self Hosted Setup

> Setup PHP on a self-hosted runner.

- To set up a dockerized self-hosted runner, refer to this [guide](https://github.com/shivammathur/setup-php/wiki/Dockerized-self-hosted-runner-on-Ubuntu) to set up in an `Ubuntu` container and refer to this [guide](https://github.com/shivammathur/setup-php/wiki/Dockerized-self-hosted-runner-on-Windows) to set up in a `Windows` container.
- To set up the runner directly on the host OS or in a virtual machine, follow this [requirements guide](https://github.com/shivammathur/setup-php/wiki/Requirements-for-self-hosted-runners "Requirements guide for self-hosted runner to run setup-php") before setting up the self-hosted runner.
- If your workflow uses [service containers](https://help.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idservices "GitHub Actions Services"), then setup the runner on a Linux host or in a Linux virtual machine. GitHub Actions does not support nested virtualization on Linux, so services will not work in a dockerized container.

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

**Notes**
- Do not set up multiple self-hosted runners on a single server instance as parallel workflow will conflict with each other.
- Do not set up self-hosted runners on the side on your development environment or your production server.
- Avoid using the same labels for your `self-hosted` runners which are used by `GitHub-hosted` runners.

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

Run the workflow locally with `act` using [`shivammathur/node`](https://github.com/shivammathur/node-docker "Docker image to run setup-php") docker images.

Choose the image tag which matches the `runs-on` property in your workflow. For example, if you are using `ubuntu-20.04` in your workflow, run `act -P ubuntu-20.04=shivammathur/node:20.04`.

```bash
# For runs-on: ubuntu-latest
act -P ubuntu-latest=shivammathur/node:latest

# For runs-on: ubuntu-20.04
act -P ubuntu-20.04=shivammathur/node:2004

# For runs-on: ubuntu-18.04
act -P ubuntu-18.04=shivammathur/node:1804

# For runs-on: ubuntu-16.04 (deprecated)
act -P ubuntu-16.04=shivammathur/node:1604
```

### JIT Configuration

> Enable Just-in-time(JIT) on PHP 8.0 and PHP 8.1.

- To enable JIT, enable `opcache` in cli mode by setting `opcache.enable_cli=1`.
- JIT conflicts with `Xdebug`, `PCOV`, and other extensions which override `zend_execute_ex` function, so set `coverage: none` and remove any such extension if added.
- By default, `opcache.jit=1235` and `opcache.jit_buffer_size=256M` are set which can be changed using `ini-values` input.
- For detailed information about JIT related directives refer to the [`official PHP documentation`](https://www.php.net/manual/en/opcache.configuration.php#ini.opcache.jit "opcache.jit documentation").

For example to enable JIT in `tracing` mode with buffer size of `64 MB`. 

```yaml
- name: Setup PHP with JIT in tracing mode
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.0'
    coverage: none
    ini-values: opcache.enable_cli=1, opcache.jit=tracing, opcache.jit_buffer_size=64M
```

### Cache Extensions

You can cache PHP extensions using `shivammathur/cache-extensions` and `action/cache` GitHub Actions. Extensions which take very long to set up when cached are available in the next workflow run and are enabled directly. This reduces the workflow execution time.  
Refer to [`shivammathur/cache-extensions`](https://github.com/shivammathur/cache-extensions "GitHub Action to cache php extensions") for details.

### Cache Composer Dependencies

If your project uses composer, you can persist the composer's internal cache directory. Dependencies cached are loaded directly instead of downloading them while installation. The files cached are available across check-runs and will reduce the workflow execution time.

```yaml
- name: Get composer cache directory
  id: composer-cache
  run: echo "::set-output name=dir::$(composer config cache-files-dir)"

- name: Cache dependencies
  uses: actions/cache@v2
  with:
    path: ${{ steps.composer-cache.outputs.dir }}
    key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.lock') }}
    restore-keys: ${{ runner.os }}-composer-

- name: Install dependencies
  run: composer install --prefer-dist
```

**Notes**
- Please do not cache `vendor` directory using `action/cache` as that will have side effects.
- If you do not commit `composer.lock`, you can use the hash of `composer.json` as the key for your cache.
```yaml
key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.json') }}
```

- If you support a range of `composer` dependencies and use `prefer-lowest` and `prefer-stable` options, you can store them in your matrix and add them to the keys.
```yaml
key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.lock') }}-${{ matrix.prefer }}-
restore-keys: ${{ runner.os }}-composer-${{ matrix.prefer }}-
```

### Cache Node.js Dependencies

If your project has node.js dependencies, you can persist NPM or yarn cache directory. The cached files are available across check-runs and will reduce the workflow execution time.

```yaml
- name: Get node.js cache directory
  id: node-cache-dir
  run: echo "::set-output name=dir::$(npm config get cache)" # Use $(yarn cache dir) for yarn

- name: Cache dependencies
  uses: actions/cache@v2
  with:
    path: ${{ steps.node-cache-dir.outputs.dir }}
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }} # Use '**/yarn.lock' for yarn
    restore-keys: ${{ runner.os }}-node-
```

**Note:** Please do not cache `node_modules` directory as that will have side effects.

### Composer GitHub OAuth

If you have a number of workflows which setup multiple tools or have many composer dependencies, you might hit the GitHub's rate limit for composer. Also, if you specify only the major version or the version in `major.minor` format, you can hit the rate limit. To avoid this you can specify an `OAuth` token by setting `COMPOSER_TOKEN` environment variable. You can use [`GITHUB_TOKEN`](https://help.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token "GITHUB_TOKEN documentation") secret for this purpose.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
  env:
    COMPOSER_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Problem Matchers

Problem matchers are `json` configurations which identify errors and warnings in your logs and surface them prominently in the GitHub Actions UI by highlighting them and creating code annotations.

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

PHPStan supports error reporting in GitHub Actions, so it does not require problem matchers.

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

- Use the `v2` tag as `setup-php` version. It is a rolling tag and is synced with the latest minor and patch releases. With `v2` you automatically get the bug fixes, security patches, new features and support for latest PHP releases. For debugging any issues `verbose` tag can be used temporarily. It outputs all the logs and is also synced with the latest releases.
- Semantic release versions can also be used. It is recommended to [use dependabot](https://docs.github.com/en/github/administering-a-repository/keeping-your-actions-up-to-date-with-github-dependabot "Setup Dependabot with GitHub Actions") with semantic versioning to keep the actions in your workflows up to date.
- Commit SHA can also be used, but are not recommended. They have to be updated with every release manually, without which you will not get any bug fixes, security patches or new features. 
- It is highly discouraged to use the `master` branch as version, it might break your workflow after major releases as they have breaking changes.
- If you are using the `v1` tag or a `1.x.y` version, you should [switch to v2](https://github.com/shivammathur/setup-php/wiki/Switch-to-v2 "Guide for switching from setup-php v1 to v2") as `v1` only gets critical bug fixes. Maintenance support for `v1` will be dropped with the last `PHP 8.0` release.

## :scroll: License

- The scripts and documentation in this project are under the [MIT License](LICENSE "License for shivammathur/setup-php"). 
- This project has multiple [dependencies](#package-dependencies "Dependencies for this PHP Action"). Their licenses can be found in their respective repositories.
- The logo for `setup-php` is a derivative work of [php.net logo](https://www.php.net/download-logos.php) and is licensed under the [CC BY-SA 4.0 License](https://creativecommons.org/licenses/by-sa/4.0/ "Creative Commons License").

## :+1: Contributions

> Contributions are welcome!

- See [Contributor's Guide](.github/CONTRIBUTING.md "shivammathur/setup-php contribution guide") before you start.
- If you face any issues or want to suggest a feature/improvement, start a discussion [here](https://github.com/shivammathur/setup-php/discussions "Setup PHP discussions").

*Contributors of `setup-php` and other related projects*

<p align="center">
  <a href="https://github.com/shivammathur/setup-php/graphs/contributors">
    <img src="https://setup-php.com/contributors/?" alt="Contributors of setup-php and related projects" width="100%">
  </a>
</p>

## :sparkling_heart: Support This Project

- This project is provided as Free and Open-Source software. We need funds to maintain and do future improvements. Please sponsor setup-php using the below options:
  - [Open Collective](https://opencollective.com/setup-php "setup-php Open Collective")
  - [Paypal](https://www.paypal.me/shivammathur "Shivam Mathur PayPal")
  - [Patreon](https://www.patreon.com/shivammathur "Shivam Mathur Patreon")
- Please [reach out](mailto:contact@setup-php.com) if you have any questions about sponsoring setup-php.
- Please star the project and share it. If you blog, please share your experience of using this action.

*`setup-php` is generously supported by*

<p>
  <a href="https://www.jetbrains.com/?from=setup-php">
    <img src="https://setup-php.com/sponsors/jetbrains.svg" alt="JetBrains" width="106" height="60">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://blackfire.io/?utm_source=setup-php">
    <img src="https://setup-php.com/sponsors//blackfire.svg" alt="Blackfire" width="212" height="60">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://www.macstadium.com/?source=setup-php">
    <img src="https://setup-php.com/sponsors//macstadium.png" alt="Mac Stadium" width="148" height="60">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://tidelift.com/subscription/pkg/npm-setup-php">
    <img src="https://setup-php.com/sponsors//tidelift.png" alt="Tidelift" width="70" height="60">
  </a>  
</p>

## :package: Dependencies

- [Node.js dependencies](https://github.com/shivammathur/setup-php/network/dependencies "Node.js dependencies")
- [aaronparker/VcRedist](https://github.com/aaronparker/VcRedist "VcRedist PowerShell package")
- [mlocati/powershell-phpmanager](https://github.com/mlocati/powershell-phpmanager "Package to handle PHP on windows")
- [ppa:ondrej/php](https://launchpad.net/~ondrej/+archive/ubuntu/php "Packaging active PHP packages")
- [shivammathur/cache-extensions](https://github.com/shivammathur/cache-extensions "GitHub action to help with caching PHP extensions")
- [shivammathur/composer-cache](https://github.com/shivammathur/composer-cache "Cache composer releases")
- [shivammathur/homebrew-extensions](https://github.com/shivammathur/homebrew-extensions "Tap for PHP extensions on MacOS")
- [shivammathur/homebrew-php](https://github.com/shivammathur/homebrew-php "Tap for PHP builds on MacOS")
- [shivammathur/icu-intl](https://github.com/shivammathur/icu-intl "icu4c and php-intl builds")
- [shivammathur/php-builder](https://github.com/shivammathur/php-builder "Nightly PHP package for Ubuntu")
- [shivammathur/php-builder-windows](https://github.com/shivammathur/php-builder-windows "Nightly PHP package for Windows")
- [shivammathur/php-ubuntu](https://github.com/shivammathur/php-ubuntu "Cache stable PHP Packages for Ubuntu")
- [shivammathur/php5-darwin](https://github.com/shivammathur/php5-darwin "Scripts to setup PHP5 versions on darwin")
- [shivammathur/php5-ubuntu](https://github.com/shivammathur/php5-ubuntu "Scripts to setup PHP5 versions on ubuntu")

## :bookmark_tabs: Further Reading

- [About GitHub Actions](https://github.com/features/actions "GitHub Actions")
- [GitHub Actions Syntax](https://help.github.com/en/articles/workflow-syntax-for-github-actions "GitHub Actions Syntax")
- [Other Awesome Actions](https://github.com/sdras/awesome-actions "List of Awesome GitHub Actions")
