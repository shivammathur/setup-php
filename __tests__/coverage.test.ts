import * as coverage from '../src/coverage';

describe('Config tests', () => {
  it.each`
    driver       | php      | os          | output
    ${'PCOV'}    | ${'7.4'} | ${'win32'}  | ${'Add-Extension pcov,Disable-Extension xdebug false'}
    ${'pcov'}    | ${'7.0'} | ${'win32'}  | ${'PHP 7.1 or newer is required'}
    ${'pcov'}    | ${'5.6'} | ${'win32'}  | ${'PHP 7.1 or newer is required'}
    ${'pcov'}    | ${'7.4'} | ${'win32'}  | ${'Add-Extension pcov,Disable-Extension xdebug false'}
    ${'pcov'}    | ${'7.4'} | ${'linux'}  | ${'add_extension pcov,disable_extension xdebug false'}
    ${'pcov'}    | ${'7.4'} | ${'darwin'} | ${'add_brew_extension pcov,disable_extension xdebug false'}
    ${'xdebug'}  | ${'7.4'} | ${'win32'}  | ${'Add-Extension xdebug'}
    ${'xdebug3'} | ${'7.4'} | ${'win32'}  | ${'Add-Extension xdebug'}
    ${'xdebug2'} | ${'7.4'} | ${'win32'}  | ${'Add-Extension xdebug stable 2.9.8'}
    ${'xdebug'}  | ${'8.0'} | ${'linux'}  | ${'add_extension xdebug'}
    ${'xdebug3'} | ${'8.0'} | ${'linux'}  | ${'add_extension xdebug'}
    ${'xdebug2'} | ${'7.4'} | ${'linux'}  | ${'add_pecl_extension xdebug 2.9.8 zend_extension'}
    ${'xdebug'}  | ${'7.4'} | ${'darwin'} | ${'add_brew_extension xdebug'}
    ${'xdebug3'} | ${'7.4'} | ${'darwin'} | ${'add_brew_extension xdebug'}
    ${'xdebug2'} | ${'7.4'} | ${'darwin'} | ${'add_brew_extension xdebug2'}
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
