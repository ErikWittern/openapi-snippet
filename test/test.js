'use strict';

const test = require('tape');
const OpenAPISnippets = require('../index');

const InstagramOpenAPI = require('./instagram_swagger.json');
const BloggerOpenAPI = require('./blogger_swagger.json');
const GitHubOpenAPI = require('./github_swagger.json');
const WatsonOpenAPI = require('./watson_alchemy_language_swagger.json');
const IBMOpenAPI = require('./ibm_watson_alchemy_data_news_api.json');
const PetStoreOpenAPI = require('./petstore_swagger.json');
const PetStoreOpenAPI3 = require('./petstore_oas.json');
const ParameterSchemaReferenceAPI = require('./parameter_schema_reference');
const ParameterExampleReferenceAPI = require('./parameter_example_swagger.json');

test('Getting snippets should not result in error or undefined', function (t) {
  t.plan(1);

  const result = OpenAPISnippets.getSnippets(InstagramOpenAPI, ['c_libcurl']);
  t.notEqual(result, undefined);
});

test('An invalid target should result in error', function (t) {
  t.plan(1);

  try {
    const result = OpenAPISnippets.getSnippets(BloggerOpenAPI, ['node_asfd']);
    console.log(result);
  } catch (err) {
    t.equal(err.toString(), 'Error: Invalid target: node_asfd');
  }
});

test('Getting snippets for endpoint should not result in error or undefined', function (t) {
  t.plan(1);

  const result = OpenAPISnippets.getEndpointSnippets(
    InstagramOpenAPI,
    '/geographies/{geo-id}/media/recent',
    'get',
    ['c_libcurl']
  );
  t.notEqual(result, undefined);
});

test('Getting snippets for IBM Watson Alchemy Language should work', function (t) {
  t.plan(1);

  const result = OpenAPISnippets.getEndpointSnippets(
    IBMOpenAPI,
    '/data/GetNews',
    'get',
    ['node_request']
  );
  t.notEqual(result, undefined);
});

test('Getting snippets for endpoint should contain body', function (t) {
  t.plan(2);
  // checks the 'Pages' schema...
  const result = OpenAPISnippets.getEndpointSnippets(
    BloggerOpenAPI,
    '/blogs/{blogId}/pages',
    'post',
    ['node_request']
  );
  t.true(/body/.test(result.snippets[0].content));
  t.true(/subPage/.test(result.snippets[0].content));
});

test('Getting snippets from OpenAPI 3.0.x should work', function (t) {
  t.plan(1);
  // checks the 'Pages' schema...
  const result = OpenAPISnippets.getEndpointSnippets(
    PetStoreOpenAPI3,
    '/pets/{id}',
    'get',
    ['node_request']
  );
  t.notEqual(result, undefined);
});

test('Testing server overrides', function (t) {
  t.plan(12);
  const result = OpenAPISnippets.getSnippets(PetStoreOpenAPI3, ['c_libcurl']);
  t.equal(result[0].url, 'https://method-override.example.com/pets');
  t.match(result[0].snippets[0].content, /.*method-override.example.com.*/);
  t.doesNotMatch(result[0].snippets[0].content, /.*petstore.swagger.io.*/);
  t.equal(result[1].url, 'http://petstore.swagger.io/api/pets/{id}');
  t.match(result[1].snippets[0].content, /.*petstore.swagger.io.*/);
  t.doesNotMatch(result[1].snippets[0].content, /.*example.com.*/);
  t.equal(result[2].url, 'https://path-override.example.com/pets');
  t.match(result[2].snippets[0].content, /.*path-override.example.com.*/);
  t.doesNotMatch(result[2].snippets[0].content, /.*petstore.swagger.io.*/);
  t.equal(result[3].url, 'http://petstore.swagger.io/api/pets/{id}');
  t.match(result[3].snippets[0].content, /.*petstore.swagger.io.*/);
  t.doesNotMatch(result[3].snippets[0].content, /.*example.com.*/);
});

test('Testing optionally provided parameter values', function (t) {
  t.plan(2);
  // checks the 'Pages' schema...
  const result = OpenAPISnippets.getEndpointSnippets(
    InstagramOpenAPI,
    '/locations/search',
    'get',
    ['node_request'],
    {
      distance: 5000,
      'not-a-query-param': 'foo',
    }
  );
  t.true(/5000/.test(result.snippets[0].content));
  t.false(/not-a-query-param/.test(result.snippets[0].content));
});

test('Testing the case when default is present but a value is provided, use the provided value', function (t) {
  t.plan(2);
  // checks the 'Pages' schema...
  const result = OpenAPISnippets.getEndpointSnippets(
    GitHubOpenAPI,
    '/issues',
    'get',
    ['node_request'],
    {
      filter: 'assigned',
    }
  );
  t.true(/assigned/.test(result.snippets[0].content));
  t.false(/all/.test(result.snippets[0].content)); // The default value of `filter` is `all`
});

test('Testing the case when default is present but no value is provided, use the default', function (t) {
  t.plan(2);
  // checks the 'Pages' schema...
  const result = OpenAPISnippets.getEndpointSnippets(
    GitHubOpenAPI,
    '/issues',
    'get',
    ['node_request']
  );
  t.false(/assigned/.test(result.snippets[0].content));
  t.true(/all/.test(result.snippets[0].content)); // The default value of `filter` is `all`
});

test('Referenced query parameters should be resolved', function (t) {
  const result = OpenAPISnippets.getEndpointSnippets(
    WatsonOpenAPI,
    '/html/HTMLExtractDates',
    'get',
    ['node_request']
  );
  const snippet = result.snippets[0].content;
  t.true(/apikey/.test(snippet));
  t.true(/showSourceText/.test(snippet));
  t.end();
});

test('Resolve samples from nested examples', function (t) {
  const result = OpenAPISnippets.getEndpointSnippets(
    PetStoreOpenAPI,
    '/user',
    'post',
    ['node_request']
  );
  const snippet = result.snippets[0].content;
  t.true(/username.*John78\'/.test(snippet));
  t.true(/email.*john.smith@example.com\'/.test(snippet));
  t.true(/phone.*\+1\-202\-555\-0192/.test(snippet));
  t.true(/password.*drowssaP123/.test(snippet));
  t.end();
});

test('Parameters that are Schema References Are Dereferenced', function (t) {
  const result = OpenAPISnippets.getEndpointSnippets(
    ParameterSchemaReferenceAPI,
    '/pets',
    'post',
    ['node_request']
  );
  const snippet = result.snippets[0].content;
  t.true(/pet: 'SOME_OBJECT_VALUE'/.test(snippet));
  t.end();
});

test('Testing the case when an example is provided, use the provided example value', function (t) {
  t.plan(2);
  const result = OpenAPISnippets.getEndpointSnippets(
    ParameterExampleReferenceAPI,
    '/pets',
    'get',
    ['node_request']
  );
  const snippet = result.snippets[0].content;
  t.true(/ {tags: 'dog,cat', limit: '10'}/.test(snippet));
  t.false(/SOME_INTEGER_VALUE/.test(snippet));
  t.end();
});
