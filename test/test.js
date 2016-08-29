'use strict'

var test = require('tape')
var SwaggerSnippet = require('../index')

var InstagramSwagger = require('./instagram_swagger.json')

test('Getting snippets should not result in error or undefined', function (t) {
  t.plan(1)

  var result = SwaggerSnippet.getSwaggerSnippets(InstagramSwagger, ['c_libcurl'])
  t.notEqual(result, undefined)
})

test('An invalid target should result in error', function (t) {
  t.plan(1)

  try {
    SwaggerSnippet.getSwaggerSnippets(InstagramSwagger, ['node_asfd'])
  } catch (err) {
    t.equal(err.toString(), 'Error: Invalid target: node_asfd')
  }
})

test('Getting snippets for endpoint should not result in error or undefined', function (t) {
  t.plan(1)

  var result = SwaggerSnippet.getEndpointSnippets(InstagramSwagger, '/geographies/{geo-id}/media/recent', 'get', ['c_libcurl'])
  t.notEqual(result, undefined)
})
