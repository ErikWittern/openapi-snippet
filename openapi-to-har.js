/**
 * Translates given OpenAPI document to an array of HTTP Archive (HAR) 1.2 Request Object.
 * See more:
 *  - http://swagger.io/specification/
 *  - http://www.softwareishard.com/blog/har-12-spec/#request
 *
 * Example HAR Request Object:
 * "request": {
 *   "method": "GET",
 *   "url": "http://www.example.com/path/?param=value",
 *   "httpVersion": "HTTP/1.1",
 *   "cookies": [],
 *   "headers": [],
 *   "queryString" : [],
 *   "postData" : {},
 *   "headersSize" : 150,
 *   "bodySize" : 0,
 *   "comment" : ""
 * }
 */
const OpenAPISampler = require('openapi-sampler');

/**
 * Creates a query string object as defined by HAR.
 *
 * 
 * @param {*} example
 * @returns
 */
const createQueryStringObject = function (
  name,
  example,
  location,
  style,
  explode
) {
  if (!location) return;

  const explodeArrayParameter = function (name, example) {
    return example.map((entry) => {
      return { name, value: entry + '' };
    });
  };

  const explodeObjectParameter = function (example) {
    return Object.keys(example).map((name) => {
      return { name, value: example[name] + '' };
    });
  };

  if (typeof style === 'undefined') {
    // From OpenAPI spec
    // https://spec.openapis.org/oas/v3.0.3#fixed-fields-9
    if (location === 'query' || location === 'cookie') {
      style = 'form';
    } else if (location === 'path' || location === 'header') {
      style = 'simple';
    }
  }

  if (typeof explode === 'undefined') {
    if (style === 'form') {
      // From OpenAPI Spec
      // When style is form, the default value is true. For all other styles, the default value is false.
      explode = true;
    }
  }

  if (
    (style === 'form' && location === 'path') ||
    (style === 'simple' && location === 'query')
  ) {
    // this is an error according to the spec
    return {
      name,
      value: 'errorInSpec',
    };
  }

  if (Array.isArray(example)) {
    if (style === 'simple' || (style === 'form' && !explode)) {
      return {
        name,
        value: example + '',
      };
    }
    if (style === 'form' && explode) {
      return explodeArrayParameter(name, example);
    }
  }

  if (example && typeof example === 'object') {
    if (style === 'form' || style === 'simple') {
      return explode
        ? explodeObjectParameter(example)
        : {
            name,
            value:
              Object.keys(example).map((key) => `${key},${example[key]}`) + '',
          };
    }
  }

  return { name, value: example + '' };
};

const getParameterValueFromExampleForPath = function (
  name,
  example,
  location,
  style,
  explode
) {
  const queryStringObjects = createQueryStringObject(
    name,
    example,
    location,
    style,
    explode
  );

  if (Array.isArray(queryStringObjects)) {
    // We are dealing with an exploded parameter, check the example
    // to see if it's an array or an object as they explode differently
    if (Array.isArray(example)) {
      return queryStringObjects.map((entry) => entry.value) + '';
    } else {
      return queryStringObjects.map((qs) => `${qs.name}=${qs.value}`) + '';
    }
  }
  return queryStringObjects.value + '';
};

/**
 * Create HAR Request object for path and method pair described in given OpenAPI
 * document.
 *
 * @param  {Object} openApi           OpenAPI document
 * @param  {string} path              Key of the path
 * @param  {string} method            Key of the method
 * @param  {Object} queryParamValues  Optional: Values for the query parameters if present
 * @return {array}                    List of HAR Request objects for the endpoint
 */
