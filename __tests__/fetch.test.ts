import * as fetch from '../src/fetch';
import nock from 'nock';

it('checking fetch', async () => {
  const host_url = 'https://example.com';
  const manifest_url = host_url + '/manifest';
  const ping_url = host_url + '/ping';

  nock(host_url)
    .get('/manifest')
    .reply(200, {latest: 'latest'})
    .get('/manifest', '', {
      reqheaders: {authorization: 'Bearer invalid_token'}
    })
    .reply(401, {error: '401: Unauthorized'})
    .get('/ping')
    .twice()
    .reply(301, undefined, {
      Location: host_url + '/pong'
    })
    .get('/pong')
    .reply(200, 'pong');

  let response: Record<string, string> = await fetch.fetch(manifest_url);
  expect(response.error).toBe(undefined);
  expect(response.data).toContain('latest');

  response = await fetch.fetch(ping_url, '', 1);
  expect(response.error).toBe(undefined);
  expect(response.data).toContain('pong');

  response = await fetch.fetch(ping_url, '', 0);
  expect(response.error).toBe('301: Redirect error');
  expect(response.data).toBe(undefined);

  response = await fetch.fetch(manifest_url, 'invalid_token');
  expect(response.error).not.toBe(undefined);
  expect(response.data).toBe(undefined);
});
