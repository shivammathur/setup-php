import * as extensions from '../src/extensions';

describe('Extension tests', () => {
  it('checking addExtensionOnWindows', async () => {
    let win32: string = await extensions.addExtension(
      'Xdebug, pcov, sqlite, :intl, phalcon4, ioncube, oci8, pdo_oci, ast-beta, grpc-1.2.3, inotify-1.2.3alpha2',
      '7.4',
      'win32'
    );
    expect(win32).toContain('Add-Extension xdebug');
    expect(win32).toContain('Add-Extension pcov');
    expect(win32).toContain('Add-Extension sqlite3');
    expect(win32).toContain('Remove-Extension intl');
    expect(win32).toContain('Add-Phalcon phalcon4');
    expect(win32).toContain('Add-Ioncube');
    expect(win32).toContain('Add-OCI oci8');
    expect(win32).toContain('Add-OCI pdo_oci');
    expect(win32).toContain('Add-Extension ast beta');
    expect(win32).toContain('Add-Extension grpc stable 1.2.3');
    expect(win32).toContain('Add-Extension inotify alpha 1.2.3');

    win32 = await extensions.addExtension('pcov', '5.6', 'win32');
    expect(win32).toContain(
      'Add-Log "$cross" "pcov" "pcov is not supported on PHP 5.6"'
    );

    win32 = await extensions.addExtension('mysql', '7.4', 'win32');
    expect(win32).toContain('Add-Extension mysqli');
    expect(win32).toContain('Add-Extension mysqlnd');

    win32 = await extensions.addExtension('mysql', '8.0', 'win32');
    expect(win32).toContain('Add-Extension mysqli');
    expect(win32).toContain('Add-Extension mysqlnd');

    win32 = await extensions.addExtension('mysql', '5.5', 'win32');
    expect(win32).toContain('Add-Extension mysql');
    expect(win32).toContain('Add-Extension mysqli');
    expect(win32).toContain('Add-Extension mysqlnd');

    win32 = await extensions.addExtension(
      'phalcon3, does_not_exist',
      '7.2',
      'win32',
      true
    );
    expect(win32).toContain('Add-Phalcon phalcon3');
    expect(win32).toContain('Add-Extension does_not_exist');

    win32 = await extensions.addExtension('xdebug', '7.2', 'fedora');
    expect(win32).toContain('Platform fedora is not supported');

    win32 = await extensions.addExtension('blackfire', '7.3', 'win32');
    expect(win32).toContain('Add-Blackfire blackfire');

    win32 = await extensions.addExtension('blackfire-1.31.0', '7.3', 'win32');
    expect(win32).toContain('Add-Blackfire blackfire-1.31.0');
  });

  it('checking addExtensionOnLinux', async () => {
    let linux: string = await extensions.addExtension(
      'Xdebug, xdebug3, pcov, sqlite, :intl, ast, uopz, ast-beta, pdo_mysql, pdo-odbc, xdebug-alpha, grpc-1.2.3',
      '7.4',
      'linux'
    );
    expect(linux).toContain(
      'add_extension_from_source xdebug xdebug/xdebug master --enable-xdebug zend_extension'
    );
    expect(linux).toContain('sudo $debconf_fix apt-get install -y php7.4-pcov');
    expect(linux).toContain(
      'sudo $debconf_fix apt-get install -y php7.4-sqlite3'
    );
    expect(linux).toContain('remove_extension intl');
    expect(linux).toContain('sudo $debconf_fix apt-get install -y php-ast');
    expect(linux).toContain('sudo $debconf_fix apt-get install -y php-uopz');
    expect(linux).toContain('add_unstable_extension ast beta extension');
    expect(linux).toContain('add_pdo_extension mysql');
    expect(linux).toContain('add_pdo_extension odbc');
    expect(linux).toContain('add_pecl_extension grpc 1.2.3 extension');
    expect(linux).toContain(
      'add_unstable_extension xdebug alpha zend_extension'
    );

    linux = await extensions.addExtension('xdebug3', '8.0', 'linux');
    expect(linux).toContain(
      'sudo $debconf_fix apt-get install -y php8.0-xdebug'
    );

    linux = await extensions.addExtension('pcov', '5.6', 'linux');
    expect(linux).toContain(
      'add_log "$cross" "pcov" "pcov is not supported on PHP 5.6"'
    );

    linux = await extensions.addExtension('gearman', '7.0', 'linux');
    expect(linux).toContain('add_gearman');
    linux = await extensions.addExtension('gearman', '7.4', 'linux');
    expect(linux).toContain('add_gearman');

    linux = await extensions.addExtension('xdebug', '7.2', 'fedora');
    expect(linux).toContain('Platform fedora is not supported');

    linux = await extensions.addExtension('phalcon3, phalcon4', '7.3', 'linux');
    expect(linux).toContain('add_phalcon phalcon3');
    expect(linux).toContain('add_phalcon phalcon4');

    linux = await extensions.addExtension('ioncube', '7.3', 'linux');
    expect(linux).toContain('add_ioncube');

    linux = await extensions.addExtension('oci8, pdo_oci', '7.3', 'linux');
    expect(linux).toContain('add_oci oci8');
    expect(linux).toContain('add_oci pdo_oci');

    linux = await extensions.addExtension('blackfire', '7.3', 'linux');
    expect(linux).toContain('add_blackfire blackfire');

    linux = await extensions.addExtension('blackfire-1.31.0', '7.3', 'linux');
    expect(linux).toContain('add_blackfire blackfire-1.31.0');
  });

  it('checking addExtensionOnDarwin', async () => {
    let darwin: string = await extensions.addExtension(
      'Xdebug, pcov, grpc, protobuf, swoole, sqlite, oci8, pdo_oci, :intl, ast-beta, grpc-1.2.3',
      '7.2',
      'darwin'
    );
    expect(darwin).toContain('add_brew_extension xdebug');
    expect(darwin).toContain('add_brew_extension pcov');
    expect(darwin).toContain('add_brew_extension grpc');
    expect(darwin).toContain('add_brew_extension protobuf');
    expect(darwin).toContain('add_brew_extension swoole');
    expect(darwin).toContain('pecl_install sqlite3');
    expect(darwin).toContain('remove_extension intl');
    expect(darwin).toContain('add_unstable_extension ast beta extension');
    expect(darwin).toContain('add_pecl_extension grpc 1.2.3 extension');

    darwin = await extensions.addExtension('phalcon3', '7.0', 'darwin');
    expect(darwin).toContain('add_phalcon phalcon3');

    darwin = await extensions.addExtension('phalcon4', '7.3', 'darwin');
    expect(darwin).toContain('add_phalcon phalcon4');

    darwin = await extensions.addExtension('ioncube', '7.3', 'darwin');
    expect(darwin).toContain('add_ioncube');

    darwin = await extensions.addExtension('oci8, pdo_oci', '7.3', 'darwin');
    expect(darwin).toContain('add_oci oci8');
    expect(darwin).toContain('add_oci pdo_oci');

    darwin = await extensions.addExtension('pcov', '5.6', 'darwin');
    expect(darwin).toContain(
      'add_log "$cross" "pcov" "pcov is not supported on PHP 5.6"'
    );

    darwin = await extensions.addExtension('pcov', '7.2', 'darwin');
    expect(darwin).toContain('add_brew_extension pcov');

    darwin = await extensions.addExtension('xdebug', '5.6', 'darwin');
    expect(darwin).toContain('add_brew_extension xdebug');

    darwin = await extensions.addExtension('xdebug', '7.0', 'darwin');
    expect(darwin).toContain('add_brew_extension xdebug');

    darwin = await extensions.addExtension('xdebug', '7.2', 'darwin');
    expect(darwin).toContain('add_brew_extension xdebug');

    darwin = await extensions.addExtension('redis', '5.6', 'darwin');
    expect(darwin).toContain('pecl_install redis-2.2.8');

    darwin = await extensions.addExtension('redis', '7.2', 'darwin');
    expect(darwin).toContain('pecl_install redis');

    darwin = await extensions.addExtension('imagick', '5.6', 'darwin');
    expect(darwin).toContain('brew install pkg-config imagemagick');
    expect(darwin).toContain('pecl_install imagick');

    darwin = await extensions.addExtension('imagick', '7.4', 'darwin');
    expect(darwin).toContain('brew install pkg-config imagemagick');
    expect(darwin).toContain('pecl_install imagick');

    darwin = await extensions.addExtension('blackfire', '7.3', 'darwin');
    expect(darwin).toContain('add_blackfire blackfire');

    darwin = await extensions.addExtension('blackfire-1.31.0', '7.3', 'darwin');
    expect(darwin).toContain('add_blackfire blackfire-1.31.0');

    darwin = await extensions.addExtension(
      'does_not_exist',
      '7.2',
      'darwin',
      false
    );
    expect(darwin).toContain('add_extension does_not_exist');

    darwin = await extensions.addExtension('xdebug', '7.2', 'fedora');
    expect(darwin).toContain('Platform fedora is not supported');
  });
});
