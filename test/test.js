'use strict';

const test = require('tape');
const OpenAPISnippets = require('../index');

const { createHarParameterObjects } = require('../openapi-to-har');

const InstagramOpenAPI = require('./instagram_swagger.json');
const BloggerOpenAPI = require('./blogger_swagger.json');
const GitHubOpenAPI = require('./github_swagger.json');
const WatsonOpenAPI = require('./watson_alchemy_language_swagger.json');
const IBMOpenAPI = require('./ibm_watson_alchemy_data_news_api.json');
const PetStoreOpenAPI = require('./petstore_swagger.json');
const PetStoreOpenAPI3 = require('./petstore_oas.json');
const ParameterSchemaReferenceAPI = require('./parameter_schema_reference');
const ParameterExampleReferenceAPI = require('./parameter_example_swagger.json');
const FormDataExampleReferenceAPI = require('./form_data_example.json');
const FormUrlencodedExampleAPI = require('./form_urlencoded_example.json');
const MultipleRequestContentReferenceAPI = require('./multiple_request_content.json');

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

test('Generate snippet with multipart/form-data', function (t) {
  const result = OpenAPISnippets.getEndpointSnippets(
    FormDataExampleReferenceAPI,
    '/pets',
    'patch',
    ['node_request']
  );
  const snippet = result.snippets[0].content;
  t.true(/boundary=---011000010111000001101001/.test(snippet));
  t.true(
    /formData: {'pet\[name\]': 'string', 'pet\[tag\]': 'string'}/.test(snippet)
  );
  t.end();
});

test('Generate snippet with multipart/form-data with array', function (t) {
  const result = OpenAPISnippets.getEndpointSnippets(
    FormDataExampleReferenceAPI,
    '/pets/{id}/updatetags',
    'patch',
    ['node_request']
  );
  const snippet = result.snippets[0].content;
  t.true(/boundary=---011000010111000001101001/.test(snippet));
  t.true(/formData: {'pet\[tags\]': '\["string"\]'}/.test(snippet));
  t.end();
});

test('Generate snippet with multipart/form-data with object', function (t) {
  const result = OpenAPISnippets.getEndpointSnippets(
    FormDataExampleReferenceAPI,
    '/pets/{id}/feedingschedule',
    'patch',
    ['node_request']
  );
  const snippet = result.snippets[0].content;
  t.true(/boundary=---011000010111000001101001/.test(snippet));
  t.true(
    /formData: {'pet\[feedingSchedule\]': '{"time":"string","food":"string"}'}/.test(
      snippet
    )
  );
  t.end();
});

test('Generate snippets with multiple content types', function (t) {
  const result = OpenAPISnippets.getEndpointSnippets(
    MultipleRequestContentReferenceAPI,
    '/pets',
    'patch',
    ['node_request']
  );
  t.equal(result.snippets.length, 2);
  for (const snippet of result.snippets) {
    if (snippet.mimeType === 'application/json') {
      t.true(
        /headers: {'content-type': 'application\/json'}/.test(snippet.content)
      );
      t.true(/body: {name: 'string', tag: 'string'}/.test(snippet.content));
    } else if (snippet.mimeType === 'multipart/form-data') {
      t.true(
        /headers: {'content-type': 'multipart\/form-data; boundary=---011000010111000001101001'}/.test(
          snippet.content
        )
      );
      t.true(
        /formData: {'pet\[name\]': 'string', 'pet\[tag\]': 'string', 'pet\[picture\]': 'string'}/.test(
          snippet.content
        )
      );
    }
  }
  t.end();
});

test('Query Params Defined for all methods should be resolved', function (t) {
  const result = OpenAPISnippets.getEndpointSnippets(
    ParameterExampleReferenceAPI,
    '/animals',
    'get',
    ['node_request']
  );
  const snippet = result.snippets[0].content;
  t.true(/ {tags: 'dog,cat', limit: '10'}/.test(snippet));
  t.false(/SOME_INTEGER_VALUE/.test(snippet));
  t.end();
});

