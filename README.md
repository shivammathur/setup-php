<p align="center">
  <a href="https://github.com/marketplace/actions/setup-php-action" target="_blank">
    <img src="https://repository-images.githubusercontent.com/206578964/e0a18480-dc65-11e9-8dd3-b9ffbf5575fe" alt="Setup PHP in GitHub Actions" width="400">
  </a>
</p>

<h1 align="center">Setup PHP in GitHub Actions</h1>

<p align="center">
  <a href="https://github.com/shivammathur/setup-php" title="GitHub action to setup PHP"><img alt="GitHub Actions status" src="https://github.com/shivammathur/setup-php/workflows/Main%20workflow/badge.svg"></a>
  <a href="https://codecov.io/gh/shivammathur/setup-php" title="Code coverage"><img alt="Codecov Code Coverage" src="https://img.shields.io/codecov/c/github/shivammathur/setup-php?logo=codecov"></a>
  <a href="https://github.com/shivammathur/setup-php/blob/main/LICENSE" title="license"><img alt="LICENSE" src="https://img.shields.io/badge/license-MIT-428f7e.svg?logo=open%20source%20initiative&logoColor=white&labelColor=555555"></a>
  <a href="#tada-php-support" title="PHP Versions Supported"><img alt="PHP Versions Supported" src="https://img.shields.io/badge/php-5.3%20to%208.5-777bb3.svg?logo=php&logoColor=white&labelColor=555555"></a>
</p>
<p align="center">
  <a href="https://reddit.com/r/setup_php" title="setup-php reddit"><img alt="setup-php reddit" src="https://img.shields.io/badge/reddit-join-FF5700?logo=reddit&logoColor=FF5700&labelColor=555555"></a>
  <a href="https://twitter.com/setup_php" title="setup-php twitter"><img alt="setup-php twitter" src="https://img.shields.io/badge/twitter-follow-1DA1F2?logo=twitter&logoColor=1DA1F2&labelColor=555555"></a>
  <a href="https://status.setup-php.com" title="setup-php status"><img alt="setup-php status" src="https://img.shields.io/badge/status-subscribe-28A745?logo=statuspage&logoColor=28A745&labelColor=555555"></a>
</p>

