import * as extensions from '../src/extensions';

describe('Extension tests', () => {
  it('checking addExtensionOnWindows', async () => {
    let win32: string = await extensions.addExtension(
      'xdebug, pcov',
      '7.2',
      'win32'
    );
    expect(win32).toContain('Install-PhpExtension xdebug');
    expect(win32).toContain('Install-PhpExtension pcov');
    win32 = await extensions.addExtension('xdebug, pcov', '7.4', 'win32');
    const extension_url: string =
      'https://xdebug.org/files/php_xdebug-2.8.0-7.4-vc15.dll';
    expect(win32).toContain(
      'Invoke-WebRequest -Uri ' +
        extension_url +
        ' -OutFile C:\\tools\\php\\ext\\php_xdebug.dll'
    );
    expect(win32).toContain('Install-PhpExtension pcov');

    win32 = await extensions.addExtension(
      'does_not_exist',
      '7.2',
      'win32',
      true
    );
    expect(win32).toContain(
      'Add-Extension does_not_exist "Install-PhpExtension does_not_exist" extension'
    );

    win32 = await extensions.addExtension('xdebug', '7.2', 'fedora');
    expect(win32).toContain('Platform fedora is not supported');
  });

  it('checking addExtensionOnLinux', async () => {
    let linux: string = await extensions.addExtension(
      'xdebug, pcov',
      '7.2',
      'linux'
    );
    expect(linux).toContain(
      'sudo DEBIAN_FRONTEND=noninteractive apt install -y php7.2-xdebug'
    );
    expect(linux).toContain(
      'sudo DEBIAN_FRONTEND=noninteractive apt install -y php7.2-pcov'
    );

    linux = await extensions.addExtension('xdebug, pcov', '7.4', 'linux');
    expect(linux).toContain('xdebug.sh');
    expect(linux).toContain('pcov.sh');

    linux = await extensions.addExtension('phalcon3, phalcon4', '7.2', 'linux');
    expect(linux).toContain('phalcon.sh master 7.2');
    expect(linux).toContain('phalcon.sh 4.0.x 7.2');

    linux = await extensions.addExtension('phalcon3, phalcon4', '7.3', 'linux');
    expect(linux).toContain('phalcon.sh master 7.3');
    expect(linux).toContain('phalcon.sh 4.0.x 7.3');

    linux = await extensions.addExtension('xdebug', '7.2', 'fedora');
    expect(linux).toContain('Platform fedora is not supported');
  });

  it('checking addExtensionOnDarwin', async () => {
    let darwin: string = await extensions.addExtension(
      'xdebug, pcov',
      '7.2',
      'darwin'
    );
    expect(darwin).toContain('sudo pecl install xdebug');
    expect(darwin).toContain('sudo pecl install pcov');

    darwin = await extensions.addExtension('pcov', '5.6', 'darwin');
    expect(darwin).toContain('sudo pecl install pcov');

    darwin = await extensions.addExtension('pcov', '7.2', 'darwin');
    expect(darwin).toContain('sudo pecl install pcov');

    darwin = await extensions.addExtension('xdebug', '5.6', 'darwin');
    expect(darwin).toContain('sudo pecl install xdebug-2.5.5');

    darwin = await extensions.addExtension('xdebug', '7.4', 'darwin');
    expect(darwin).toContain('xdebug_darwin.sh');

    darwin = await extensions.addExtension('pcov', '7.4', 'darwin');
    expect(darwin).toContain('pcov.sh');

    darwin = await extensions.addExtension('xdebug', '7.2', 'darwin');
    expect(darwin).toContain('sudo pecl install xdebug');

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
