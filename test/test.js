'use strict'

var test = require('tape')
var SwaggerSnippet = require('../index')

var InstagramSwagger = require('./instagram_swagger.json')

test('Getting snippets should not result in error or undefined', function (t) {
  t.plan(1)

  var result = SwaggerSnippet(InstagramSwagger, ['c_libcurl'])
  t.notEqual(result, undefined)
})

test('Receive error on invalid target', function (t) {
  t.plan(1)

  try {
    SwaggerSnippet(InstagramSwagger, ['node_asfd'])
  } catch (err) {
    t.equal(err.toString(), 'Error: Invalid target: node_asfd')
  }
})
