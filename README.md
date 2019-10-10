<p align="center">
  <a href="https://github.com/marketplace/actions/setup-php-action" target="_blank">
    <img src="https://repository-images.githubusercontent.com/206578964/e0a18480-dc65-11e9-8dd3-b9ffbf5575fe" alt="Setup PHP in GitHub Actions" width="400">
  </a>
</p>

# Setup PHP in GitHub Actions

<p align="left">
  <a href="https://github.com/shivammathur/setup-php" title="GitHub action to setup PHP"><img alt="GitHub Actions status" src="https://github.com/shivammathur/setup-php/workflows/Main%20workflow/badge.svg"></a>
  <a href="https://codecov.io/gh/shivammathur/setup-php" title="Code coverage"><img alt="Codecov Code Coverage" src="https://codecov.io/gh/shivammathur/setup-php/branch/master/graph/badge.svg"></a>
  <a href="https://github.com/shivammathur/setup-php/blob/master/LICENSE" title="license"><img alt="LICENSE" src="https://img.shields.io/badge/license-MIT-428f7e.svg"></a>
  <a href="#tada-php-support" title="PHP Versions Supported"><img alt="PHP Versions Supported" src="https://img.shields.io/badge/php-%3E%3D%205.6-8892BF.svg"></a> 
  <a href="https://www.patreon.com/shivammathur" title="Support Shivam Mathur on Patreon"><img alt="Support me on Patreon" src="https://shivammathur.com/badges/patreon.svg"></a>   <a href="https://www.paypal.me/shivammathur"><img alt="Support me on PayPal" src="https://shivammathur.com/badges/paypal.svg"></a>
  <a href="https://www.codementor.io/shivammathur?utm_source=github&utm_medium=button&utm_term=shivammathur&utm_campaign=github" title="Contact Shivam Mathur on Codementor"><img alt="Contact me on Codementor" src="https://cdn.codementor.io/badges/contact_me_github.svg"></a>  
</p>

