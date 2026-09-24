import {extensionPacks} from '../src/extensions';
import {execFileSync} from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('Optional macOS extension archives', () => {
  it('installs packs concurrently and preserves successful packs when another fails', () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'setup-php-packs-')
    );
    const cache = path.join(directory, 'cache');
    fs.mkdirSync(cache);
    try {
      for (const name of ['imagick', 'mongodb', 'memcached']) {
        fs.writeFileSync(path.join(cache, name + '.json'), '{}');
      }
      fs.writeFileSync(
        path.join(cache, 'install-extensions.cjs'),
        `const fs=require('node:fs'), path=require('node:path');
const [,directory,name]=process.argv.slice(2);
fs.writeFileSync(path.join(directory,name+'.started'),'yes');
setTimeout(()=>process.exit(2),1500);
setInterval(()=>{
  if (fs.readdirSync(directory).filter(file=>file.endsWith('.started')).length!==3) return;
  fs.writeFileSync(path.join(directory,name+'.env'),'SASL_PATH=/cache/'+name+'\\n');
  console.log('completed '+name);
  process.exit(name==='mongodb'?1:0);
},10);
`
      );
      const output = execFileSync(
        'bash',
        [
          '-c',
          '. "$CACHE_SCRIPT"; add_env() { printf "env %s %s\\n" "$1" "$2"; }; (exit 0) & extension_cache_pid=$!; finish_extension_cache_downloads; test "$extension_cache_memcached_dependencies" = "igbinary msgpack"'
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            CACHE_SCRIPT: path.resolve(
              'src/scripts/extensions/darwin_cache.sh'
            ),
            SETUP_PHP_NODE: process.execPath,
            SETUP_PHP_EXTENSION_PACKS: 'imagick mongodb memcached',
            extension_cache_dir: cache,
            verbose: ''
          }
        }
      );
      expect(output).toContain('completed imagick');
      expect(output).toContain('completed memcached');
      expect(output).toContain('mongodb cache unavailable');
      expect(output).toContain('env SASL_PATH /cache/imagick');
      expect(output).not.toContain('env SASL_PATH /cache/mongodb');
      expect(fs.existsSync(cache)).toBe(false);
    } finally {
      fs.rmSync(directory, {recursive: true, force: true});
    }
  });
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

  it('selects optional packs for PHP 5.6 through 8.7', async () => {
    for (const version of [
      '5.6',
      '7.0',
      '7.1',
      '7.2',
      '7.3',
      '7.4',
      '8.0',
      '8.1',
      '8.2',
      '8.3',
      '8.4',
      '8.5',
      '8.6',
      '8.7'
    ]) {
      expect(
        await extensionPacks('imagick, mongodb, memcached', version, 'darwin')
      ).toEqual(['imagick', 'mongodb', 'memcached']);
    }
  });

  it('keeps unsupported PHP and other platforms on their existing paths', async () => {
    for (const version of ['5.4', '5.5', '7.5', '8.8', '9.0']) {
      expect(await extensionPacks('imagick', version, 'darwin')).toEqual([]);
    }
    for (const os of ['linux', 'win32']) {
      expect(await extensionPacks('imagick', '8.4', os)).toEqual([]);
    }
  });
});
