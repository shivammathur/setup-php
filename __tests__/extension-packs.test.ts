import {extensionPacks} from '../src/extensions';

describe('Optional macOS extension archives', () => {
  it('selects each requested pack once', async () => {
    expect(
      await extensionPacks(
        'imagick, mongodb, memcached, imagick, redis',
        '8.4',
        'darwin'
      )
    ).toEqual(['imagick', 'mongodb', 'memcached']);
  });

  it.each(['', 'redis, yaml', ':imagick', 'imagick, :imagick'])(
    'does not download unused or disabled packs: %s',
    async input => {
      expect(await extensionPacks(input, '8.4', 'darwin')).toEqual([]);
    }
  );

  it.each(['imagick-3.8.1', 'mongodb-beta', 'memcached-github.com/a/b@main'])(
    'preserves explicit version/source installation: %s',
    async input => {
      expect(await extensionPacks(input, '8.4', 'darwin')).toEqual([]);
    }
  );

  it('keeps legacy PHP and other platforms on their existing paths', async () => {
    for (const version of ['5.4', '7.4', '8.1', '8.6']) {
      expect(await extensionPacks('imagick', version, 'darwin')).toEqual([]);
    }
    for (const os of ['linux', 'win32']) {
      expect(await extensionPacks('imagick', '8.4', os)).toEqual([]);
    }
  });
});