const createHar = function (openApi, path, method, queryParamValues) {
  // if the operational parameter is not provided, set it to empty object
  if (typeof queryParamValues === 'undefined') {
    queryParamValues = {};
  }

  const baseUrl = getBaseUrl(openApi, path, method);

  const baseHar = {
    method: method.toUpperCase(),
    url: baseUrl + getFullPath(openApi, path, method),
    headers: getHeadersArray(openApi, path, method),
    queryString: getQueryStrings(openApi, path, method, queryParamValues),
    httpVersion: 'HTTP/1.1',
    cookies: [],
    headersSize: 0,
    bodySize: 0,
  };

  let hars = [];

  // get payload data, if available:
  const postDatas = getPayloads(openApi, path, method);

  // For each postData create a snippet
  if (postDatas.length > 0) {
    for (let i in postDatas) {
      const postData = postDatas[i];
      const copiedHar = JSON.parse(JSON.stringify(baseHar));
      copiedHar.postData = postData;
      copiedHar.comment = postData.mimeType;
      copiedHar.headers.push({
        name: 'content-type',
        value: postData.mimeType,
      });
      hars.push(copiedHar);
    }
  } else {
    hars = [baseHar];
  }

  return hars;
};

/**
 * Get the payload definition for the given endpoint (path + method) from the
 * given OAI specification. References within the payload definition are
 * resolved.
 *
 * @param  {object} openApi
 * @param  {string} path
 * @param  {string} method
 * @return {array}  A list of payload objects
 */
const getPayloads = function (openApi, path, method) {
  if (typeof openApi.paths[path][method].parameters !== 'undefined') {
    for (let i in openApi.paths[path][method].parameters) {
      const param = openApi.paths[path][method].parameters[i];
      if (
        typeof param.in !== 'undefined' &&
        param.in.toLowerCase() === 'body' &&
        typeof param.schema !== 'undefined'
      ) {
        try {
          const sample = OpenAPISampler.sample(
            param.schema,
            { skipReadOnly: true },
            openApi
          );
          return [
            {
              mimeType: 'application/json',
              text: JSON.stringify(sample),
            },
          ];
        } catch (err) {
          console.log(err);
          return null;
        }
      }
    }
  }

  if (
    openApi.paths[path][method].requestBody &&
    openApi.paths[path][method].requestBody['$ref']
  ) {
    openApi.paths[path][method].requestBody = resolveRef(
      openApi,
      openApi.paths[path][method].requestBody['$ref']
    );
  }

  const payloads = [];
  if (
    openApi.paths[path][method].requestBody &&
    openApi.paths[path][method].requestBody.content
  ) {
    [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
    ].forEach((type) => {
      const content = openApi.paths[path][method].requestBody.content[type];
      if (content && content.schema) {
        const sample = OpenAPISampler.sample(
          content.schema,
          { skipReadOnly: true },
          openApi
        );
        if (type === 'application/json') {
          payloads.push({
            mimeType: type,
            text: JSON.stringify(sample),
          });
        } else if (type === 'multipart/form-data') {
          if (sample !== undefined) {
            const params = [];
            Object.keys(sample).forEach((key) => {
              let value = sample[key];
              if (typeof sample[key] !== 'string') {
                value = JSON.stringify(sample[key]);
              }
              params.push({ name: key, value: value });
            });
            payloads.push({
              mimeType: type,
              params: params,
            });
          }
        } else if (type == 'application/x-www-form-urlencoded') {
          if (sample === undefined) return null;

          const params = [];
          Object.keys(sample).map((key) =>
            params.push({
              name: encodeURIComponent(key).replace(/\%20/g, '+'),
              value: encodeURIComponent(sample[key]).replace(/\%20/g, '+'),
            })
          );

          payloads.push({
            mimeType: 'application/x-www-form-urlencoded',
            params: params,
            text: Object.keys(params)
              .map((key) => key + '=' + sample[key])
              .join('&'),
          });
        }
      }
    });
  }
  return payloads;
};

/**
 * Gets the base URL constructed from the given openApi.
 *
 * @param  {Object} openApi OpenAPI document
 * @return {string}         Base URL
 */
