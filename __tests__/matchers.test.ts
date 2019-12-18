import * as io from '@actions/io';
import * as path from 'path';
import * as fs from 'fs';
import * as matchers from '../src/matchers';

async function cleanup(path: string): Promise<void> {
  fs.unlink(path, error => {
    if (error) {
      console.log(error);
    }
  });
}

jest.mock('@actions/io');

describe('Matchers', () => {
  it('Add matchers', async () => {
    process.env['RUNNER_TOOL_CACHE'] = __dirname;
    await matchers.addMatchers();
    const spy = jest.spyOn(io, 'cp');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('Test Regex', async () => {
    const regex1 = /^\d+\)\s.*$/;
    const regex2 = /^(.*)$/;
    const regex3 = /^\s*$/;
    const regex4 = /^(.*):(\d+)$/;
    expect(regex1.test('1) Tests\\Test::it_tests')).toBe(true);
    expect(regex2.test('Failed asserting that false is true')).toBe(true);
    expect(regex3.test('\n')).toBe(true);
    expect(regex4.test('/path/to/file.php:42')).toBe(true);
  });
});
