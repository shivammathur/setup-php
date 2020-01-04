import * as tools from '../src/tools';

describe('Tools tests', () => {
  it('checking getToolCommand', async () => {
    expect(await tools.getToolCommand('linux')).toBe('add_tool ');
    expect(await tools.getToolCommand('darwin')).toBe('add_tool ');
    expect(await tools.getToolCommand('win32')).toBe('Add-Tool ');
    expect(await tools.getToolCommand('fedora')).toContain(
      'Platform fedora is not supported'
    );
  });

  it('checking getPECLCommand', async () => {
    expect(await tools.getPECLCommand('linux')).toBe('add_pecl ');
    expect(await tools.getPECLCommand('darwin')).toBe('add_pecl ');
    expect(await tools.getPECLCommand('win32')).toBe('Add-PECL ');
    expect(await tools.getPECLCommand('fedora')).toContain(
      'Platform fedora is not supported'
    );
  });

  it('checking linkTool', async () => {
    expect(await tools.linkTool('tool', 'linux')).toContain(
      'sudo ln -s "$(composer -q global config home)"/vendor/bin/tool /usr/local/bin/tool'
    );
    expect(await tools.linkTool('tool', 'darwin')).toContain(
      'sudo ln -s "$(composer -q global config home)"/vendor/bin/tool /usr/local/bin/tool'
    );
    expect(await tools.linkTool('tool', 'win32')).toContain(
      '$composer_dir = composer -q global config home | % {$_ -replace "/", "\\"}'
    );
    expect(await tools.linkTool('tool', 'win32')).toContain(
      'Add-Content -Path $PsHome\\profile.ps1 -Value "New-Alias tool $composer_dir\\vendor\\bin\\tool.bat"'
    );
    expect(await tools.linkTool('tool', 'fedora')).toContain(
      'Platform fedora is not supported'
    );
  });

  it('checking addTools', async () => {
    let script: string = await tools.addTools(
      'php-cs-fixer, phpstan, phpunit, pecl, phinx',
      'linux'
    );
    expect(script).toContain(
      'add_tool https://github.com/composer/composer/releases/latest/download/composer.phar composer'
    );
    expect(script).toContain(
      'add_tool https://github.com/FriendsOfPHP/PHP-CS-Fixer/releases/latest/download/php-cs-fixer.phar php-cs-fixer'
    );
    expect(script).toContain(
      'add_tool https://github.com/phpstan/phpstan/releases/latest/download/phpstan.phar phpstan'
    );
    expect(script).toContain(
      'add_tool https://phar.phpunit.de/phpunit.phar phpunit'
    );
    expect(script).toContain('add_pecl');
    expect(script).toContain('composer global require robmorgan/phinx');
    expect(script).toContain(
      'sudo ln -s "$(composer -q global config home)"/vendor/bin/phinx /usr/local/bin/phinx'
    );

    script = await tools.addTools(
      'phpcs, phpcbf, phpcpd, phpmd, psalm, phinx',
      'darwin'
    );
    expect(script).toContain(
      'add_tool https://github.com/composer/composer/releases/latest/download/composer.phar composer'
    );
    expect(script).toContain(
      'add_tool https://github.com/squizlabs/PHP_CodeSniffer/releases/latest/download/phpcs.phar phpcs'
    );
    expect(script).toContain(
      'add_tool https://github.com/squizlabs/PHP_CodeSniffer/releases/latest/download/phpcbf.phar phpcbf'
    );
    expect(script).toContain(
      'add_tool https://github.com/sebastianbergmann/phpcpd/releases/latest/download/phpcpd.phar phpcpd'
    );
    expect(script).toContain(
      'add_tool https://github.com/phpmd/phpmd/releases/latest/download/phpmd.phar phpmd'
    );
    expect(script).toContain(
      'https://github.com/vimeo/psalm/releases/latest/download/psalm.phar psalm'
    );
    expect(script).toContain('composer global require robmorgan/phinx');
    expect(script).toContain(
      'sudo ln -s "$(composer -q global config home)"/vendor/bin/phinx /usr/local/bin/phinx'
    );

    script = await tools.addTools(
      'codeception, deployer, prestissimo, phpmd, phinx, does_not_exit',
      'win32'
    );
    expect(script).toContain(
      'Add-Tool https://github.com/composer/composer/releases/latest/download/composer.phar composer'
    );
    expect(script).toContain(
      'Add-Tool https://deployer.org/deployer.phar deployer'
    );
    expect(script).toContain('composer global require hirak/prestissimo');
    expect(script).toContain('composer global require robmorgan/phinx');
    expect(script).toContain(
      '$composer_dir = composer -q global config home | % {$_ -replace "/", "\\"}'
    );
    expect(script).toContain(
      'Add-Content -Path $PsHome\\profile.ps1 -Value "New-Alias phinx $composer_dir\\vendor\\bin\\phinx.bat"'
    );
    expect(script).toContain('Tool does_not_exit is not supported');

    script = await tools.addTools('phpstan, composer-prefetcher', 'darwin');
    expect(script).toContain(
      'add_tool https://github.com/phpstan/phpstan/releases/latest/download/phpstan.phar phpstan'
    );
    expect(script).toContain(
      'composer global require narrowspark/automatic-composer-prefetcher'
    );
  });
});