test('Query Params Defined for all methods are overriden by method definitions', function (t) {
  const result = OpenAPISnippets.getEndpointSnippets(
    ParameterExampleReferenceAPI,
    '/species',
    'get',
    ['node_request']
  );
  const snippet = result.snippets[0].content;
  t.true(/ qs: {id: '1,2'}/.test(snippet));
  t.end();
});

test('Snippet for Get with no parameters should work', function (t) {
  const result = OpenAPISnippets.getEndpointSnippets(
    InstagramOpenAPI,
    '/media/popular',
    'get',
    ['node_request']
  );
  const snippet = result.snippets[0].content;
  t.false(/qs/.test(snippet));
  t.end();
});

test('Testing the application/x-www-form-urlencoded example case', function (t) {
  t.plan(2);
  const result = OpenAPISnippets.getEndpointSnippets(
    FormUrlencodedExampleAPI,
    '/auth/token',
    'post',
    ['shell_curl']
  );
  const snippet = result.snippets[0].content;
  t.match(snippet, /.*--data 'id=id\+example\+value'.*/);
  t.match(snippet, /.*--data 'secret=secret\+example\+value'.*/);
  t.end();
});

// Tests of createHarParameterObject

// First a set of path parameter tests from here: https://swagger.io/docs/specification/serialization/#path

test('Path: test that style and explode default correctly (to "simple" and "false") when neither is specified for path', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
  };

  const expected = [{ name: 'id', value: '1,2,3' }];
  const actual = createHarParameterObjects(parameter, [1, 2, 3]);
  t.deepEqual(actual, expected);
  t.end();
});

// Simple style tests:

test('Path: /users/{id*} with id=5', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'simple',
    explode: true,
  };

  const expected = [{ name: 'id', value: '5' }];
  const actual = createHarParameterObjects(parameter, 5);
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{id*} with id=[3,4,5]', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'simple',
    explode: true,
  };

  const expected = [{ name: 'id', value: '3,4,5' }];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{id*} with id= {"role": "admin", "firstName": "Alex", "age": 34}', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'simple',
    explode: true,
  };

  const expected = [{ name: 'id', value: 'role=admin,firstName=Alex,age=34' }];
  const actual = createHarParameterObjects(parameter, {
    role: 'admin',
    firstName: 'Alex',
    age: 34,
  });
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{id} with id=5', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'simple',
    explode: false,
  };

  const expected = [{ name: 'id', value: '5' }];
  const actual = createHarParameterObjects(parameter, 5);
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{id} with id=[3,4,5]', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'simple',
    explode: false,
  };

  const expected = [{ name: 'id', value: '3,4,5' }];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{id} with id= {"role": "admin", "firstName": "Alex", "age": 34}', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'simple',
    explode: false,
  };

  const expected = [{ name: 'id', value: 'role,admin,firstName,Alex,age,34' }];
  const actual = createHarParameterObjects(parameter, {
    role: 'admin',
    firstName: 'Alex',
    age: 34,
  });
  t.deepEqual(actual, expected);
  t.end();
});

// Label style tests

test('Path: /users/{.id*} with id=5', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'label',
    explode: true,
  };

  const expected = [{ name: 'id', value: '.5' }];
  const actual = createHarParameterObjects(parameter, 5);
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{.id*} with id=[3,4,5]', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'label',
    explode: true,
  };

  const expected = [{ name: 'id', value: '.3.4.5' }];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{.id*} with id= {"role": "admin", "firstName": "Alex", "age": 34}', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'label',
    explode: true,
  };

  const expected = [{ name: 'id', value: '.role=admin.firstName=Alex.age=34' }];
  const actual = createHarParameterObjects(parameter, {
    role: 'admin',
    firstName: 'Alex',
    age: 34,
  });
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{.id} with id=5', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'label',
    explode: false,
  };

  const expected = [{ name: 'id', value: '.5' }];
  const actual = createHarParameterObjects(parameter, 5);
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{.id} with id=[3,4,5]', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'label',
    explode: false,
  };

  const expected = [{ name: 'id', value: '.3,4,5' }];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{.id} with id= {"role": "admin", "firstName": "Alex", "age": 34}', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'label',
    explode: false,
  };

  const expected = [{ name: 'id', value: '.role,admin,firstName,Alex,age,34' }];
  const actual = createHarParameterObjects(parameter, {
    role: 'admin',
    firstName: 'Alex',
    age: 34,
  });
  t.deepEqual(actual, expected);
  t.end();
});

