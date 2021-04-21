import * as extensions from '../src/extensions';

describe('Extension tests', () => {
  it('checking addExtensionOnWindows', async () => {
    let win32: string = await extensions.addExtension(
      'Xdebug, pcov, sqlite, :intl, phalcon4, pecl_http, ioncube, oci8, pdo_oci, ast-beta, grpc-1.2.3, inotify-1.2.3alpha2, sqlsrv-1.2.3preview1',
      '7.4',
      'win32'
    );
    expect(win32).toContain('Add-Extension xdebug');
    expect(win32).toContain('Add-Extension pcov');
    expect(win32).toContain('Add-Extension sqlite3');
    expect(win32).toContain('Remove-Extension intl');
    expect(win32).toContain('Add-Phalcon phalcon4');
    expect(win32).toContain('Add-Http');
    expect(win32).toContain('Add-Ioncube');
    expect(win32).toContain('Add-Oci oci8');
    expect(win32).toContain('Add-Oci pdo_oci');
    expect(win32).toContain('Add-Extension ast beta');
    expect(win32).toContain('Add-Extension grpc stable 1.2.3');
    expect(win32).toContain('Add-Extension inotify alpha 1.2.3');
    expect(win32).toContain('Add-Extension sqlsrv devel 1.2.3');

    win32 = await extensions.addExtension('pcov', '5.6', 'win32');
    expect(win32).toContain(
      'Add-Log "$cross" "pcov" "pcov is not supported on PHP 5.6"'
    );

    win32 = await extensions.addExtension('xdebug2', '7.2', 'win32');
    expect(win32).toContain('Add-Extension xdebug stable 2.9.8');

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

    win32 = await extensions.addExtension('xdebug', '7.2', 'openbsd');
    expect(win32).toContain('Platform openbsd is not supported');

    win32 = await extensions.addExtension('blackfire', '7.3', 'win32');
    expect(win32).toContain('Add-Blackfire blackfire');

    win32 = await extensions.addExtension('blackfire-1.31.0', '7.3', 'win32');
    expect(win32).toContain('Add-Blackfire blackfire-1.31.0');

    win32 = await extensions.addExtension(
      'mongodb-mongodb/mongo-php-driver@master',
      '7.3',
      'win32'
    );
    expect(win32).toContain(
      'Add-Log "$cross" "mongodb-mongodb/mongo-php-driver@master" "mongodb-mongodb/mongo-php-driver@master is not supported on PHP 7.3"'
    );
  });

  it('checking addExtensionOnLinux', async () => {
    let linux: string = await extensions.addExtension(
      'Xdebug, pcov, sqlite, :intl, ast, ast-beta, pdo_mysql, pdo-odbc, xdebug-alpha, grpc-1.2.3',
      '7.4',
      'linux'
    );
    expect(linux).toContain('add_extension xdebug');
    expect(linux).toContain('add_extension sqlite3');
    expect(linux).toContain('remove_extension intl');
    expect(linux).toContain('add_unstable_extension ast beta extension');
    expect(linux).toContain('add_pdo_extension mysql');
    expect(linux).toContain('add_pdo_extension odbc');
    expect(linux).toContain('add_pecl_extension grpc 1.2.3 extension');
    expect(linux).toContain(
      'add_unstable_extension xdebug alpha zend_extension'
    );

    linux = await extensions.addExtension('pcov', '5.6', 'linux');
    expect(linux).toContain(
      'add_log "$cross" "pcov" "pcov is not supported on PHP 5.6"'
    );

    linux = await extensions.addExtension('gearman', '5.6', 'linux');
    expect(linux).toContain('add_gearman');
    linux = await extensions.addExtension('gearman', '7.4', 'linux');
    expect(linux).toContain('add_gearman');

    linux = await extensions.addExtension('couchbase', '5.6', 'linux');
    expect(linux).toContain('add_couchbase');
    linux = await extensions.addExtension('couchbase', '7.4', 'linux');
    expect(linux).toContain('add_couchbase');

    linux = await extensions.addExtension('pdo_cubrid', '7.0', 'linux');
    expect(linux).toContain('add_cubrid pdo_cubrid');
    linux = await extensions.addExtension('cubrid', '7.4', 'linux');
    expect(linux).toContain('add_cubrid cubrid');

    linux = await extensions.addExtension('xdebug2', '7.2', 'linux');
    expect(linux).toContain('add_pecl_extension xdebug 2.9.8 zend_extension');

    linux = await extensions.addExtension('xdebug', '7.2', 'openbsd');
    expect(linux).toContain('Platform openbsd is not supported');

    linux = await extensions.addExtension('phalcon3, phalcon4', '7.3', 'linux');
    expect(linux).toContain('add_phalcon phalcon3');
    expect(linux).toContain('add_phalcon phalcon4');

    linux = await extensions.addExtension('ioncube', '7.3', 'linux');
    expect(linux).toContain('add_ioncube');

    linux = await extensions.addExtension('geos', '7.3', 'linux');
    expect(linux).toContain('add_geos');

    linux = await extensions.addExtension('pecl_http', '7.3', 'linux');
    expect(linux).toContain('add_http');

    linux = await extensions.addExtension('http-1.2.3', '7.3', 'linux');
    expect(linux).toContain('add_http http-1.2.3');

    linux = await extensions.addExtension('oci8, pdo_oci', '7.3', 'linux');
    expect(linux).toContain('add_oci oci8');
    expect(linux).toContain('add_oci pdo_oci');

    linux = await extensions.addExtension('blackfire', '7.3', 'linux');
    expect(linux).toContain('add_blackfire blackfire');

    linux = await extensions.addExtension('blackfire-1.31.0', '7.3', 'linux');
    expect(linux).toContain('add_blackfire blackfire-1.31.0');

    linux = await extensions.addExtension('intl-65.1', '5.6', 'linux');
    expect(linux).toContain('add_intl intl-65.1');

    linux = await extensions.addExtension('intl-67.1', '7.3', 'linux');
    expect(linux).toContain('add_intl intl-67.1');

    linux = await extensions.addExtension('intl-68.2', '8.0', 'linux');
    expect(linux).toContain('add_intl intl-68.2');

    linux = await extensions.addExtension(
      'mongodb-mongodb/mongo-php-driver@master',
      '7.3',
      'linux'
    );
    expect(linux).toContain(
      'add_extension_from_source mongodb https://github.com mongodb mongo-php-driver master extension'
    );
  });

  it('checking addExtensionOnDarwin', async () => {
    let darwin: string = await extensions.addExtension(
      'amqp, apcu, Xdebug, pcov, grpc, igbinary, imagick, imap, memcache, memcached, msgpack, phalcon3, phalcon4, protobuf, psr, redis, swoole, sqlite, oci8, pdo_oci, :intl, ast-beta, grpc-1.2.3',
      '7.2',
      'darwin'
    );
    expect(darwin).toContain('add_brew_extension amqp extension');
    expect(darwin).toContain('add_brew_extension apcu extension');
    expect(darwin).toContain('add_brew_extension xdebug zend_extension');
    expect(darwin).toContain('add_brew_extension pcov extension');
    expect(darwin).toContain('add_brew_extension grpc extension');
    expect(darwin).toContain('add_brew_extension igbinary extension');
    expect(darwin).toContain('add_brew_extension imagick extension');
    expect(darwin).toContain('add_brew_extension imap extension');
    expect(darwin).toContain('add_brew_extension memcache extension');
    expect(darwin).toContain('add_brew_extension memcached extension');
    expect(darwin).toContain('add_brew_extension msgpack extension');
    expect(darwin).toContain('add_brew_extension phalcon3 extension');
    expect(darwin).toContain('add_brew_extension phalcon4 extension');
    expect(darwin).toContain('add_brew_extension protobuf extension');
    expect(darwin).toContain('add_brew_extension psr extension');
    expect(darwin).toContain('add_brew_extension redis extension');
    expect(darwin).toContain('add_brew_extension swoole extension');
    expect(darwin).toContain('add_extension sqlite3');
    expect(darwin).toContain('remove_extension intl');
    expect(darwin).toContain('add_unstable_extension ast beta extension');
    expect(darwin).toContain('add_pecl_extension grpc 1.2.3 extension');

    darwin = await extensions.addExtension('couchbase', '5.6', 'darwin');
    expect(darwin).toContain('add_couchbase');

    darwin = await extensions.addExtension('couchbase', '7.3', 'darwin');
    expect(darwin).toContain('add_couchbase');

    darwin = await extensions.addExtension('ioncube', '7.3', 'darwin');
    expect(darwin).toContain('add_ioncube');

    darwin = await extensions.addExtension('geos', '7.3', 'darwin');
    expect(darwin).toContain('add_geos');

    darwin = await extensions.addExtension('pecl_http', '7.3', 'darwin');
    expect(darwin).toContain('add_http');

    darwin = await extensions.addExtension('http-1.2.3', '7.3', 'darwin');
    expect(darwin).toContain('add_http http-1.2.3');

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

    darwin = await extensions.addExtension('xdebug2', '7.2', 'darwin');
    expect(darwin).toContain('add_brew_extension xdebug2');

    darwin = await extensions.addExtension('imagick', '5.5', 'darwin');
    expect(darwin).toContain('add_extension imagick');

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

    darwin = await extensions.addExtension('xdebug', '7.2', 'openbsd');
    expect(darwin).toContain('Platform openbsd is not supported');

    darwin = await extensions.addExtension(
      'mongodb-mongodb/mongo-php-driver@master',
      '7.3',
      'darwin'
    );
    expect(darwin).toContain(
      'add_extension_from_source mongodb https://github.com mongodb mongo-php-driver master extension'
    );
  });
});