const getBaseUrl = function (openApi, path, method) {
  if (openApi.paths[path][method].servers)
    return openApi.paths[path][method].servers[0].url;
  if (openApi.paths[path].servers) return openApi.paths[path].servers[0].url;
  if (openApi.servers) return openApi.servers[0].url;

  let baseUrl = '';
  if (typeof openApi.schemes !== 'undefined') {
    baseUrl += openApi.schemes[0];
  } else {
    baseUrl += 'http';
  }

  if (openApi.basePath === '/') {
    baseUrl += '://' + openApi.host;
  } else {
    baseUrl += '://' + openApi.host + openApi.basePath;
  }

  return baseUrl;
};

/**
 * Gets an object describing the parameters (header or query) in a given OpenAPI method
 * @param  {Object} param  parameter values to use in snippet
 * @param  {Object} values Optional: query parameter values to use in the snippet if present
 * @return {Object}        Object describing the parameters in a given OpenAPI method or path
 */
const getParameterValues = function (param, values) {
  let value = {
    name: param.name,
    value: 'SOME_' + (param.type || param.schema.type).toUpperCase() + '_VALUE',
  };
  if (values && typeof values[param.name] !== 'undefined') {
    value = {
      name: param.name,
      value: values[param.name] + '',
    }; /* adding a empty string to convert to string */
  } else if (typeof param.default !== 'undefined') {
    value = createQueryStringObject(
      param.name,
      param.default,
      param.in,
      param.style,
      param.explode
    );
  } else if (
    typeof param.schema !== 'undefined' &&
    typeof param.schema.example !== 'undefined'
  ) {
    value = createQueryStringObject(
      param.name,
      param.schema.example,
      param.in,
      param.style,
      param.explode
    );
  } else if (typeof param.example !== 'undefined') {
    value = createQueryStringObject(
      param.name,
      param.example,
      param.in,
      param.style,
      param.explode
    );
  } else if (typeof param.examples !== 'undefined') {
    if (param.examples && typeof param.examples === 'object') {
      const values = Object.values(param.examples);

      if (values.length > 0 && typeof values[0].value !== 'undefined') {
        const example = values[0].value;
        value = createQueryStringObject(
          param.name,
          example,
          param.in,
          param.style,
          param.explode,
          value
        );
      }
    }
  }
  // TODO: Rename this and the getParameterValueFrom* methods, They now get "query strings"
  return value;
};

/**
 * Parse parameter object into query string objects
 *
 * @param  {Object} openApi    OpenApi document
 * @param  {Object} parameters Objects described in the document to parse into the query string
 * @param  {Object} values     Optional: query parameter values to use in the snippet if present
 * @return {Object}            Object describing the parameters for a method or path
 */
const parseParametersToQuery = function (openApi, parameters, values) {
  const queryStrings = {};

  for (let i in parameters) {
    let param = parameters[i];
    if (typeof param['$ref'] === 'string' && /^#/.test(param['$ref'])) {
      param = resolveRef(openApi, param['$ref']);
    }
    if (typeof param.schema !== 'undefined') {
      if (
        typeof param.schema['$ref'] === 'string' &&
        /^#/.test(param.schema['$ref'])
      ) {
        param.schema = resolveRef(openApi, param.schema['$ref']);
        if (typeof param.schema.type === 'undefined') {
          // many schemas don't have an explicit type
          param.schema.type = 'object';
        }
      }
    }
    if (typeof param.in !== 'undefined' && param.in.toLowerCase() === 'query') {
      // param.name is a safe key, because the spec defines
      // that name MUST be unique
      queryStrings[param.name] = getParameterValues(param, values);
    }
  }

  return queryStrings;
};

/**
 * Get array of objects describing the query parameters for a path and method
 * pair described in the given OpenAPI document.
 *
 * @param  {Object} openApi OpenApi document
 * @param  {string} path    Key of the path
 * @param  {string} method  Key of the method
 * @param  {Object} values  Optional: query parameter values to use in the snippet if present
 * @return {array}          List of objects describing the query strings
 */
