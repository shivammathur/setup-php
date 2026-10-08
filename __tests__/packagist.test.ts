import * as packagist from '../src/packagist.js';
import nock from 'nock';

beforeAll(() => nock.disableNetConnect());

afterEach(() => {
  const pending = nock.pendingMocks();
  nock.cleanAll();
  expect(pending).toEqual([]);
});

afterAll(() => {
  nock.enableNetConnect();
  nock.restore();
});

describe('search function', () => {
  const mockResponse = {
    packages: {
      'test-package': [
        {
          require: {
            php: '8.0.0'
          },
          version: '1.0.0'
        },
        {
          version: '2.0.0'
        }
      ]
    }
  };

  test('should return the version if matching php version is found', async () => {
    nock('https://repo.packagist.org')
      .get('/p2/test-package.json')
      .reply(200, mockResponse);
    const result = await packagist.search('test-package', '8.0');
    expect(result).toBe('1.0.0');
  });

  test('should return null if no matching php version is found', async () => {
    nock('https://repo.packagist.org')
      .get('/p2/test-package.json')
      .reply(200, mockResponse);
    const result = await packagist.search('test-package', '5.6');
    expect(result).toBeNull();
  });

  test('should return null if fetch fails', async () => {
    nock('https://repo.packagist.org').get('/p2/test-package.json').reply(404);
    const result = await packagist.search('test-package', '8.0');
    expect(result).toBeNull();
  });

  test('should return null if the response is empty', async () => {
    nock('https://repo.packagist.org')
      .get('/p2/test-package.json')
      .reply(200, {error: true, data: '[]'});
    const result = await packagist.search('test-package', '8.0');
    expect(result).toBeNull();
  });
});
