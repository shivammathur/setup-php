import * as pecl from '../src/pecl';

let valid_extensions = ['xdebug', 'pcov'];
jest.mock('../src/pecl', () => ({
  checkPECLExtension: jest.fn().mockImplementation(extension => {
    return valid_extensions.indexOf(extension) !== -1;
  })
}));

describe('pecl tests', () => {
  it('checking checkPECLExtension', async () => {
    expect(await pecl.checkPECLExtension('extensionDoesNotExist')).toBe(false);
    expect(await pecl.checkPECLExtension('xdebug')).toBe(true);
  });
});
