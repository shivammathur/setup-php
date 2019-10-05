import * as features from '../src/features';

let valid_extensions = ['xdebug', 'pcov'];
jest.mock('../src/pecl', () => ({
  checkPECLExtension: jest.fn().mockImplementation(extension => {
    return valid_extensions.indexOf(extension) !== -1;
  })
}));

describe('Features tests', () => {
  it('checking addExtensionOnWindows', async () => {
    let win32: string = await features.addExtension(
      'xdebug, pcov',
      '7.2',
      'win32'
    );
    expect(win32).toContain('Install-PhpExtension xdebug');
    expect(win32).toContain('Install-PhpExtension pcov');
    win32 = await features.addExtension('xdebug, pcov', '7.4', 'win32');
    const extension_url: string =
      'https://xdebug.org/files/php_xdebug-2.8.0beta2-7.4-vc15.dll';
    expect(win32).toContain(
      'Invoke-WebRequest -Uri ' +
        extension_url +
        ' -OutFile C:\\tools\\php\\ext\\php_xdebug.dll'
    );
    expect(win32).toContain('Install-PhpExtension pcov');

    win32 = await features.addExtension('does_not_exist', '7.2', 'win32');
    expect(win32).toContain('Could not find does_not_exist for PHP7.2 on PECL');

    win32 = await features.addExtension('xdebug', '7.2', 'fedora');
    expect(win32).toContain('Platform fedora is not supported');
  });

  it('checking addExtensionOnLinux', async () => {
    let linux: string = await features.addExtension(
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

    linux = await features.addExtension('xdebug, pcov', '7.4', 'linux');
    expect(linux).toContain('./xdebug.sh');
    expect(linux).toContain('./pcov.sh');

    linux = await features.addExtension('xdebug', '7.2', 'fedora');
    expect(linux).toContain('Platform fedora is not supported');
  });

  it('checking addExtensionOnDarwin', async () => {
    let darwin: string = await features.addExtension(
      'xdebug, pcov',
      '7.2',
      'darwin'
    );
    expect(darwin).toContain('sudo pecl install xdebug');
    expect(darwin).toContain('sudo pecl install pcov');

    darwin = await features.addExtension('pcov', '5.6', 'darwin');
    expect(darwin).toContain('sudo pecl install pcov');

    darwin = await features.addExtension('pcov', '7.2', 'darwin');
    expect(darwin).toContain('sudo pecl install pcov');

    darwin = await features.addExtension('xdebug', '5.6', 'darwin');
    expect(darwin).toContain('sudo pecl install xdebug-2.5.5');

    darwin = await features.addExtension('xdebug', '7.4', 'darwin');
    expect(darwin).toContain('sh ./xdebug_darwin.sh');

    darwin = await features.addExtension('pcov', '7.4', 'darwin');
    expect(darwin).toContain('sh ./pcov.sh');

    darwin = await features.addExtension('xdebug', '7.2', 'darwin');
    expect(darwin).toContain('sudo pecl install xdebug');

    darwin = await features.addExtension('does_not_exist', '7.2', 'darwin');
    expect(darwin).toContain(
      'Could not find does_not_exist for PHP7.2 on PECL'
    );

    darwin = await features.addExtension('xdebug', '7.2', 'fedora');
    expect(darwin).toContain('Platform fedora is not supported');
  });

  it('checking addINIValuesOnWindows', async () => {
    let win32: string = await features.addINIValues(
      'post_max_size=256M, short_open_tag=On, date.timezone=Asia/Kolkata',
      'win32'
    );
    expect(win32).toContain(
      'Add-Content C:\\tools\\php\\php.ini "post_max_size=256M"'
    );
    expect(win32).toContain(
      'Add-Content C:\\tools\\php\\php.ini "short_open_tag=On"'
    );
    expect(win32).toContain(
      'Add-Content C:\\tools\\php\\php.ini "date.timezone=Asia/Kolkata"'
    );

    win32 = await features.addINIValues(
      'post_max_size=256M, short_open_tag=On, date.timezone=Asia/Kolkata',
      'fedora'
    );
    expect(win32).toContain('Platform fedora is not supported');
  });

  it('checking addINIValuesOnLinux', async () => {
    let linux: string = await features.addINIValues(
      'post_max_size=256M, short_open_tag=On, date.timezone=Asia/Kolkata',
      'linux'
    );
    expect(linux).toContain('echo "post_max_size=256M" >> $ini_file');
    expect(linux).toContain('echo "short_open_tag=On" >> $ini_file');
    expect(linux).toContain('echo "date.timezone=Asia/Kolkata" >> $ini_file');

    linux = await features.addINIValues(
      'post_max_size=256M, short_open_tag=On, date.timezone=Asia/Kolkata',
      'fedora'
    );
    expect(linux).toContain('Platform fedora is not supported');
  });

  it('checking addINIValuesOnDarwin', async () => {
    let darwin: string = await features.addINIValues(
      'post_max_size=256M, short_open_tag=On, date.timezone=Asia/Kolkata',
      'darwin'
    );
    expect(darwin).toContain('echo "post_max_size=256M" >> $ini_file');
    expect(darwin).toContain('echo "short_open_tag=On" >> $ini_file');
    expect(darwin).toContain('echo "date.timezone=Asia/Kolkata" >> $ini_file');

    darwin = await features.addINIValues(
      'post_max_size=256M, short_open_tag=On, date.timezone=Asia/Kolkata',
      'fedora'
    );
    expect(darwin).toContain('Platform fedora is not supported');
  });

  it('checking addCoverage on windows', async () => {
    let win32: string = await features.addCoverage('xdebug', '7.4', 'win32');
    const extension_url: string =
      'https://xdebug.org/files/php_xdebug-2.8.0beta2-7.4-vc15.dll';
    expect(win32).toContain(
      'Invoke-WebRequest -Uri ' +
        extension_url +
        ' -OutFile C:\\tools\\php\\ext\\php_xdebug.dll'
    );

    win32 = await features.addCoverage('xdebug', '7.3', 'win32');
    expect(win32).toContain('Install-PhpExtension xdebug');

    win32 = await features.addCoverage('pcov', '7.4', 'win32');
    expect(win32).toContain('Install-PhpExtension pcov');
    expect(win32).toContain(
      'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug C:\\tools\\php'
    );

    win32 = await features.addCoverage('pcov', '7.3', 'win32');
    expect(win32).toContain('Install-PhpExtension pcov');
    expect(win32).toContain(
      'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug C:\\tools\\php'
    );

    win32 = await features.addCoverage('nocov', '7.3', 'win32');
    expect(win32).toContain('');

    win32 = await features.addCoverage('pcov', '7.0', 'win32');
    expect(win32).toContain('PCOV requires PHP 7.1 or newer');

    win32 = await features.addCoverage('pcov', '5.6', 'win32');
    expect(win32).toContain('PCOV requires PHP 7.1 or newer');

    win32 = await features.addCoverage('none', '7.4', 'win32');
    expect(win32).toContain('Disable-PhpExtension xdebug');
    expect(win32).toContain('Disable-PhpExtension pcov');

    win32 = await features.addCoverage('', '7.4', 'win32');
    expect(win32).toEqual('');
  });

  it('checking addCoverage on linux', async () => {
    let linux: string = await features.addCoverage('xdebug', '7.4', 'linux');
    expect(linux).toContain('./xdebug.sh');

    linux = await features.addCoverage('pcov', '7.4', 'linux');
    expect(linux).toContain('./pcov.sh');
    expect(linux).toContain('sudo sed -i "/xdebug/d" $ini_file');
    expect(linux).toContain('sudo phpdismod xdebug');

    linux = await features.addCoverage('none', '7.4', 'linux');
    expect(linux).toContain('sudo phpdismod xdebug');
    expect(linux).toContain('sudo phpdismod pcov');
    expect(linux).toContain('sudo sed -i "/xdebug/d" $ini_file');
    expect(linux).toContain('sudo sed -i "/pcov/d" $ini_file');

    linux = await features.addCoverage('', '7.4', 'linux');
    expect(linux).toEqual('');
  });

  it('checking addCoverage on darwin', async () => {
    let darwin: string = await features.addCoverage('xdebug', '7.4', 'darwin');
    expect(darwin).toContain('sh ./xdebug_darwin.sh');

    darwin = await features.addCoverage('xdebug', '5.6', 'darwin');
    expect(darwin).toContain('sudo pecl install xdebug-2.5.5');

    darwin = await features.addCoverage('pcov', '7.4', 'darwin');
    expect(darwin).toContain('sh ./pcov.sh');

    darwin = await features.addCoverage('none', '7.4', 'darwin');
    expect(darwin).toContain('sudo sed -i \'\' "/xdebug/d" $ini_file');
    expect(darwin).toContain('sudo sed -i \'\' "/pcov/d" $ini_file');

    darwin = await features.addCoverage('', '7.4', 'win32');
    expect(darwin).toEqual('');
  });
});
