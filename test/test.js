'use strict'

var test = require('tape')
var SwaggerSnippet = require('../index')

var InstagramSwagger = require('./instagram_swagger.json')

test('Getting snippets should not result in error or undefined', function (t) {
  t.plan(1)

  SwaggerSnippet(InstagramSwagger, ['c_libcurl'], false, function (err, data) {
    if (err) throw err
    t.notEqual(data, undefined)
  })
})

test('Receive error on invalid target', function (t) {
  t.plan(1)

  SwaggerSnippet(InstagramSwagger, ['node_asfd'], false, function (err, data) {
    t.ok(err)
  })
})
