# swagger-snippet
Generates code snippets for given Swagger / Open API specification files.

This package takes as input a Swagger 2.0 / Open API specification. Optionally, validates that specification. Translates the specification into an [HTTP Archive 1.2 request object](http://www.softwareishard.com/blog/har-12-spec/#request). Uses the [HTTP Snippet](https://github.com/Mashape/httpsnippet) library to generate code snippets for every API endpoint defined in the specification in various languages & tools (`cURL`, `Node`, `Python`, `Ruby`, `Java`, `Go`, `C#`...).

## Installation

    npm i --save swagger-snippet


## Usage

```javascript
let SwaggerSnippet = require('swagger-snippet')

// define input:
var swagger = ... // a Swagger / Open API specification
var targets = ['node_unirest', 'c'] // array of targets for code snippets. See list below...
var validateSpec = true // whether to validate the specification


SwaggerSnippet(swagger, targets, validateSpec, function(err, data) {
  if (err) return
  console.log(data) // prints array of snippets
})
```

## Targets
Currently, swagger-snippet supports the following targets (depending on the HTTP Snippet library):

* c_libcurl (default)
* csharp_restsharp (default)
* go_native (default)
* java_okhttp
* java_unirest (default)
* javascript_jquery
* javascript_xhr (default)
* node_native (default)
* node_request
* node_unirest
* objc_nsurlsession (default)
* ocaml_cohttp (default)
* php_curl (default)
* php_http1
* php_http2
* python_python3 (default)
* python_requests
* ruby_native (default)
* shell_curl (default)
* shell_httpie
* shell_wget
* swift_nsurlsession (default)

If only the language is provided (e.g., `c`), the default library will be selected.


License: MIT