const getQueryStrings = function (openApi, path, method, values) {
  // Set the optional parameter if it's not provided
  if (typeof values === 'undefined') {
    values = {};
  }

  let pathQueryStrings = {};
  let methodQueryStrings = {};

  // First get any parameters from the path
  if (typeof openApi.paths[path].parameters !== 'undefined') {
    pathQueryStrings = parseParametersToQuery(
      openApi,
      openApi.paths[path].parameters,
      values
    );
  }

  if (typeof openApi.paths[path][method].parameters !== 'undefined') {
    methodQueryStrings = parseParametersToQuery(
      openApi,
      openApi.paths[path][method].parameters,
      values
    );
  }

  // Merge query strings, with method overriding path
  // from the spec:
  // If a parameter is already defined at the Path Item, the new definition will override
  // it but can never remove it.
  // https://swagger.io/specification/
  const queryStrings = Object.assign(pathQueryStrings, methodQueryStrings);

  // Now we need to go thru all of the query values. If any is an array it's because
  // it's an exploded query string. We need to flatten these.

  return Object.values(queryStrings).flatMap((entry) => {
    if (Array.isArray(entry.value)) {
      return entry.value.map((innerEntry) => {
        return {
          name: entry.name,
          value: innerEntry.value,
        };
      });
    } else {
      return entry;
    }
  });
};

/**
 * Return the path with the parameters example values used if specified.
 *
 * @param  {Object} openApi OpenApi document
 * @param  {string} path    Key of the path
 * @param  {string} method  Key of the method
 * @return {string}         Full path including example values
 */
const getFullPath = function (openApi, path, method) {
  let fullPath = path;
  const parameters =
    openApi.paths[path].parameters || openApi.paths[path][method].parameters;

  if (typeof parameters !== 'undefined') {
    for (let i in parameters) {
      let param = parameters[i];
      if (typeof param['$ref'] === 'string' && /^#/.test(param['$ref'])) {
        param = resolveRef(openApi, param['$ref']);
      }
      if (
        typeof param.in !== 'undefined' &&
        param.in.toLowerCase() === 'path'
      ) {
        if (typeof param.example !== 'undefined') {
          // only if the schema has an example value
          fullPath = fullPath.replace(
            '{' + param.name + '}',
            getParameterValueFromExampleForPath(
              param.name,
              param.example,
              param.in,
              param.style,
              param.explode
            )
          );
        } else if (typeof param.examples !== 'undefined') {
          if (param.examples && typeof param.examples === 'object') {
            const values = Object.values(param.examples);

            if (values.length > 0 && typeof values[0].value !== 'undefined') {
              const example = values[0].value;
              const defaultValue = '{' + param.name + '}';
              fullPath = fullPath.replace(
                defaultValue,
                getParameterValueFromExampleForPath(
                  param.name,
                  example,
                  param.in,
                  param.style,
                  param.explode,
                  defaultValue
                )
              );
            }
          }
        }
      }
    }
  }
  return fullPath;
};

/**
 * Get an array of objects describing the header for a path and method pair
 * described in the given OpenAPI document.
 *
 * @param  {Object} openApi OpenAPI document
 * @param  {string} path    Key of the path
 * @param  {string} method  Key of the method
 * @return {array}          List of objects describing the header
 */
