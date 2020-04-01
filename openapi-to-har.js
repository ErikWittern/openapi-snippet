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
const OpenAPISampler = require('openapi-sampler')

/**
 * Create HAR Request object for path and method pair described in given OpenAPI
 * document.
 *
 * @param  {Object} openApi           OpenAPI document
 * @param  {string} path              Key of the path
 * @param  {string} method            Key of the method
 * @param  {Object} queryParamValues  Optional: Values for the query parameters if present
 * @return {Object}                   HAR Request object
 */
const createHar = function (openApi, path, method, queryParamValues) {
  // if the operational parameter is not provided, set it to empty object
  if (typeof queryParamValues === 'undefined') {
    queryParamValues = {}
  }

  const baseUrl = getBaseUrl(openApi)

  const har = {
    method: method.toUpperCase(),
    url: baseUrl + path,
    headers: getHeadersArray(openApi, path, method),
    queryString: getQueryStrings(openApi, path, method, queryParamValues),
    httpVersion: 'HTTP/1.1',
    cookies: [],
    headersSize: 0,
    bodySize: 0
  }

  // get payload data, if available:
  const postData = getPayload(openApi, path, method)
  if (postData) har.postData = postData

  return har
}

/**
 * Get the payload definition for the given endpoint (path + method) from the
 * given OAI specification. References within the payload definition are
 * resolved.
 *
 * @param  {object} openApi
 * @param  {string} path
 * @param  {string} method
 * @return {object}
 */
const getPayload = function (openApi, path, method) {
  if (typeof openApi.paths[path][method].parameters !== 'undefined') {
    for (let i in openApi.paths[path][method].parameters) {
      const param = openApi.paths[path][method].parameters[i]
      if (typeof param.in !== 'undefined' && param.in.toLowerCase() === 'body' &&
        typeof param.schema !== 'undefined') {
          try {
            const sample = OpenAPISampler.sample(param.schema, {skipReadOnly: true}, openApi)
            return {
              mimeType: 'application/json',
              text: JSON.stringify(sample)
            }
          } catch (err) {
            console.log(err)
            return null
          }
      }
    }
  }
    if (openApi.paths[path][method].requestBody && openApi.paths[path][method].requestBody.content &&
        openApi.paths[path][method].requestBody.content['application/json'] &&
        openApi.paths[path][method].requestBody.content['application/json'].schema) {
        const sample = OpenAPISampler.sample(openApi.paths[path][method].requestBody.content['application/json'].schema, {skipReadOnly: true}, openApi)
        return {
            mimeType: 'application/json',
            text: JSON.stringify(sample)
        }
    }
  return null
}

/**
 * Gets the base URL constructed from the given openApi.
 *
 * @param  {Object} openApi OpenAPI document
 * @return {string}         Base URL
 */
