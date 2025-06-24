// This is a modified version of fetch.ts for local execution, using node-fetch.
// User should install node-fetch: npm install node-fetch@2
// (or node-fetch@3 if using ESM modules, but this project seems to be CJS for now)
import OriginalNodeFetch from 'node-fetch';

// node-fetch v3 is ESM-only. If the project is CJS, we need v2 or a dynamic import.
// For simplicity, assuming node-fetch v2 or that the project can handle ESM.
// If using ts-node with commonjs, node-fetch v2 is easier.
const fetchModule = OriginalNodeFetch as any; // Type assertion to handle CJS/ESM differences if any
const actualFetch = fetchModule.default || fetchModule; // Handle default export for ESM

interface FetchResult {
  data: string | null;
  statusCode: number;
  error?: string;
}

export async function fetch(url: string): Promise<FetchResult> {
  try {
    const response = await actualFetch(url, {
      // node-fetch options if needed, e.g., timeout, retries (though http-client handled retries)
      // For simplicity, no complex retry logic here, but could be added.
    });
    const data = await response.text();
    if (response.ok) {
      return { data, statusCode: response.status };
    }
    return { data, statusCode: response.status, error: `Request failed with status ${response.status}` };
  } catch (error: any) {
    // console.error(`Fetch error for URL ${url}:`, error);
    return {
      data: null,
      statusCode: 0, // Indicate a client-side error or network issue
      error: error.message
    };
  }
}
