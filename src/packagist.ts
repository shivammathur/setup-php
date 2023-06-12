import * as cv from 'compare-versions';
import * as fetch from './fetch';

type RS = Record<string, string>;
type RSRS = Record<string, RS>;

export async function search(
  package_name: string,
  php_version: string
): Promise<string | null> {
  const response = await fetch.fetch(
    `https://repo.packagist.org/p2/${package_name}.json`
  );
  if (response.error || response.data === '[]') {
    return null;
  }

  const data = JSON.parse(response['data']);
  if (data && data.packages) {
    const versions = data.packages[package_name];
    versions.sort((a: RS, b: RS) => cv.compareVersions(b.version, a.version));

    const result = versions.find((versionData: RSRS) => {
      if (versionData?.require?.php) {
        return versionData?.require?.php
          .split('|')
          .some(
            require => require && cv.satisfies(php_version + '.0', require)
          );
      }
      return false;
    });

    return result ? result.version : null;
  }
  return null;
}
