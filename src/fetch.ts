/**
 * Redirect status codes set for O(1) lookup
 */
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

/**
 * Function to fetch a URL using native fetch API (Node 24+)
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
  const headers: Record<string, string> = {
    'User-Agent': `setup-php (${process.platform}; ${process.arch}; +https://setup-php.com)`
  };
  if (auth_token) {
    headers['Authorization'] = 'Bearer ' + auth_token;
  }

  try {
    const response = await globalThis.fetch(input_url, {
      headers,
      redirect: redirect_count > 0 ? 'follow' : 'manual'
    });

    if (response.ok) {
      const data = await response.text();
      return {data};
    } else if (REDIRECT_CODES.has(response.status) && redirect_count <= 0) {
      return {error: `${response.status}: Redirect error`};
    } else {
      return {error: `${response.status}: ${response.statusText}`};
    }
  } catch (error) {
    return {error: `Fetch error: ${(error as Error).message}`};
  }
}
