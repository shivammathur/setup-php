import * as hc from 'typed-rest-client/HttpClient';

/**
 * Function to check if PECL extension exists
 *
 * @param extension
 */
export async function checkPECLExtension(extension: string): Promise<boolean> {
  const http: hc.HttpClient = new hc.HttpClient('shivammathur/php-setup', [], {
    allowRetries: true,
    maxRetries: 2
  });
  const response: hc.HttpClientResponse = await http.get(
    'https://pecl.php.net/package/' + extension
  );
  return response.message.statusCode === 200;
}
