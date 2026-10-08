import {jest} from '@jest/globals';
import * as core from '../src/core.js';

describe('Core tests', () => {
  const originalEnv = process.env;
  const originalExitCode = process.exitCode;
  let stdoutOutput: string;
  const originalWrite = process.stdout.write;

  beforeEach(() => {
    process.env = {...originalEnv};
    process.exitCode = undefined;
    stdoutOutput = '';
    process.stdout.write = jest.fn((chunk: string | Uint8Array): boolean => {
      stdoutOutput += chunk.toString();
      return true;
    }) as unknown as typeof process.stdout.write;
  });

  afterEach(() => {
    process.env = originalEnv;
    process.exitCode = originalExitCode;
    process.stdout.write = originalWrite;
  });

  it('checking issueCommand with no properties', () => {
    core.issueCommand('warning', {}, 'test message');
    expect(stdoutOutput).toContain('::warning::test message');
  });

  it('checking issueCommand with properties', () => {
    core.issueCommand('error', {file: 'test.ts', line: '10'}, 'error message');
    expect(stdoutOutput).toContain(
      '::error file=test.ts,line=10::error message'
    );
  });

  it('checking issueCommand escapes special characters in message', () => {
    core.issueCommand('warning', {}, 'line1\nline2\rline3%percent');
    expect(stdoutOutput).toContain(
      '::warning::line1%0Aline2%0Dline3%25percent'
    );
  });

  it('checking issueCommand escapes special characters in properties', () => {
    core.issueCommand('error', {file: 'path:to,file'}, 'message');
    expect(stdoutOutput).toContain('::error file=path%3Ato%2Cfile::message');
  });

  it('checking issueCommand with Error object', () => {
    const error = new Error('test error');
    core.issueCommand('error', {}, error);
    expect(stdoutOutput).toContain('::error::Error: test error');
  });

  it('checking issueCommand filters empty properties', () => {
    core.issueCommand('warning', {file: 'test.ts', line: ''}, 'message');
    expect(stdoutOutput).toContain('::warning file=test.ts::message');
  });

  it('checking error', () => {
    core.error('error message');
    expect(stdoutOutput).toContain('::error::error message');
  });

  it('checking error with Error object', () => {
    core.error(new Error('error instance'));
    expect(stdoutOutput).toContain('::error::Error: error instance');
  });

  it('checking setFailed', () => {
    core.setFailed('failure message');
    expect(process.exitCode).toBe(1);
    expect(stdoutOutput).toContain('::error::failure message');
  });

  it('checking setFailed with Error object', () => {
    core.setFailed(new Error('failure error'));
    expect(process.exitCode).toBe(1);
    expect(stdoutOutput).toContain('::error::Error: failure error');
  });

  it('checking getInput returns value', () => {
    process.env['INPUT_TEST-INPUT'] = 'test value';
    expect(core.getInput('test-input')).toBe('test value');
  });

  it('checking getInput trims value', () => {
    process.env['INPUT_TEST-INPUT'] = '  trimmed  ';
    expect(core.getInput('test-input')).toBe('trimmed');
  });

  it('checking getInput returns empty string for missing input', () => {
    expect(core.getInput('missing-input')).toBe('');
  });

  it('checking getInput throws for required missing input', () => {
    expect(() => core.getInput('missing-input', true)).toThrow(
      'Input required and not supplied: missing-input'
    );
  });

  it('checking getInput handles spaces in name', () => {
    process.env['INPUT_INPUT_WITH_SPACES'] = 'spaced value';
    expect(core.getInput('input with spaces')).toBe('spaced value');
  });
});
