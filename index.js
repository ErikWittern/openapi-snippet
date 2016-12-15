/**
 * swagger-snippet
 * Generate code snippets for given Swagger / Open API Specification files
 *
 * Author: Erik Wittern
 * License: MIT
 */
'use strict'

var SwaggerToHar = require('./swagger-to-har.js')
var HTTPSnippet = require('httpsnippet')

var getEndpointSnippets = function (swagger, path, method, targets, values) {
  // if optional parameter is not provided, set it to empty object
  if (typeof values === 'undefined') {
    values = {}
  }

  var har = SwaggerToHar.getEndpoint(swagger, path, method, values)

  var snippet = new HTTPSnippet(har)

  var snippets = []
  for (var j in targets) {
    var target = formatTarget(targets[j])
    if (!target) throw new Error('Invalid target: ' + targets[j])
    snippets.push({
      id: targets[j],
      title: target.title,
      content: snippet.convert(target.language, typeof target.library !== 'undefined' ? target.library : null)
    })
  }

  return {
    method: har.method,
    url: har.url,
    description: har.description,
    resource: getResourceName(har.url),
    snippets: snippets
  }
}

var getSwaggerSnippets = function (swagger, targets) {
  var harList = SwaggerToHar.getAll(swagger)

  var results = []
  for (var i in harList) {
    // create HTTPSnippet object:
    var har = harList[i]
    var snippet = new HTTPSnippet(har.har)

    var snippets = []
    for (var j in targets) {
      var target = formatTarget(targets[j])
      if (!target) throw new Error('Invalid target: ' + targets[j])
      snippets.push({
        id: targets[j],
        title: target.title,
        content: snippet.convert(target.language, typeof target.library !== 'undefined' ? target.library : null)
      })
    }

    results.push({
      method: har.method,
      url: har.url,
      description: har.description,
      resource: getResourceName(har.url),
      snippets: snippets
    })
  }

  // sort results:
  results.sort(function (a, b) {
    if (a.resource < b.resource) {
      return -1
    } else if (a.resource > b.resource) {
      return 1
    } else {
      return getMethodOrder(a.method.toLowerCase(), b.method.toLowerCase())
    }
  })

  return results
}

/**
 * Determine the order of HTTP methods.
 *
 * @param  {string} a One HTTP verb in lower case
 * @param  {string} b Another HTTP verb in lower case
 * @return {number}   The order instruction for the given HTTP verbs
 */
var getMethodOrder = function (a, b) {
  var order = ['get', 'post', 'put', 'delete', 'patch']
  if (order.indexOf(a) === -1) {
    return 1
  } else if (order.indexOf(b) === -1) {
    return -1
  } else if (order.indexOf(a) < order.indexOf(b)) {
    return -1
  } else if (order.indexOf(a) > order.indexOf(b)) {
    return 1
  } else {
    return 0
  }
}

/**
 * Determines the name of the resource exposed by the method.
 * E.g., ../users/{userId} --> users
 *
 * @param  {string} urlStr The Swagger path definition
 * @return {string}        The determined resource name
 */
var getResourceName = function (urlStr) {
  var pathComponents = urlStr.split('/')
  for (var i = pathComponents.length - 1; i >= 0; i--) {
    var cand = pathComponents[i]
    if (cand !== '' && !/^{/.test(cand)) {
      return cand
    }
  }
}

/**
 * Format the given target by splitting up language and library and making sure
 * that HTTP Snippet supports them.
 *
 * @param  {string} targetStr String defining a target, e.g., node_request
 * @return {object}           Object with formatted target, or null
 */
var formatTarget = function (targetStr) {
  var language = targetStr.split('_')[0]
  var title = capitalizeFirstLetter(language)
  var library = targetStr.split('_')[1]

  var validTargets = HTTPSnippet.availableTargets()
  var validLanguage = false
  var validLibrary = false
  for (var i in validTargets) {
    var target = validTargets[i]
    if (language === target.key) {
      validLanguage = true
      if (typeof library === 'undefined') {
        library = target.default
        validLibrary = true
      } else {
        for (var j in target.clients) {
          var client = target.clients[j]
          if (library === client.key) {
            validLibrary = true
            break
          }
        }
      }
    }
  }

  if (!validLanguage || !validLibrary) {
    return null
  }

  return {
    title: typeof library !== 'undefined' ? title + ' + ' + capitalizeFirstLetter(library) : title,
    language: language,
    library: library
  }
}

var capitalizeFirstLetter = function (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

module.exports = {
  getSwaggerSnippets: getSwaggerSnippets,
  getEndpointSnippets: getEndpointSnippets
}

// The if is only for when this is run from the browser
if (typeof window !== 'undefined') {
  // grab existing namespace object, or create a blank object
  // if it doesn't exist
  var SwaggerSnippet = window.SwaggerSnippet || {}

  // define that object
  SwaggerSnippet = {
    getSwaggerSnippets: getSwaggerSnippets,
    getEndpointSnippets: getEndpointSnippets
  }

  // replace/create the global namespace
  window.SwaggerSnippet = SwaggerSnippet
}
