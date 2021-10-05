import * as extensions from '../src/extensions';

describe('Extension tests', () => {
  it.each`
    extension                                    | version  | output
    ${'none'}                                    | ${'7.4'} | ${'Disable-AllShared'}
    ${'Xdebug'}                                  | ${'7.4'} | ${'Add-Extension xdebug'}
    ${':intl'}                                   | ${'7.4'} | ${'Disable-Extension intl'}
    ${'phalcon4'}                                | ${'7.4'} | ${'Add-Phalcon phalcon4'}
    ${'pecl_http'}                               | ${'7.4'} | ${'Add-Http'}
    ${'ioncube'}                                 | ${'7.4'} | ${'Add-Ioncube'}
    ${'oci8'}                                    | ${'7.4'} | ${'Add-Oci oci8'}
    ${'pdo_oci'}                                 | ${'7.4'} | ${'Add-Oci pdo_oci'}
    ${'ast-beta'}                                | ${'7.4'} | ${'Add-Extension ast beta'}
    ${'grpc-1.2.3'}                              | ${'7.4'} | ${'Add-Extension grpc stable 1.2.3'}
    ${'inotify-1.2.3alpha2'}                     | ${'7.4'} | ${'Add-Extension inotify alpha 1.2.3'}
    ${'sqlsrv-1.2.3preview1'}                    | ${'7.4'} | ${'Add-Extension sqlsrv devel 1.2.3'}
    ${'pcov'}                                    | ${'5.6'} | ${'Add-Log "$cross" "pcov" "pcov is not supported on PHP 5.6"'}
    ${'xdebug2'}                                 | ${'7.2'} | ${'Add-Extension xdebug stable 2.9.8'}
    ${'mysql'}                                   | ${'7.4'} | ${'Add-Extension mysqli'}
    ${'mysql'}                                   | ${'7.4'} | ${'Add-Extension mysqlnd'}
    ${'mysql'}                                   | ${'5.5'} | ${'Add-Extension mysql'}
    ${'mysql'}                                   | ${'5.5'} | ${'Add-Extension mysqli'}
    ${'mysql'}                                   | ${'5.5'} | ${'Add-Extension mysqlnd'}
    ${'phalcon3'}                                | ${'7.2'} | ${'Add-Phalcon phalcon3'}
    ${'blackfire'}                               | ${'7.3'} | ${'Add-Blackfire blackfire'}
    ${'blackfire-1.31.0'}                        | ${'7.3'} | ${'Add-Blackfire blackfire-1.31.0'}
    ${'mongodb-mongodb/mongo-php-driver@master'} | ${'7.3'} | ${'Add-Log "$cross" "mongodb-mongodb/mongo-php-driver@master" "mongodb-mongodb/mongo-php-driver@master is not supported on PHP 7.3"'}
  `(
    'checking addExtensionOnWindows for extension $extension on version $version',
    async ({extension, version, output}) => {
      expect(
        await extensions.addExtension(extension, version, 'win32')
      ).toContain(output);
    }
  );

  it.each`
    extension                                    | version  | output
    ${'none'}                                    | ${'7.4'} | ${'disable_all_shared'}
    ${'Xdebug'}                                  | ${'7.4'} | ${'add_extension xdebug'}
    ${':intl'}                                   | ${'7.4'} | ${'disable_extension intl'}
    ${'ast-beta'}                                | ${'7.4'} | ${'add_unstable_extension ast beta extension'}
    ${'pdo_mysql'}                               | ${'7.4'} | ${'add_pdo_extension mysql'}
    ${'pdo-odbc'}                                | ${'7.4'} | ${'add_pdo_extension odbc'}
    ${'grpc-1.2.3'}                              | ${'7.4'} | ${'add_pecl_extension grpc 1.2.3 extension'}
    ${'xdebug-alpha'}                            | ${'7.4'} | ${'add_unstable_extension xdebug alpha zend_extension'}
    ${'pcov'}                                    | ${'5.6'} | ${'add_log "$cross" "pcov" "pcov is not supported on PHP 5.6'}
    ${'gearman'}                                 | ${'5.6'} | ${'add_gearman'}
    ${'gearman'}                                 | ${'7.4'} | ${'add_gearman'}
    ${'couchbase'}                               | ${'5.6'} | ${'add_couchbase'}
    ${'couchbase'}                               | ${'7.4'} | ${'add_couchbase'}
    ${'pdo_cubrid'}                              | ${'7.0'} | ${'add_cubrid pdo_cubrid'}
    ${'pdo_cubrid'}                              | ${'7.4'} | ${'add_pdo_extension cubrid'}
    ${'xdebug2'}                                 | ${'7.2'} | ${'add_pecl_extension xdebug 2.9.8 zend_extension'}
    ${'phalcon3'}                                | ${'7.3'} | ${'add_phalcon phalcon3'}
    ${'ioncube'}                                 | ${'7.3'} | ${'add_ioncube'}
    ${'geos'}                                    | ${'7.3'} | ${'add_geos'}
    ${'pecl_http'}                               | ${'7.3'} | ${'add_http'}
    ${'http-1.2.3'}                              | ${'7.3'} | ${'add_http http-1.2.3'}
    ${'oci8'}                                    | ${'7.3'} | ${'add_oci oci8'}
    ${'pdo_oci'}                                 | ${'7.3'} | ${'add_oci pdo_oci'}
    ${'blackfire'}                               | ${'7.3'} | ${'add_blackfire blackfire'}
    ${'blackfire-1.31.0'}                        | ${'7.3'} | ${'add_blackfire blackfire-1.31.0'}
    ${'intl-65.1'}                               | ${'5.6'} | ${'add_intl intl-65.1'}
    ${'mongodb-mongodb/mongo-php-driver@master'} | ${'7.3'} | ${'add_extension_from_source mongodb https://github.com mongodb mongo-php-driver master extension'}
  `('checking addExtensionOnLinux for extension $extension on version $version', async ({extension, version, output}) => {
    expect(await extensions.addExtension(extension, version, 'linux')).toContain(output);
  });

  it('checking addExtensionOnDarwin', async () => {
    let darwin: string = await extensions.addExtension(
      'none, amqp, apcu, expect, Xdebug, pcov, grpc, igbinary, imagick, imap, memcache, memcached, mongodb, msgpack, phalcon3, phalcon4, protobuf, psr, rdkafka, redis, ssh2, swoole, vips, yaml, sqlite, oci8, pdo_oci, :intl, ast-beta, grpc-1.2.3',
      '7.2',
      'darwin'
    );
    expect(darwin).toContain('disable_all_shared');
    expect(darwin).toContain('add_brew_extension amqp extension');
    expect(darwin).toContain('add_brew_extension apcu extension');
    expect(darwin).toContain('add_brew_extension expect extension');
    expect(darwin).toContain('add_brew_extension xdebug zend_extension');
    expect(darwin).toContain('add_brew_extension pcov extension');
    expect(darwin).toContain('add_brew_extension grpc extension');
    expect(darwin).toContain('add_brew_extension igbinary extension');
    expect(darwin).toContain('add_brew_extension imagick extension');
    expect(darwin).toContain('add_brew_extension imap extension');
    expect(darwin).toContain('add_brew_extension memcache extension');
    expect(darwin).toContain('add_brew_extension memcached extension');
    expect(darwin).toContain('add_brew_extension mongodb extension');
    expect(darwin).toContain('add_brew_extension msgpack extension');
    expect(darwin).toContain('add_brew_extension phalcon3 extension');
    expect(darwin).toContain('add_brew_extension phalcon4 extension');
    expect(darwin).toContain('add_brew_extension protobuf extension');
    expect(darwin).toContain('add_brew_extension psr extension');
    expect(darwin).toContain('add_brew_extension rdkafka extension');
    expect(darwin).toContain('add_brew_extension redis extension');
    expect(darwin).toContain('add_brew_extension ssh2 extension');
    expect(darwin).toContain('add_brew_extension swoole extension');
    expect(darwin).toContain('add_brew_extension vips extension');
    expect(darwin).toContain('add_brew_extension yaml extension');
    expect(darwin).toContain('add_extension sqlite3');
    expect(darwin).toContain('disable_extension intl');
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
