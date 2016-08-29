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
var targets = ['node_unirest', 'c'] // array of 

SwaggerSnippet(swagger, targets, ignoreValidation, function(err, data) {
  if (err) return
  console.log(data) // prints array of snippets
})
```

License: MIT