const getHeadersArray = function (openApi, path, method) {
  const headers = [];
  const pathObj = openApi.paths[path][method];

  // 'accept' header:
  if (typeof pathObj.consumes !== 'undefined') {
    for (let i in pathObj.consumes) {
      const type = pathObj.consumes[i];
      headers.push({
        name: 'accept',
        value: type,
      });
    }
  }

  // headers defined in path object:
  if (typeof pathObj.parameters !== 'undefined') {
    for (let k in pathObj.parameters) {
      let param = pathObj.parameters[k];
      if (typeof param['$ref'] === 'string' && /^#/.test(param['$ref'])) {
        param = resolveRef(openApi, param['$ref']);
      }
      if (
        typeof param.in !== 'undefined' &&
        param.in.toLowerCase() === 'header'
      ) {
        headers.push(getParameterValues(param));
      }
    }
  }

  // security:
  let basicAuthDef;
  let apiKeyAuthDef;
  let oauthDef;
  if (typeof pathObj.security !== 'undefined') {
    for (var l in pathObj.security) {
      const secScheme = Object.keys(pathObj.security[l])[0];
      const secDefinition = openApi.securityDefinitions
        ? openApi.securityDefinitions[secScheme]
        : openApi.components.securitySchemes[secScheme];
      const authType = secDefinition.type.toLowerCase();
      let authScheme = null;

      if (authType !== 'apikey' && secDefinition.scheme != null) {
        authScheme = secDefinition.scheme.toLowerCase();
      }

      switch (authType) {
        case 'basic':
          basicAuthDef = secScheme;
          break;
        case 'apikey':
          if (secDefinition.in === 'header') {
            apiKeyAuthDef = secDefinition;
          }
          break;
        case 'oauth2':
          oauthDef = secScheme;
          break;
        case 'http':
          switch (authScheme) {
            case 'bearer':
              oauthDef = secScheme;
              break;
            case 'basic':
              basicAuthDef = secScheme;
              break;
          }
          break;
      }
    }
  } else if (typeof openApi.security !== 'undefined') {
    // Need to check OAS 3.0 spec about type http and scheme
    for (let m in openApi.security) {
      const secScheme = Object.keys(openApi.security[m])[0];
      const secDefinition = openApi.components.securitySchemes[secScheme];
      const authType = secDefinition.type.toLowerCase();
      let authScheme = null;

      if (authType !== 'apikey' && authType !== 'oauth2') {
        authScheme = secDefinition.scheme.toLowerCase();
      }

      switch (authType) {
        case 'http':
          switch (authScheme) {
            case 'bearer':
              oauthDef = secScheme;
              break;
            case 'basic':
              basicAuthDef = secScheme;
              break;
          }
          break;
        case 'basic':
          basicAuthDef = secScheme;
          break;
        case 'apikey':
          if (secDefinition.in === 'header') {
            apiKeyAuthDef = secDefinition;
          }
          break;
        case 'oauth2':
          oauthDef = secScheme;
          break;
      }
    }
  }

  if (basicAuthDef) {
    headers.push({
      name: 'Authorization',
      value: 'Basic ' + 'REPLACE_BASIC_AUTH',
    });
  } else if (apiKeyAuthDef) {
    headers.push({
      name: apiKeyAuthDef.name,
      value: 'REPLACE_KEY_VALUE',
    });
  } else if (oauthDef) {
    headers.push({
      name: 'Authorization',
      value: 'Bearer ' + 'REPLACE_BEARER_TOKEN',
    });
  }

  return headers;
};

/**
 * Produces array of HAR files for given OpenAPI document
 *
 * @param  {object}   openApi          OpenAPI document
 * @param  {Function} callback
 */
const openApiToHarList = function (openApi) {
  try {
    // iterate openApi and create har objects:
    const harList = [];
    for (let path in openApi.paths) {
      for (let method in openApi.paths[path]) {
        const url = getBaseUrl(openApi, path, method) + path;
        const hars = createHar(openApi, path, method);
        // need to push multiple here
        harList.push({
          method: method.toUpperCase(),
          url: url,
          description:
            openApi.paths[path][method].description ||
            'No description available',
          hars: hars,
        });
      }
    }

    return harList;
  } catch (e) {
    console.log(e);
  }
};

/**
 * Returns the value referenced in the given reference string
 *
 * @param  {object} openApi  OpenAPI document
 * @param  {string} ref      A reference string
 * @return {any}
 */
const resolveRef = function (openApi, ref) {
  const parts = ref.split('/');

  if (parts.length <= 1) return {}; // = 3

  const recursive = function (obj, index) {
    if (index + 1 < parts.length) {
      // index = 1
      let newCount = index + 1;
      return recursive(obj[parts[index]], newCount);
    } else {
      return obj[parts[index]];
    }
  };
  return recursive(openApi, 1);
};

module.exports = {
  getAll: openApiToHarList,
  getEndpoint: createHar,
};
