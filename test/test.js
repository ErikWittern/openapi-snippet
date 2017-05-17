'use strict'

var test = require('tape')
var SwaggerSnippet = require('../index')

var InstagramSwagger = require('./instagram_swagger.json')
var BloggerSwagger = require('./blogger_swagger.json')
var GithubSwagger = require('./github_swagger.json')
var WatsonSwagger = require('./watson_alchemy_language_swagger.json')
var IBMSwagger = require('./ibm_watson_alchemy_data_news_api.json')

test('Getting snippets should not result in error or undefined', function (t) {
  t.plan(1)

  var result = SwaggerSnippet.getSwaggerSnippets(InstagramSwagger, ['c_libcurl'])
  t.notEqual(result, undefined)
})

test('An invalid target should result in error', function (t) {
  t.plan(1)

  try {
    var result = SwaggerSnippet.getSwaggerSnippets(BloggerSwagger, ['node_asfd'])
    console.log(result)
  } catch (err) {
    t.equal(err.toString(), 'Error: Invalid target: node_asfd')
  }
})

test('Getting snippets for endpoint should not result in error or undefined', function (t) {
  t.plan(1)

  var result = SwaggerSnippet.getEndpointSnippets(InstagramSwagger, '/geographies/{geo-id}/media/recent', 'get', ['c_libcurl'])
  t.notEqual(result, undefined)
})

test('Getting snippets for IBM Watson Alchemy Language should work', function (t) {
  t.plan(1)

  var result = SwaggerSnippet.getEndpointSnippets(IBMSwagger, '/data/GetNews', 'get', ['node_request'])
  t.notEqual(result, undefined)
})

test('Getting snippets for endpoint should contain body', function (t) {
  t.plan(2)
  // checks the 'Pages' schema...
  var result = SwaggerSnippet.getEndpointSnippets(BloggerSwagger, '/blogs/{blogId}/pages', 'post', ['node_request'])
  t.true(/body/.test(result.snippets[0].content))
  t.true(/subPage/.test(result.snippets[0].content))
})

test('Testing optionally provided parameter values', function (t) {
  t.plan(2)
  // checks the 'Pages' schema...
  var result = SwaggerSnippet.getEndpointSnippets(InstagramSwagger, '/locations/search', 'get', ['node_request'],
    {
      'distance': 5000,
      'not-a-query-param': 'foo'
    })
  t.true(/5000/.test(result.snippets[0].content))
  t.false(/not-a-query-param/.test(result.snippets[0].content))
})

test('Testing the case when default is present but a value is provided, use the provided value', function (t) {
  t.plan(2)
  // checks the 'Pages' schema...
  var result = SwaggerSnippet.getEndpointSnippets(GithubSwagger, '/issues', 'get', ['node_request'],
    {
      'filter': 'assigned'
    })
  t.true(/assigned/.test(result.snippets[0].content))
  t.false(/all/.test(result.snippets[0].content)) // The default value of `filter` is `all`
})

test('Testing the case when default is present but no value is provided, use the default', function (t) {
  t.plan(2)
  // checks the 'Pages' schema...
  var result = SwaggerSnippet.getEndpointSnippets(GithubSwagger, '/issues', 'get', ['node_request'])
  t.false(/assigned/.test(result.snippets[0].content))
  t.true(/all/.test(result.snippets[0].content))  // The default value of `filter` is `all`
})

test('Referenced query parameters should be resolved', function (t) {
  var result = SwaggerSnippet.getEndpointSnippets(WatsonSwagger, '/html/HTMLExtractDates', 'get', ['node_request'])
  var snippet = result.snippets[0].content
  t.true(/apikey/.test(snippet))
  t.true(/showSourceText/.test(snippet))
  t.end()
})
