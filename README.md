# OpenAPI Snippet
**Generates code snippets from Open API (previously Swagger) documents.**

This package takes as input an OpenAPI v2.0 or v3.0.x document. It translates the document into an [HTTP Archive 1.2 request object](http://www.softwareishard.com/blog/har-12-spec/#request). It uses the [HTTP Snippet](https://github.com/Mashape/httpsnippet) library to generate code snippets for every API endpoint (URL path + HTTP method) defined in the specification in various languages & tools (`cURL`, `Node`, `Python`, `Ruby`, `Java`, `Go`, `C#`...), or for selected endpoints.

## Installation

```bash
npm i openapi-snippet
```

## Build OpenAPI Snippet (for use in browser)
Clone this repository. Install required dependencies:

```bash
npm i
```

Build a minified version of OpenAPI Snippet (`openapisnippet.min.js`):

```bash
npm run build
```

## Usage

### As a module

```javascript
const OpenAPISnippet = require('openapi-snippet')

// define input:
const openApi = ... // Open API document
const targets = ['node_unirest', 'c'] // array of targets for code snippets. See list below...

try {
  // either, get snippets for ALL endpoints:
  const results = OpenAPISnippet.getSnippets(openApi, targets) // results is now array of snippets, see "Output" below.

  // ...or, get snippets for a single endpoint:
  const results2 = OpenAPISnippet.getEndpointSnippets(openApi, '/users/{user-id}/relationship', 'get', targets)
} catch (err) {
  // do something with potential errors...
}
```

### Within the browser

Include the `openapisnippet.min.js` file created after building the the library (see above) in your HTML page:

```html
<script type="text/javascript" src="path/to/openapisnippet.min.js"></script>
```

Use OpenAPI Snippet, which now defines the global variable `OpenAPISnippet`.


## Output
The output for every endpoint is an object, containing the `method`, `url`, a human-readable `description`, and the corresponding `resource` - all of these values stem from the OpenAPI document. In addition, within the `snippets` list, an object containing a code snippet for every chosen target is provided. As of version `0.4.0`, the snippets include exemplary payload data.

If `getSnippets` is used, an array of the above described objects is returned.

For example:

```js
[
  // ...
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
  // ...
]
```

## Targets
Currently, OpenAPI Snippet supports the following targets (depending on the HTTP Snippet library):

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
