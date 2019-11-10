# Swagger Snippet
**Generates code snippets for given Swagger / Open API specification files.**

This package takes as input a Swagger 2.0 / OpenAPI v3.0.x specification. It translates the specification into an [HTTP Archive 1.2 request object](http://www.softwareishard.com/blog/har-12-spec/#request). It uses the [HTTP Snippet](https://github.com/Mashape/httpsnippet) library to generate code snippets for every API endpoint (URL path + HTTP method) defined in the specification in various languages & tools (`cURL`, `Node`, `Python`, `Ruby`, `Java`, `Go`, `C#`...).

## Installation

```bash
npm i swagger-snippet
```

## Build Swagger Snippet (for use in browser)
Clone the Swagger Snippet repository. Install required dependencies:

```bash
npm i
```

Build a minified version of Swagger Snippet (`swaggersnippet.min.js`):

```bash
npm run build
```

## Usage

### As a module

```javascript
const SwaggerSnippet = require('swagger-snippet')

// define input:
const swagger = ... // a Swagger / Open API specification
const targets = ['node_unirest', 'c'] // array of targets for code snippets. See list below...

try {
  // either, get snippets for ALL endpoints:
  const results = SwaggerSnippet.getSwaggerSnippets(swagger, targets) // results is now array of snippets, see "Output" below.

  // ...or, get snippets for a single endpoint:
  const results2 = SwaggerSnippet.getEndpointSnippets(swagger, '/users/{user-id}/relationship', 'get', targets)
} catch (err) {
  // do something with potential errors...
}
```

### Within the browser

Include the `swaggersnippet.min.js` file created after building the the library (see above) in your HTML page:

```html
<script type="text/javascript" src="path/to/swaggersnippet.min.js"></script>
```

Use Swagger Snippet, which now defines the global variable `SwaggerSnippet`.

### In CLI to produce OpenAPI 3.0 JSON enriched with code samples
You can follow this repo [cdwv/oas3-api-snippet-enricher](https://github.com/cdwv/oas3-api-snippet-enricher/) where the authors make use of swagger-snippet to produce OpenAPI 3.0 JSON spec with ``x-code-sample`` entries for all methods. It's super simple.

## Output
The output for every endpoint is an object, containing the `method`, `url`, a human-readable `description`, and the corresponding `resource` - all of these values stem from the specification. In addition, within the `snippets` list, an object containing a code snippet for every chosen target is provided. As of version `0.4.0`, the snippets include exemplary payload data.

If `getSwaggerSnippets` is used, an array of the above described objects is returned.

For example:

```json
[
  ...
  {
    "method": "GET",
    "url": "https://api.instagram.com/v1/users/{user-id}/relationship",
    "description": "Get information about a relationship to another user.",
    "resource": "relationship",
    "snippets": [
      {
        "id": "node",
        "title": "Node + Native",
        "content": "var http = require(\"https\");\n\nvar options = {..."
      }
    ]
  }
  ...
]
```

## Targets
Currently, swagger-snippet supports the following targets (depending on the HTTP Snippet library):

* `c_libcurl` (default)
* `csharp_restsharp` (default)
* `go_native` (default)
* `java_okhttp`
* `java_unirest` (default)
* `javascript_jquery`
* `javascript_xhr` (default)
* `node_native` (default)
* `node_request`
* `node_unirest`
* `objc_nsurlsession` (default)
* `ocaml_cohttp` (default)
* `php_curl` (default)
* `php_http1`
* `php_http2`
* `python_python3` (default)
* `python_requests`
* `ruby_native` (default)
* `shell_curl` (default)
* `shell_httpie`
* `shell_wget`
* `swift_nsurlsession` (default)

If only the language is provided (e.g., `c`), the default library will be selected.


License: MIT
