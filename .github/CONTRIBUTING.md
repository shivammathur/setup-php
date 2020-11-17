# Contributing to setup-php

## Contributor Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Workflow

* Fork the project.
* Make your bug fix or feature addition.
* Add tests for it, so we don't break it in a future version unintentionally.
* If editing the scripts, create a demo integration test.
* Send a pull request to the develop branch with all the details.

Please make sure that you have [set up your user name and email address](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup) for use with Git. Strings such as `silly nick name <root@localhost>` look really stupid in the commit history of a project.

Due to time constraints, you may not always get a quick response. Please do not take delays personally and feel free to remind.

## Coding Guidelines

## Using setup-php from a Git checkout

The following commands can be used to perform the initial checkout of setup-php:

```bash
$ git clone https://github.com/shivammathur/setup-php.git

$ cd setup-php
```

Install setup-php dependencies using [npm](https://www.npmjs.com/):

```bash
$ npm install
```

If you are using `Windows` configure `git` to handle line endings.

```cmd
git config --local core.autocrlf true
```

This project comes with `.prettierrc.json` and `eslintrc.json` configuration files. Please run the following commands to fix and verify the code quality.

```bash
$ npm run format
$ npm run lint
```

## Running the test suite

After following the steps shown above, The `setup-php` tests in the `__tests__` directory can be run using this command:

```bash
$ npm test
```

## Creating a release

Create a release before you push your changes.

```bash
$ npm run release
```

## Reporting issues

Please submit the issue using the appropriate template provided for a bug report or a feature request:

* [Issues](https://github.com/shivammathur/setup-php/issues)