Setup PHP with required extensions, php.ini configuration, code-coverage support and various tools like composer in [GitHub Actions](https://github.com/features/actions "GitHub Actions"). This action gives you a cross-platform interface to set up the PHP environment you need to test your application. Refer to [Usage](#memo-usage "How to use this") section and [examples](#examples "Examples of use") to see how to use this.

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
  - [Debug Build Setup](#debug-build-setup)
  - [Thread Safe Setup](#thread-safe-setup)
  - [Force Update Setup](#force-update-setup)
  - [Verbose Setup](#verbose-setup)
  - [Multi-Arch Setup](#multi-arch-setup)
  - [Self Hosted Setup](#self-hosted-setup)
  - [Local Testing Setup](#local-testing-setup)
  - [JIT Configuration](#jit-configuration)
  - [Cache Extensions](#cache-extensions)
  - [Cache Composer Dependencies](#cache-composer-dependencies)
  - [GitHub Composer Authentication](#github-composer-authentication)
  - [Private Packagist Authentication](#private-packagist-authentication)
  - [Manual Composer Authentication](#manual-composer-authentication)
  - [Inline PHP Scripts](#inline-php-scripts)
  - [Problem Matchers](#problem-matchers)
  - [Examples](#examples)
- [Versioning](#bookmark-versioning)
- [License](#scroll-license)
- [Contributions](#1-contributions)
- [Support This Project](#sparkling_heart-support-this-project)
- [Dependencies](#package-dependencies)
- [Further Reading](#bookmark_tabs-further-reading)

## :cloud: OS/Platform Support

Both `GitHub-hosted` and `self-hosted` runners are supported by `setup-php` on the following OS/Platforms.

### GitHub-Hosted Runners

| Virtual environment | YAML workflow label                | Pre-installed PHP      |
|---------------------|------------------------------------|------------------------|
| Ubuntu 24.04        | `ubuntu-24.04`                     | `PHP 8.3`              |
| Ubuntu 22.04        | `ubuntu-latest` or `ubuntu-22.04`  | `PHP 8.1`              |
| Ubuntu 20.04        | `ubuntu-20.04`                     | `PHP 7.4` to `PHP 8.3` |
| Windows Server 2025 | `windows-2025`                     | `PHP 8.3`              |
| Windows Server 2022 | `windows-latest` or `windows-2022` | `PHP 8.3`              |
| Windows Server 2019 | `windows-2019`                     | `PHP 8.3`              |
| macOS Sequoia 15.x  | `macos-15`                         | -                      |
| macOS Sonoma 14.x   | `macos-latest` or `macos-14`       | -                      |
| macOS Ventura 13.x  | `macos-13`                         | `PHP 8.3`              |

### Self-Hosted Runners

| Host OS/Virtual environment      | YAML workflow label        |
|----------------------------------|----------------------------|
| Ubuntu 24.04                     | `self-hosted` or `Linux`   |
| Ubuntu 22.04                     | `self-hosted` or `Linux`   |
| Ubuntu 20.04                     | `self-hosted` or `Linux`   |
| Debian 12                        | `self-hosted` or `Linux`   |
| Debian 11                        | `self-hosted` or `Linux`   |
| Windows 7 and newer              | `self-hosted` or `Windows` |
| Windows Server 2012 R2 and newer | `self-hosted` or `Windows` |
| macOS Sequoia 15.x x86_64/arm64  | `self-hosted` or `macOS`   |
| macOS Sonoma 14.x x86_64/arm64   | `self-hosted` or `macOS`   |
| macOS Ventura 13.x x86_64/arm64  | `self-hosted` or `macOS`   |

- Refer to the [self-hosted setup](#self-hosted-setup) to use the action on self-hosted runners.
- Operating systems based on the above Ubuntu and Debian versions are also supported on best effort basis.
- If the requested PHP version is pre-installed, `setup-php` switches to it, otherwise it installs the PHP version.

## :tada: PHP Support

On all supported OS/Platforms the following PHP versions can be set up as per the runner.

- PHP 5.3 to PHP 8.5 on GitHub-hosted runners, except for macOS ARM64 runners (macos-14).
- PHP 5.6 to PHP 8.5 on GitHub-hosted macOS ARM64 runners (macos-14).
- PHP 5.6 to PHP 8.5 on self-hosted runners.

| PHP Version | Stability | Release Support       | Runner Support                 |
|-------------|-----------|-----------------------|--------------------------------|
| `5.3`       | `Stable`  | `End of life`         | `GitHub-hosted`                |
| `5.4`       | `Stable`  | `End of life`         | `GitHub-hosted`                |
| `5.5`       | `Stable`  | `End of life`         | `GitHub-hosted`                |
| `5.6`       | `Stable`  | `End of life`         | `GitHub-hosted`, `self-hosted` |
| `7.0`       | `Stable`  | `End of life`         | `GitHub-hosted`, `self-hosted` |
| `7.1`       | `Stable`  | `End of life`         | `GitHub-hosted`, `self-hosted` |
| `7.2`       | `Stable`  | `End of life`         | `GitHub-hosted`, `self-hosted` |
| `7.3`       | `Stable`  | `End of life`         | `GitHub-hosted`, `self-hosted` |
| `7.4`       | `Stable`  | `End of life`         | `GitHub-hosted`, `self-hosted` |
| `8.0`       | `Stable`  | `End of life`         | `GitHub-hosted`, `self-hosted` |
| `8.1`       | `Stable`  | `Security fixes only` | `GitHub-hosted`, `self-hosted` |
| `8.2`       | `Stable`  | `Active`              | `GitHub-hosted`, `self-hosted` |
| `8.3`       | `Stable`  | `Active`              | `GitHub-hosted`, `self-hosted` |
| `8.4`       | `Stable`  | `Active`              | `GitHub-hosted`, `self-hosted` |
| `8.5`       | `Nightly` | `In development`      | `GitHub-hosted`, `self-hosted` |

**Notes:**
- Specifying `8.5` in `php-version` input installs a nightly build of `PHP 8.5.0-dev`. See [nightly build setup](#nightly-build-setup) for more information.
- To use JIT on `PHP 8.0` and above, refer to the [JIT configuration](#jit-configuration) section.

## :heavy_plus_sign: PHP Extension Support

PHP extensions can be set up using the `extensions` input. It accepts a `string` in csv-format.

- On `Ubuntu`, extensions which are available as a package, available on `PECL` or a git repository can be set up.

```yaml
- name: Setup PHP with PECL extension
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    extensions: imagick, swoole
```

- On `Windows`, extensions available on `PECL` which have the `DLL` binary can be set up.

- On `macOS`, extensions available on `PECL` or a git repository can be set up.

- On `Ubuntu` and `macOS` to compile and install an extension from a git repository follow this [guide](https://github.com/shivammathur/setup-php/wiki/Add-extension-from-source "Guide to compile and install PHP extensions in setup-php").

- Extensions installed along with PHP if specified are enabled.

- Specific versions of extensions available on `PECL` can be set up by suffixing the extension's name with the version. This is useful for installing old versions of extensions which support end of life PHP versions.

```yaml
- name: Setup PHP with specific version of PECL extension
  uses: shivammathur/setup-php@v2
  with:
    php-version: '5.4'
    extensions: swoole-1.9.3
```

- Extensions with pre-release versions available on `PECL` can be set up by suffixing the extension's name with its state i.e `alpha`, `beta`, `devel` or `snapshot`.

```yaml
- name: Setup PHP with pre-release PECL extension
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    extensions: xdebug-beta
```

- On `Ubuntu` and `macOS` to compile and install an extension from PECL with libraries or custom configuration follow this [guide](https://github.com/shivammathur/setup-php/wiki/Add-extension-from-PECL-with-libraries-and-custom-configuration "Guide to compile and install PHP extensions using PECL with libraries and custom configuration in setup-php").

- Shared extensions can be disabled by prefixing them with a `:`. All extensions depending on the specified extension will also be disabled.

```yaml
- name: Setup PHP and disable opcache
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    extensions: :opcache
```

- All shared extensions can be disabled by specifying `none`. When `none` is specified along with other extensions, it is hoisted to the start of the input. So, all the shared extensions will be disabled first, then rest of the extensions in the input will be processed.

**Note:** This disables all core and third-party shared extensions and thus, can break some tools which need them. Required extensions are enabled again when the tools are set up on a best-effort basis. So it is recommended to add the extensions required for your tools after `none` in the `extensions` input to avoid any issues.

```yaml
- name: Setup PHP without any shared extensions except mbstring
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    extensions: none, mbstring
```

- Extension `intl` can be set up with specific `ICU` version for `PHP 5.6` and above in `Ubuntu` workflows by suffixing `intl` with the `ICU` version. `ICU 50.2` and newer versions are supported. Refer to [`ICU builds`](https://github.com/shivammathur/icu-intl#icu4c-builds) for the specific versions supported.

```yaml
- name: Setup PHP with intl
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    extensions: intl-70.1
```

- Extensions loaded by default after `setup-php` runs can be found on the [wiki](https://github.com/shivammathur/setup-php/wiki).

- These extensions have custom support:
  - `cubrid` and `pdo_cubrid` on `Ubuntu`.
  - `event`, `gearman`, `geos` and `relay` on `Ubuntu` and `macOS`.
  - `blackfire`, `couchbase`, `ioncube`, `oci8`, `pdo_firebird`, `pdo_oci`, `pecl_http`, `phalcon3`, `phalcon4`, `phalcon5`, and `zephir_parser` on all supported OS.

- By default, extensions which cannot be added or disabled gracefully leave an error message in the logs, the execution is not interrupted. To change this behaviour you can set `fail-fast` flag to `true`.

```yaml
- name: Setup PHP with fail-fast
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    extensions: oci8
  env:
    fail-fast: true
```

## :wrench: Tools Support

These tools can be set up globally using the `tools` input. It accepts a string in csv-format.

[`behat`], [`blackfire`], [`blackfire-player`], [`box`], [`castor`], [`churn`], [`codeception`], [`composer`], [`composer-dependency-analyser`], [`composer-normalize`], [`composer-prefetcher`], [`composer-require-checker`], [`composer-unused`], [`cs2pr`], [`deployer`], [`ecs`], [`flex`], [`grpc_php_plugin`], [`infection`], [`parallel-lint`], [`pecl`], [`phan`], [`phing`], [`phinx`], [`phive`], [`php-config`], [`php-cs-fixer`], [`php-scoper`], [`phpcbf`], [`phpcpd`], [`phpcs`], [`phpdoc`] or [`phpDocumentor`], [`phpize`], [`phplint`], [`phpmd`], [`phpspec`], [`phpstan`], [`phpunit`], [`phpunit-bridge`], [`phpunit-polyfills`], [`pint`], [`prestissimo`], [`protoc`], [`psalm`], [`rector`], [`symfony`] or [`symfony-cli`], [`vapor`] or [`vapor-cli`], [`wp`] or [`wp-cli`]

```yaml
- name: Setup PHP with tools
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    tools: php-cs-fixer, phpunit
```

- In addition to above tools any composer tool or package can also be set up globally by specifying it as `vendor/package` matching the listing on Packagist. This format accepts the same [version constraints](https://getcomposer.org/doc/articles/versions.md#writing-version-constraints "Composer version constraints") as `composer`.

```yaml
- name: Setup PHP with tools
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    tools: vimeo/psalm
```

- To set up a particular version of a tool, specify it in the form `tool:version`.
  
  Version can be in the following format:
    - Semver. For example `tool:1.2.3` or `tool:1.2.3-beta1`.
    - Major version. For example `tool:1` or `tool:1.x`.
    - Major and minor version. For example `tool:1.2` or `tool:1.2.x`.
  
  When you specify just the major version or the version in `major.minor` format, the latest patch version matching the input will be setup. 

  With the exception of major versions of `composer`, if you specify only the `major` version or the version in `major.minor` format for a tool you can get rate limited by GitHub's API. To avoid this, it is recommended to provide a [`GitHub` OAuth token](https://github.com/shivammathur/setup-php#composer-github-oauth "Composer GitHub OAuth").
  You can do that by setting `GITHUB_TOKEN` environment variable. The `COMPOSER_TOKEN` environment variable has been deprecated in favor of `GITHUB_TOKEN` and will be removed in the next major version.

```yaml
- name: Setup PHP with tools
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    tools: php-cs-fixer:3.64, phpunit:11.4
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- The latest stable version of `composer` is set up by default. You can set up the required `composer` version by specifying the major version `v1` or `v2`, or the version in `major.minor` or `semver` format. Additionally, for composer `snapshot` and `preview` can also be specified to set up the respective releases.

```yaml
- name: Setup PHP with composer v2
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    tools: composer:v2
```

- If you do not use composer in your workflow, you can specify `tools: none` to skip it.

```yaml
- name: Setup PHP without composer
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    tools: none
```

- Tools `pear`, `pecl`, `phpize` and `php-config` are set up by default for all supported PHP versions on Linux and macOS.

- The latest version of `blackfire` cli is set up when `blackfire` is specified in tools input. Please refer to the [official documentation](https://blackfire.io/docs/integrations/ci/github-actions "Blackfire.io documentation for GitHub Actions") for using `blackfire` with GitHub Actions.

- Tools `prestissimo` and `composer-prefetcher` will be skipped unless `composer:v1` is also specified in tools input. It is recommended to drop `prestissimo` and use `composer v2`.

- By default, except `composer` tools which cannot be set up gracefully leave an error message in the logs, the execution is not interrupted. To change this behaviour you can set `fail-fast` flag to `true`.

```yaml
- name: Setup PHP with fail-fast
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    tools: deployer
  env:
    fail-fast: true
```

**Notes**
- Input `tools` is useful to set up tools which are only used in CI workflows, thus keeping your `composer.json` tidy.
- If you do not want to use all your dev-dependencies in workflow, you can run composer with `--no-dev` and install required tools using `tools` input to speed up your workflow.
- By default, `COMPOSER_NO_INTERACTION` is set to `1` and `COMPOSER_PROCESS_TIMEOUT` is set to `0`. In effect, this means that Composer commands in your scripts do not need to specify `--no-interaction`.
- Also, `COMPOSER_NO_AUDIT` is set to `1`. So if you want to audit your dependencies for security vulnerabilities, it is recommended to add a `composer audit` step before you install them.
- If you want to set a different `COMPOSER_PROCESS_TIMEOUT`, you can set it in your workflow file using the `env` keyword.

```yaml
- name: Setup PHP with composer and custom process timeout
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
  env:
    COMPOSER_PROCESS_TIMEOUT: 300
```

## :signal_strength: Coverage Support

### Xdebug

Specify `coverage: xdebug` to use `Xdebug` and disable `PCOV`.  
Runs on all [PHP versions supported](#tada-php-support "List of PHP versions supported on this GitHub Action").

```yaml
- name: Setup PHP with Xdebug
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    coverage: xdebug
```

- When you specify `coverage: xdebug`, the latest version of Xdebug compatible with the PHP version is set up by default.
- If you need Xdebug 2.x on PHP 7.2, 7.3 or 7.4, you can specify `coverage: xdebug2`.

```yaml
- name: Setup PHP with Xdebug 2.x
  uses: shivammathur/setup-php@v2
  with:
    php-version: '7.4'
    coverage: xdebug2
```

**Note**: Xdebug is enabled by default on Ubuntu GitHub Actions images, so if you are not using it in your workflow it is recommended to disable it as that will have a positive impact on your PHP performance. Please refer to the [disable coverage](#disable-coverage) section for details.

### PCOV

Specify `coverage: pcov` to use `PCOV` and disable `Xdebug`.  
Runs on PHP 7.1 and newer PHP versions.

- If your source code directory is other than `src`, `lib` or, `app`, specify `pcov.directory` using the `ini-values` input.  

```yaml
- name: Setup PHP with PCOV
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
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

Specify `coverage: none` to disable both `Xdebug` and `PCOV`.

Disable coverage for these reasons:

- You are not generating coverage reports while testing.
- You are using `phpdbg` for running your tests.
- You are profiling your code using `blackfire`.
- You are using PHP in JIT mode. Please refer to [JIT configuration](#jit-configuration) section for more details.

```yaml
- name: Setup PHP with no coverage driver
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    coverage: none
```

## :memo: Usage

### Inputs

> Specify using `with` keyword

#### `php-version` (optional)

- Specify the PHP version you want to set up.
- Accepts a `string`. For example `'8.4'`.
- Accepts `lowest` to set up the lowest supported PHP version.
- Accepts `highest` or `latest` to set up the latest stable PHP version.
- Accepts `nightly` to set up a nightly build from the master branch of PHP.
- Accepts `pre-installed` to set up the highest pre-installed PHP version. You can combine this with `update: true` to update the pre-installed PHP version.
- Accepts the format `d.x`, where `d` is the major version. For example `5.x`, `7.x` and `8.x`.  
- See [PHP support](#tada-php-support) for the supported PHP versions.
- If not specified, it looks for the following in order:
  - The `php-version-file` input if it exists
  - A `composer.lock` file and the `platform-overrides.php` value
  - A `composer.json` file and the `config.platform.php` value
  - If the `composer.lock` or `composer.json` file is in a sub-directory in your repository, please specify the subdirectory path in `COMPOSER_PROJECT_DIR` env.

#### `php-version-file` (optional)

- Specify a file with the PHP version you want to set up.
- Accepts a `string`. For example `'.phpenv-version'`.
- See [PHP support](#tada-php-support) for the supported PHP versions.
- By default, `.php-version` file is used.
- The file either have the PHP version as its content, or follow the asdf `.tool-versions` format.
- If not specified and the default `.php-version` file is not found, the latest stable PHP version is set up.

#### `extensions` (optional)

- Specify the extensions you want to add or disable.
- Accepts a `string` in csv-format. For example `mbstring, :opcache`.
- Accepts `none` to disable all shared extensions.
- Shared extensions prefixed with `:` are disabled.
- See [PHP extension support](#heavy_plus_sign-php-extension-support) for more info.

#### `ini-file` (optional)

- Specify the base `php.ini` file.
- Accepts `production`, `development` or `none`.
- By default, production `php.ini` file is used.

#### `ini-values` (optional)

- Specify the values you want to add to `php.ini`. 
- Accepts a `string` in csv-format. For example `post_max_size=256M, max_execution_time=180`.
- Accepts ini values with commas if wrapped in quotes. For example `xdebug.mode="develop,coverage"`.  

#### `coverage` (optional)

- Specify the code-coverage driver you want to set up.
- Accepts `xdebug`, `pcov` or `none`.
- See [coverage support](#signal_strength-coverage-support) for more info.

#### `tools` (optional)

- Specify the tools you want to set up.
- Accepts a `string` in csv-format. For example: `phpunit, phpcs`
- See [tools support](#wrench-tools-support) for tools supported.

### Outputs

#### `php-version`

On GitHub Actions you can assign the `setup-php` step an `id`, you can use the same to get the outputs in a later step.

- Provides the PHP version in semver format.

```yaml
- name: Setup PHP
  id: setup-php
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'

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

- Specify to set up a thread-safe build of PHP.
- Accepts `nts` for non-thread-safe and `zts` or `ts` for thread-safe.
- By default, it is set to `nts`.
- See [thread safe setup](#thread-safe-setup) for more info.

#### `update` (optional)

- Specify to update PHP on the runner to the latest patch version.
- Accepts `true` and `false`.
- By default, it is set to `false`.
- See [force update setup](#force-update-setup) for more info.

See below for more info.

### Basic Setup

> Set up a particular PHP version.

```yaml
steps:
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    extensions: mbstring, intl
    ini-values: post_max_size=256M, max_execution_time=180
    coverage: xdebug
    tools: php-cs-fixer, phpunit
```

### Matrix Setup

> Set up multiple PHP versions on multiple operating systems.

```yaml
jobs:
  run:
    runs-on: ${{ matrix.operating-system }}
    strategy:
      matrix:
        operating-system: ['ubuntu-latest', 'windows-latest', 'macos-latest']
        php-versions: ['8.2', '8.3', '8.4']
        phpunit-versions: ['latest']
        include:
          - operating-system: 'ubuntu-latest'
            php-versions: '8.1'
            phpunit-versions: 10
    steps:
    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: ${{ matrix.php-versions }}
        extensions: mbstring, intl
        ini-values: post_max_size=256M, max_execution_time=180
        coverage: xdebug
        tools: php-cs-fixer, phpunit:${{ matrix.phpunit-versions }}
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Nightly Build Setup

> Set up a nightly build of `PHP 8.5`.

- These PHP versions are currently in active development and might contain bugs and breaking changes.
- Some user space extensions might not support this version currently.

```yaml
steps:
- name: Setup nightly PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.5'
    extensions: mbstring
    ini-values: post_max_size=256M, max_execution_time=180
    coverage: xdebug
    tools: php-cs-fixer, phpunit
```

### Debug Build Setup

> Set up a PHP build with debugging symbols.

- Production release builds of PHP without debugging symbols are set up by default.
- You can use the `debug` environment variable to set up a build with debugging symbols for PHP 5.6 and above.

**Notes**
- On Linux, the debug symbols are added as [debug info files](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Separate-Debug-Files.html) in the `/usr/lib/debug/.build-id` directory. These files match the `build-id` in the ELF section of the PHP binaries and debugging tools like `gdb` are able to resolve the symbols from these files.
- On Windows, the debug symbols are added as `pdb` files in the PHP installation directory.
- On macOS, the debug symbols are compiled into the binaries.

```yaml
steps:
- name: Setup PHP with debugging symbols
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
  env:
    debug: true # specify true or false
```

### Thread Safe Setup

> Set up `TS` or `NTS` PHP.

- `NTS` versions are set up by default.

```yaml
jobs:
  run:
    runs-on: [ubuntu-latest, windows-latest, macos-latest]
    name: Setup PHP TS
    steps:
    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: '8.4'
      env:
        phpts: ts # specify ts or nts
```

### Force Update Setup

> Update to the latest patch of PHP versions.

- Pre-installed PHP versions are not updated to their latest patch release by default.
- If `ppa:ondrej/php` is missing on the Ubuntu GitHub environment, the PHP version is updated to the latest patch release.
- You can specify the `update` environment variable to `true` for updating to the latest release.

```yaml
- name: Setup PHP with latest versions
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
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
    php-version: '8.4'
```

### Multi-Arch Setup

> Set up PHP on multiple architecture on Ubuntu GitHub Runners.

- `PHP 5.6` to `PHP 8.4` are supported by `setup-php` on multiple architecture on `Ubuntu`.
- For this, you can use `shivammathur/node` images as containers. These have compatible `Nodejs` installed for `setup-php`.
- Currently, for `ARM` based setup, you will need [self-hosted runners](#self-hosted-setup).

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
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.4'
```

### Self Hosted Setup

> Set up PHP on a self-hosted runner.

- To set up a containerised self-hosted runner, refer to the following guides as per your base operating system.
  - [Linux](https://github.com/shivammathur/setup-php/wiki/Dockerized-self-hosted-runner-on-Linux)
  - [Windows](https://github.com/shivammathur/setup-php/wiki/Dockerized-self-hosted-runner-on-Windows)

- To set up the runner directly on the host OS or in a virtual machine, follow this [requirements guide](https://github.com/shivammathur/setup-php/wiki/Requirements-for-self-hosted-runners "Requirements guide for self-hosted runner to run setup-php") before setting up the self-hosted runner.
- If your workflow uses [service containers](https://help.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idservices "GitHub Actions Services"), then set up the runner on a Linux host or in a Linux virtual machine. GitHub Actions does not support nested virtualization on Linux, so services will not work in a dockerized container.

It is recommended to specify the environment variable `runner` with the value `self-hosted` for self-hosted environments.

```yaml
jobs:
  run:
    runs-on: self-hosted
    strategy:
      matrix:
        php-versions: ['5.6', '7.0', '7.1', '7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4']
    name: PHP ${{ matrix.php-versions }}
    steps:
    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: ${{ matrix.php-versions }}
      env:
        runner: self-hosted
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
    steps:
    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: '8.4'
```

Run the workflow locally with `act` using [`shivammathur/node`](https://github.com/shivammathur/node-docker "Docker image to run setup-php") docker images.

Choose the image tag which matches the `runs-on` property in your workflow. For example, if you are using `ubuntu-20.04` in your workflow, run `act -P ubuntu-20.04=shivammathur/node:2004`.

```bash
# For runs-on: ubuntu-latest
act -P ubuntu-latest=shivammathur/node:latest

# For runs-on: ubuntu-24.04
act -P ubuntu-24.04=shivammathur/node:2404

# For runs-on: ubuntu-22.04
act -P ubuntu-22.04=shivammathur/node:2204

# For runs-on: ubuntu-20.04
act -P ubuntu-20.04=shivammathur/node:2004
```

### JIT Configuration

> Enable Just-in-time (JIT) on PHP 8.0 and above.

- To enable JIT, enable `opcache` in cli mode by setting `opcache.enable_cli=1`.
- JIT conflicts with `Xdebug`, `PCOV`, and other extensions which override `zend_execute_ex` function, so set `coverage: none` and disable any such extension if added.
- By default, `opcache.jit=1235` and `opcache.jit_buffer_size=256M` are set which can be changed using `ini-values` input.
- For detailed information about JIT related directives refer to the [`official PHP documentation`](https://www.php.net/manual/en/opcache.configuration.php#ini.opcache.jit "opcache.jit documentation").

For example to enable JIT in `tracing` mode with buffer size of `64 MB`. 

```yaml
- name: Setup PHP with JIT in tracing mode
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
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
  run: echo "dir=$(composer config cache-files-dir)" >> $GITHUB_OUTPUT

- name: Cache dependencies
  uses: actions/cache@v4
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
key: ${{ runner.os }}-composer-${{ matrix.prefer }}-${{ hashFiles('**/composer.lock') }}
restore-keys: ${{ runner.os }}-composer-${{ matrix.prefer }}-
```

### GitHub Composer Authentication

If you have a number of workflows which set up multiple tools or have many composer dependencies, you might hit the GitHub's rate limit for composer. Also, if you specify only the major version or the version in `major.minor` format, you can hit the rate limit. To avoid this you can specify an `OAuth` token by setting `GITHUB_TOKEN` environment variable. You can use [`GITHUB_TOKEN`](https://help.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token "GITHUB_TOKEN documentation") secret for this purpose.

The `COMPOSER_TOKEN` environment variable has been deprecated in favor of `GITHUB_TOKEN` and will be removed in the next major version.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Private Packagist Authentication

If you use Private Packagist for your private composer dependencies, you can set the `PACKAGIST_TOKEN` environment variable to authenticate.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
  env:
    PACKAGIST_TOKEN: ${{ secrets.PACKAGIST_TOKEN }}
```

### Manual Composer Authentication

In addition to GitHub or Private Packagist, if you want to authenticate private repositories hosted elsewhere, you can set the `COMPOSER_AUTH_JSON` environment variable with the authentication methods and the credentials in json format.
Please refer to the authentication section in [`composer documentation`](https://getcomposer.org/doc/articles/authentication-for-private-packages.md "composer documentation") for more details.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
  env:
    COMPOSER_AUTH_JSON: |
      {
        "http-basic": {
          "example.org": {
            "username": "${{ secrets.EXAMPLE_ORG_USERNAME }}",
            "password": "${{ secrets.EXAMPLE_ORG_PASSWORD }}"
          }
        }
      }
```

### Inline PHP Scripts

If you have to run multiple lines of PHP code in your workflow, you can do that easily without saving it to a file.

Put the code in the run property of a step and specify the shell as `php {0}`.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'

- name: Run PHP code
  shell: php {0}
  run: |
    <?php
    $welcome = "Hello, world";
    echo $welcome;
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
    php-version: '8.4'
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
    php-version: '8.4'
    tools: psalm

- name: Run Psalm
  run: psalm --output-format=github
```

#### Tools with checkstyle support

For tools that support `checkstyle` reporting like `phpstan`, `psalm`, `php-cs-fixer` and `phpcs` you can use `cs2pr` to annotate your code.  
For examples refer to the [cs2pr documentation](https://github.com/staabm/annotate-pull-request-from-checkstyle).

> Here is an example with `phpcs`.

```yaml
- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: '8.4'
    tools: cs2pr, phpcs

- name: Run phpcs
  run: phpcs -q --report=checkstyle src | cs2pr
```

### Examples

Examples of using `setup-php` with various PHP frameworks and packages.

| Framework/Package                      | Runs on                         | Workflow                                                                                                      |
|----------------------------------------|---------------------------------|---------------------------------------------------------------------------------------------------------------|
| Blackfire                              | `macOS`, `ubuntu` and `windows` | [blackfire.yml](./examples/blackfire.yml "GitHub Action using Blackfire")                                     |
| Blackfire Player                       | `macOS`, `ubuntu` and `windows` | [blackfire-player.yml](./examples/blackfire-player.yml "GitHub Action using Blackfire Player")                |
| CakePHP with `MySQL` and `Redis`       | `ubuntu`                        | [cakephp-mysql.yml](./examples/cakephp-mysql.yml "GitHub Action for CakePHP with MySQL and Redis")            |
| CakePHP with `PostgreSQL` and `Redis`  | `ubuntu`                        | [cakephp-postgres.yml](./examples/cakephp-postgres.yml "GitHub Action for CakePHP with Postgres and Redis")   |
| CakePHP without services               | `macOS`, `ubuntu` and `windows` | [cakephp.yml](./examples/cakephp.yml "GitHub Action for CakePHP without services")                            |
| CodeIgniter                            | `macOS`, `ubuntu` and `windows` | [codeigniter.yml](./examples/codeigniter.yml "GitHub Action for CodeIgniter")                                 |
| Laminas MVC                            | `macOS`, `ubuntu` and `windows` | [laminas-mvc.yml](./examples/laminas-mvc.yml "GitHub Action for Laminas Framework MVC Projects")              |
| Laravel with `MySQL` and `Redis`       | `ubuntu`                        | [laravel-mysql.yml](./examples/laravel-mysql.yml "GitHub Action for Laravel with MySQL and Redis")            |
| Laravel with `PostgreSQL` and `Redis`  | `ubuntu`                        | [laravel-postgres.yml](./examples/laravel-postgres.yml "GitHub Action for Laravel with PostgreSQL and Redis") |
| Laravel without services               | `macOS`, `ubuntu` and `windows` | [laravel.yml](./examples/laravel.yml "GitHub Action for Laravel without services")                            |
| Lumen with `MySQL` and `Redis`         | `ubuntu`                        | [lumen-mysql.yml](./examples/lumen-mysql.yml "GitHub Action for Lumen with MySQL and Redis")                  |
| Lumen with `PostgreSQL` and `Redis`    | `ubuntu`                        | [lumen-postgres.yml](./examples/lumen-postgres.yml "GitHub Action for Lumen with PostgreSQL and Redis")       |
| Lumen without services                 | `macOS`, `ubuntu` and `windows` | [lumen.yml](./examples/lumen.yml "GitHub Action for Lumen without services")                                  |
| Phalcon with `MySQL`                   | `ubuntu`                        | [phalcon-mysql.yml](./examples/phalcon-mysql.yml "GitHub Action for Phalcon with MySQL")                      |
| Phalcon with `PostgreSQL`              | `ubuntu`                        | [phalcon-postgres.yml](./examples/phalcon-postgres.yml "GitHub Action for Phalcon with PostgreSQL")           |
| Roots/bedrock                          | `ubuntu`                        | [bedrock.yml](./examples/bedrock.yml "GitHub Action for Wordpress Development using @roots/bedrock")          |
| Roots/sage                             | `ubuntu`                        | [sage.yml](./examples/sage.yml "GitHub Action for Wordpress Development using @roots/sage")                   |
| Slim Framework                         | `macOS`, `ubuntu` and `windows` | [slim-framework.yml](./examples/slim-framework.yml "GitHub Action for Slim Framework")                        |
| Symfony with `MySQL`                   | `ubuntu`                        | [symfony-mysql.yml](./examples/symfony-mysql.yml "GitHub Action for Symfony with MySQL")                      |
| Symfony with `PostgreSQL`              | `ubuntu`                        | [symfony-postgres.yml](./examples/symfony-postgres.yml "GitHub Action for Symfony with PostgreSQL")           |
| Symfony without services               | `macOS`, `ubuntu` and `windows` | [symfony.yml](./examples/symfony.yml "GitHub Action for Symfony without services")                            |
| Yii2 Starter Kit with `MySQL`          | `ubuntu`                        | [yii2-mysql.yml](./examples/yii2-mysql.yml "GitHub Action for Yii2 Starter Kit with MySQL")                   |
| Yii2 Starter Kit with `PostgreSQL`     | `ubuntu`                        | [yii2-postgres.yml](./examples/yii2-postgres.yml "GitHub Action for Yii2 Starter Kit with PostgreSQL")        |

## :bookmark: Versioning

- Use the `v2` tag as `setup-php` version. It is a rolling tag and is synced with the latest minor and patch releases. With `v2` you automatically get the bug fixes, security patches, new features and support for latest PHP releases.
- Semantic release versions can also be used. It is recommended to [use dependabot](https://docs.github.com/en/github/administering-a-repository/keeping-your-actions-up-to-date-with-github-dependabot "Setup Dependabot with GitHub Actions") with semantic versioning to keep the actions in your workflows up to date.
- Commit SHA can also be used, but are not recommended unless you set up tooling to update them with each release of the action.
- A new major version of the action will only be tagged when there are breaking changes in the setup-php API i.e. inputs, outputs, and environment flags.
- For debugging any issues `verbose` tag can be used temporarily. It outputs all the logs and is also synced with the latest releases.
- It is highly discouraged to use the `main` branch as version, it might break your workflow after major releases as they have breaking changes.
- If you are using the `v1` tag or a `1.x.y` version, you should [switch to v2](https://github.com/shivammathur/setup-php/wiki/Switch-to-v2 "Guide for switching from setup-php v1 to v2") as `v1` is not supported anymore.

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

- Please star the project and share it. If you blog, please share your experience of using `setup-php`.
- Please [reach out](mailto:contact@setup-php.com) if you have any questions about sponsoring setup-php.

Many users and organisations support setup-php via [GitHub Sponsors](https://github.com/sponsors/shivammathur).

<a href="https://github.com/sponsors/shivammathur"><img src="https://setup-php.com/sponsors.svg?" alt="Sponsor shivammathur"></a>

These companies generously provide setup-php their products and services to aid in the development of this project.

<p>
  <a href="https://www.jetbrains.com/?from=setup-php">
    <img src="https://setup-php.com/sponsors/jetbrains.svg" alt="JetBrains" width="212" height="120">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://www.macstadium.com/opensource/members#gh-light-mode-only">
    <img src="https://setup-php.com/sponsors/macstadium.png" alt="Mac Stadium" width="296" height="120">
  </a>
  <a href="https://www.macstadium.com/opensource/members#gh-dark-mode-only">
    <img src="https://setup-php.com/sponsors/macstadium-white.png" alt="Mac Stadium" width="296" height="120">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://tidelift.com/subscription/pkg/npm-setup-php">
    <img src="https://setup-php.com/sponsors/tidelift.png" alt="Tidelift" width="140" height="120">
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
- [shivammathur/php5-darwin](https://github.com/shivammathur/php5-darwin "Scripts to set up PHP5 versions on darwin")
- [shivammathur/php5-ubuntu](https://github.com/shivammathur/php5-ubuntu "Scripts to set up PHP5 versions on ubuntu")

## :bookmark_tabs: Further Reading

- [About GitHub Actions](https://github.com/features/actions "GitHub Actions")
- [GitHub Actions Syntax](https://help.github.com/en/articles/workflow-syntax-for-github-actions "GitHub Actions Syntax")
- [Other Awesome Actions](https://github.com/sdras/awesome-actions "List of Awesome GitHub Actions")


<!-- Links to tools -->
[`behat`]:                    https://docs.behat.org/en/latest/
[`blackfire`]:                https://blackfire.io/docs/php/index
[`blackfire-player`]:         https://blackfire.io/docs/builds-cookbooks/player
[`box`]:                      https://github.com/humbug/box
[`castor`]:                   https://github.com/jolicode/castor
[`churn`]:                    https://github.com/bmitch/churn-php
[`codeception`]:              https://codeception.com/
[`composer`]:                 https://getcomposer.org/
[`composer-dependency-analyser`]: https://github.com/shipmonk-rnd/composer-dependency-analyser
[`composer-normalize`]:       https://github.com/ergebnis/composer-normalize
[`composer-prefetcher`]:      https://github.com/narrowspark/automatic-composer-prefetcher
[`composer-require-checker`]: https://github.com/maglnet/ComposerRequireChecker
[`composer-unused`]:          https://github.com/composer-unused/composer-unused
[`cs2pr`]:                    https://github.com/staabm/annotate-pull-request-from-checkstyle
[`deployer`]:                 https://deployer.org/
[`ecs`]:                      https://github.com/easy-coding-standard/easy-coding-standard
[`flex`]:                     https://flex.symfony.com/
[`grpc_php_plugin`]:          https://grpc.io/
[`infection`]:                https://infection.github.io/
[`parallel-lint`]:            https://github.com/php-parallel-lint/PHP-Parallel-Lint
[`pecl`]:                     https://pecl.php.net/
[`phan`]:                     https://github.com/phan/phan/wiki
[`phing`]:                    https://www.phing.info/
[`phinx`]:                    https://phinx.org/
[`phive`]:                    https://phar.io/
[`php-config`]:               https://www.php.net/manual/en/install.pecl.php-config.php
[`php-cs-fixer`]:             https://cs.symfony.com/
[`php-scoper`]:               https://github.com/humbug/php-scoper
[`phpcbf`]:                   https://github.com/PHPCSStandards/php_codesniffer
[`phpcpd`]:                   https://github.com/sebastianbergmann/phpcpd
[`phpcs`]:                    https://github.com/PHPCSStandards/php_codesniffer
[`phpdoc`]:                   https://phpdoc.org/
[`phpDocumentor`]:            https://phpdoc.org/
[`phpize`]:                   https://www.php.net/manual/en/install.pecl.phpize.php
[`phplint`]:                  https://github.com/overtrue/phplint
[`phpmd`]:                    https://phpmd.org/
[`phpspec`]:                  https://www.phpspec.net/
[`phpstan`]:                  https://phpstan.org/
[`phpunit`]:                  https://phpunit.de/
[`phpunit-bridge`]:           https://symfony.com/doc/current/components/phpunit_bridge.html
[`phpunit-polyfills`]:        https://github.com/Yoast/PHPUnit-Polyfills
[`pint`]:                     https://github.com/laravel/pint
[`prestissimo`]:              https://github.com/hirak/prestissimo
[`protoc`]:                   https://developers.google.com/protocol-buffers/
[`psalm`]:                    https://psalm.dev/
[`rector`]:                   https://getrector.org/
[`symfony`]:                  https://symfony.com/download
[`symfony-cli`]:              https://symfony.com/download
[`vapor`]:                    https://docs.vapor.build/
[`vapor-cli`]:                https://docs.vapor.build/
[`wp`]:                       https://wp-cli.org/
[`wp-cli`]:                   https://wp-cli.org/
