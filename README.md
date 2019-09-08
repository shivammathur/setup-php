# Setup PHP in GitHub Actions

<p align="left">
  <a href="https://github.com/shivammathur/setup-php"><img alt="GitHub Actions status" src="https://github.com/shivammathur/setup-php/workflows/Main%20workflow/badge.svg"></a>
  <a href="https://github.com/shivammathur/setup-php/blob/master/LICENSE"><img alt="LICENSE" src="https://img.shields.io/badge/license-MIT-428f7e.svg"></a>
</p>

[GitHub Action](https://github.com/features/actions) to install PHP with required extensions and composer. This action can be added as a step in your action workflow and it will setup the PHP environment you need to test your application. Refer to [Usage](#usage) section to see how to use this.

## PHP Versions Support
- 5.6
- 7.0
- 7.1
- 7.2
- 7.3

## OS Support

|Virtual environment|matrix.operating-system|
|--- |--- |
|Windows Server 2019|`windows-latest` or `windows-2019`|
|Windows Server 2016 R2|`windows-2016`|
|Ubuntu 18.04|`ubuntu-latest` or `ubuntu-18.04`|
|Ubuntu 16.04|`ubuntu-16.04`|
|macOS X Mojave 10.14|`macOS-latest` or `macOS-10.14`|


## PHP Extension Support
- On `ubuntu` extensions which have the package in apt are installed.
- On `windows` and `macOS` PECL extensions are installed.
- Extensions which are installed along with PHP if specified are enabled.
- Extensions which cannot be installed gracefully leave an error message in the logs, the action is not interruped.

## Usage

See [action.yml](action.yml) for inputs this action supports.

### Basic

```yaml
steps:
- name: Checkout
  uses: actions/checkout@master
- name: Installing PHP
  uses: shivammathur/setup-php@master
  with:
    php-version: 7.3
    extension-csv: mbstring, xdebug
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
        extension-csv: mbstring, xdebug
    - name: Check PHP Version
      run: php -v
    - name: Check Composer Version
      run: composer -V
    - name: Check PHP Extensions
      run: php -m           

```

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

## Contributions

Contributions are welcome!  See [Contributor's Guide](docs/contributors.md)

## This action uses the following works

- [powershell-phpmanager](https://github.com/mlocati/powershell-phpmanager)
- [Homebrew](https://brew.sh/)
- [ppa:ondrej/php](https://launchpad.net/~ondrej/+archive/ubuntu/php)
- [exolnet/homebrew-deprecated](https://github.com/eXolnet/homebrew-deprecated)

## Further Reading

- [About GitHub Actions](https://github.com/features/actions)
- [GitHub Actions Syntax](https://help.github.com/en/articles/workflow-syntax-for-github-actions)
- [Other Awesome Actions](https://github.com/sdras/awesome-actions)
