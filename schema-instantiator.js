/**
 * This code is taken from:
 * https://github.com/tomarad/JSON-Schema-Instantiator/blob/master/src/instantiator.js
 *
 * The code is provided under the following license:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Tom Arad
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */
'use strict'

// The JSON Object that defines the default values of certain types.
var typesInstantiator = {
  'string': '<ADD STRING VALUE>',
  'number': 0,
  'integer': 0,
  'null': null,
  'boolean': false, // Always stay positive?
  'object': { }
}

/**
 * Checks whether a variable is a primitive.
 * @param obj - an object.
 * @returns {boolean}
 */
function isPrimitive (obj) {
  var type = obj.type

  return typesInstantiator[type] !== undefined
}

/**
 * Checks whether a property is on required array.
 * @param property - the property to check.
 * @param requiredArray - the required array
 * @returns {boolean}
 */
function isPropertyRequired (property, requiredArray) {
  var found = false
  requiredArray = requiredArray || []
  requiredArray.forEach(function (requiredProperty) {
    if (requiredProperty === property) {
      found = true
    }
  })
  return found
}

function shouldVisit (property, obj, options) {
  return (!options.requiredPropertiesOnly) ||
    (options.requiredPropertiesOnly &&
      isPropertyRequired(property, obj.required))
}

/**
 * Instantiate a primitive.
 * @param val - The object that represents the primitive.
 * @returns {*}
 */
function instantiatePrimitive (val) {
  var type = val.type

  // Support for default values in the JSON Schema.
  if (val.default) {
    return val.default
  }

  return typesInstantiator[type]
}

/**
 * Checks whether a variable is an enum.
 * @param obj - an object.
 * @returns {boolean}
 */
function isEnum (obj) {
  return Object.prototype.toString.call(obj.enum) === '[object Array]'
}

/**
 * Instantiate an enum.
 * @param val - The object that represents the primitive.
 * @returns {*}
 */
function instantiateEnum (val) {
  // Support for default values in the JSON Schema.
  if (val.default) {
    return val.default
  }
  if (!val.enum.length) {
    return undefined
  }
  return val.enum[0]
}

/**
 * The main function.
 * Calls sub-objects recursively, depth first, using the sub-function 'visit'.
 * @param schema - The schema to instantiate.
 * @returns {*}
 */
function instantiate (schema, options) {
  options = options || {}

  /**
   * Visits each sub-object using recursion.
   * If it reaches a primitive, instantiate it.
   * @param obj - The object that represents the schema.
   * @param name - The name of the current object.
   * @param data - The instance data that represents the current object.
   */
  function visit (obj, name, data) {
    if (!obj) {
      return
    }
    var i
    var type = obj.type
    // We want non-primitives objects (primitive === object w/o properties).
    if (type === 'object' && obj.properties) {
      data[name] = data[name] || { }

      // Visit each property.
      for (var property in obj.properties) {
        if (obj.properties.hasOwnProperty(property)) {
          if (shouldVisit(property, obj, options)) {
            visit(obj.properties[property], property, data[name])
          }
        }
      }
    } else if (obj.allOf) {
      for (i = 0; i < obj.allOf.length; i++) {
        visit(obj.allOf[i], name, data)
      }
    } else if (type === 'array') {
      data[name] = []
      var len = 1
      if (obj.minItems || obj.minItems === 0) {
        len = obj.minItems
      }

      // Instantiate 'len' items.
      for (i = 0; i < len; i++) {
        visit(obj.items, i, data[name])
      }
    } else if (isEnum(obj)) {
      data[name] = instantiateEnum(obj)
    } else if (isPrimitive(obj)) {
      data[name] = instantiatePrimitive(obj)
    }
  }

  var data = {}
  visit(schema, 'kek', data)
  return data['kek']
}

// If we're using Node.js, export the module.
if (typeof module !== 'undefined') {
  module.exports = {
    instantiate: instantiate
  }
}
