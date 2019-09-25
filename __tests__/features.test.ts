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
    expect(win32).toContain(
      'Install-PhpExtension xdebug -MinimumStability stable'
    );
    expect(win32).toContain(
      'Install-PhpExtension pcov -MinimumStability stable'
    );
    win32 = await features.addExtension('xdebug, pcov', '7.4', 'win32');
    expect(win32).toContain(
      'Install-PhpExtension xdebug -MinimumStability alpha'
    );
    expect(win32).toContain(
      'Install-PhpExtension pcov -MinimumStability alpha'
    );

    win32 = await features.addExtension('DoesNotExist', '7.2', 'win32');
    expect(win32).not.toContain(
      'Install-PhpExtension DoesNotExist -MinimumStability stable'
    );
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
  });

  it('checking addExtensionOnDarwin', async () => {
    let darwin: string = await features.addExtension(
      'xdebug, pcov',
      '7.2',
      'darwin'
    );
    expect(darwin).toContain('sudo pecl install xdebug');
    expect(darwin).toContain('sudo pecl install pcov');

    darwin = await features.addExtension('xdebug', '5.6', 'darwin');
    expect(darwin).toContain('sudo pecl install xdebug-2.5.5');

    darwin = await features.addExtension('DoesNotExist', '7.2', 'darwin');
    expect(darwin).not.toContain('sudo pecl install DoesNotExist');
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
  });

  it('checking addINIValuesOnLinux', async () => {
    let linux: string = await features.addINIValues(
      'post_max_size=256M, short_open_tag=On, date.timezone=Asia/Kolkata',
      'linux'
    );
    expect(linux).toContain('echo "post_max_size=256M" >> $ini_file');
    expect(linux).toContain('echo "short_open_tag=On" >> $ini_file');
    expect(linux).toContain('echo "date.timezone=Asia/Kolkata" >> $ini_file');
  });

  it('checking addINIValuesOnDarwin', async () => {
    let darwin: string = await features.addINIValues(
      'post_max_size=256M, short_open_tag=On, date.timezone=Asia/Kolkata',
      'darwin'
    );
    expect(darwin).toContain('echo "post_max_size=256M" >> $ini_file');
    expect(darwin).toContain('echo "short_open_tag=On" >> $ini_file');
    expect(darwin).toContain('echo "date.timezone=Asia/Kolkata" >> $ini_file');
  });

  it('checking addCoverage on windows', async () => {
    let win32: string = await features.addCoverage('xdebug', '7.4', 'win32');
    expect(win32).toContain(
      'Install-PhpExtension xdebug -MinimumStability alpha'
    );

    win32 = await features.addCoverage('xdebug', '7.3', 'win32');
    expect(win32).toContain(
      'Install-PhpExtension xdebug -MinimumStability stable'
    );

    win32 = await features.addCoverage('pcov', '7.4', 'win32');
    expect(win32).toContain(
      'Install-PhpExtension pcov -MinimumStability alpha'
    );
    expect(win32).toContain(
      'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug C:\\tools\\php'
    );

    win32 = await features.addCoverage('pcov', '7.3', 'win32');
    expect(win32).toContain(
      'Install-PhpExtension pcov -MinimumStability stable'
    );
    expect(win32).toContain(
      'if(php -m | findstr -i xdebug) { Disable-PhpExtension xdebug C:\\tools\\php'
    );

    win32 = await features.addCoverage('nocov', '7.3', 'win32');
    expect(win32).toContain(
      'nocov is not a coverage driver or it is not supported'
    );

    win32 = await features.addCoverage('pcov', '7.0', 'win32');
    expect(win32).toContain('pcov requires php 7.1 or newer');
  });

  it('checking addCoverage on linux', async () => {
    let linux: string = await features.addCoverage('xdebug', '7.4', 'linux');
    expect(linux).toContain(
      'sudo DEBIAN_FRONTEND=noninteractive apt install -y php7.4-xdebug'
    );

    linux = await features.addCoverage('pcov', '7.4', 'linux');
    expect(linux).toContain(
      'sudo DEBIAN_FRONTEND=noninteractive apt install -y php7.4-pcov'
    );
    expect(linux).toContain(
      "sudo phpdismod xdebug || echo 'xdebug not installed'"
    );
    expect(linux).toContain("sudo phpenmod pcov || echo 'pcov not installed'");
  });

  it('checking addCoverage on darwin', async () => {
    let darwin: string = await features.addCoverage('xdebug', '7.4', 'darwin');
    expect(darwin).toContain('sudo pecl install xdebug');

    darwin = await features.addCoverage('xdebug', '5.6', 'darwin');
    expect(darwin).toContain('sudo pecl install xdebug-2.5.5');

    darwin = await features.addCoverage('pcov', '7.4', 'darwin');
    expect(darwin).toContain('sudo pecl install pcov');
    expect(darwin).toContain('sudo sed -i \'\' "/xdebug/d" $ini_file\n');
  });
});
