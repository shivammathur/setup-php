import * as extensions from '../src/extensions';

describe('Extension tests', () => {
  it('checking addExtensionOnWindows', async () => {
    let win32: string = await extensions.addExtension(
      'xdebug, pcov, phalcon4',
      '7.4',
      'win32'
    );
    expect(win32).toContain('Add-Extension xdebug');
    expect(win32).toContain('Add-Extension pcov');
    expect(win32).toContain('phalcon.ps1 phalcon4');

    win32 = await extensions.addExtension(
      'phalcon3, does_not_exist',
      '7.2',
      'win32',
      true
    );
    expect(win32).toContain('phalcon.ps1 phalcon3');
    expect(win32).toContain('Add-Extension does_not_exist');

    win32 = await extensions.addExtension('xdebug', '7.2', 'fedora');
    expect(win32).toContain('Platform fedora is not supported');
  });

  it('checking addExtensionOnLinux', async () => {
    let linux: string = await extensions.addExtension(
      'xdebug, pcov',
      '7.4',
      'linux'
    );
    expect(linux).toContain('update_extension xdebug 2.9.0');
    expect(linux).toContain(
      'sudo DEBIAN_FRONTEND=noninteractive apt-get install -y php7.4-pcov'
    );
    expect(linux).toContain('pecl install pcov');

    linux = await extensions.addExtension('gearman', '7.0', 'linux');
    expect(linux).toContain('gearman.sh 7.0');
    linux = await extensions.addExtension('gearman', '7.1', 'linux');
    expect(linux).toContain('gearman.sh 7.1');

    linux = await extensions.addExtension('gearman', '7.2', 'linux');
    expect(linux).toContain('gearman.sh 7.2');

    linux = await extensions.addExtension('gearman', '7.3', 'linux');
    expect(linux).toContain('gearman.sh 7.3');

    linux = await extensions.addExtension('gearman', '7.4', 'linux');
    expect(linux).toContain('gearman.sh 7.4');

    linux = await extensions.addExtension('xdebug', '7.2', 'fedora');
    expect(linux).toContain('Platform fedora is not supported');

    linux = await extensions.addExtension('phalcon3, phalcon4', '7.3', 'linux');
    expect(linux).toContain('phalcon.sh phalcon3 7.3');
    expect(linux).toContain('phalcon.sh phalcon4 7.3');
  });

  it('checking addExtensionOnDarwin', async () => {
    let darwin: string = await extensions.addExtension(
      'xdebug, pcov',
      '7.2',
      'darwin'
    );
    expect(darwin).toContain('sudo pecl install xdebug');
    expect(darwin).toContain('sudo pecl install pcov');

    darwin = await extensions.addExtension('phalcon3', '7.0', 'darwin');
    expect(darwin).toContain('phalcon_darwin.sh phalcon3 7.0');

    darwin = await extensions.addExtension('phalcon4', '7.3', 'darwin');
    expect(darwin).toContain('phalcon_darwin.sh phalcon4 7.3');

    darwin = await extensions.addExtension('pcov', '5.6', 'darwin');
    expect(darwin).toContain('sudo pecl install pcov');

    darwin = await extensions.addExtension('pcov', '7.2', 'darwin');
    expect(darwin).toContain('sudo pecl install pcov');

    darwin = await extensions.addExtension('xdebug', '5.6', 'darwin');
    expect(darwin).toContain('sudo pecl install xdebug-2.5.5');

    darwin = await extensions.addExtension('xdebug', '7.0', 'darwin');
    expect(darwin).toContain('sudo pecl install xdebug-2.9.0');

    darwin = await extensions.addExtension('xdebug', '7.2', 'darwin');
    expect(darwin).toContain('sudo pecl install xdebug');

    darwin = await extensions.addExtension('redis', '5.6', 'darwin');
    expect(darwin).toContain('sudo pecl install redis-2.2.8');

    darwin = await extensions.addExtension('redis', '7.2', 'darwin');
    expect(darwin).toContain('sudo pecl install redis');

    darwin = await extensions.addExtension('imagick', '5.6', 'darwin');
    expect(darwin).toContain('brew install pkg-config imagemagick');
    expect(darwin).toContain('sudo pecl install imagick');

    darwin = await extensions.addExtension('imagick', '7.4', 'darwin');
    expect(darwin).toContain('brew install pkg-config imagemagick');
    expect(darwin).toContain('sudo pecl install imagick');

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
