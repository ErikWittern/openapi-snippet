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

var SwaggerParser = require('swagger-parser')

/**
 * Create HAR Request object for path and method pair described in given swagger.
 *
 * @param  {Object} swagger Swagger document
 * @param  {string} path    Key of the path
 * @param  {string} method  Key of the method
 * @return {Object}         HAR Request object
 */
var createHar = function (swagger, path, method) {
  var baseUrl = getBaseUrl(swagger)

  var har = {
    method: method.toUpperCase(),
    url: baseUrl + path,
    headers: getHeadersArray(swagger, path, method),
    queryString: getQueryStrings(swagger, path, method)
  }
  // if (body) {
  //   confHAR.postData = {
  //     mimeType: $scope.contentType,
  //     text: body
  //   }
  // }
  return har
}

/**
 * Gets the base URL constructed from the given swagger.
 *
 * @param  {Object} swagger Swagger document
 * @return {string}         Base URL
 */
var getBaseUrl = function (swagger) {
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
 * @return {array}         List of objects describing the query strings
 */
var getQueryStrings = function (swagger, path, method) {
  var queryStrings = []

  if (typeof swagger.paths[path][method].parameters !== 'undefined') {
    for (var i in swagger.paths[path][method].parameters) {
      var param = swagger.paths[path][method].parameters[i]
      if (typeof param.in !== 'undefined' && param.in.toLowerCase() === 'query') {
        queryStrings.push({
          name: param.name,
          value: 'SOME_' + param.type.toUpperCase() + '_VALUE'
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

  // headers defined in path object:
  if (typeof pathObj.parameters !== 'undefined') {
    for (var k in pathObj.parameters) {
      var param = pathObj.parameters[k]
      if (typeof param.in !== 'undefined' && param.in.toLowerCase() === 'header') {
        headers.push({
          name: param.name,
          value: 'SOME_' + param.type.toUpperCase() + '_VALUE'
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
      var authType = swagger.securityDefinitions[secScheme].type.toLowerCase()
      switch (authType) {
        case 'basic':
          basicAuthDef = secScheme
          break
        case 'apikey':
          if (swagger.securityDefinitions[secScheme].in === 'query') {
            apiKeyAuthDef = secScheme
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
            apiKeyAuthDef = overallSecScheme
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
      name: swagger.securityDefinitions[apiKeyAuthDef].name,
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
 * @param  {boolean}  ignoreValidation Whether to ignore Swagger validation
 * @param  {Function} callback
 */
var swaggerToHarList = function (swagger, ignoreValidation, callback) {
  SwaggerParser.validate(swagger, function (err, api) {
    if (err && !ignoreValidation) {
      return callback(err)
    }

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

      return callback(null, harList)
    } catch (e) {
      callback(e)
    }
  })
}

module.exports = swaggerToHarList
