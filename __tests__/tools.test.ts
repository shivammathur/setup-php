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

  it('checking addTools', async () => {
    let script: string = await tools.addTools(
      'php-cs-fixer, phpstan, phpunit, pecl',
      'linux'
    );
    expect(script).toContain('add_tool https://getcomposer.org/composer.phar');
    expect(script).toContain(
      'add_tool https://github.com/FriendsOfPHP/PHP-CS-Fixer/releases/latest/download/php-cs-fixer.phar'
    );
    expect(script).toContain(
      'add_tool https://github.com/phpstan/phpstan/releases/latest/download/phpstan.phar'
    );
    expect(script).toContain('add_tool https://phar.phpunit.de/phpunit.phar');
    expect(script).toContain('add_pecl');

    script = await tools.addTools('phpcs, phpcbf, phpcpd, phpmd', 'darwin');
    expect(script).toContain('add_tool https://getcomposer.org/composer.phar');
    expect(script).toContain(
      'add_tool https://github.com/squizlabs/PHP_CodeSniffer/releases/latest/download/phpcs.phar'
    );
    expect(script).toContain(
      'add_tool https://github.com/squizlabs/PHP_CodeSniffer/releases/latest/download/phpcbf.phar'
    );
    expect(script).toContain(
      'add_tool https://github.com/sebastianbergmann/phpcpd/releases/latest/download/phpcpd.phar'
    );
    expect(script).toContain(
      'add_tool https://github.com/phpmd/phpmd/releases/latest/download/phpmd.phar'
    );

    script = await tools.addTools(
      'codeception, deployer, prestissimo, phpmd, does_not_exit',
      'win32'
    );
    expect(script).toContain('Add-Tool https://getcomposer.org/composer.phar');
    expect(script).toContain('Add-Tool https://deployer.org/deployer.phar');
    expect(script).toContain('composer global require hirak/prestissimo');
    expect(script).toContain('Tool does_not_exit is not supported');
  });
});
