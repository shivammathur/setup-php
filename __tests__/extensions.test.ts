import * as extensions from '../src/extensions';

describe('Extension tests', () => {
  it('checking addExtensionOnWindows', async () => {
    let win32: string = await extensions.addExtension(
      'Xdebug, pcov, sqlite, phalcon4, ast-beta',
      '7.4',
      'win32'
    );
    expect(win32).toContain('Add-Extension xdebug');
    expect(win32).toContain('Add-Extension pcov');
    expect(win32).toContain('Add-Extension sqlite3');
    expect(win32).toContain('phalcon.ps1 phalcon4');
    expect(win32).toContain('Add-Extension ast beta');

    win32 = await extensions.addExtension('xdebug2', '7.2', 'win32');
    expect(win32).toContain('Add-Extension xdebug stable 2.9.8');

    win32 = await extensions.addExtension('mysql', '7.4', 'win32');
    expect(win32).toContain('Add-Extension mysqli');
    expect(win32).toContain('Add-Extension mysqlnd');

    win32 = await extensions.addExtension('mysql', '8.0', 'win32');
    expect(win32).toContain('Add-Extension mysqli');
    expect(win32).toContain('Add-Extension mysqlnd');

    win32 = await extensions.addExtension('mysql', '5.6', 'win32');
    expect(win32).toContain('Add-Extension mysql');
    expect(win32).toContain('Add-Extension mysqli');
    expect(win32).toContain('Add-Extension mysqlnd');

    win32 = await extensions.addExtension(
      'phalcon3, does_not_exist',
      '7.2',
      'win32',
      true
    );
    expect(win32).toContain('phalcon.ps1 phalcon3');
    expect(win32).toContain('Add-Extension does_not_exist');

    win32 = await extensions.addExtension('xdebug', '7.2', 'openbsd');
    expect(win32).toContain('Platform openbsd is not supported');
  });

  it('checking addExtensionOnLinux', async () => {
    let linux: string = await extensions.addExtension(
      'Xdebug, pcov, sqlite, ast-beta, xdebug-alpha',
      '7.4',
      'linux'
    );
    expect(linux).toContain('sudo $debconf_fix apt-get install -y php7.4-pcov');
    expect(linux).toContain(
      'sudo $debconf_fix apt-get install -y php7.4-sqlite3'
    );
    expect(linux).toContain('add_unstable_extension ast beta extension');
    expect(linux).toContain(
      'add_unstable_extension xdebug alpha zend_extension'
    );

    linux = await extensions.addExtension('gearman', '7.0', 'linux');
    expect(linux).toContain('gearman.sh');

    linux = await extensions.addExtension('xdebug2', '7.2', 'linux');
    expect(linux).toContain('add_pecl_extension xdebug 2.9.8 zend_extension');

    linux = await extensions.addExtension('xdebug', '7.2', 'openbsd');
    expect(linux).toContain('Platform openbsd is not supported');

    linux = await extensions.addExtension('phalcon3, phalcon4', '7.3', 'linux');
    expect(linux).toContain('phalcon.sh phalcon3 7.3');
    expect(linux).toContain('phalcon.sh phalcon4 7.3');
  });

  it('checking addExtensionOnDarwin', async () => {
    let darwin: string = await extensions.addExtension(
      'Xdebug, pcov, grpc, igbinary, imagick, phalcon3, phalcon4, protobuf, psr, rdkafka, swoole, sqlite, ast-beta',
      '7.2',
      'darwin'
    );
    expect(darwin).toContain('add_brew_extension xdebug');
    expect(darwin).toContain('add_brew_extension pcov');
    expect(darwin).toContain('add_brew_extension grpc');
    expect(darwin).toContain('add_brew_extension igbinary');
    expect(darwin).toContain('add_brew_extension imagick');
    expect(darwin).toContain('add_brew_extension phalcon3');
    expect(darwin).toContain('add_brew_extension phalcon4');
    expect(darwin).toContain('add_brew_extension protobuf');
    expect(darwin).toContain('add_brew_extension psr');
    expect(darwin).toContain('add_brew_extension rdkafka');
    expect(darwin).toContain('add_brew_extension swoole');
    expect(darwin).toContain('pecl_install sqlite3');
    expect(darwin).toContain('add_unstable_extension ast beta extension');

    darwin = await extensions.addExtension('pcov', '5.6', 'darwin');
    expect(darwin).toContain('pecl_install pcov');

    darwin = await extensions.addExtension('pcov', '7.2', 'darwin');
    expect(darwin).toContain('add_brew_extension pcov');

    darwin = await extensions.addExtension('xdebug', '5.6', 'darwin');
    expect(darwin).toContain('add_brew_extension xdebug');

    darwin = await extensions.addExtension('xdebug', '7.0', 'darwin');
    expect(darwin).toContain('add_brew_extension xdebug');

    darwin = await extensions.addExtension('xdebug2', '7.2', 'darwin');
    expect(darwin).toContain('add_brew_extension xdebug2');

    darwin = await extensions.addExtension(
      'does_not_exist',
      '7.2',
      'darwin',
      false
    );
    expect(darwin).toContain('add_extension does_not_exist');

    darwin = await extensions.addExtension('xdebug', '7.2', 'openbsd');
    expect(darwin).toContain('Platform openbsd is not supported');
  });
});
