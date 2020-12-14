import * as utils from './utils';

export async function getSapiList(sapi_csv: string): Promise<Array<string>> {
  const sapi_list: Array<string> = await utils.packageArray(sapi_csv);
  const servers: Array<string> = sapi_list.filter(sapi => /.*:.*/.test(sapi));
  return [servers[servers.length - 1]].concat(
    sapi_list.filter(sapi => /.*[^:].*/.test(sapi))
  );
}

/**
 * Function to set sapi
 *
 * @param sapi_csv
 * @param os_version
 */
export async function addSAPI(
  sapi_csv: string,
  os_version: string
): Promise<string> {
  let script: string = '\n' + (await utils.stepLog('Setup SAPI', os_version));
  let sapi_list: Array<string>;
  switch (true) {
    case sapi_csv.split(':').length - 1 > 1:
      sapi_list = await getSapiList(sapi_csv);
      script +=
        '\n' +
        utils.log(
          'Multiple SAPI with web servers specified, choosing the last one ' +
            sapi_list[0],
          os_version,
          'warning'
        );
      break;
    default:
      sapi_list = await utils.packageArray(sapi_csv);
  }
  await utils.asyncForEach(sapi_list, async function (sapi: string) {
    sapi = sapi.toLowerCase();
    switch (os_version) {
      case 'linux':
      case 'darwin':
        script += '\nadd_sapi ' + sapi;
        break;
      case 'win32':
        script += '\nAdd-Sapi ' + sapi;
        break;
    }
  });
  return script;
}
