# Contributing to setup-php

## Welcome!

We look forward to your contributions! Here are some examples how you can contribute:

* [Ask any questions you may have](https://github.com/shivammathur/setup-php/discussions/new?category=Q-A-Help)
* [Report a bug](https://github.com/shivammathur/setup-php/issues/new?labels=type/bug&template=bug.md)
* [Propose a new feature](https://github.com/shivammathur/setup-php/issues/new?labels=enhancement&template=feature.md)
* [Send a pull request](https://github.com/shivammathur/setup-php/pulls)

## Contributor Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Getting Started

To get started fork `setup-php` and clone it using git:

```bash
git clone https://github.com/<your-username>/setup-php.git

cd setup-php
```

If you are using `Windows` configure `git` to handle line endings.

```cmd
git config --local core.autocrlf true
```

Install `setup-php` dependencies using [npm](https://www.npmjs.com/):

```bash
npm install
```

## Workflow to create Pull Requests

* Fork the `setup-php` project and clone it.
* Create a new branch from the develop branch.
* Make your bug fix or feature addition.
* Add tests for it, so we don't break it in a future version unintentionally.
* Ensure the test suite passes and the code complies with our coding guidelines (see below).
* Send a pull request to the develop branch with all the details.
* If possible, create a GitHub Actions workflow with an integration test for the change in a demo repository and link it in your pull request.

Please make sure that you have [set up your user name and email address](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup) for use with Git. Strings such as `silly nick name <root@localhost>` look really stupid in the commit history of a project.

Due to time constraints, you may not always get a quick response. Please do not take delays personally and feel free to remind.

## Coding Guidelines

This project comes with `.prettierrc.json` and `eslintrc.json` configuration files. Please run the following commands to fix and verify the code quality.

```bash
npm run format
npm run lint
```

### Running the test suite

After following the steps shown above, The `setup-php` tests in the `__tests__` directory can be run using this command:

```bash
npm test
```

### Creating a release

Creating a release means compiling all the TypeScript code to a single file which `setup-php` can run. Run this, before you push your changes.

```bash
npm run build
npm run release
```

### Reporting issues and discussions

For questions or support, we prefer GitHub Discussions. For any bugs or new features you can create an issue using the appropriate template:

* [Discussions](https://github.com/shivammathur/setup-php/discussions)
* [Issues](https://github.com/shivammathur/setup-php/issues)
