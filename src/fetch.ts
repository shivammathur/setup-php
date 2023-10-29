import {IncomingMessage, OutgoingHttpHeaders} from 'http';
import * as https from 'https';
import * as url from 'url';

/**
 * Function to fetch a URL
 *
 * @param input_url
 * @param auth_token
 * @param redirect_count
 */
export async function fetch(
  input_url: string,
  auth_token?: string,
  redirect_count = 5
): Promise<Record<string, string>> {
  const fetch_promise: Promise<Record<string, string>> = new Promise(
    resolve => {
      const url_object: url.UrlObject = new url.URL(input_url);
      const headers: OutgoingHttpHeaders = {
        'User-Agent': `Mozilla/5.0 (${process.platform} ${process.arch}) setup-php`
      };
      if (auth_token) {
        headers.authorization = 'Bearer ' + auth_token;
      }
      const options: https.RequestOptions = {
        hostname: url_object.hostname,
        path: url_object.pathname,
        headers: headers,
        agent: new https.Agent({keepAlive: false})
      };
      const req = https.get(options, (res: IncomingMessage) => {
        if (res.statusCode === 200) {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', chunk => (body += chunk));
          res.on('end', () => resolve({data: `${body}`}));
        } else if (
          [301, 302, 303, 307, 308].includes(res.statusCode as number)
        ) {
          if (redirect_count > 0 && res.headers.location) {
            fetch(res.headers.location, auth_token, redirect_count--).then(
              resolve
            );
          } else {
            resolve({error: `${res.statusCode}: Redirect error`});
          }
        } else {
          resolve({error: `${res.statusCode}: ${res.statusMessage}`});
        }
      });
      req.end();
    }
  );
  return await fetch_promise;
}
