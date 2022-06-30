import * as coverage from '../src/coverage';

describe('Config tests', () => {
  it.each`
    driver       | php      | os          | output
    ${'PCOV'}    | ${'7.4'} | ${'win32'}  | ${'Add-Extension pcov,Disable-Extension xdebug false'}
    ${'pcov'}    | ${'7.4'} | ${'win32'}  | ${'$pcov_version = php -r "echo phpversion(\'pcov\');"'}
    ${'pcov'}    | ${'7.4'} | ${'win32'}  | ${'PCOV $pcov_version enabled as coverage driver'}
    ${'pcov'}    | ${'7.0'} | ${'win32'}  | ${'PHP 7.1 or newer is required'}
    ${'pcov'}    | ${'5.6'} | ${'win32'}  | ${'PHP 7.1 or newer is required'}
    ${'pcov'}    | ${'7.4'} | ${'win32'}  | ${'Add-Extension pcov,Disable-Extension xdebug false'}
    ${'pcov'}    | ${'7.4'} | ${'linux'}  | ${'add_extension pcov,disable_extension xdebug false'}
    ${'pcov'}    | ${'7.4'} | ${'darwin'} | ${'add_brew_extension pcov,disable_extension xdebug false'}
    ${'xdebug'}  | ${'7.4'} | ${'win32'}  | ${'Add-Extension xdebug'}
    ${'xdebug3'} | ${'7.1'} | ${'win32'}  | ${'xdebug3 is not supported on PHP 7.1'}
    ${'xdebug2'} | ${'7.4'} | ${'win32'}  | ${'Add-Extension xdebug stable 2.9.8'}
    ${'xdebug'}  | ${'8.0'} | ${'linux'}  | ${'add_extension xdebug'}
    ${'xdebug3'} | ${'8.0'} | ${'linux'}  | ${'add_extension xdebug'}
    ${'xdebug2'} | ${'7.4'} | ${'linux'}  | ${'add_pecl_extension xdebug 2.9.8 zend_extension'}
    ${'xdebug'}  | ${'7.4'} | ${'linux'}  | ${'xdebug_version="$(php -r "echo phpversion(\'xdebug\');")"'}
    ${'xdebug'}  | ${'7.4'} | ${'linux'}  | ${'Xdebug $xdebug_version enabled as coverage driver'}
    ${'xdebug'}  | ${'7.4'} | ${'darwin'} | ${'add_brew_extension xdebug'}
    ${'xdebug3'} | ${'7.1'} | ${'darwin'} | ${'xdebug3 is not supported on PHP 7.1'}
    ${'xdebug2'} | ${'7.4'} | ${'darwin'} | ${'add_brew_extension xdebug2'}
    ${'xdebug2'} | ${'8.0'} | ${'darwin'} | ${'xdebug2 is not supported on PHP 8.0'}
    ${'none'}    | ${'7.4'} | ${'win32'}  | ${'Disable-Extension xdebug false,Disable-Extension pcov false'}
    ${'none'}    | ${'7.4'} | ${'linux'}  | ${'disable_extension xdebug false,disable_extension pcov false'}
    ${'none'}    | ${'7.4'} | ${'darwin'} | ${'disable_extension xdebug false,disable_extension pcov false'}
    ${'nocov'}   | ${'7.x'} | ${'any'}    | ${''}
    ${''}        | ${'7.x'} | ${'any'}    | ${''}
  `(
    'checking addCoverage with $driver on $os',
    async ({driver, php, os, output}) => {
      const script: string = await coverage.addCoverage(driver, php, os);
      if (output) {
        output.split(',').forEach((command: string) => {
          expect(script).toContain(command);
        });
      } else {
        expect(script).toEqual(output);
      }
    }
  );
});