// Matrix style tests

test('Path: /users/{;id*} with id=5', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'matrix',
    explode: true,
  };

  const expected = [{ name: 'id', value: ';id=5' }];
  const actual = createHarParameterObjects(parameter, 5);
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{;id*} with id=[3,4,5]', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'matrix',
    explode: true,
  };

  const expected = [{ name: 'id', value: ';id=3;id=4;id=5' }];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{;id*} with id= {"role": "admin", "firstName": "Alex", "age": 34}', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'matrix',
    explode: true,
  };

  const expected = [{ name: 'id', value: ';role=admin;firstName=Alex;age=34' }];
  const actual = createHarParameterObjects(parameter, {
    role: 'admin',
    firstName: 'Alex',
    age: 34,
  });
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{;id} with id=5', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'matrix',
    explode: false,
  };

  const expected = [{ name: 'id', value: ';id=5' }];
  const actual = createHarParameterObjects(parameter, 5);
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{;id} with id=[3,4,5]', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'matrix',
    explode: false,
  };

  const expected = [{ name: 'id', value: ';id=3,4,5' }];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

test('Path: /users/{;id} with id= {"role": "admin", "firstName": "Alex", "age": 34}', function (t) {
  const parameter = {
    name: 'id',
    in: 'path',
    style: 'matrix',
    explode: false,
  };

  const expected = [
    { name: 'id', value: ';id=role,admin,firstName,Alex,age,34' },
  ];
  const actual = createHarParameterObjects(parameter, {
    role: 'admin',
    firstName: 'Alex',
    age: 34,
  });
  t.deepEqual(actual, expected);
  t.end();
});

//// Query Parameters: Test cases from https://swagger.io/docs/specification/serialization/#query

// Form Tests

test('Query: /users{?id*} with id= 5', function (t) {
  const parameter = {
    name: 'id',
    in: 'query',
    style: 'form',
    explode: true,
  };

  const expected = [{ name: 'id', value: '5' }];
  const actual = createHarParameterObjects(parameter, 5);
  t.deepEqual(actual, expected);
  t.end();
});

