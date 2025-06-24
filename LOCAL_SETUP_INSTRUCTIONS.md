# Local PHP Environment Setup using setup-php Scripts

This document provides instructions on how to use the `setup-php` action's scripts to configure a PHP environment on your local Linux/Ubuntu machine, outside of GitHub Actions.

This process involves using a Node.js script (`src/local_installer.ts`) to generate a shell script (`run.sh`) tailored to your desired PHP setup. You then execute `run.sh` to perform the actual installation and configuration.

## Prerequisites

1.  **Linux/Ubuntu Environment:** These instructions are primarily for Ubuntu. Debian or other Ubuntu derivatives might work but are not explicitly tested.
2.  **Node.js and npm:** Required to run the `local_installer.ts` script.
    *   Install Node.js (which includes npm) from [NodeSource](https://github.com/nodesource/distributions#installation-instructions) or your distribution's package manager. Version 16+ is recommended.
3.  **Curl:** Used by the scripts to download PHP versions and tools.
    ```bash
    sudo apt update
    sudo apt install curl
    ```
4.  **Build Tools (Recommended):** For installing PECL extensions or some PHP versions from source.
    ```bash
    sudo apt install -y build-essential autoconf automake bison re2c libtool make pkg-config
    ```
5.  **Git:** To clone the repository.
    ```bash
    sudo apt install -y git
    ```
6.  **Sudo Access:** The generated `run.sh` script will require `sudo` privileges to install packages and configure PHP.

## Setup Steps

1.  **Clone the `setup-php` Repository:**
    ```bash
    git clone https://github.com/shivammathur/setup-php.git
    cd setup-php
    ```

2.  **Install Node.js Dependencies:**
    This will install `yargs` (for command-line argument parsing by `local_installer.ts`) and `node-fetch` (used by the adapted `src/fetch.ts`).
    ```bash
    npm install yargs node-fetch@2
    # If your project uses ES Modules and you prefer node-fetch v3:
    # npm install yargs node-fetch
    ```
    *Note: `node-fetch@2` is CJS compatible which is generally easier with `ts-node`. If you have an ESM setup, v3+ might be used.*

3.  **Compile TypeScript (Optional but Recommended):**
    While you can run `.ts` files directly with `ts-node`, compiling them to JavaScript first is a cleaner approach for repeated use.
    ```bash
    npm install -g typescript ts-node # Install TypeScript and ts-node globally if not already
    # Or as dev dependencies: npm install --save-dev typescript ts-node @types/node @types/yargs
    tsc --project tsconfig.json # Ensure your tsconfig.json is set up for CJS output to a 'dist' folder typically
    ```
    If you compile, the command in the next step will change (e.g. `node dist/local_installer.js`). For simplicity, the following steps will use `ts-node`. If you compile, adjust the path accordingly.

4.  **Run `local_installer.ts` to Generate `run.sh`:**
    Execute `src/local_installer.ts` using `ts-node`, providing your desired PHP configuration as command-line arguments.

    **Command Syntax:**
    ```bash
    npx ts-node src/local_installer.ts [options]
    ```

    **Available Options:**
    *   `--php-version <version>`: PHP version (e.g., `8.2`, `7.4`, `latest`, `nightly`). Default: `latest`.
    *   `--php-version-file <path>`: Path to a `.php-version` or similar file. Default: `.php-version`.
    *   `--extensions <csv_list>`: Comma-separated list of PHP extensions (e.g., `mbstring,gd,intl,zip`). Default: `""`.
    *   `--ini-file <type>`: Base `php.ini` to use (`production`, `development`, `none`). Default: `production`.
    *   `--ini-values <csv_list>`: Comma-separated list of `php.ini` values (e.g., `memory_limit=512M,post_max_size=128M`). Default: `""`.
    *   `--coverage <driver>`: Code coverage driver (`xdebug`, `pcov`, `none`). Default: `""`.
    *   `--tools <csv_list>`: Comma-separated list of tools to install (e.g., `composer,phpunit:latest,php-cs-fixer`). Default: `composer`.
    *   `--fail-fast <boolean>`: Exit immediately if a tool or extension fails. Default: `false`.
    *   `--phpts <type>`: PHP thread safety (`nts` or `zts`/`ts`). Default: `nts`.
    *   `--update <boolean>`: Force update PHP to the latest patch version. Default: `false`.
    *   `--debug <boolean>`: Install debug build of PHP. Default: `false`.
    *   `--tools-dir <path>`: Directory for installing global tools. Default: `/usr/local/bin`.
    *   `--runner-tool-cache <path>`: Directory for caching downloaded tools (simulates GitHub Actions `RUNNER_TOOL_CACHE`). Default: `/opt/hostedtoolcache`. (Ensure this directory is writable by the user running `sudo bash run.sh` or create it with appropriate permissions: `sudo mkdir -p /opt/hostedtoolcache && sudo chmod -R 777 /opt/hostedtoolcache`)

    **Example:**
    To set up PHP 8.2 with extensions `mbstring`, `gd`, `zip`, `intl` and tools `composer` and `phpunit` (latest version):
    ```bash
    npx ts-node src/local_installer.ts \
      --php-version 8.2 \
      --extensions "mbstring,gd,zip,intl" \
      --tools "composer,phpunit:latest" \
      --ini-values "memory_limit=256M,date.timezone=UTC"
    ```
    This will generate a `run.sh` file in your current directory (`setup-php`).

5.  **Review and Execute `run.sh`:**
    Inspect the generated `run.sh` script to understand the commands that will be executed.
    ```bash
    less run.sh
    ```
    Execute the script with `sudo` using `bash`:
    ```bash
    sudo bash run.sh
    ```
    The script will then proceed to install and configure PHP and the specified extensions and tools. This may take some time.

6.  **Verify Installation:**
    After the script finishes, verify your PHP setup:
    ```bash
    php -v
    php -m # List compiled modules (extensions)
    composer --version # If installed
    phpunit --version # If installed
    ```

## Environment Variables for Composer (Optional)

If you use private Composer repositories or hit GitHub API rate limits, you might need to set authentication environment variables **before running `sudo bash run.sh`**:

*   **`GITHUB_TOKEN`**: Your GitHub Personal Access Token for Composer to access private GitHub repositories or increase rate limits.
    ```bash
    export GITHUB_TOKEN="your_github_pat"
    # Then run: sudo -E bash run.sh (the -E preserves user environment variables)
    ```
*   **`PACKAGIST_TOKEN`**: For private Packagist.
    ```bash
    export PACKAGIST_TOKEN="your_packagist_token"
    # Then run: sudo -E bash run.sh
    ```
*   **`COMPOSER_AUTH_JSON`**: For other types of Composer authentication, as a JSON string.
    ```bash
    export COMPOSER_AUTH_JSON='{"http-basic": {"example.org": {"username": "user", "password": "password"}}}'
    # Then run: sudo -E bash run.sh
    ```
    It's often better to pass these to `sudo` using the `-E` flag if you set them in your user shell: `sudo -E bash run.sh`.

## Troubleshooting

*   **Script Failures:** If `run.sh` fails, examine the output for error messages. These often indicate missing system dependencies (e.g., `-dev` library packages for a PECL extension) or network issues.
*   **Permissions:** Ensure the `RUNNER_TOOL_CACHE` directory (default `/opt/hostedtoolcache`) is writable. The `local_installer.ts` script will print a message if it's using this. You might need to create and set permissions for it: `sudo mkdir -p /opt/hostedtoolcache && sudo chown -R $(whoami):$(whoami) /opt/hostedtoolcache` (or `sudo chmod -R 777 /opt/hostedtoolcache`).
*   **`fetch.ts` / `node-fetch`:** The adapted `src/fetch.ts` uses `node-fetch`. Ensure it's installed correctly.
*   **Path Issues:** After installation, if tools like `composer` are not found, ensure that the `tools-dir` (default `/usr/local/bin`) is in your system's `PATH`. The scripts attempt to add relevant paths to shell profiles, but you might need to source your profile (`source ~/.bashrc`) or open a new terminal.

This local setup mechanism provides a powerful way to replicate parts of the `setup-php` GitHub Action's functionality directly on your Ubuntu machine.
```
