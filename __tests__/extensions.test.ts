import * as fs from 'fs';
import * as extensions from '../src/extensions';

describe('Extension tests', () => {
  it.each`
    extension                                    | version  | output
    ${'none'}                                    | ${'7.4'} | ${'Disable-AllShared'}
    ${':intl'}                                   | ${'7.4'} | ${'Disable-Extension intl'}
    ${'ast-beta'}                                | ${'7.4'} | ${'Add-Extension ast beta'}
    ${'blackfire'}                               | ${'7.3'} | ${'Add-Blackfire blackfire'}
    ${'blackfire-1.31.0'}                        | ${'7.3'} | ${'Add-Blackfire blackfire-1.31.0'}
    ${'grpc-1.2.3'}                              | ${'7.4'} | ${'Add-Extension grpc stable 1.2.3'}
    ${'inotify-1.2.3alpha2'}                     | ${'7.4'} | ${'Add-Extension inotify alpha 1.2.3'}
    ${'ioncube'}                                 | ${'7.4'} | ${'Add-Ioncube'}
    ${'mongodb-mongodb/mongo-php-driver@master'} | ${'7.3'} | ${'Add-Log "$cross" "mongodb-mongodb/mongo-php-driver@master" "mongodb-mongodb/mongo-php-driver@master is not supported on PHP 7.3"'}
    ${'mysql'}                                   | ${'7.4'} | ${'Add-Extension mysqli\nAdd-Extension mysqlnd'}
    ${'mysql'}                                   | ${'5.5'} | ${'Add-Extension mysql\nAdd-Extension mysqli\nAdd-Extension mysqlnd'}
    ${'oci8'}                                    | ${'7.4'} | ${'Add-Oci oci8'}
    ${'pcov'}                                    | ${'5.6'} | ${'Add-Log "$cross" "pcov" "pcov is not supported on PHP 5.6"'}
    ${'pdo_oci'}                                 | ${'7.4'} | ${'Add-Oci pdo_oci'}
    ${'pecl_http'}                               | ${'7.4'} | ${'Add-Http'}
    ${'pdo_sqlsrv'}                              | ${'7.4'} | ${'Add-Sqlsrv pdo_sqlsrv'}
    ${'phalcon3'}                                | ${'7.2'} | ${'Add-Phalcon phalcon3'}
    ${'phalcon4'}                                | ${'7.4'} | ${'Add-Phalcon phalcon4'}
    ${'sqlite'}                                  | ${'7.4'} | ${'Add-Extension sqlite3'}
    ${'sqlsrv'}                                  | ${'5.6'} | ${'Add-Extension sqlsrv'}
    ${'sqlsrv'}                                  | ${'7.4'} | ${'Add-Sqlsrv sqlsrv'}
    ${'sqlsrv-1.2.3preview1'}                    | ${'7.4'} | ${'Add-Extension sqlsrv devel 1.2.3'}
    ${'Xdebug'}                                  | ${'7.4'} | ${'Add-Extension xdebug'}
    ${'xdebug2'}                                 | ${'7.2'} | ${'Add-Extension xdebug stable 2.9.8'}
    ${'zephir_parser'}                           | ${'7.2'} | ${'Add-ZephirParser zephir_parser'}
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
    ${':intl'}                                   | ${'7.4'} | ${'disable_extension intl'}
    ${'ast-beta'}                                | ${'7.4'} | ${'add_unstable_extension ast beta extension'}
    ${'blackfire'}                               | ${'7.3'} | ${'add_blackfire blackfire'}
    ${'blackfire-1.31.0'}                        | ${'7.3'} | ${'add_blackfire blackfire-1.31.0'}
    ${'couchbase'}                               | ${'7.4'} | ${'add_couchbase'}
    ${'gearman'}                                 | ${'5.6'} | ${'add_gearman'}
    ${'geos'}                                    | ${'7.3'} | ${'add_geos'}
    ${'grpc-1.2.3'}                              | ${'7.4'} | ${'add_pecl_extension grpc 1.2.3 extension'}
    ${'http-1.2.3'}                              | ${'7.3'} | ${'add_http http-1.2.3'}
    ${'intl-65.1'}                               | ${'5.6'} | ${'add_intl intl-65.1'}
    ${'ioncube'}                                 | ${'7.3'} | ${'add_ioncube'}
    ${'memcache-8.2'}                            | ${'8.2'} | ${'add_pecl_extension memcache 8.2 extension'}
    ${'mongodb-mongodb/mongo-php-driver@master'} | ${'7.3'} | ${'add_extension_from_source mongodb https://github.com mongodb mongo-php-driver master extension'}
    ${'oci8'}                                    | ${'7.3'} | ${'add_oci oci8'}
    ${'pcov'}                                    | ${'5.6'} | ${'add_log "$cross" "pcov" "pcov is not supported on PHP 5.6'}
    ${'pdo-odbc'}                                | ${'7.4'} | ${'add_pdo_extension odbc'}
    ${'pdo_cubrid'}                              | ${'7.0'} | ${'add_cubrid pdo_cubrid'}
    ${'pdo_cubrid'}                              | ${'7.4'} | ${'add_pdo_extension cubrid'}
    ${'pdo_mysql'}                               | ${'7.4'} | ${'add_pdo_extension mysql'}
    ${'pdo_oci'}                                 | ${'7.3'} | ${'add_oci pdo_oci'}
    ${'pdo_sqlsrv'}                              | ${'7.4'} | ${'add_sqlsrv pdo_sqlsrv'}
    ${'pecl_http'}                               | ${'7.3'} | ${'add_http'}
    ${'phalcon3'}                                | ${'7.3'} | ${'add_phalcon phalcon3'}
    ${'relay'}                                   | ${'7.4'} | ${'add_relay relay'}
    ${'relay-v1.2.3'}                            | ${'7.4'} | ${'add_relay relay-v1.2.3'}
    ${'sqlite'}                                  | ${'7.4'} | ${'add_extension sqlite3'}
    ${'sqlsrv-1.2.3-beta1'}                      | ${'7.4'} | ${'add_pecl_extension sqlsrv 1.2.3beta1 extension'}
    ${'Xdebug'}                                  | ${'7.4'} | ${'add_extension xdebug'}
    ${'xdebug-alpha'}                            | ${'7.4'} | ${'add_unstable_extension xdebug alpha zend_extension'}
    ${'xdebug2'}                                 | ${'7.2'} | ${'add_pecl_extension xdebug 2.9.8 zend_extension'}
    ${'zephir_parser-1.2.3'}                     | ${'7.2'} | ${'add_zephir_parser zephir_parser-1.2.3'}
  `(
    'checking addExtensionOnLinux for extension $extension on version $version',
    async ({extension, version, output}) => {
      expect(
        await extensions.addExtension(extension, version, 'linux')
      ).toContain(output);
    }
  );

  it.each`
    extension                                    | version  | output
    ${'none'}                                    | ${'7.2'} | ${'disable_all_shared'}
    ${':intl'}                                   | ${'7.2'} | ${'disable_extension intl'}
    ${'ast-beta'}                                | ${'7.2'} | ${'add_unstable_extension ast beta extension'}
    ${'blackfire'}                               | ${'7.3'} | ${'add_blackfire blackfire'}
    ${'blackfire-1.31.0'}                        | ${'7.3'} | ${'add_blackfire blackfire-1.31.0'}
    ${'couchbase'}                               | ${'5.6'} | ${'add_couchbase'}
    ${'does_not_exist'}                          | ${'7.2'} | ${'add_extension does_not_exist'}
    ${'geos'}                                    | ${'7.3'} | ${'add_geos'}
    ${'grpc-1.2.3'}                              | ${'7.2'} | ${'add_pecl_extension grpc 1.2.3 extension'}
    ${'http-1.2.3'}                              | ${'7.3'} | ${'add_http http-1.2.3'}
    ${'imagick'}                                 | ${'5.5'} | ${'add_extension imagick'}
    ${'ioncube'}                                 | ${'7.3'} | ${'add_ioncube'}
    ${'mongodb-mongodb/mongo-php-driver@master'} | ${'7.2'} | ${'add_extension_from_source mongodb https://github.com mongodb mongo-php-driver master extension'}
    ${'oci8'}                                    | ${'7.3'} | ${'add_oci oci8'}
    ${'pcov'}                                    | ${'5.6'} | ${'add_log "$cross" "pcov" "pcov is not supported on PHP 5.6"'}
    ${'pdo_oci'}                                 | ${'7.3'} | ${'add_oci pdo_oci'}
    ${'pecl_http'}                               | ${'7.3'} | ${'add_http'}
    ${'relay-1.2.3'}                             | ${'7.4'} | ${'add_relay relay-1.2.3'}
    ${'sqlite'}                                  | ${'7.2'} | ${'add_extension sqlite3'}
    ${'zephir_parser-v1.2.3'}                    | ${'7.2'} | ${'add_zephir_parser zephir_parser-v1.2.3'}
  `(
    'checking addExtensionOnDarwin for extension $extension on version $version',
    async ({extension, version, output}) => {
      expect(
        await extensions.addExtension(extension, version, 'darwin')
      ).toContain(output);
    }
  );

  const data: string[][] = fs
    .readFileSync('src/configs/brew_extensions')
    .toString()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => {
      const [formula, extension]: string[] = line.split('=');
      const prefix: string =
        extension == 'xdebug' ? 'zend_extension' : 'extension';
      const ext_name = extension.replace(/\d+|(pdo|pecl)[_-]/, '');
      const output: string = fs.existsSync(
        `src/scripts/extensions/${ext_name}.sh`
      )
        ? `add_${ext_name}`
        : `add_brew_extension ${formula} ${prefix}`;
      return [formula, formula === 'phalcon3' ? '7.3' : '7.4', output];
    });

  it.each(data)(
    'checking addExtensionOnDarwin for brew extension %s',
    async (extension, version, output) => {
      expect(
        await extensions.addExtension(extension, version, 'darwin')
      ).toContain(output);
    }
  );

  it.each`
    extension   | version  | output
    ${'xdebug'} | ${'7.2'} | ${'Platform openbsd is not supported'}
  `(
    'checking addExtension on openbsd for extension $extension on version $version',
    async ({extension, version, output}) => {
      expect(
        await extensions.addExtension(extension, version, 'openbsd')
      ).toContain(output);
    }
  );
});