test('Query: /users{?id*} with id=[3,4,5]', function (t) {
  const parameter = {
    name: 'id',
    in: 'query',
    style: 'form',
    explode: true,
  };

  const expected = [
    { name: 'id', value: '3' },
    { name: 'id', value: '4' },
    { name: 'id', value: '5' },
  ];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

test('Query: /users{?id*} with id={"role": "admin", "firstName": "Alex", "age": 34}', function (t) {
  const parameter = {
    name: 'id',
    in: 'query',
    style: 'form',
    explode: true,
  };

  const expected = [
    { name: 'role', value: 'admin' },
    { name: 'firstName', value: 'Alex' },
    { name: 'age', value: '34' },
  ];
  const actual = createHarParameterObjects(parameter, {
    role: 'admin',
    firstName: 'Alex',
    age: 34,
  });
  t.deepEqual(actual, expected);
  t.end();
});

test('Query: /users{?id} with id= 5', function (t) {
  const parameter = {
    name: 'id',
    in: 'query',
    style: 'form',
    explode: false,
  };

  const expected = [{ name: 'id', value: '5' }];
  const actual = createHarParameterObjects(parameter, 5);
  t.deepEqual(actual, expected);
  t.end();
});

test('Query: /users{?id} with id=[3,4,5]', function (t) {
  const parameter = {
    name: 'id',
    in: 'query',
    style: 'form',
    explode: false,
  };

  const expected = [{ name: 'id', value: '3,4,5' }];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

test('Query: /users{?id} with id={"role": "admin", "firstName": "Alex", "age": 34}', function (t) {
  const parameter = {
    name: 'id',
    in: 'query',
    style: 'form',
    explode: false,
  };

  const expected = [{ name: 'id', value: 'role,admin,firstName,Alex,age,34' }];
  const actual = createHarParameterObjects(parameter, {
    role: 'admin',
    firstName: 'Alex',
    age: 34,
  });
  t.deepEqual(actual, expected);
  t.end();
});

test('Query: test that style and explode default correctly (to "form" and "true") when neither is specified for query', function (t) {
  const parameter = {
    name: 'id',
    in: 'query',
  };

  const expected = [
    { name: 'firstName', value: 'Alex' },
    { name: 'age', value: '34' },
  ];
  const actual = createHarParameterObjects(parameter, {
    firstName: 'Alex',
    age: 34,
  });
  t.deepEqual(actual, expected);
  t.end();
});

// Space Delimited Tests
// Note: There are less scenarios for this and no special URI Template

test('Query: /users{?id*} with id=[3,4,5], spaceDelimited', function (t) {
  const parameter = {
    name: 'id',
    in: 'query',
    style: 'spaceDelimited',
    explode: true,
  };

  const expected = [
    { name: 'id', value: '3' },
    { name: 'id', value: '4' },
    { name: 'id', value: '5' },
  ];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

test('Query: /users{?id} with id=[3,4,5], spaceDelimited', function (t) {
  const parameter = {
    name: 'id',
    in: 'query',
    style: 'spaceDelimited',
    explode: false,
  };

  const expected = [{ name: 'id', value: '3%204%205' }];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

// Pipe Delimited Tests
// Note: There are less scenarios for this and no special URI Template

test('Query: /users{?id*} with id=[3,4,5], pipeDelimited', function (t) {
  const parameter = {
    name: 'id',
    in: 'query',
    style: 'pipeDelimited',
    explode: true,
  };

  const expected = [
    { name: 'id', value: '3' },
    { name: 'id', value: '4' },
    { name: 'id', value: '5' },
  ];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

test('Query: /users{?id} with id=[3,4,5], pipeDelimited', function (t) {
  const parameter = {
    name: 'id',
    in: 'query',
    style: 'pipeDelimited',
    explode: false,
  };

  const expected = [{ name: 'id', value: '3|4|5' }];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

// DeepObject
// Spec doesn't say what to do if explode false. We just assume deepOject ignores explode
// as no alternative serialization is defined when explode is false.

test('Query: deepObject with id={"role": "admin", "firstName": "Alex", "age": 34}', function (t) {
  const parameter = {
    name: 'id',
    in: 'query',
    style: 'deepObject',
  };

  const expected = [
    {
      name: 'id[role]',
      value: 'admin',
    },
    {
      name: 'id[firstName]',
      value: 'Alex',
    },
    {
      name: 'id[age]',
      value: '34',
    },
  ];
  const actual = createHarParameterObjects(parameter, {
    role: 'admin',
    firstName: 'Alex',
    age: 34,
  });
  t.deepEqual(actual, expected);
  t.end();
});

//// Header Parameters https://swagger.io/docs/specification/serialization/#header

test('Header: {id} with X-MyHeader = 5', function (t) {
  const parameter = {
    name: 'X-MyHeader',
    in: 'header',
    style: 'simple',
    explode: false,
  };

  const expected = [{ name: 'X-MyHeader', value: '5' }];
  const actual = createHarParameterObjects(parameter, 5);
  t.deepEqual(actual, expected);
  t.end();
});

test('Header: {id} with X-MyHeader = [3,4,5]', function (t) {
  const parameter = {
    name: 'X-MyHeader',
    in: 'header',
    style: 'simple',
    explode: false,
  };

  const expected = [{ name: 'X-MyHeader', value: '3,4,5' }];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

test('Header: {id} with X-MyHeader = {"role": "admin", "firstName": "Alex", "age": 34}', function (t) {
  const parameter = {
    name: 'X-MyHeader',
    in: 'header',
    style: 'simple',
    explode: false,
  };

  const expected = [
    { name: 'X-MyHeader', value: 'role,admin,firstName,Alex,age,34' },
  ];
  const actual = createHarParameterObjects(parameter, {
    role: 'admin',
    firstName: 'Alex',
    age: 34,
  });
  t.deepEqual(actual, expected);
  t.end();
});

test('Header: {id*} with X-MyHeader = 5', function (t) {
  const parameter = {
    name: 'X-MyHeader',
    in: 'header',
    style: 'simple',
    explode: true,
  };

  const expected = [{ name: 'X-MyHeader', value: '5' }];
  const actual = createHarParameterObjects(parameter, 5);
  t.deepEqual(actual, expected);
  t.end();
});

test('Header: {id*} with X-MyHeader = [3,4,5]', function (t) {
  const parameter = {
    name: 'X-MyHeader',
    in: 'header',
    style: 'simple',
    explode: true,
  };

  const expected = [{ name: 'X-MyHeader', value: '3,4,5' }];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);
  t.deepEqual(actual, expected);
  t.end();
});

test('Header: {id*} with X-MyHeader = {"role": "admin", "firstName": "Alex", "age": 34}', function (t) {
  const parameter = {
    name: 'X-MyHeader',
    in: 'header',
    style: 'simple',
    explode: true,
  };

  const expected = [
    { name: 'X-MyHeader', value: 'role=admin,firstName=Alex,age=34' },
  ];
  const actual = createHarParameterObjects(parameter, {
    role: 'admin',
    firstName: 'Alex',
    age: 34,
  });
  t.deepEqual(actual, expected);
  t.end();
});

test('Header: Test that style and explode default to simple/false when not provided', function (t) {
  const parameter = {
    name: 'X-MyHeader',
    in: 'header',
  };

  const expected = [
    { name: 'X-MyHeader', value: 'role,admin,firstName,Alex,age,34' },
  ];
  const actual = createHarParameterObjects(parameter, {
    role: 'admin',
    firstName: 'Alex',
    age: 34,
  });
  t.deepEqual(actual, expected);
  t.end();
});

//// Cookie Parameters https://swagger.io/docs/specification/serialization/#cookie

test("Cookie: Test that it doesn't throw an error if style and explode are missing", function (t) {
  const parameter = {
    name: 'id',
    in: 'cookie',
  };

  let expected = [{ name: 'id', value: '5' }];
  let actual = createHarParameterObjects(parameter, 5);

  t.deepEqual(actual, expected);

  // At the time of writing the spec doesn't actually show any test cases for exploded arrays or objects
  // so I assume they are not "legal"

  t.end();
});

test('Cookie: id = 5', function (t) {
  const parameter = {
    name: 'id',
    in: 'cookie',
    style: 'form',
    explode: true,
  };

  const expected = [{ name: 'id', value: '5' }];
  const actual = createHarParameterObjects(parameter, 5);

  t.deepEqual(actual, expected);
  t.end();
});

test('Cookie: id={id} with id = 5', function (t) {
  const parameter = {
    name: 'id',
    in: 'cookie',
    style: 'form',
    explode: false,
  };

  const expected = [{ name: 'id', value: '5' }];
  const actual = createHarParameterObjects(parameter, 5);

  t.deepEqual(actual, expected);
  t.end();
});

test('Cookie: id={id} with id = [3,4,5]', function (t) {
  const parameter = {
    name: 'id',
    in: 'cookie',
    style: 'form',
    explode: false,
  };

  const expected = [{ name: 'id', value: '3,4,5' }];
  const actual = createHarParameterObjects(parameter, [3, 4, 5]);

  t.deepEqual(actual, expected);
  t.end();
});

test('Cookie: id={id} with id = {role: "admin", firstName: "Alex", age: 34}', function (t) {
  const parameter = {
    name: 'id',
    in: 'cookie',
    style: 'form',
    explode: false,
  };

  const expected = [{ name: 'id', value: 'role,admin,firstName,Alex,age,34' }];
  const actual = createHarParameterObjects(parameter, {
    role: 'admin',
    firstName: 'Alex',
    age: 34,
  });

  t.deepEqual(actual, expected);
  t.end();
});
