/**
 * Translates given Swagger 2.0 file to an array of HTTP Archive (HAR) 1.2 Request Object.
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
var OpenAPISampler = require('openapi-sampler')

/**
 * Create HAR Request object for path and method pair described in given swagger.
 *
 * @param  {Object} swagger           Swagger document
 * @param  {string} path              Key of the path
 * @param  {string} method            Key of the method
 * @param  {Object} queryParamValues  Optional: Values for the query parameters if present
 * @return {Object}                   HAR Request object
 */
var createHar = function (swagger, path, method, queryParamValues) {
  // if the operational parameter is not provided, set it to empty object
  if (typeof queryParamValues === 'undefined') {
    queryParamValues = {}
  }

  var baseUrl = getBaseUrl(swagger)

  var har = {
    method: method.toUpperCase(),
    url: baseUrl + path,
    headers: getHeadersArray(swagger, path, method),
    queryString: getQueryStrings(swagger, path, method, queryParamValues),
    httpVersion: 'HTTP/1.1',
    cookies: [],
    headersSize: 0,
    bodySize: 0
  }

  // get payload data, if available:
  var postData = getPayload(swagger, path, method)
  if (postData) har.postData = postData

  return har
}

/**
 * Get the payload definition for the given endpoint (path + method) from the
 * given OAI specification. References within the payload definition are
 * resolved.
 *
 * @param  {object} swagger
 * @param  {string} path
 * @param  {string} method
 * @return {object}
 */
