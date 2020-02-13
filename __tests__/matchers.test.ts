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
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('Test PHPUnit Regex', async () => {
    const regex1 = /^\d+\)\s.*$/;
    const regex2 = /^(.*Failed\sasserting\sthat.*)$/;
    const regex3 = /^\s*$/;
    const regex4 = /^(.*):(\d+)$/;
    expect(regex1.test('1) Tests\\Test::it_tests')).toBe(true);
    expect(regex2.test('Failed asserting that false is true')).toBe(true);
    expect(regex3.test('\n')).toBe(true);
    expect(regex4.test('/path/to/file.php:42')).toBe(true);
  });

  it('Test PHP Regex', async () => {
    const regex1 = /^(.*error):\s+\s+(.+) in (.+) on line (\d+)$/;
    const regex2 = /^(.*Warning|.*Deprecated|.*Notice):\s+\s+(.+) in (.+) on line (\d+)$/;
    expect(
      regex1.test('PHP Parse error:  error_message in file.php on line 10')
    ).toBe(true);
    expect(
      regex2.test('PHP Notice:  info_message in file.php on line 10')
    ).toBe(true);
    expect(
      regex2.test('PHP Warning:  warning_message in file.php on line 10')
    ).toBe(true);
    expect(
      regex2.test('PHP Deprecated:  deprecated_message in file.php on line 10')
    ).toBe(true);
  });
});
