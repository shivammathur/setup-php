import * as path from 'path';

/**
 * Add matches using the Actions Toolkit problem matchers syntax
 * https://github.com/actions/toolkit/blob/master/docs/problem-matchers.md
 */
export function addMatchers(): void {
  const matchersPath = path.join(__dirname, '..', '.github/matchers');
  console.log(`##[add-matcher]${path.join(matchersPath, 'phpunit.json')}`);
}