var getPayload = function (swagger, path, method) {
  if (typeof swagger.paths[path][method].parameters !== 'undefined') {
    for (var i in swagger.paths[path][method].parameters) {
      var param = swagger.paths[path][method].parameters[i]
      if (typeof param.in !== 'undefined' && param.in.toLowerCase() === 'body' &&
        typeof param.schema !== 'undefined') {
          try {
            const sample = OpenAPISampler.sample(param.schema, {skipReadOnly: true}, swagger)
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
    if (swagger.paths[path][method].requestBody && swagger.paths[path][method].requestBody.content &&
        swagger.paths[path][method].requestBody.content['application/json'] &&
        swagger.paths[path][method].requestBody.content['application/json'].schema) {
        const sample = OpenAPISampler.sample(swagger.paths[path][method].requestBody.content['application/json'].schema, {skipReadOnly: true}, swagger)
        return {
            mimeType: 'application/json',
            text: JSON.stringify(sample)
        }
    }
  return null
}

/**
 * Gets the base URL constructed from the given swagger.
 *
 * @param  {Object} swagger Swagger document
 * @return {string}         Base URL
 */
var getBaseUrl = function (swagger) {
  if (swagger.servers)
      return swagger.servers[0].url;
  var baseUrl = ''
  if (typeof swagger.schemes !== 'undefined') {
    baseUrl += swagger.schemes[0]
  } else {
    baseUrl += 'http'
  }

  if (swagger.basePath === '/') {
    baseUrl += '://' + swagger.host
  } else {
    baseUrl += '://' + swagger.host + swagger.basePath
  }

  return baseUrl
}

/**
 * Get array of objects describing the query parameters for a path and method pair
 * described in the given swagger.
 *
 * @param  {Object} swagger Swagger document
 * @param  {string} path    Key of the path
 * @param  {string} method  Key of the method
 * @param  {Object} values  Optional: query parameter values to use in the snippet if present
 * @return {array}          List of objects describing the query strings
 */
var getQueryStrings = function (swagger, path, method, values) {
  // Set the optional parameter if it's not provided
  if (typeof values === 'undefined') {
    values = {}
  }

  var queryStrings = []

  if (typeof swagger.paths[path][method].parameters !== 'undefined') {
    for (var i in swagger.paths[path][method].parameters) {
      var param = swagger.paths[path][method].parameters[i]
      if (typeof param['$ref'] === 'string' &&
        !/^http/.test(param['$ref'])) {
        param = resolveRef(swagger, param['$ref'])
      }
      if (typeof param.in !== 'undefined' && param.in.toLowerCase() === 'query') {
        queryStrings.push({
          name: param.name,
          value: typeof values[param.name] === 'undefined'
            ? (typeof param.default === 'undefined'
              ? ('SOME_' + (param.type || param.schema.type).toUpperCase() + '_VALUE')
              : param.default + '')
            : (values[param.name] + '') /* adding a empty string to convert to string */
        })
      }
    }
  }

  return queryStrings
}

/**
 * Get an array of objects describing the header for a path and method pair
 * described in the given swagger.
 *
 * @param  {Object} swagger Swagger document
 * @param  {string} path    Key of the path
 * @param  {string} method  Key of the method
 * @return {array}          List of objects describing the header
 */
var getHeadersArray = function (swagger, path, method) {
  var headers = []

  var pathObj = swagger.paths[path][method]

  // 'accept' header:
  if (typeof pathObj.consumes !== 'undefined') {
    for (var i in pathObj.consumes) {
      var type = pathObj.consumes[i]
      headers.push({
        name: 'accept',
        value: type
      })
    }
  }

  // 'content-type' header:
  if (typeof pathObj.produces !== 'undefined') {
    for (var j in pathObj.produces) {
      var type2 = pathObj.produces[j]
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
    for (var k in pathObj.parameters) {
      var param = pathObj.parameters[k]
      if (typeof param.in !== 'undefined' && param.in.toLowerCase() === 'header') {
        headers.push({
          name: param.name,
          value: 'SOME_' + (param.type||param.schema.type).toUpperCase() + '_VALUE'
        })
      }
    }
  }

  // security:
  var basicAuthDef
  var apiKeyAuthDef
  var oauthDef
  if (typeof pathObj.security !== 'undefined') {
    for (var l in pathObj.security) {
      var secScheme = Object.keys(pathObj.security[l])[0]
      var secDefinition = swagger.securityDefinitions ?
        swagger.securityDefinitions[secScheme] :
        swagger.components.securitySchemes[secScheme];
      var authType = secDefinition.type.toLowerCase();
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
      }
    }
  } else if (typeof swagger.security !== 'undefined') {
    for (var m in swagger.security) {
      var overallSecScheme = Object.keys(swagger.security[m])[0]
      var overallAuthType = swagger.securityDefinitions[overallSecScheme].type.toLowerCase()
      switch (overallAuthType) {
        case 'basic':
          basicAuthDef = overallSecScheme
          break
        case 'apikey':
          if (swagger.securityDefinitions[overallSecScheme].in === 'query') {
            apiKeyAuthDef = swagger.securityDefinitions[overallSecScheme]
          }
          break
        case 'oauth2':
          oauthDef = overallSecScheme
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
 * Produces array of HAR files for given Swagger document
 *
 * @param  {object}   swagger          A swagger document
 * @param  {Function} callback
 */
var swaggerToHarList = function (swagger) {
  try {
    // determine basePath:
    var baseUrl = getBaseUrl(swagger)

    // iterate Swagger and create har objects:
    var harList = []
    for (var path in swagger.paths) {
      for (var method in swagger.paths[path]) {
        var url = baseUrl + path
        var har = createHar(swagger, path, method)
        harList.push({
          method: method.toUpperCase(),
          url: url,
          description: swagger.paths[path][method].description || 'No description available',
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
 * @param  {object} oai
 * @param  {string} ref A reference string
 * @return {any}
 */
var resolveRef = function (oai, ref) {
  var parts = ref.split('/')

  if (parts.length <= 1) return {} // = 3

  var recursive = function (obj, index) {
    if (index + 1 < parts.length) { // index = 1
      var newCount = index + 1
      return recursive(obj[parts[index]], newCount)
    } else {
      return obj[parts[index]]
    }
  }
  return recursive(oai, 1)
}

module.exports = {
  getAll: swaggerToHarList,
  getEndpoint: createHar
}
