# setup-php

<p align="left">
  <a href="https://github.com/shivammathur/setup-php"><img alt="GitHub Actions status" src="https://github.com/shivammathur/setup-php/workflows/Main%20workflow/badge.svg"></a>
</p>

This action sets up a php environment for use in actions by:

- optionally installing a version of PHP and adding to PATH. Along with php it also installs composer

# Usage

See [action.yml](action.yml)

Basic:
```yaml
steps:
- name: Checkout
  uses: actions/checkout@master
- name: Installing PHP
  uses: shivammathur/setup-php@master
  with:
    php-version: 7.3
- name: Check PHP Version
  run: php -v
- name: Check Composer Version
  run: composer -V
```

Matrix Testing:
```yaml
jobs:
  run:    
    runs-on: ${{ matrix.operating-system }}
    strategy:
      max-parallel: 15
      matrix:
        operating-system: [ubuntu-latest, windows-latest, macOS-latest]
        php-versions: ['5.6', '7.0', '7.1', '7.2', '7.3']
    name: PHP ${{ matrix.php-versions }} Test
    steps:
    - name: Checkout
      uses: actions/checkout@master
    - name: Install PHP
      uses: shivammathur/setup-php@develop
      with:
        php-version: ${{ matrix.php-versions }}
    - name: Check PHP Version
      run: php -v

```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

# Contributions

Contributions are welcome!  See [Contributor's Guide](docs/contributors.md)