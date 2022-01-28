import * as config from '../src/config';

describe('Config tests', () => {
  it.each`
    ini_values    | os           | output
    ${'a=b, c=d'} | ${'win32'}   | ${'Add-Content "$php_dir\\php.ini" "a=b\nc=d"'}
    ${'a=b, c=d'} | ${'linux'}   | ${'echo "a=b\nc=d" | sudo tee -a "${pecl_file:-${ini_file[@]}}"'}
    ${'a=b, c=d'} | ${'darwin'}  | ${'echo "a=b\nc=d" | sudo tee -a "${pecl_file:-${ini_file[@]}}"'}
    ${'a=b & ~c'} | ${'win32'}   | ${'Add-Content "$php_dir\\php.ini" "a=\'b & ~c\'"'}
    ${'a="~(b)"'} | ${'win32'}   | ${'Add-Content "$php_dir\\php.ini" "a=\'~(b)\'"'}
    ${'a="b, c"'} | ${'win32'}   | ${'Add-Content "$php_dir\\php.ini" "a=b, c"'}
    ${'a=b, c=d'} | ${'openbsd'} | ${'Platform openbsd is not supported'}
  `('checking addINIValues on $os', async ({ini_values, os, output}) => {
    expect(await config.addINIValues(ini_values, os)).toContain(output);
  });
});