const getBaseUrl = function (openApi) {
  if (openApi.servers)
      return openApi.servers[0].url
  let baseUrl = ''
  if (typeof openApi.schemes !== 'undefined') {
    baseUrl += openApi.schemes[0]
  } else {
    baseUrl += 'http'
  }

  if (openApi.basePath === '/') {
    baseUrl += '://' + openApi.host
  } else {
    baseUrl += '://' + openApi.host + openApi.basePath
  }

  return baseUrl
}

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
    values = {}
  }

  const queryStrings = []

  if (typeof openApi.paths[path][method].parameters !== 'undefined') {
    for (let i in openApi.paths[path][method].parameters) {
      let param = openApi.paths[path][method].parameters[i]
      if (typeof param['$ref'] === 'string' &&
        /^#/.test(param['$ref'])) {
        param = resolveRef(openApi, param['$ref'])
      }
      if (typeof param.schema !== 'undefined') {
        if (typeof param.schema['$ref'] === 'string' &&
          /^#/.test(param.schema['$ref'])) {
          param.schema = resolveRef(openApi, param.schema['$ref'])
          if (typeof param.schema.type === 'undefined') { // many schemas don't have an explicit type
            param.schema.type = 'object';
          }
        }
      }
      if (typeof param.in !== 'undefined' && param.in.toLowerCase() === 'query') {
        let value = 'SOME_' + (param.type || param.schema.type).toUpperCase() + '_VALUE'
        if (typeof values[param.name] !== 'undefined') {
          value = values[param.name] + ''  /* adding a empty string to convert to string */
        } else if (typeof param.default !== 'undefined') {
          value = param.default + ''
        } else if (typeof param.schema !== 'undefined' && typeof param.schema.example !== 'undefined') {
          value = param.schema.example + ''
        }
        queryStrings.push({
          name: param.name,
          value: value
        })
      }
    }
  }

  return queryStrings
}

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
  const headers = []
  const pathObj = openApi.paths[path][method]

  // 'accept' header:
  if (typeof pathObj.consumes !== 'undefined') {
    for (let i in pathObj.consumes) {
      const type = pathObj.consumes[i]
      headers.push({
        name: 'accept',
        value: type
      })
    }
  }

  // 'content-type' header:
  if (typeof pathObj.produces !== 'undefined') {
    for (let j in pathObj.produces) {
      const type2 = pathObj.produces[j]
      headers.push({
        name: 'content-type',
        value: type2
      })
    }
  }

  // v3 'content-type' header:
  if (pathObj.requestBody && pathObj.requestBody.content) {
      for (const type3 of Object.keys(pathObj.requestBody.content)) {
          headers.push({
              name: 'content-type',
              value: type3
          });
      }
  }

  // headers defined in path object:
  if (typeof pathObj.parameters !== 'undefined') {
    for (let k in pathObj.parameters) {
      const param = pathObj.parameters[k]
      if (typeof param.in !== 'undefined' && param.in.toLowerCase() === 'header') {
        headers.push({
          name: param.name,
          value: 'SOME_' + (param.type||param.schema.type).toUpperCase() + '_VALUE'
        })
      }
    }
  }

  // security:
  let basicAuthDef
  let apiKeyAuthDef
  let oauthDef
  if (typeof pathObj.security !== 'undefined') {
    for (var l in pathObj.security) {
      const secScheme = Object.keys(pathObj.security[l])[0]
      const secDefinition = openApi.securityDefinitions ?
        openApi.securityDefinitions[secScheme] :
        openApi.components.securitySchemes[secScheme];
      const authType = secDefinition.type.toLowerCase();
      let authScheme = null;

      if(authType !== 'apikey' && secDefinition.scheme != null){
        authScheme = secDefinition.scheme.toLowerCase();
      }

      switch (authType) {
        case 'basic':
          basicAuthDef = secScheme
          break
        case 'apikey':
          if (secDefinition.in === 'header') {
            apiKeyAuthDef = secDefinition
          }
          break
        case 'oauth2':
          oauthDef = secScheme
          break
        case 'http':
          switch(authScheme){
            case 'bearer':
              oauthDef = secScheme
              break
            case 'basic':
              basicAuthDef = secScheme
              break
          }
          break
      }
    }
  } else if (typeof openApi.security !== 'undefined') {
    // Need to check OAS 3.0 spec about type http and scheme
    for (let m in openApi.security) {
      const secScheme = Object.keys(openApi.security[m])[0]
      const secDefinition = openApi.components.securitySchemes[secScheme];
      const authType = secDefinition.type.toLowerCase();
      let authScheme = null;
      
      if(authType !== 'apikey'){
        authScheme = secDefinition.scheme.toLowerCase();
      }
      
      switch (authType) {
        case 'http':
          switch(authScheme){
            case 'bearer': 
              oauthDef = secScheme
              break
            case 'basic':
              basicAuthDef = secScheme
              break
          }
          break
        case 'basic':
          basicAuthDef = secScheme
          break
        case 'apikey':
          if (secDefinition.in === 'header') {
            apiKeyAuthDef = secDefinition
          }
          break
        case 'oauth2':
          oauthDef = secScheme
          break
      }
    }
  }

  if (basicAuthDef) {
    headers.push({
      name: 'Authorization',
      value: 'Basic ' + 'REPLACE_BASIC_AUTH'
    })
  } else if (apiKeyAuthDef) {
    headers.push({
      name: apiKeyAuthDef.name,
      value: 'REPLACE_KEY_VALUE'
    })
  } else if (oauthDef) {
    headers.push({
      name: 'Authorization',
      value: 'Bearer ' + 'REPLACE_BEARER_TOKEN'
    })
  }

  return headers
}

/**
 * Produces array of HAR files for given OpenAPI document
 *
 * @param  {object}   openApi          OpenAPI document
 * @param  {Function} callback
 */
const openApiToHarList = function (openApi) {
  try {
    // determine basePath:
    const baseUrl = getBaseUrl(openApi)

    // iterate openApi and create har objects:
    const harList = []
    for (let path in openApi.paths) {
      for (let method in openApi.paths[path]) {
        const url = baseUrl + path
        const har = createHar(openApi, path, method)
        harList.push({
          method: method.toUpperCase(),
          url: url,
          description: openApi.paths[path][method].description || 'No description available',
          har: har
        })
      }
    }

    return harList
  } catch (e) {
    console.log(e);
  }
}

/**
 * Returns the value referenced in the given reference string
 *
 * @param  {object} openApi  OpenAPI document
 * @param  {string} ref      A reference string
 * @return {any}
 */
const resolveRef = function (openApi, ref) {
  const parts = ref.split('/')

  if (parts.length <= 1) return {} // = 3

  const recursive = function (obj, index) {
    if (index + 1 < parts.length) { // index = 1
      let newCount = index + 1
      return recursive(obj[parts[index]], newCount)
    } else {
      return obj[parts[index]]
    }
  }
  return recursive(openApi, 1)
}

module.exports = {
  getAll: openApiToHarList,
  getEndpoint: createHar
}