Setup PHP with required extensions, php.ini configuration and composer in [GitHub Actions](https://github.com/features/actions "GitHub Actions"). This action can be added as a step in your action workflow and it will setup the PHP environment you need to test your application. Refer to [Usage](#memo-usage "How to use this") section and [examples](#examples "Examples of use") to see how to use this.

## :tada: PHP Support

|PHP Version|Stability|Release Support|
|--- |--- |--- |
|5.6|`Stable`|`End of life`|
|7.0|`Stable`|`End of life`|
|7.1|`Stable`|`Security fixes only`|
|7.2|`Stable`|`Active`|
|7.3|`Stable`|`Active`|
|7.4|`RC3`|`Active`|

**Note:** PHP 7.4 is currently in development, do not use in production/release branches.

## :cloud: OS/Platform Support

|Virtual environment|matrix.operating-system|
|--- |--- |
|Windows Server 2019|`windows-latest` or `windows-2019`|
|Windows Server 2016 R2|`windows-2016`|
|Ubuntu 18.04|`ubuntu-latest` or `ubuntu-18.04`|
|Ubuntu 16.04|`ubuntu-16.04`|
|macOS X Mojave 10.14|`macOS-latest` or `macOS-10.14`|

## :wrench: PHP Extension Support
- On `ubuntu` extensions which have the package in apt are installed.
- On `windows` and `macOS` PECL extensions are installed.
- Extensions which are installed along with PHP if specified are enabled.
- Extensions which cannot be installed gracefully leave an error message in the logs, the action is not interrupted.

## :signal_strength: Coverage support

### Xdebug

Specify `coverage: xdebug` to use `Xdebug`.  
Runs on all [PHP versions supported](#tada-php-support "List of PHP versions supported on this GitHub Action")    

```yaml
uses: shivammathur/setup-php@master
with:
  php-version: '7.3'  
  coverage: xdebug
```

### PCOV

Specify `coverage: pcov` to use `PCOV`.  
It is much faster than `Xdebug`.  
If your source code directory is other than `src`, `lib` or, `app`, specify `pcov.directory` using the `ini-values-csv` input.  
`PCOV` needs `PHPUnit >= 8.0` and `PHP >= 7.1`, `PHPUnit` needs `PHP >= 7.2`. So use `PHP >= 7.2` with `PCOV`

```yaml
uses: shivammathur/setup-php@master
with:
  php-version: '7.3'
  ini-values-csv: pcov.directory=api #optional, see above for usage.
  coverage: pcov
```

### Disable coverage

Specify `coverage: none` to disable both `Xdebug` and `PCOV`.
Consider disabling the coverage using this PHP action for these reasons.
- You are not generating coverage reports while testing.
- It will disable `Xdebug`, which will have a positive impact on PHP performance.
- You are using `phpdbg`.

```yaml
uses: shivammathur/setup-php@master
with:
  php-version: '7.3'
  coverage: none
```

## :memo: Usage

Inputs supported by this GitHub Action.

- php-version `required`
- extension-csv `optional`
- ini-values-csv `optional`
- coverage `optional`

See [action.yml](action.yml "Metadata for this GitHub Action") and usage below for more info.

### Basic Usage

```yaml
steps:
- name: Checkout
  uses: actions/checkout@master
- name: Installing PHP
  uses: shivammathur/setup-php@master
  with:
    php-version: '7.3'
    extension-csv: mbstring, xdebug #optional
    ini-values-csv: post_max_size=256M, short_open_tag=On #optional
    coverage: xdebug #optional
- name: Check PHP Version
  run: php -v
- name: Check Composer Version
  run: composer -V
- name: Check PHP Extensions
  run: php -m
```

### Matrix Testing

```yaml
jobs:
  run:    
    runs-on: ${{ matrix.operating-system }}
    strategy:
      max-parallel: 15
      matrix:
        operating-system: [ubuntu-latest, windows-latest, macOS-latest]
        php-versions: ['5.6', '7.0', '7.1', '7.2', '7.3']
    name: PHP ${{ matrix.php-versions }} Test on ${{ matrix.operating-system }}
    steps:
    - name: Checkout
      uses: actions/checkout@master
    - name: Install PHP
      uses: shivammathur/setup-php@master
      with:
        php-version: ${{ matrix.php-versions }}
        extension-csv: mbstring, xdebug #optional
        ini-values-csv: post_max_size=256M, short_open_tag=On #optional
        coverage: xdebug #optional
    - name: Check PHP Version
      run: php -v
    - name: Check Composer Version
      run: composer -V
    - name: Check PHP Extensions
      run: php -m           

```

### Examples

Examples for setting up this GitHub Action with different PHP Frameworks/Packages.

|Framework/Package|Runs on|Workflow|
|--- |--- |--- |
|CodeIgniter|`macOS`, `ubuntu` and `windows`|[codeigniter.yml](./examples/codeigniter.yml "GitHub Action for CodeIgniter")|
|Laravel with `MySQL` and `Redis`|`ubuntu`|[laravel-mysql.yml](./examples/laravel-mysql.yml "GitHub Action for Laravel with MySQL and Redis")|
|Laravel with `PostgreSQL` and `Redis`|`ubuntu`|[laravel-postgres.yml](./examples/laravel-postgres.yml "GitHub Action for Laravel with PostgreSQL and Redis")|
|Laravel without services|`macOS`, `ubuntu` and `windows`|[laravel.yml](./examples/laravel.yml "GitHub Action for Laravel without services")|
|Slim Framework|`macOS`, `ubuntu` and `windows`|[slim-framework.yml](./examples/slim-framework.yml "GitHub Action for Slim Framework")|
|Symfony with `MySQL`|`ubuntu`|[symfony-mysql.yml](./examples/symfony-mysql.yml "GitHub Action for Symfony with MySQL")|
|Symfony with `PostgreSQL`|`ubuntu`|[symfony-postgres.yml](./examples/symfony-postgres.yml "GitHub Action for Symfony with PostgreSQL")|
|Yii2 Starter Kit with `MySQL`|`ubuntu`|[yii2-mysql.yml](./examples/yii2-mysql.yml "GitHub Action for Yii2 Starter Kit with MySQL")|
|Yii2 Starter Kit with `PostgreSQL`|`ubuntu`|[yii2-postgres.yml](./examples/yii2-postgres.yml "GitHub Action for Yii2 Starter Kit with PostgreSQL")|
|Zend Framework|`macOS`, `ubuntu` and `windows`|[zend-framework.yml](./examples/zend-framework.yml "GitHub Action for Zend Framework")|

## :scroll: License

The scripts and documentation in this project are released under the [MIT License](LICENSE "License for shivammathur/setup-php"). This project has multiple [dependencies](https://github.com/shivammathur/setup-php/network/dependencies "Dependencies for this PHP Action") and their licenses can be found in their respective repositories.

## :+1: Contributions

Contributions are welcome! See [Contributor's Guide](.github/CONTRIBUTING.md "shivammathur/setup-php contribution guide").

## :sparkling_heart: Support this project

- Please star the project and share it among your developer friends.
- Consider supporting on <a href="https://www.patreon.com/shivammathur"><img alt="Support me on Patreon" src="https://shivammathur.com/badges/patreon.svg"></a> and <a href="https://www.paypal.me/shivammathur"><img alt="Support me on Paypal" src="https://shivammathur.com/badges/paypal.svg"></a>.

## :bookmark: This action uses the following works

- [powershell-phpmanager](https://github.com/mlocati/powershell-phpmanager "Package to handle PHP on windows")
- [Homebrew](https://brew.sh/ "MacOS package manager")
- [ppa:ondrej/php](https://launchpad.net/~ondrej/+archive/ubuntu/php "Pre-compiled ubuntu packages")
- [exolnet/homebrew-deprecated](https://github.com/eXolnet/homebrew-deprecated "Pre-compiled deprecated PHP for macOS")
- [phpbrew](https://github.com/phpbrew/phpbrew "PHP packages manager")

## :bookmark_tabs: Further Reading

- [About GitHub Actions](https://github.com/features/actions "GitHub Actions")
- [GitHub Actions Syntax](https://help.github.com/en/articles/workflow-syntax-for-github-actions "GitHub Actions Syntax")
- [Other Awesome Actions](https://github.com/sdras/awesome-actions "List of Awesome GitHub Actions")
