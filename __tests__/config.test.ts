import * as config from '../src/config';

describe('Config tests', () => {
  it('checking addINIValuesOnWindows', async () => {
    let win32: string = await config.addINIValues(
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

    win32 = await config.addINIValues(
      'post_max_size=256M, short_open_tag=On, date.timezone=Asia/Kolkata',
      'fedora'
    );
    expect(win32).toContain('Platform fedora is not supported');
  });

  it('checking addINIValuesOnLinux', async () => {
    let linux: string = await config.addINIValues(
      'post_max_size=256M, short_open_tag=On, date.timezone=Asia/Kolkata',
      'linux'
    );
    expect(linux).toContain('echo "post_max_size=256M" >> $ini_file');
    expect(linux).toContain('echo "short_open_tag=On" >> $ini_file');
    expect(linux).toContain('echo "date.timezone=Asia/Kolkata" >> $ini_file');

    linux = await config.addINIValues(
      'post_max_size=256M, short_open_tag=On, date.timezone=Asia/Kolkata',
      'fedora'
    );
    expect(linux).toContain('Platform fedora is not supported');
  });

  it('checking addINIValuesOnDarwin', async () => {
    let darwin: string = await config.addINIValues(
      'post_max_size=256M, short_open_tag=On, date.timezone=Asia/Kolkata',
      'darwin'
    );
    expect(darwin).toContain('echo "post_max_size=256M" >> $ini_file');
    expect(darwin).toContain('echo "short_open_tag=On" >> $ini_file');
    expect(darwin).toContain('echo "date.timezone=Asia/Kolkata" >> $ini_file');

    darwin = await config.addINIValues(
      'post_max_size=256M, short_open_tag=On, date.timezone=Asia/Kolkata',
      'fedora'
    );
    expect(darwin).toContain('Platform fedora is not supported');
  });
});
