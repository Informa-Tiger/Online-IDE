/*! Pixi3D v1.3.1 */
var Pixi3d =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/gl-matrix/esm/common.js":
/*!**********************************************!*\
  !*** ./node_modules/gl-matrix/esm/common.js ***!
  \**********************************************/
/*! exports provided: EPSILON, ARRAY_TYPE, RANDOM, setMatrixArrayType, toRadian, equals */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "EPSILON", function() { return EPSILON; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ARRAY_TYPE", function() { return ARRAY_TYPE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "RANDOM", function() { return RANDOM; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "setMatrixArrayType", function() { return setMatrixArrayType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "toRadian", function() { return toRadian; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "equals", function() { return equals; });
/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON = 0.000001;
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
var RANDOM = Math.random;
/**
 * Sets the type of array used when creating new vectors and matrices
 *
 * @param {Float32ArrayConstructor | ArrayConstructor} type Array type, such as Float32Array or Array
 */

function setMatrixArrayType(type) {
  ARRAY_TYPE = type;
}
var degree = Math.PI / 180;
/**
 * Convert Degree To Radian
 *
 * @param {Number} a Angle in Degrees
 */

function toRadian(a) {
  return a * degree;
}
/**
 * Tests whether or not the arguments have approximately the same value, within an absolute
 * or relative tolerance of glMatrix.EPSILON (an absolute tolerance is used for values less
 * than or equal to 1.0, and a relative tolerance is used for larger values)
 *
 * @param {Number} a The first number to test.
 * @param {Number} b The second number to test.
 * @returns {Boolean} True if the numbers are approximately equal, false otherwise.
 */

function equals(a, b) {
  return Math.abs(a - b) <= EPSILON * Math.max(1.0, Math.abs(a), Math.abs(b));
}
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/***/ }),

/***/ "./node_modules/gl-matrix/esm/index.js":
/*!*********************************************!*\
  !*** ./node_modules/gl-matrix/esm/index.js ***!
  \*********************************************/
/*! exports provided: glMatrix, mat2, mat2d, mat3, mat4, quat, quat2, vec2, vec3, vec4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "glMatrix", function() { return _common_js__WEBPACK_IMPORTED_MODULE_0__; });
/* harmony import */ var _mat2_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./mat2.js */ "./node_modules/gl-matrix/esm/mat2.js");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "mat2", function() { return _mat2_js__WEBPACK_IMPORTED_MODULE_1__; });
/* harmony import */ var _mat2d_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./mat2d.js */ "./node_modules/gl-matrix/esm/mat2d.js");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "mat2d", function() { return _mat2d_js__WEBPACK_IMPORTED_MODULE_2__; });
/* harmony import */ var _mat3_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./mat3.js */ "./node_modules/gl-matrix/esm/mat3.js");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "mat3", function() { return _mat3_js__WEBPACK_IMPORTED_MODULE_3__; });
/* harmony import */ var _mat4_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./mat4.js */ "./node_modules/gl-matrix/esm/mat4.js");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "mat4", function() { return _mat4_js__WEBPACK_IMPORTED_MODULE_4__; });
/* harmony import */ var _quat_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./quat.js */ "./node_modules/gl-matrix/esm/quat.js");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "quat", function() { return _quat_js__WEBPACK_IMPORTED_MODULE_5__; });
/* harmony import */ var _quat2_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./quat2.js */ "./node_modules/gl-matrix/esm/quat2.js");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "quat2", function() { return _quat2_js__WEBPACK_IMPORTED_MODULE_6__; });
/* harmony import */ var _vec2_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./vec2.js */ "./node_modules/gl-matrix/esm/vec2.js");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "vec2", function() { return _vec2_js__WEBPACK_IMPORTED_MODULE_7__; });
/* harmony import */ var _vec3_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./vec3.js */ "./node_modules/gl-matrix/esm/vec3.js");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "vec3", function() { return _vec3_js__WEBPACK_IMPORTED_MODULE_8__; });
/* harmony import */ var _vec4_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./vec4.js */ "./node_modules/gl-matrix/esm/vec4.js");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "vec4", function() { return _vec4_js__WEBPACK_IMPORTED_MODULE_9__; });












/***/ }),

/***/ "./node_modules/gl-matrix/esm/mat2.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/mat2.js ***!
  \********************************************/
/*! exports provided: create, clone, copy, identity, fromValues, set, transpose, invert, adjoint, determinant, multiply, rotate, scale, fromRotation, fromScaling, str, frob, LDU, add, subtract, exactEquals, equals, multiplyScalar, multiplyScalarAndAdd, mul, sub */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "create", function() { return create; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "clone", function() { return clone; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "copy", function() { return copy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "identity", function() { return identity; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromValues", function() { return fromValues; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "set", function() { return set; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "transpose", function() { return transpose; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "invert", function() { return invert; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "adjoint", function() { return adjoint; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "determinant", function() { return determinant; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiply", function() { return multiply; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotate", function() { return rotate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "scale", function() { return scale; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromRotation", function() { return fromRotation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromScaling", function() { return fromScaling; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "str", function() { return str; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "frob", function() { return frob; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "LDU", function() { return LDU; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "add", function() { return add; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "subtract", function() { return subtract; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "exactEquals", function() { return exactEquals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "equals", function() { return equals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiplyScalar", function() { return multiplyScalar; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiplyScalarAndAdd", function() { return multiplyScalarAndAdd; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "mul", function() { return mul; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sub", function() { return sub; });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 2x2 Matrix
 * @module mat2
 */

/**
 * Creates a new identity mat2
 *
 * @returns {mat2} a new 2x2 matrix
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](4);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"] != Float32Array) {
    out[1] = 0;
    out[2] = 0;
  }

  out[0] = 1;
  out[3] = 1;
  return out;
}
/**
 * Creates a new mat2 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat2} a matrix to clone
 * @returns {mat2} a new 2x2 matrix
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](4);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Copy the values from one mat2 to another
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the source matrix
 * @returns {mat2} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Set a mat2 to the identity matrix
 *
 * @param {mat2} out the receiving matrix
 * @returns {mat2} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  return out;
}
/**
 * Create a new mat2 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m10 Component in column 1, row 0 position (index 2)
 * @param {Number} m11 Component in column 1, row 1 position (index 3)
 * @returns {mat2} out A new 2x2 matrix
 */

function fromValues(m00, m01, m10, m11) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](4);
  out[0] = m00;
  out[1] = m01;
  out[2] = m10;
  out[3] = m11;
  return out;
}
/**
 * Set the components of a mat2 to the given values
 *
 * @param {mat2} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m10 Component in column 1, row 0 position (index 2)
 * @param {Number} m11 Component in column 1, row 1 position (index 3)
 * @returns {mat2} out
 */

function set(out, m00, m01, m10, m11) {
  out[0] = m00;
  out[1] = m01;
  out[2] = m10;
  out[3] = m11;
  return out;
}
/**
 * Transpose the values of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the source matrix
 * @returns {mat2} out
 */

function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache
  // some values
  if (out === a) {
    var a1 = a[1];
    out[1] = a[2];
    out[2] = a1;
  } else {
    out[0] = a[0];
    out[1] = a[2];
    out[2] = a[1];
    out[3] = a[3];
  }

  return out;
}
/**
 * Inverts a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the source matrix
 * @returns {mat2} out
 */

function invert(out, a) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3]; // Calculate the determinant

  var det = a0 * a3 - a2 * a1;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = a3 * det;
  out[1] = -a1 * det;
  out[2] = -a2 * det;
  out[3] = a0 * det;
  return out;
}
/**
 * Calculates the adjugate of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the source matrix
 * @returns {mat2} out
 */

function adjoint(out, a) {
  // Caching this value is nessecary if out == a
  var a0 = a[0];
  out[0] = a[3];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = a0;
  return out;
}
/**
 * Calculates the determinant of a mat2
 *
 * @param {ReadonlyMat2} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant(a) {
  return a[0] * a[3] - a[2] * a[1];
}
/**
 * Multiplies two mat2's
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the first operand
 * @param {ReadonlyMat2} b the second operand
 * @returns {mat2} out
 */

function multiply(out, a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = a0 * b0 + a2 * b1;
  out[1] = a1 * b0 + a3 * b1;
  out[2] = a0 * b2 + a2 * b3;
  out[3] = a1 * b2 + a3 * b3;
  return out;
}
/**
 * Rotates a mat2 by the given angle
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2} out
 */

function rotate(out, a, rad) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  out[0] = a0 * c + a2 * s;
  out[1] = a1 * c + a3 * s;
  out[2] = a0 * -s + a2 * c;
  out[3] = a1 * -s + a3 * c;
  return out;
}
/**
 * Scales the mat2 by the dimensions in the given vec2
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the matrix to rotate
 * @param {ReadonlyVec2} v the vec2 to scale the matrix by
 * @returns {mat2} out
 **/

function scale(out, a, v) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var v0 = v[0],
      v1 = v[1];
  out[0] = a0 * v0;
  out[1] = a1 * v0;
  out[2] = a2 * v1;
  out[3] = a3 * v1;
  return out;
}
/**
 * Creates a matrix from a given angle
 * This is equivalent to (but much faster than):
 *
 *     mat2.identity(dest);
 *     mat2.rotate(dest, dest, rad);
 *
 * @param {mat2} out mat2 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2} out
 */

function fromRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  out[0] = c;
  out[1] = s;
  out[2] = -s;
  out[3] = c;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat2.identity(dest);
 *     mat2.scale(dest, dest, vec);
 *
 * @param {mat2} out mat2 receiving operation result
 * @param {ReadonlyVec2} v Scaling vector
 * @returns {mat2} out
 */

function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = v[1];
  return out;
}
/**
 * Returns a string representation of a mat2
 *
 * @param {ReadonlyMat2} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */

function str(a) {
  return "mat2(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
}
/**
 * Returns Frobenius norm of a mat2
 *
 * @param {ReadonlyMat2} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */

function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3]);
}
/**
 * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
 * @param {ReadonlyMat2} L the lower triangular matrix
 * @param {ReadonlyMat2} D the diagonal matrix
 * @param {ReadonlyMat2} U the upper triangular matrix
 * @param {ReadonlyMat2} a the input matrix to factorize
 */

function LDU(L, D, U, a) {
  L[2] = a[2] / a[0];
  U[0] = a[0];
  U[1] = a[1];
  U[3] = a[3] - L[2] * U[1];
  return [L, D, U];
}
/**
 * Adds two mat2's
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the first operand
 * @param {ReadonlyMat2} b the second operand
 * @returns {mat2} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the first operand
 * @param {ReadonlyMat2} b the second operand
 * @returns {mat2} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyMat2} a The first matrix.
 * @param {ReadonlyMat2} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {ReadonlyMat2} a The first matrix.
 * @param {ReadonlyMat2} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a3), Math.abs(b3));
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat2} out the receiving matrix
 * @param {ReadonlyMat2} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat2} out
 */

function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  return out;
}
/**
 * Adds two mat2's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat2} out the receiving vector
 * @param {ReadonlyMat2} a the first operand
 * @param {ReadonlyMat2} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat2} out
 */

function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  return out;
}
/**
 * Alias for {@link mat2.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link mat2.subtract}
 * @function
 */

var sub = subtract;

/***/ }),

/***/ "./node_modules/gl-matrix/esm/mat2d.js":
/*!*********************************************!*\
  !*** ./node_modules/gl-matrix/esm/mat2d.js ***!
  \*********************************************/
/*! exports provided: create, clone, copy, identity, fromValues, set, invert, determinant, multiply, rotate, scale, translate, fromRotation, fromScaling, fromTranslation, str, frob, add, subtract, multiplyScalar, multiplyScalarAndAdd, exactEquals, equals, mul, sub */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "create", function() { return create; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "clone", function() { return clone; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "copy", function() { return copy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "identity", function() { return identity; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromValues", function() { return fromValues; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "set", function() { return set; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "invert", function() { return invert; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "determinant", function() { return determinant; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiply", function() { return multiply; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotate", function() { return rotate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "scale", function() { return scale; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "translate", function() { return translate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromRotation", function() { return fromRotation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromScaling", function() { return fromScaling; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromTranslation", function() { return fromTranslation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "str", function() { return str; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "frob", function() { return frob; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "add", function() { return add; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "subtract", function() { return subtract; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiplyScalar", function() { return multiplyScalar; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiplyScalarAndAdd", function() { return multiplyScalarAndAdd; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "exactEquals", function() { return exactEquals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "equals", function() { return equals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "mul", function() { return mul; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sub", function() { return sub; });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 2x3 Matrix
 * @module mat2d
 * @description
 * A mat2d contains six elements defined as:
 * <pre>
 * [a, b,
 *  c, d,
 *  tx, ty]
 * </pre>
 * This is a short form for the 3x3 matrix:
 * <pre>
 * [a, b, 0,
 *  c, d, 0,
 *  tx, ty, 1]
 * </pre>
 * The last column is ignored so the array is shorter and operations are faster.
 */

/**
 * Creates a new identity mat2d
 *
 * @returns {mat2d} a new 2x3 matrix
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](6);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"] != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[4] = 0;
    out[5] = 0;
  }

  out[0] = 1;
  out[3] = 1;
  return out;
}
/**
 * Creates a new mat2d initialized with values from an existing matrix
 *
 * @param {ReadonlyMat2d} a matrix to clone
 * @returns {mat2d} a new 2x3 matrix
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](6);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  return out;
}
/**
 * Copy the values from one mat2d to another
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the source matrix
 * @returns {mat2d} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  return out;
}
/**
 * Set a mat2d to the identity matrix
 *
 * @param {mat2d} out the receiving matrix
 * @returns {mat2d} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  out[4] = 0;
  out[5] = 0;
  return out;
}
/**
 * Create a new mat2d with the given values
 *
 * @param {Number} a Component A (index 0)
 * @param {Number} b Component B (index 1)
 * @param {Number} c Component C (index 2)
 * @param {Number} d Component D (index 3)
 * @param {Number} tx Component TX (index 4)
 * @param {Number} ty Component TY (index 5)
 * @returns {mat2d} A new mat2d
 */

function fromValues(a, b, c, d, tx, ty) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](6);
  out[0] = a;
  out[1] = b;
  out[2] = c;
  out[3] = d;
  out[4] = tx;
  out[5] = ty;
  return out;
}
/**
 * Set the components of a mat2d to the given values
 *
 * @param {mat2d} out the receiving matrix
 * @param {Number} a Component A (index 0)
 * @param {Number} b Component B (index 1)
 * @param {Number} c Component C (index 2)
 * @param {Number} d Component D (index 3)
 * @param {Number} tx Component TX (index 4)
 * @param {Number} ty Component TY (index 5)
 * @returns {mat2d} out
 */

function set(out, a, b, c, d, tx, ty) {
  out[0] = a;
  out[1] = b;
  out[2] = c;
  out[3] = d;
  out[4] = tx;
  out[5] = ty;
  return out;
}
/**
 * Inverts a mat2d
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the source matrix
 * @returns {mat2d} out
 */

function invert(out, a) {
  var aa = a[0],
      ab = a[1],
      ac = a[2],
      ad = a[3];
  var atx = a[4],
      aty = a[5];
  var det = aa * ad - ab * ac;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = ad * det;
  out[1] = -ab * det;
  out[2] = -ac * det;
  out[3] = aa * det;
  out[4] = (ac * aty - ad * atx) * det;
  out[5] = (ab * atx - aa * aty) * det;
  return out;
}
/**
 * Calculates the determinant of a mat2d
 *
 * @param {ReadonlyMat2d} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant(a) {
  return a[0] * a[3] - a[1] * a[2];
}
/**
 * Multiplies two mat2d's
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the first operand
 * @param {ReadonlyMat2d} b the second operand
 * @returns {mat2d} out
 */

function multiply(out, a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3],
      b4 = b[4],
      b5 = b[5];
  out[0] = a0 * b0 + a2 * b1;
  out[1] = a1 * b0 + a3 * b1;
  out[2] = a0 * b2 + a2 * b3;
  out[3] = a1 * b2 + a3 * b3;
  out[4] = a0 * b4 + a2 * b5 + a4;
  out[5] = a1 * b4 + a3 * b5 + a5;
  return out;
}
/**
 * Rotates a mat2d by the given angle
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2d} out
 */

function rotate(out, a, rad) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  out[0] = a0 * c + a2 * s;
  out[1] = a1 * c + a3 * s;
  out[2] = a0 * -s + a2 * c;
  out[3] = a1 * -s + a3 * c;
  out[4] = a4;
  out[5] = a5;
  return out;
}
/**
 * Scales the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the matrix to translate
 * @param {ReadonlyVec2} v the vec2 to scale the matrix by
 * @returns {mat2d} out
 **/

function scale(out, a, v) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var v0 = v[0],
      v1 = v[1];
  out[0] = a0 * v0;
  out[1] = a1 * v0;
  out[2] = a2 * v1;
  out[3] = a3 * v1;
  out[4] = a4;
  out[5] = a5;
  return out;
}
/**
 * Translates the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the matrix to translate
 * @param {ReadonlyVec2} v the vec2 to translate the matrix by
 * @returns {mat2d} out
 **/

function translate(out, a, v) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var v0 = v[0],
      v1 = v[1];
  out[0] = a0;
  out[1] = a1;
  out[2] = a2;
  out[3] = a3;
  out[4] = a0 * v0 + a2 * v1 + a4;
  out[5] = a1 * v0 + a3 * v1 + a5;
  return out;
}
/**
 * Creates a matrix from a given angle
 * This is equivalent to (but much faster than):
 *
 *     mat2d.identity(dest);
 *     mat2d.rotate(dest, dest, rad);
 *
 * @param {mat2d} out mat2d receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2d} out
 */

function fromRotation(out, rad) {
  var s = Math.sin(rad),
      c = Math.cos(rad);
  out[0] = c;
  out[1] = s;
  out[2] = -s;
  out[3] = c;
  out[4] = 0;
  out[5] = 0;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat2d.identity(dest);
 *     mat2d.scale(dest, dest, vec);
 *
 * @param {mat2d} out mat2d receiving operation result
 * @param {ReadonlyVec2} v Scaling vector
 * @returns {mat2d} out
 */

function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = v[1];
  out[4] = 0;
  out[5] = 0;
  return out;
}
/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat2d.identity(dest);
 *     mat2d.translate(dest, dest, vec);
 *
 * @param {mat2d} out mat2d receiving operation result
 * @param {ReadonlyVec2} v Translation vector
 * @returns {mat2d} out
 */

function fromTranslation(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  out[4] = v[0];
  out[5] = v[1];
  return out;
}
/**
 * Returns a string representation of a mat2d
 *
 * @param {ReadonlyMat2d} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */

function str(a) {
  return "mat2d(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ")";
}
/**
 * Returns Frobenius norm of a mat2d
 *
 * @param {ReadonlyMat2d} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */

function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], 1);
}
/**
 * Adds two mat2d's
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the first operand
 * @param {ReadonlyMat2d} b the second operand
 * @returns {mat2d} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the first operand
 * @param {ReadonlyMat2d} b the second operand
 * @returns {mat2d} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  out[4] = a[4] - b[4];
  out[5] = a[5] - b[5];
  return out;
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat2d} out the receiving matrix
 * @param {ReadonlyMat2d} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat2d} out
 */

function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  return out;
}
/**
 * Adds two mat2d's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat2d} out the receiving vector
 * @param {ReadonlyMat2d} a the first operand
 * @param {ReadonlyMat2d} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat2d} out
 */

function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  out[4] = a[4] + b[4] * scale;
  out[5] = a[5] + b[5] * scale;
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyMat2d} a The first matrix.
 * @param {ReadonlyMat2d} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {ReadonlyMat2d} a The first matrix.
 * @param {ReadonlyMat2d} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3],
      b4 = b[4],
      b5 = b[5];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a5), Math.abs(b5));
}
/**
 * Alias for {@link mat2d.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link mat2d.subtract}
 * @function
 */

var sub = subtract;

/***/ }),

/***/ "./node_modules/gl-matrix/esm/mat3.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/mat3.js ***!
  \********************************************/
/*! exports provided: create, fromMat4, clone, copy, fromValues, set, identity, transpose, invert, adjoint, determinant, multiply, translate, rotate, scale, fromTranslation, fromRotation, fromScaling, fromMat2d, fromQuat, normalFromMat4, projection, str, frob, add, subtract, multiplyScalar, multiplyScalarAndAdd, exactEquals, equals, mul, sub */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "create", function() { return create; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromMat4", function() { return fromMat4; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "clone", function() { return clone; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "copy", function() { return copy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromValues", function() { return fromValues; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "set", function() { return set; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "identity", function() { return identity; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "transpose", function() { return transpose; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "invert", function() { return invert; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "adjoint", function() { return adjoint; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "determinant", function() { return determinant; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiply", function() { return multiply; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "translate", function() { return translate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotate", function() { return rotate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "scale", function() { return scale; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromTranslation", function() { return fromTranslation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromRotation", function() { return fromRotation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromScaling", function() { return fromScaling; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromMat2d", function() { return fromMat2d; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromQuat", function() { return fromQuat; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "normalFromMat4", function() { return normalFromMat4; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "projection", function() { return projection; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "str", function() { return str; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "frob", function() { return frob; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "add", function() { return add; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "subtract", function() { return subtract; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiplyScalar", function() { return multiplyScalar; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiplyScalarAndAdd", function() { return multiplyScalarAndAdd; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "exactEquals", function() { return exactEquals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "equals", function() { return equals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "mul", function() { return mul; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sub", function() { return sub; });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 3x3 Matrix
 * @module mat3
 */

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](9);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"] != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }

  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}
/**
 * Copies the upper-left 3x3 values into the given mat3.
 *
 * @param {mat3} out the receiving 3x3 matrix
 * @param {ReadonlyMat4} a   the source 4x4 matrix
 * @returns {mat3} out
 */

function fromMat4(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[4];
  out[4] = a[5];
  out[5] = a[6];
  out[6] = a[8];
  out[7] = a[9];
  out[8] = a[10];
  return out;
}
/**
 * Creates a new mat3 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat3} a matrix to clone
 * @returns {mat3} a new 3x3 matrix
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](9);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  return out;
}
/**
 * Copy the values from one mat3 to another
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the source matrix
 * @returns {mat3} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  return out;
}
/**
 * Create a new mat3 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m10 Component in column 1, row 0 position (index 3)
 * @param {Number} m11 Component in column 1, row 1 position (index 4)
 * @param {Number} m12 Component in column 1, row 2 position (index 5)
 * @param {Number} m20 Component in column 2, row 0 position (index 6)
 * @param {Number} m21 Component in column 2, row 1 position (index 7)
 * @param {Number} m22 Component in column 2, row 2 position (index 8)
 * @returns {mat3} A new mat3
 */

function fromValues(m00, m01, m02, m10, m11, m12, m20, m21, m22) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](9);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m10;
  out[4] = m11;
  out[5] = m12;
  out[6] = m20;
  out[7] = m21;
  out[8] = m22;
  return out;
}
/**
 * Set the components of a mat3 to the given values
 *
 * @param {mat3} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m10 Component in column 1, row 0 position (index 3)
 * @param {Number} m11 Component in column 1, row 1 position (index 4)
 * @param {Number} m12 Component in column 1, row 2 position (index 5)
 * @param {Number} m20 Component in column 2, row 0 position (index 6)
 * @param {Number} m21 Component in column 2, row 1 position (index 7)
 * @param {Number} m22 Component in column 2, row 2 position (index 8)
 * @returns {mat3} out
 */

function set(out, m00, m01, m02, m10, m11, m12, m20, m21, m22) {
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m10;
  out[4] = m11;
  out[5] = m12;
  out[6] = m20;
  out[7] = m21;
  out[8] = m22;
  return out;
}
/**
 * Set a mat3 to the identity matrix
 *
 * @param {mat3} out the receiving matrix
 * @returns {mat3} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 1;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[8] = 1;
  return out;
}
/**
 * Transpose the values of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the source matrix
 * @returns {mat3} out
 */

function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if (out === a) {
    var a01 = a[1],
        a02 = a[2],
        a12 = a[5];
    out[1] = a[3];
    out[2] = a[6];
    out[3] = a01;
    out[5] = a[7];
    out[6] = a02;
    out[7] = a12;
  } else {
    out[0] = a[0];
    out[1] = a[3];
    out[2] = a[6];
    out[3] = a[1];
    out[4] = a[4];
    out[5] = a[7];
    out[6] = a[2];
    out[7] = a[5];
    out[8] = a[8];
  }

  return out;
}
/**
 * Inverts a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the source matrix
 * @returns {mat3} out
 */

function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  var b01 = a22 * a11 - a12 * a21;
  var b11 = -a22 * a10 + a12 * a20;
  var b21 = a21 * a10 - a11 * a20; // Calculate the determinant

  var det = a00 * b01 + a01 * b11 + a02 * b21;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = b01 * det;
  out[1] = (-a22 * a01 + a02 * a21) * det;
  out[2] = (a12 * a01 - a02 * a11) * det;
  out[3] = b11 * det;
  out[4] = (a22 * a00 - a02 * a20) * det;
  out[5] = (-a12 * a00 + a02 * a10) * det;
  out[6] = b21 * det;
  out[7] = (-a21 * a00 + a01 * a20) * det;
  out[8] = (a11 * a00 - a01 * a10) * det;
  return out;
}
/**
 * Calculates the adjugate of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the source matrix
 * @returns {mat3} out
 */

function adjoint(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  out[0] = a11 * a22 - a12 * a21;
  out[1] = a02 * a21 - a01 * a22;
  out[2] = a01 * a12 - a02 * a11;
  out[3] = a12 * a20 - a10 * a22;
  out[4] = a00 * a22 - a02 * a20;
  out[5] = a02 * a10 - a00 * a12;
  out[6] = a10 * a21 - a11 * a20;
  out[7] = a01 * a20 - a00 * a21;
  out[8] = a00 * a11 - a01 * a10;
  return out;
}
/**
 * Calculates the determinant of a mat3
 *
 * @param {ReadonlyMat3} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant(a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
}
/**
 * Multiplies two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the first operand
 * @param {ReadonlyMat3} b the second operand
 * @returns {mat3} out
 */

function multiply(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  var b00 = b[0],
      b01 = b[1],
      b02 = b[2];
  var b10 = b[3],
      b11 = b[4],
      b12 = b[5];
  var b20 = b[6],
      b21 = b[7],
      b22 = b[8];
  out[0] = b00 * a00 + b01 * a10 + b02 * a20;
  out[1] = b00 * a01 + b01 * a11 + b02 * a21;
  out[2] = b00 * a02 + b01 * a12 + b02 * a22;
  out[3] = b10 * a00 + b11 * a10 + b12 * a20;
  out[4] = b10 * a01 + b11 * a11 + b12 * a21;
  out[5] = b10 * a02 + b11 * a12 + b12 * a22;
  out[6] = b20 * a00 + b21 * a10 + b22 * a20;
  out[7] = b20 * a01 + b21 * a11 + b22 * a21;
  out[8] = b20 * a02 + b21 * a12 + b22 * a22;
  return out;
}
/**
 * Translate a mat3 by the given vector
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the matrix to translate
 * @param {ReadonlyVec2} v vector to translate by
 * @returns {mat3} out
 */

function translate(out, a, v) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a10 = a[3],
      a11 = a[4],
      a12 = a[5],
      a20 = a[6],
      a21 = a[7],
      a22 = a[8],
      x = v[0],
      y = v[1];
  out[0] = a00;
  out[1] = a01;
  out[2] = a02;
  out[3] = a10;
  out[4] = a11;
  out[5] = a12;
  out[6] = x * a00 + y * a10 + a20;
  out[7] = x * a01 + y * a11 + a21;
  out[8] = x * a02 + y * a12 + a22;
  return out;
}
/**
 * Rotates a mat3 by the given angle
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */

function rotate(out, a, rad) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a10 = a[3],
      a11 = a[4],
      a12 = a[5],
      a20 = a[6],
      a21 = a[7],
      a22 = a[8],
      s = Math.sin(rad),
      c = Math.cos(rad);
  out[0] = c * a00 + s * a10;
  out[1] = c * a01 + s * a11;
  out[2] = c * a02 + s * a12;
  out[3] = c * a10 - s * a00;
  out[4] = c * a11 - s * a01;
  out[5] = c * a12 - s * a02;
  out[6] = a20;
  out[7] = a21;
  out[8] = a22;
  return out;
}
/**
 * Scales the mat3 by the dimensions in the given vec2
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the matrix to rotate
 * @param {ReadonlyVec2} v the vec2 to scale the matrix by
 * @returns {mat3} out
 **/

function scale(out, a, v) {
  var x = v[0],
      y = v[1];
  out[0] = x * a[0];
  out[1] = x * a[1];
  out[2] = x * a[2];
  out[3] = y * a[3];
  out[4] = y * a[4];
  out[5] = y * a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  return out;
}
/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.translate(dest, dest, vec);
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {ReadonlyVec2} v Translation vector
 * @returns {mat3} out
 */

function fromTranslation(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 1;
  out[5] = 0;
  out[6] = v[0];
  out[7] = v[1];
  out[8] = 1;
  return out;
}
/**
 * Creates a matrix from a given angle
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.rotate(dest, dest, rad);
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */

function fromRotation(out, rad) {
  var s = Math.sin(rad),
      c = Math.cos(rad);
  out[0] = c;
  out[1] = s;
  out[2] = 0;
  out[3] = -s;
  out[4] = c;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[8] = 1;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.scale(dest, dest, vec);
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {ReadonlyVec2} v Scaling vector
 * @returns {mat3} out
 */

function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = v[1];
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[8] = 1;
  return out;
}
/**
 * Copies the values from a mat2d into a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat2d} a the matrix to copy
 * @returns {mat3} out
 **/

function fromMat2d(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = 0;
  out[3] = a[2];
  out[4] = a[3];
  out[5] = 0;
  out[6] = a[4];
  out[7] = a[5];
  out[8] = 1;
  return out;
}
/**
 * Calculates a 3x3 matrix from the given quaternion
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {ReadonlyQuat} q Quaternion to create matrix from
 *
 * @returns {mat3} out
 */

function fromQuat(out, q) {
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var yx = y * x2;
  var yy = y * y2;
  var zx = z * x2;
  var zy = z * y2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - yy - zz;
  out[3] = yx - wz;
  out[6] = zx + wy;
  out[1] = yx + wz;
  out[4] = 1 - xx - zz;
  out[7] = zy - wx;
  out[2] = zx - wy;
  out[5] = zy + wx;
  out[8] = 1 - xx - yy;
  return out;
}
/**
 * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {ReadonlyMat4} a Mat4 to derive the normal matrix from
 *
 * @returns {mat3} out
 */

function normalFromMat4(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  return out;
}
/**
 * Generates a 2D projection matrix with the given bounds
 *
 * @param {mat3} out mat3 frustum matrix will be written into
 * @param {number} width Width of your gl context
 * @param {number} height Height of gl context
 * @returns {mat3} out
 */

function projection(out, width, height) {
  out[0] = 2 / width;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = -2 / height;
  out[5] = 0;
  out[6] = -1;
  out[7] = 1;
  out[8] = 1;
  return out;
}
/**
 * Returns a string representation of a mat3
 *
 * @param {ReadonlyMat3} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */

function str(a) {
  return "mat3(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ")";
}
/**
 * Returns Frobenius norm of a mat3
 *
 * @param {ReadonlyMat3} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */

function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]);
}
/**
 * Adds two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the first operand
 * @param {ReadonlyMat3} b the second operand
 * @returns {mat3} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  out[6] = a[6] + b[6];
  out[7] = a[7] + b[7];
  out[8] = a[8] + b[8];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the first operand
 * @param {ReadonlyMat3} b the second operand
 * @returns {mat3} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  out[4] = a[4] - b[4];
  out[5] = a[5] - b[5];
  out[6] = a[6] - b[6];
  out[7] = a[7] - b[7];
  out[8] = a[8] - b[8];
  return out;
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat3} out
 */

function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  out[6] = a[6] * b;
  out[7] = a[7] * b;
  out[8] = a[8] * b;
  return out;
}
/**
 * Adds two mat3's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat3} out the receiving vector
 * @param {ReadonlyMat3} a the first operand
 * @param {ReadonlyMat3} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat3} out
 */

function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  out[4] = a[4] + b[4] * scale;
  out[5] = a[5] + b[5] * scale;
  out[6] = a[6] + b[6] * scale;
  out[7] = a[7] + b[7] * scale;
  out[8] = a[8] + b[8] * scale;
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyMat3} a The first matrix.
 * @param {ReadonlyMat3} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {ReadonlyMat3} a The first matrix.
 * @param {ReadonlyMat3} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5],
      a6 = a[6],
      a7 = a[7],
      a8 = a[8];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3],
      b4 = b[4],
      b5 = b[5],
      b6 = b[6],
      b7 = b[7],
      b8 = b[8];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a8), Math.abs(b8));
}
/**
 * Alias for {@link mat3.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link mat3.subtract}
 * @function
 */

var sub = subtract;

/***/ }),

/***/ "./node_modules/gl-matrix/esm/mat4.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/mat4.js ***!
  \********************************************/
/*! exports provided: create, clone, copy, fromValues, set, identity, transpose, invert, adjoint, determinant, multiply, translate, scale, rotate, rotateX, rotateY, rotateZ, fromTranslation, fromScaling, fromRotation, fromXRotation, fromYRotation, fromZRotation, fromRotationTranslation, fromQuat2, getTranslation, getScaling, getRotation, fromRotationTranslationScale, fromRotationTranslationScaleOrigin, fromQuat, frustum, perspective, perspectiveFromFieldOfView, ortho, lookAt, targetTo, str, frob, add, subtract, multiplyScalar, multiplyScalarAndAdd, exactEquals, equals, mul, sub */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "create", function() { return create; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "clone", function() { return clone; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "copy", function() { return copy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromValues", function() { return fromValues; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "set", function() { return set; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "identity", function() { return identity; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "transpose", function() { return transpose; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "invert", function() { return invert; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "adjoint", function() { return adjoint; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "determinant", function() { return determinant; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiply", function() { return multiply; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "translate", function() { return translate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "scale", function() { return scale; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotate", function() { return rotate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateX", function() { return rotateX; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateY", function() { return rotateY; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateZ", function() { return rotateZ; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromTranslation", function() { return fromTranslation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromScaling", function() { return fromScaling; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromRotation", function() { return fromRotation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromXRotation", function() { return fromXRotation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromYRotation", function() { return fromYRotation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromZRotation", function() { return fromZRotation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromRotationTranslation", function() { return fromRotationTranslation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromQuat2", function() { return fromQuat2; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getTranslation", function() { return getTranslation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getScaling", function() { return getScaling; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getRotation", function() { return getRotation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromRotationTranslationScale", function() { return fromRotationTranslationScale; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromRotationTranslationScaleOrigin", function() { return fromRotationTranslationScaleOrigin; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromQuat", function() { return fromQuat; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "frustum", function() { return frustum; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "perspective", function() { return perspective; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "perspectiveFromFieldOfView", function() { return perspectiveFromFieldOfView; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ortho", function() { return ortho; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "lookAt", function() { return lookAt; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "targetTo", function() { return targetTo; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "str", function() { return str; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "frob", function() { return frob; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "add", function() { return add; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "subtract", function() { return subtract; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiplyScalar", function() { return multiplyScalar; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiplyScalarAndAdd", function() { return multiplyScalarAndAdd; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "exactEquals", function() { return exactEquals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "equals", function() { return equals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "mul", function() { return mul; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sub", function() { return sub; });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](16);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"] != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Create a new mat4 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m03 Component in column 0, row 3 position (index 3)
 * @param {Number} m10 Component in column 1, row 0 position (index 4)
 * @param {Number} m11 Component in column 1, row 1 position (index 5)
 * @param {Number} m12 Component in column 1, row 2 position (index 6)
 * @param {Number} m13 Component in column 1, row 3 position (index 7)
 * @param {Number} m20 Component in column 2, row 0 position (index 8)
 * @param {Number} m21 Component in column 2, row 1 position (index 9)
 * @param {Number} m22 Component in column 2, row 2 position (index 10)
 * @param {Number} m23 Component in column 2, row 3 position (index 11)
 * @param {Number} m30 Component in column 3, row 0 position (index 12)
 * @param {Number} m31 Component in column 3, row 1 position (index 13)
 * @param {Number} m32 Component in column 3, row 2 position (index 14)
 * @param {Number} m33 Component in column 3, row 3 position (index 15)
 * @returns {mat4} A new mat4
 */

function fromValues(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](16);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
/**
 * Set the components of a mat4 to the given values
 *
 * @param {mat4} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m03 Component in column 0, row 3 position (index 3)
 * @param {Number} m10 Component in column 1, row 0 position (index 4)
 * @param {Number} m11 Component in column 1, row 1 position (index 5)
 * @param {Number} m12 Component in column 1, row 2 position (index 6)
 * @param {Number} m13 Component in column 1, row 3 position (index 7)
 * @param {Number} m20 Component in column 2, row 0 position (index 8)
 * @param {Number} m21 Component in column 2, row 1 position (index 9)
 * @param {Number} m22 Component in column 2, row 2 position (index 10)
 * @param {Number} m23 Component in column 2, row 3 position (index 11)
 * @param {Number} m30 Component in column 3, row 0 position (index 12)
 * @param {Number} m31 Component in column 3, row 1 position (index 13)
 * @param {Number} m32 Component in column 3, row 2 position (index 14)
 * @param {Number} m33 Component in column 3, row 3 position (index 15)
 * @returns {mat4} out
 */

function set(out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if (out === a) {
    var a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    var a12 = a[6],
        a13 = a[7];
    var a23 = a[11];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a01;
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a02;
    out[9] = a12;
    out[11] = a[14];
    out[12] = a03;
    out[13] = a13;
    out[14] = a23;
  } else {
    out[0] = a[0];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a[1];
    out[5] = a[5];
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a[2];
    out[9] = a[6];
    out[10] = a[10];
    out[11] = a[14];
    out[12] = a[3];
    out[13] = a[7];
    out[14] = a[11];
    out[15] = a[15];
  }

  return out;
}
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function adjoint(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  out[0] = a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22);
  out[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
  out[2] = a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12);
  out[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
  out[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
  out[5] = a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22);
  out[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
  out[7] = a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12);
  out[8] = a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21);
  out[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
  out[10] = a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11);
  out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
  out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
  out[13] = a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21);
  out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
  out[15] = a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11);
  return out;
}
/**
 * Calculates the determinant of a mat4
 *
 * @param {ReadonlyMat4} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant(a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {ReadonlyVec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/

function scale(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function rotate(out, a, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;

  if (len < _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"]) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11]; // Construct the elements of the rotation matrix

  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, dest, vec);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {ReadonlyVec3} v Translation vector
 * @returns {mat4} out
 */

function fromTranslation(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.scale(dest, dest, vec);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {ReadonlyVec3} v Scaling vector
 * @returns {mat4} out
 */

function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = v[1];
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = v[2];
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a given angle around a given axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotate(dest, dest, rad, axis);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function fromRotation(out, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;

  if (len < _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"]) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c; // Perform rotation-specific matrix multiplication

  out[0] = x * x * t + c;
  out[1] = y * x * t + z * s;
  out[2] = z * x * t - y * s;
  out[3] = 0;
  out[4] = x * y * t - z * s;
  out[5] = y * y * t + c;
  out[6] = z * y * t + x * s;
  out[7] = 0;
  out[8] = x * z * t + y * s;
  out[9] = y * z * t - x * s;
  out[10] = z * z * t + c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the X axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateX(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromXRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = c;
  out[6] = s;
  out[7] = 0;
  out[8] = 0;
  out[9] = -s;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the Y axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateY(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromYRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = c;
  out[1] = 0;
  out[2] = -s;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = s;
  out[9] = 0;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the Z axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateZ(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromZRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = c;
  out[1] = s;
  out[2] = 0;
  out[3] = 0;
  out[4] = -s;
  out[5] = c;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @returns {mat4} out
 */

function fromRotationTranslation(out, q, v) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - (yy + zz);
  out[1] = xy + wz;
  out[2] = xz - wy;
  out[3] = 0;
  out[4] = xy - wz;
  out[5] = 1 - (xx + zz);
  out[6] = yz + wx;
  out[7] = 0;
  out[8] = xz + wy;
  out[9] = yz - wx;
  out[10] = 1 - (xx + yy);
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 from a dual quat.
 *
 * @param {mat4} out Matrix
 * @param {ReadonlyQuat2} a Dual Quaternion
 * @returns {mat4} mat4 receiving operation result
 */

function fromQuat2(out, a) {
  var translation = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](3);
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7];
  var magnitude = bx * bx + by * by + bz * bz + bw * bw; //Only scale if it makes sense

  if (magnitude > 0) {
    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2 / magnitude;
    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2 / magnitude;
    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2 / magnitude;
  } else {
    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
  }

  fromRotationTranslation(out, a, translation);
  return out;
}
/**
 * Returns the translation vector component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslation,
 *  the returned vector will be the same as the translation vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive translation component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getTranslation(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}
/**
 * Returns the scaling factor component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslationScale
 *  with a normalized Quaternion paramter, the returned vector will be
 *  the same as the scaling vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive scaling factor component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getScaling(out, mat) {
  var m11 = mat[0];
  var m12 = mat[1];
  var m13 = mat[2];
  var m21 = mat[4];
  var m22 = mat[5];
  var m23 = mat[6];
  var m31 = mat[8];
  var m32 = mat[9];
  var m33 = mat[10];
  out[0] = Math.hypot(m11, m12, m13);
  out[1] = Math.hypot(m21, m22, m23);
  out[2] = Math.hypot(m31, m32, m33);
  return out;
}
/**
 * Returns a quaternion representing the rotational component
 *  of a transformation matrix. If a matrix is built with
 *  fromRotationTranslation, the returned quaternion will be the
 *  same as the quaternion originally supplied.
 * @param {quat} out Quaternion to receive the rotation component
 * @param {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {quat} out
 */

function getRotation(out, mat) {
  var scaling = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](3);
  getScaling(scaling, mat);
  var is1 = 1 / scaling[0];
  var is2 = 1 / scaling[1];
  var is3 = 1 / scaling[2];
  var sm11 = mat[0] * is1;
  var sm12 = mat[1] * is2;
  var sm13 = mat[2] * is3;
  var sm21 = mat[4] * is1;
  var sm22 = mat[5] * is2;
  var sm23 = mat[6] * is3;
  var sm31 = mat[8] * is1;
  var sm32 = mat[9] * is2;
  var sm33 = mat[10] * is3;
  var trace = sm11 + sm22 + sm33;
  var S = 0;

  if (trace > 0) {
    S = Math.sqrt(trace + 1.0) * 2;
    out[3] = 0.25 * S;
    out[0] = (sm23 - sm32) / S;
    out[1] = (sm31 - sm13) / S;
    out[2] = (sm12 - sm21) / S;
  } else if (sm11 > sm22 && sm11 > sm33) {
    S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
    out[3] = (sm23 - sm32) / S;
    out[0] = 0.25 * S;
    out[1] = (sm12 + sm21) / S;
    out[2] = (sm31 + sm13) / S;
  } else if (sm22 > sm33) {
    S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
    out[3] = (sm31 - sm13) / S;
    out[0] = (sm12 + sm21) / S;
    out[1] = 0.25 * S;
    out[2] = (sm23 + sm32) / S;
  } else {
    S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
    out[3] = (sm12 - sm21) / S;
    out[0] = (sm31 + sm13) / S;
    out[1] = (sm23 + sm32) / S;
    out[2] = 0.25 * S;
  }

  return out;
}
/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @param {ReadonlyVec3} s Scaling vector
 * @returns {mat4} out
 */

function fromRotationTranslationScale(out, q, v, s) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  out[0] = (1 - (yy + zz)) * sx;
  out[1] = (xy + wz) * sx;
  out[2] = (xz - wy) * sx;
  out[3] = 0;
  out[4] = (xy - wz) * sy;
  out[5] = (1 - (xx + zz)) * sy;
  out[6] = (yz + wx) * sy;
  out[7] = 0;
  out[8] = (xz + wy) * sz;
  out[9] = (yz - wx) * sz;
  out[10] = (1 - (xx + yy)) * sz;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     mat4.translate(dest, origin);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *     mat4.translate(dest, negativeOrigin);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @param {ReadonlyVec3} s Scaling vector
 * @param {ReadonlyVec3} o The origin vector around which to scale and rotate
 * @returns {mat4} out
 */

function fromRotationTranslationScaleOrigin(out, q, v, s, o) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  var ox = o[0];
  var oy = o[1];
  var oz = o[2];
  var out0 = (1 - (yy + zz)) * sx;
  var out1 = (xy + wz) * sx;
  var out2 = (xz - wy) * sx;
  var out4 = (xy - wz) * sy;
  var out5 = (1 - (xx + zz)) * sy;
  var out6 = (yz + wx) * sy;
  var out8 = (xz + wy) * sz;
  var out9 = (yz - wx) * sz;
  var out10 = (1 - (xx + yy)) * sz;
  out[0] = out0;
  out[1] = out1;
  out[2] = out2;
  out[3] = 0;
  out[4] = out4;
  out[5] = out5;
  out[6] = out6;
  out[7] = 0;
  out[8] = out8;
  out[9] = out9;
  out[10] = out10;
  out[11] = 0;
  out[12] = v[0] + ox - (out0 * ox + out4 * oy + out8 * oz);
  out[13] = v[1] + oy - (out1 * ox + out5 * oy + out9 * oz);
  out[14] = v[2] + oz - (out2 * ox + out6 * oy + out10 * oz);
  out[15] = 1;
  return out;
}
/**
 * Calculates a 4x4 matrix from the given quaternion
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {ReadonlyQuat} q Quaternion to create matrix from
 *
 * @returns {mat4} out
 */

function fromQuat(out, q) {
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var yx = y * x2;
  var yy = y * y2;
  var zx = z * x2;
  var zy = z * y2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - yy - zz;
  out[1] = yx + wz;
  out[2] = zx - wy;
  out[3] = 0;
  out[4] = yx - wz;
  out[5] = 1 - xx - zz;
  out[6] = zy + wx;
  out[7] = 0;
  out[8] = zx + wy;
  out[9] = zy - wx;
  out[10] = 1 - xx - yy;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */

function frustum(out, left, right, bottom, top, near, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var nf = 1 / (near - far);
  out[0] = near * 2 * rl;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = near * 2 * tb;
  out[6] = 0;
  out[7] = 0;
  out[8] = (right + left) * rl;
  out[9] = (top + bottom) * tb;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = far * near * 2 * nf;
  out[15] = 0;
  return out;
}
/**
 * Generates a perspective projection matrix with the given bounds.
 * Passing null/undefined/no value for far will generate infinite projection matrix.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum, can be null or Infinity
 * @returns {mat4} out
 */

function perspective(out, fovy, aspect, near, far) {
  var f = 1.0 / Math.tan(fovy / 2),
      nf;
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;

  if (far != null && far !== Infinity) {
    nf = 1 / (near - far);
    out[10] = (far + near) * nf;
    out[14] = 2 * far * near * nf;
  } else {
    out[10] = -1;
    out[14] = -2 * near;
  }

  return out;
}
/**
 * Generates a perspective projection matrix with the given field of view.
 * This is primarily useful for generating projection matrices to be used
 * with the still experiemental WebVR API.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function perspectiveFromFieldOfView(out, fov, near, far) {
  var upTan = Math.tan(fov.upDegrees * Math.PI / 180.0);
  var downTan = Math.tan(fov.downDegrees * Math.PI / 180.0);
  var leftTan = Math.tan(fov.leftDegrees * Math.PI / 180.0);
  var rightTan = Math.tan(fov.rightDegrees * Math.PI / 180.0);
  var xScale = 2.0 / (leftTan + rightTan);
  var yScale = 2.0 / (upTan + downTan);
  out[0] = xScale;
  out[1] = 0.0;
  out[2] = 0.0;
  out[3] = 0.0;
  out[4] = 0.0;
  out[5] = yScale;
  out[6] = 0.0;
  out[7] = 0.0;
  out[8] = -((leftTan - rightTan) * xScale * 0.5);
  out[9] = (upTan - downTan) * yScale * 0.5;
  out[10] = far / (near - far);
  out[11] = -1.0;
  out[12] = 0.0;
  out[13] = 0.0;
  out[14] = far * near / (near - far);
  out[15] = 0.0;
  return out;
}
/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function ortho(out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 2 * nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
}
/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis.
 * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function lookAt(out, eye, center, up) {
  var x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
  var eyex = eye[0];
  var eyey = eye[1];
  var eyez = eye[2];
  var upx = up[0];
  var upy = up[1];
  var upz = up[2];
  var centerx = center[0];
  var centery = center[1];
  var centerz = center[2];

  if (Math.abs(eyex - centerx) < _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] && Math.abs(eyey - centery) < _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] && Math.abs(eyez - centerz) < _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"]) {
    return identity(out);
  }

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;
  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);

  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);

  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1 / len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}
/**
 * Generates a matrix that makes something look at something else.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function targetTo(out, eye, target, up) {
  var eyex = eye[0],
      eyey = eye[1],
      eyez = eye[2],
      upx = up[0],
      upy = up[1],
      upz = up[2];
  var z0 = eyex - target[0],
      z1 = eyey - target[1],
      z2 = eyez - target[2];
  var len = z0 * z0 + z1 * z1 + z2 * z2;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
    z0 *= len;
    z1 *= len;
    z2 *= len;
  }

  var x0 = upy * z2 - upz * z1,
      x1 = upz * z0 - upx * z2,
      x2 = upx * z1 - upy * z0;
  len = x0 * x0 + x1 * x1 + x2 * x2;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  out[0] = x0;
  out[1] = x1;
  out[2] = x2;
  out[3] = 0;
  out[4] = z1 * x2 - z2 * x1;
  out[5] = z2 * x0 - z0 * x2;
  out[6] = z0 * x1 - z1 * x0;
  out[7] = 0;
  out[8] = z0;
  out[9] = z1;
  out[10] = z2;
  out[11] = 0;
  out[12] = eyex;
  out[13] = eyey;
  out[14] = eyez;
  out[15] = 1;
  return out;
}
/**
 * Returns a string representation of a mat4
 *
 * @param {ReadonlyMat4} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */

function str(a) {
  return "mat4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ", " + a[9] + ", " + a[10] + ", " + a[11] + ", " + a[12] + ", " + a[13] + ", " + a[14] + ", " + a[15] + ")";
}
/**
 * Returns Frobenius norm of a mat4
 *
 * @param {ReadonlyMat4} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */

function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15]);
}
/**
 * Adds two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  out[6] = a[6] + b[6];
  out[7] = a[7] + b[7];
  out[8] = a[8] + b[8];
  out[9] = a[9] + b[9];
  out[10] = a[10] + b[10];
  out[11] = a[11] + b[11];
  out[12] = a[12] + b[12];
  out[13] = a[13] + b[13];
  out[14] = a[14] + b[14];
  out[15] = a[15] + b[15];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  out[4] = a[4] - b[4];
  out[5] = a[5] - b[5];
  out[6] = a[6] - b[6];
  out[7] = a[7] - b[7];
  out[8] = a[8] - b[8];
  out[9] = a[9] - b[9];
  out[10] = a[10] - b[10];
  out[11] = a[11] - b[11];
  out[12] = a[12] - b[12];
  out[13] = a[13] - b[13];
  out[14] = a[14] - b[14];
  out[15] = a[15] - b[15];
  return out;
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat4} out
 */

function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  out[6] = a[6] * b;
  out[7] = a[7] * b;
  out[8] = a[8] * b;
  out[9] = a[9] * b;
  out[10] = a[10] * b;
  out[11] = a[11] * b;
  out[12] = a[12] * b;
  out[13] = a[13] * b;
  out[14] = a[14] * b;
  out[15] = a[15] * b;
  return out;
}
/**
 * Adds two mat4's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat4} out the receiving vector
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat4} out
 */

function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  out[4] = a[4] + b[4] * scale;
  out[5] = a[5] + b[5] * scale;
  out[6] = a[6] + b[6] * scale;
  out[7] = a[7] + b[7] * scale;
  out[8] = a[8] + b[8] * scale;
  out[9] = a[9] + b[9] * scale;
  out[10] = a[10] + b[10] * scale;
  out[11] = a[11] + b[11] * scale;
  out[12] = a[12] + b[12] * scale;
  out[13] = a[13] + b[13] * scale;
  out[14] = a[14] + b[14] * scale;
  out[15] = a[15] + b[15] * scale;
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyMat4} a The first matrix.
 * @param {ReadonlyMat4} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] && a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {ReadonlyMat4} a The first matrix.
 * @param {ReadonlyMat4} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var a4 = a[4],
      a5 = a[5],
      a6 = a[6],
      a7 = a[7];
  var a8 = a[8],
      a9 = a[9],
      a10 = a[10],
      a11 = a[11];
  var a12 = a[12],
      a13 = a[13],
      a14 = a[14],
      a15 = a[15];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  var b4 = b[4],
      b5 = b[5],
      b6 = b[6],
      b7 = b[7];
  var b8 = b[8],
      b9 = b[9],
      b10 = b[10],
      b11 = b[11];
  var b12 = b[12],
      b13 = b[13],
      b14 = b[14],
      b15 = b[15];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a8), Math.abs(b8)) && Math.abs(a9 - b9) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a9), Math.abs(b9)) && Math.abs(a10 - b10) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a10), Math.abs(b10)) && Math.abs(a11 - b11) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a11), Math.abs(b11)) && Math.abs(a12 - b12) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a12), Math.abs(b12)) && Math.abs(a13 - b13) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a13), Math.abs(b13)) && Math.abs(a14 - b14) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a14), Math.abs(b14)) && Math.abs(a15 - b15) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a15), Math.abs(b15));
}
/**
 * Alias for {@link mat4.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link mat4.subtract}
 * @function
 */

var sub = subtract;

/***/ }),

/***/ "./node_modules/gl-matrix/esm/quat.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/quat.js ***!
  \********************************************/
/*! exports provided: create, identity, setAxisAngle, getAxisAngle, getAngle, multiply, rotateX, rotateY, rotateZ, calculateW, exp, ln, pow, slerp, random, invert, conjugate, fromMat3, fromEuler, str, clone, fromValues, copy, set, add, mul, scale, dot, lerp, length, len, squaredLength, sqrLen, normalize, exactEquals, equals, rotationTo, sqlerp, setAxes */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "create", function() { return create; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "identity", function() { return identity; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "setAxisAngle", function() { return setAxisAngle; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getAxisAngle", function() { return getAxisAngle; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getAngle", function() { return getAngle; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiply", function() { return multiply; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateX", function() { return rotateX; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateY", function() { return rotateY; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateZ", function() { return rotateZ; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "calculateW", function() { return calculateW; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "exp", function() { return exp; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ln", function() { return ln; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "pow", function() { return pow; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "slerp", function() { return slerp; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "random", function() { return random; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "invert", function() { return invert; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "conjugate", function() { return conjugate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromMat3", function() { return fromMat3; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromEuler", function() { return fromEuler; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "str", function() { return str; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "clone", function() { return clone; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromValues", function() { return fromValues; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "copy", function() { return copy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "set", function() { return set; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "add", function() { return add; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "mul", function() { return mul; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "scale", function() { return scale; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dot", function() { return dot; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "lerp", function() { return lerp; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "length", function() { return length; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "len", function() { return len; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "squaredLength", function() { return squaredLength; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sqrLen", function() { return sqrLen; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "normalize", function() { return normalize; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "exactEquals", function() { return exactEquals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "equals", function() { return equals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotationTo", function() { return rotationTo; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sqlerp", function() { return sqlerp; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "setAxes", function() { return setAxes; });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");
/* harmony import */ var _mat3_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./mat3.js */ "./node_modules/gl-matrix/esm/mat3.js");
/* harmony import */ var _vec3_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./vec3.js */ "./node_modules/gl-matrix/esm/vec3.js");
/* harmony import */ var _vec4_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./vec4.js */ "./node_modules/gl-matrix/esm/vec4.js");




/**
 * Quaternion
 * @module quat
 */

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](4);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"] != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  out[3] = 1;
  return out;
}
/**
 * Set a quat to the identity quaternion
 *
 * @param {quat} out the receiving quaternion
 * @returns {quat} out
 */

function identity(out) {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  return out;
}
/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyVec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/

function setAxisAngle(out, axis, rad) {
  rad = rad * 0.5;
  var s = Math.sin(rad);
  out[0] = s * axis[0];
  out[1] = s * axis[1];
  out[2] = s * axis[2];
  out[3] = Math.cos(rad);
  return out;
}
/**
 * Gets the rotation axis and angle for a given
 *  quaternion. If a quaternion is created with
 *  setAxisAngle, this method will return the same
 *  values as providied in the original parameter list
 *  OR functionally equivalent values.
 * Example: The quaternion formed by axis [0, 0, 1] and
 *  angle -90 is the same as the quaternion formed by
 *  [0, 0, 1] and 270. This method favors the latter.
 * @param  {vec3} out_axis  Vector receiving the axis of rotation
 * @param  {ReadonlyQuat} q     Quaternion to be decomposed
 * @return {Number}     Angle, in radians, of the rotation
 */

function getAxisAngle(out_axis, q) {
  var rad = Math.acos(q[3]) * 2.0;
  var s = Math.sin(rad / 2.0);

  if (s > _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"]) {
    out_axis[0] = q[0] / s;
    out_axis[1] = q[1] / s;
    out_axis[2] = q[2] / s;
  } else {
    // If s is zero, return any axis (no rotation - axis does not matter)
    out_axis[0] = 1;
    out_axis[1] = 0;
    out_axis[2] = 0;
  }

  return rad;
}
/**
 * Gets the angular distance between two unit quaternions
 *
 * @param  {ReadonlyQuat} a     Origin unit quaternion
 * @param  {ReadonlyQuat} b     Destination unit quaternion
 * @return {Number}     Angle, in radians, between the two quaternions
 */

function getAngle(a, b) {
  var dotproduct = dot(a, b);
  return Math.acos(2 * dotproduct * dotproduct - 1);
}
/**
 * Multiplies two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @returns {quat} out
 */

function multiply(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  out[0] = ax * bw + aw * bx + ay * bz - az * by;
  out[1] = ay * bw + aw * by + az * bx - ax * bz;
  out[2] = az * bw + aw * bz + ax * by - ay * bx;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
  return out;
}
/**
 * Rotates a quaternion by the given angle about the X axis
 *
 * @param {quat} out quat receiving operation result
 * @param {ReadonlyQuat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */

function rotateX(out, a, rad) {
  rad *= 0.5;
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = Math.sin(rad),
      bw = Math.cos(rad);
  out[0] = ax * bw + aw * bx;
  out[1] = ay * bw + az * bx;
  out[2] = az * bw - ay * bx;
  out[3] = aw * bw - ax * bx;
  return out;
}
/**
 * Rotates a quaternion by the given angle about the Y axis
 *
 * @param {quat} out quat receiving operation result
 * @param {ReadonlyQuat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */

function rotateY(out, a, rad) {
  rad *= 0.5;
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var by = Math.sin(rad),
      bw = Math.cos(rad);
  out[0] = ax * bw - az * by;
  out[1] = ay * bw + aw * by;
  out[2] = az * bw + ax * by;
  out[3] = aw * bw - ay * by;
  return out;
}
/**
 * Rotates a quaternion by the given angle about the Z axis
 *
 * @param {quat} out quat receiving operation result
 * @param {ReadonlyQuat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */

function rotateZ(out, a, rad) {
  rad *= 0.5;
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bz = Math.sin(rad),
      bw = Math.cos(rad);
  out[0] = ax * bw + ay * bz;
  out[1] = ay * bw - ax * bz;
  out[2] = az * bw + aw * bz;
  out[3] = aw * bw - az * bz;
  return out;
}
/**
 * Calculates the W component of a quat from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length.
 * Any existing W component will be ignored.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quat to calculate W component of
 * @returns {quat} out
 */

function calculateW(out, a) {
  var x = a[0],
      y = a[1],
      z = a[2];
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
  return out;
}
/**
 * Calculate the exponential of a unit quaternion.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quat to calculate the exponential of
 * @returns {quat} out
 */

function exp(out, a) {
  var x = a[0],
      y = a[1],
      z = a[2],
      w = a[3];
  var r = Math.sqrt(x * x + y * y + z * z);
  var et = Math.exp(w);
  var s = r > 0 ? et * Math.sin(r) / r : 0;
  out[0] = x * s;
  out[1] = y * s;
  out[2] = z * s;
  out[3] = et * Math.cos(r);
  return out;
}
/**
 * Calculate the natural logarithm of a unit quaternion.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quat to calculate the exponential of
 * @returns {quat} out
 */

function ln(out, a) {
  var x = a[0],
      y = a[1],
      z = a[2],
      w = a[3];
  var r = Math.sqrt(x * x + y * y + z * z);
  var t = r > 0 ? Math.atan2(r, w) / r : 0;
  out[0] = x * t;
  out[1] = y * t;
  out[2] = z * t;
  out[3] = 0.5 * Math.log(x * x + y * y + z * z + w * w);
  return out;
}
/**
 * Calculate the scalar power of a unit quaternion.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quat to calculate the exponential of
 * @param {Number} b amount to scale the quaternion by
 * @returns {quat} out
 */

function pow(out, a, b) {
  ln(out, a);
  scale(out, out, b);
  exp(out, out);
  return out;
}
/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

function slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  var omega, cosom, sinom, scale0, scale1; // calc cosine

  cosom = ax * bx + ay * by + az * bz + aw * bw; // adjust signs (if necessary)

  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  } // calculate coefficients


  if (1.0 - cosom > _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"]) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  } // calculate final values


  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}
/**
 * Generates a random unit quaternion
 *
 * @param {quat} out the receiving quaternion
 * @returns {quat} out
 */

function random(out) {
  // Implementation of http://planning.cs.uiuc.edu/node198.html
  // TODO: Calling random 3 times is probably not the fastest solution
  var u1 = _common_js__WEBPACK_IMPORTED_MODULE_0__["RANDOM"]();
  var u2 = _common_js__WEBPACK_IMPORTED_MODULE_0__["RANDOM"]();
  var u3 = _common_js__WEBPACK_IMPORTED_MODULE_0__["RANDOM"]();
  var sqrt1MinusU1 = Math.sqrt(1 - u1);
  var sqrtU1 = Math.sqrt(u1);
  out[0] = sqrt1MinusU1 * Math.sin(2.0 * Math.PI * u2);
  out[1] = sqrt1MinusU1 * Math.cos(2.0 * Math.PI * u2);
  out[2] = sqrtU1 * Math.sin(2.0 * Math.PI * u3);
  out[3] = sqrtU1 * Math.cos(2.0 * Math.PI * u3);
  return out;
}
/**
 * Calculates the inverse of a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quat to calculate inverse of
 * @returns {quat} out
 */

function invert(out, a) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var dot = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
  var invDot = dot ? 1.0 / dot : 0; // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

  out[0] = -a0 * invDot;
  out[1] = -a1 * invDot;
  out[2] = -a2 * invDot;
  out[3] = a3 * invDot;
  return out;
}
/**
 * Calculates the conjugate of a quat
 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quat to calculate conjugate of
 * @returns {quat} out
 */

function conjugate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = a[3];
  return out;
}
/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyMat3} m rotation matrix
 * @returns {quat} out
 * @function
 */

function fromMat3(out, m) {
  // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
  // article "Quaternion Calculus and Fast Animation".
  var fTrace = m[0] + m[4] + m[8];
  var fRoot;

  if (fTrace > 0.0) {
    // |w| > 1/2, may as well choose w > 1/2
    fRoot = Math.sqrt(fTrace + 1.0); // 2w

    out[3] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot; // 1/(4w)

    out[0] = (m[5] - m[7]) * fRoot;
    out[1] = (m[6] - m[2]) * fRoot;
    out[2] = (m[1] - m[3]) * fRoot;
  } else {
    // |w| <= 1/2
    var i = 0;
    if (m[4] > m[0]) i = 1;
    if (m[8] > m[i * 3 + i]) i = 2;
    var j = (i + 1) % 3;
    var k = (i + 2) % 3;
    fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
    out[i] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
    out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
    out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
  }

  return out;
}
/**
 * Creates a quaternion from the given euler angle x, y, z.
 *
 * @param {quat} out the receiving quaternion
 * @param {x} Angle to rotate around X axis in degrees.
 * @param {y} Angle to rotate around Y axis in degrees.
 * @param {z} Angle to rotate around Z axis in degrees.
 * @returns {quat} out
 * @function
 */

function fromEuler(out, x, y, z) {
  var halfToRad = 0.5 * Math.PI / 180.0;
  x *= halfToRad;
  y *= halfToRad;
  z *= halfToRad;
  var sx = Math.sin(x);
  var cx = Math.cos(x);
  var sy = Math.sin(y);
  var cy = Math.cos(y);
  var sz = Math.sin(z);
  var cz = Math.cos(z);
  out[0] = sx * cy * cz - cx * sy * sz;
  out[1] = cx * sy * cz + sx * cy * sz;
  out[2] = cx * cy * sz - sx * sy * cz;
  out[3] = cx * cy * cz + sx * sy * sz;
  return out;
}
/**
 * Returns a string representation of a quatenion
 *
 * @param {ReadonlyQuat} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

function str(a) {
  return "quat(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
}
/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {ReadonlyQuat} a quaternion to clone
 * @returns {quat} a new quaternion
 * @function
 */

var clone = _vec4_js__WEBPACK_IMPORTED_MODULE_3__["clone"];
/**
 * Creates a new quat initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} a new quaternion
 * @function
 */

var fromValues = _vec4_js__WEBPACK_IMPORTED_MODULE_3__["fromValues"];
/**
 * Copy the values from one quat to another
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the source quaternion
 * @returns {quat} out
 * @function
 */

var copy = _vec4_js__WEBPACK_IMPORTED_MODULE_3__["copy"];
/**
 * Set the components of a quat to the given values
 *
 * @param {quat} out the receiving quaternion
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} out
 * @function
 */

var set = _vec4_js__WEBPACK_IMPORTED_MODULE_3__["set"];
/**
 * Adds two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @returns {quat} out
 * @function
 */

var add = _vec4_js__WEBPACK_IMPORTED_MODULE_3__["add"];
/**
 * Alias for {@link quat.multiply}
 * @function
 */

var mul = multiply;
/**
 * Scales a quat by a scalar number
 *
 * @param {quat} out the receiving vector
 * @param {ReadonlyQuat} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {quat} out
 * @function
 */

var scale = _vec4_js__WEBPACK_IMPORTED_MODULE_3__["scale"];
/**
 * Calculates the dot product of two quat's
 *
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @returns {Number} dot product of a and b
 * @function
 */

var dot = _vec4_js__WEBPACK_IMPORTED_MODULE_3__["dot"];
/**
 * Performs a linear interpolation between two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 * @function
 */

var lerp = _vec4_js__WEBPACK_IMPORTED_MODULE_3__["lerp"];
/**
 * Calculates the length of a quat
 *
 * @param {ReadonlyQuat} a vector to calculate length of
 * @returns {Number} length of a
 */

var length = _vec4_js__WEBPACK_IMPORTED_MODULE_3__["length"];
/**
 * Alias for {@link quat.length}
 * @function
 */

var len = length;
/**
 * Calculates the squared length of a quat
 *
 * @param {ReadonlyQuat} a vector to calculate squared length of
 * @returns {Number} squared length of a
 * @function
 */

var squaredLength = _vec4_js__WEBPACK_IMPORTED_MODULE_3__["squaredLength"];
/**
 * Alias for {@link quat.squaredLength}
 * @function
 */

var sqrLen = squaredLength;
/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */

var normalize = _vec4_js__WEBPACK_IMPORTED_MODULE_3__["normalize"];
/**
 * Returns whether or not the quaternions have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyQuat} a The first quaternion.
 * @param {ReadonlyQuat} b The second quaternion.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

var exactEquals = _vec4_js__WEBPACK_IMPORTED_MODULE_3__["exactEquals"];
/**
 * Returns whether or not the quaternions have approximately the same elements in the same position.
 *
 * @param {ReadonlyQuat} a The first vector.
 * @param {ReadonlyQuat} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

var equals = _vec4_js__WEBPACK_IMPORTED_MODULE_3__["equals"];
/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {ReadonlyVec3} a the initial vector
 * @param {ReadonlyVec3} b the destination vector
 * @returns {quat} out
 */

var rotationTo = function () {
  var tmpvec3 = _vec3_js__WEBPACK_IMPORTED_MODULE_2__["create"]();
  var xUnitVec3 = _vec3_js__WEBPACK_IMPORTED_MODULE_2__["fromValues"](1, 0, 0);
  var yUnitVec3 = _vec3_js__WEBPACK_IMPORTED_MODULE_2__["fromValues"](0, 1, 0);
  return function (out, a, b) {
    var dot = _vec3_js__WEBPACK_IMPORTED_MODULE_2__["dot"](a, b);

    if (dot < -0.999999) {
      _vec3_js__WEBPACK_IMPORTED_MODULE_2__["cross"](tmpvec3, xUnitVec3, a);
      if (_vec3_js__WEBPACK_IMPORTED_MODULE_2__["len"](tmpvec3) < 0.000001) _vec3_js__WEBPACK_IMPORTED_MODULE_2__["cross"](tmpvec3, yUnitVec3, a);
      _vec3_js__WEBPACK_IMPORTED_MODULE_2__["normalize"](tmpvec3, tmpvec3);
      setAxisAngle(out, tmpvec3, Math.PI);
      return out;
    } else if (dot > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      _vec3_js__WEBPACK_IMPORTED_MODULE_2__["cross"](tmpvec3, a, b);
      out[0] = tmpvec3[0];
      out[1] = tmpvec3[1];
      out[2] = tmpvec3[2];
      out[3] = 1 + dot;
      return normalize(out, out);
    }
  };
}();
/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {ReadonlyQuat} c the third operand
 * @param {ReadonlyQuat} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

var sqlerp = function () {
  var temp1 = create();
  var temp2 = create();
  return function (out, a, b, c, d, t) {
    slerp(temp1, a, d, t);
    slerp(temp2, b, c, t);
    slerp(out, temp1, temp2, 2 * t * (1 - t));
    return out;
  };
}();
/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {ReadonlyVec3} view  the vector representing the viewing direction
 * @param {ReadonlyVec3} right the vector representing the local "right" direction
 * @param {ReadonlyVec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */

var setAxes = function () {
  var matr = _mat3_js__WEBPACK_IMPORTED_MODULE_1__["create"]();
  return function (out, view, right, up) {
    matr[0] = right[0];
    matr[3] = right[1];
    matr[6] = right[2];
    matr[1] = up[0];
    matr[4] = up[1];
    matr[7] = up[2];
    matr[2] = -view[0];
    matr[5] = -view[1];
    matr[8] = -view[2];
    return normalize(out, fromMat3(out, matr));
  };
}();

/***/ }),

/***/ "./node_modules/gl-matrix/esm/quat2.js":
/*!*********************************************!*\
  !*** ./node_modules/gl-matrix/esm/quat2.js ***!
  \*********************************************/
/*! exports provided: create, clone, fromValues, fromRotationTranslationValues, fromRotationTranslation, fromTranslation, fromRotation, fromMat4, copy, identity, set, getReal, getDual, setReal, setDual, getTranslation, translate, rotateX, rotateY, rotateZ, rotateByQuatAppend, rotateByQuatPrepend, rotateAroundAxis, add, multiply, mul, scale, dot, lerp, invert, conjugate, length, len, squaredLength, sqrLen, normalize, str, exactEquals, equals */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "create", function() { return create; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "clone", function() { return clone; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromValues", function() { return fromValues; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromRotationTranslationValues", function() { return fromRotationTranslationValues; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromRotationTranslation", function() { return fromRotationTranslation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromTranslation", function() { return fromTranslation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromRotation", function() { return fromRotation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromMat4", function() { return fromMat4; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "copy", function() { return copy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "identity", function() { return identity; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "set", function() { return set; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getReal", function() { return getReal; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getDual", function() { return getDual; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "setReal", function() { return setReal; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "setDual", function() { return setDual; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getTranslation", function() { return getTranslation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "translate", function() { return translate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateX", function() { return rotateX; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateY", function() { return rotateY; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateZ", function() { return rotateZ; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateByQuatAppend", function() { return rotateByQuatAppend; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateByQuatPrepend", function() { return rotateByQuatPrepend; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateAroundAxis", function() { return rotateAroundAxis; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "add", function() { return add; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiply", function() { return multiply; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "mul", function() { return mul; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "scale", function() { return scale; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dot", function() { return dot; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "lerp", function() { return lerp; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "invert", function() { return invert; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "conjugate", function() { return conjugate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "length", function() { return length; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "len", function() { return len; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "squaredLength", function() { return squaredLength; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sqrLen", function() { return sqrLen; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "normalize", function() { return normalize; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "str", function() { return str; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "exactEquals", function() { return exactEquals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "equals", function() { return equals; });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");
/* harmony import */ var _quat_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./quat.js */ "./node_modules/gl-matrix/esm/quat.js");
/* harmony import */ var _mat4_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./mat4.js */ "./node_modules/gl-matrix/esm/mat4.js");



/**
 * Dual Quaternion<br>
 * Format: [real, dual]<br>
 * Quaternion format: XYZW<br>
 * Make sure to have normalized dual quaternions, otherwise the functions may not work as intended.<br>
 * @module quat2
 */

/**
 * Creates a new identity dual quat
 *
 * @returns {quat2} a new dual quaternion [real -> rotation, dual -> translation]
 */

function create() {
  var dq = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](8);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"] != Float32Array) {
    dq[0] = 0;
    dq[1] = 0;
    dq[2] = 0;
    dq[4] = 0;
    dq[5] = 0;
    dq[6] = 0;
    dq[7] = 0;
  }

  dq[3] = 1;
  return dq;
}
/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {ReadonlyQuat2} a dual quaternion to clone
 * @returns {quat2} new dual quaternion
 * @function
 */

function clone(a) {
  var dq = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](8);
  dq[0] = a[0];
  dq[1] = a[1];
  dq[2] = a[2];
  dq[3] = a[3];
  dq[4] = a[4];
  dq[5] = a[5];
  dq[6] = a[6];
  dq[7] = a[7];
  return dq;
}
/**
 * Creates a new dual quat initialized with the given values
 *
 * @param {Number} x1 X component
 * @param {Number} y1 Y component
 * @param {Number} z1 Z component
 * @param {Number} w1 W component
 * @param {Number} x2 X component
 * @param {Number} y2 Y component
 * @param {Number} z2 Z component
 * @param {Number} w2 W component
 * @returns {quat2} new dual quaternion
 * @function
 */

function fromValues(x1, y1, z1, w1, x2, y2, z2, w2) {
  var dq = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](8);
  dq[0] = x1;
  dq[1] = y1;
  dq[2] = z1;
  dq[3] = w1;
  dq[4] = x2;
  dq[5] = y2;
  dq[6] = z2;
  dq[7] = w2;
  return dq;
}
/**
 * Creates a new dual quat from the given values (quat and translation)
 *
 * @param {Number} x1 X component
 * @param {Number} y1 Y component
 * @param {Number} z1 Z component
 * @param {Number} w1 W component
 * @param {Number} x2 X component (translation)
 * @param {Number} y2 Y component (translation)
 * @param {Number} z2 Z component (translation)
 * @returns {quat2} new dual quaternion
 * @function
 */

function fromRotationTranslationValues(x1, y1, z1, w1, x2, y2, z2) {
  var dq = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](8);
  dq[0] = x1;
  dq[1] = y1;
  dq[2] = z1;
  dq[3] = w1;
  var ax = x2 * 0.5,
      ay = y2 * 0.5,
      az = z2 * 0.5;
  dq[4] = ax * w1 + ay * z1 - az * y1;
  dq[5] = ay * w1 + az * x1 - ax * z1;
  dq[6] = az * w1 + ax * y1 - ay * x1;
  dq[7] = -ax * x1 - ay * y1 - az * z1;
  return dq;
}
/**
 * Creates a dual quat from a quaternion and a translation
 *
 * @param {ReadonlyQuat2} dual quaternion receiving operation result
 * @param {ReadonlyQuat} q a normalized quaternion
 * @param {ReadonlyVec3} t tranlation vector
 * @returns {quat2} dual quaternion receiving operation result
 * @function
 */

function fromRotationTranslation(out, q, t) {
  var ax = t[0] * 0.5,
      ay = t[1] * 0.5,
      az = t[2] * 0.5,
      bx = q[0],
      by = q[1],
      bz = q[2],
      bw = q[3];
  out[0] = bx;
  out[1] = by;
  out[2] = bz;
  out[3] = bw;
  out[4] = ax * bw + ay * bz - az * by;
  out[5] = ay * bw + az * bx - ax * bz;
  out[6] = az * bw + ax * by - ay * bx;
  out[7] = -ax * bx - ay * by - az * bz;
  return out;
}
/**
 * Creates a dual quat from a translation
 *
 * @param {ReadonlyQuat2} dual quaternion receiving operation result
 * @param {ReadonlyVec3} t translation vector
 * @returns {quat2} dual quaternion receiving operation result
 * @function
 */

function fromTranslation(out, t) {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  out[4] = t[0] * 0.5;
  out[5] = t[1] * 0.5;
  out[6] = t[2] * 0.5;
  out[7] = 0;
  return out;
}
/**
 * Creates a dual quat from a quaternion
 *
 * @param {ReadonlyQuat2} dual quaternion receiving operation result
 * @param {ReadonlyQuat} q the quaternion
 * @returns {quat2} dual quaternion receiving operation result
 * @function
 */

function fromRotation(out, q) {
  out[0] = q[0];
  out[1] = q[1];
  out[2] = q[2];
  out[3] = q[3];
  out[4] = 0;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  return out;
}
/**
 * Creates a new dual quat from a matrix (4x4)
 *
 * @param {quat2} out the dual quaternion
 * @param {ReadonlyMat4} a the matrix
 * @returns {quat2} dual quat receiving operation result
 * @function
 */

function fromMat4(out, a) {
  //TODO Optimize this
  var outer = _quat_js__WEBPACK_IMPORTED_MODULE_1__["create"]();
  _mat4_js__WEBPACK_IMPORTED_MODULE_2__["getRotation"](outer, a);
  var t = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](3);
  _mat4_js__WEBPACK_IMPORTED_MODULE_2__["getTranslation"](t, a);
  fromRotationTranslation(out, outer, t);
  return out;
}
/**
 * Copy the values from one dual quat to another
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the source dual quaternion
 * @returns {quat2} out
 * @function
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  return out;
}
/**
 * Set a dual quat to the identity dual quaternion
 *
 * @param {quat2} out the receiving quaternion
 * @returns {quat2} out
 */

function identity(out) {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  out[4] = 0;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  return out;
}
/**
 * Set the components of a dual quat to the given values
 *
 * @param {quat2} out the receiving quaternion
 * @param {Number} x1 X component
 * @param {Number} y1 Y component
 * @param {Number} z1 Z component
 * @param {Number} w1 W component
 * @param {Number} x2 X component
 * @param {Number} y2 Y component
 * @param {Number} z2 Z component
 * @param {Number} w2 W component
 * @returns {quat2} out
 * @function
 */

function set(out, x1, y1, z1, w1, x2, y2, z2, w2) {
  out[0] = x1;
  out[1] = y1;
  out[2] = z1;
  out[3] = w1;
  out[4] = x2;
  out[5] = y2;
  out[6] = z2;
  out[7] = w2;
  return out;
}
/**
 * Gets the real part of a dual quat
 * @param  {quat} out real part
 * @param  {ReadonlyQuat2} a Dual Quaternion
 * @return {quat} real part
 */

var getReal = _quat_js__WEBPACK_IMPORTED_MODULE_1__["copy"];
/**
 * Gets the dual part of a dual quat
 * @param  {quat} out dual part
 * @param  {ReadonlyQuat2} a Dual Quaternion
 * @return {quat} dual part
 */

function getDual(out, a) {
  out[0] = a[4];
  out[1] = a[5];
  out[2] = a[6];
  out[3] = a[7];
  return out;
}
/**
 * Set the real component of a dual quat to the given quaternion
 *
 * @param {quat2} out the receiving quaternion
 * @param {ReadonlyQuat} q a quaternion representing the real part
 * @returns {quat2} out
 * @function
 */

var setReal = _quat_js__WEBPACK_IMPORTED_MODULE_1__["copy"];
/**
 * Set the dual component of a dual quat to the given quaternion
 *
 * @param {quat2} out the receiving quaternion
 * @param {ReadonlyQuat} q a quaternion representing the dual part
 * @returns {quat2} out
 * @function
 */

function setDual(out, q) {
  out[4] = q[0];
  out[5] = q[1];
  out[6] = q[2];
  out[7] = q[3];
  return out;
}
/**
 * Gets the translation of a normalized dual quat
 * @param  {vec3} out translation
 * @param  {ReadonlyQuat2} a Dual Quaternion to be decomposed
 * @return {vec3} translation
 */

function getTranslation(out, a) {
  var ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7],
      bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3];
  out[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
  out[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
  out[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
  return out;
}
/**
 * Translates a dual quat by the given vector
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the dual quaternion to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {quat2} out
 */

function translate(out, a, v) {
  var ax1 = a[0],
      ay1 = a[1],
      az1 = a[2],
      aw1 = a[3],
      bx1 = v[0] * 0.5,
      by1 = v[1] * 0.5,
      bz1 = v[2] * 0.5,
      ax2 = a[4],
      ay2 = a[5],
      az2 = a[6],
      aw2 = a[7];
  out[0] = ax1;
  out[1] = ay1;
  out[2] = az1;
  out[3] = aw1;
  out[4] = aw1 * bx1 + ay1 * bz1 - az1 * by1 + ax2;
  out[5] = aw1 * by1 + az1 * bx1 - ax1 * bz1 + ay2;
  out[6] = aw1 * bz1 + ax1 * by1 - ay1 * bx1 + az2;
  out[7] = -ax1 * bx1 - ay1 * by1 - az1 * bz1 + aw2;
  return out;
}
/**
 * Rotates a dual quat around the X axis
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the dual quaternion to rotate
 * @param {number} rad how far should the rotation be
 * @returns {quat2} out
 */

function rotateX(out, a, rad) {
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7],
      ax1 = ax * bw + aw * bx + ay * bz - az * by,
      ay1 = ay * bw + aw * by + az * bx - ax * bz,
      az1 = az * bw + aw * bz + ax * by - ay * bx,
      aw1 = aw * bw - ax * bx - ay * by - az * bz;
  _quat_js__WEBPACK_IMPORTED_MODULE_1__["rotateX"](out, a, rad);
  bx = out[0];
  by = out[1];
  bz = out[2];
  bw = out[3];
  out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
  out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
  out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
  out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
  return out;
}
/**
 * Rotates a dual quat around the Y axis
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the dual quaternion to rotate
 * @param {number} rad how far should the rotation be
 * @returns {quat2} out
 */

function rotateY(out, a, rad) {
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7],
      ax1 = ax * bw + aw * bx + ay * bz - az * by,
      ay1 = ay * bw + aw * by + az * bx - ax * bz,
      az1 = az * bw + aw * bz + ax * by - ay * bx,
      aw1 = aw * bw - ax * bx - ay * by - az * bz;
  _quat_js__WEBPACK_IMPORTED_MODULE_1__["rotateY"](out, a, rad);
  bx = out[0];
  by = out[1];
  bz = out[2];
  bw = out[3];
  out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
  out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
  out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
  out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
  return out;
}
/**
 * Rotates a dual quat around the Z axis
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the dual quaternion to rotate
 * @param {number} rad how far should the rotation be
 * @returns {quat2} out
 */

function rotateZ(out, a, rad) {
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7],
      ax1 = ax * bw + aw * bx + ay * bz - az * by,
      ay1 = ay * bw + aw * by + az * bx - ax * bz,
      az1 = az * bw + aw * bz + ax * by - ay * bx,
      aw1 = aw * bw - ax * bx - ay * by - az * bz;
  _quat_js__WEBPACK_IMPORTED_MODULE_1__["rotateZ"](out, a, rad);
  bx = out[0];
  by = out[1];
  bz = out[2];
  bw = out[3];
  out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
  out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
  out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
  out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
  return out;
}
/**
 * Rotates a dual quat by a given quaternion (a * q)
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the dual quaternion to rotate
 * @param {ReadonlyQuat} q quaternion to rotate by
 * @returns {quat2} out
 */

function rotateByQuatAppend(out, a, q) {
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3],
      ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  out[0] = ax * qw + aw * qx + ay * qz - az * qy;
  out[1] = ay * qw + aw * qy + az * qx - ax * qz;
  out[2] = az * qw + aw * qz + ax * qy - ay * qx;
  out[3] = aw * qw - ax * qx - ay * qy - az * qz;
  ax = a[4];
  ay = a[5];
  az = a[6];
  aw = a[7];
  out[4] = ax * qw + aw * qx + ay * qz - az * qy;
  out[5] = ay * qw + aw * qy + az * qx - ax * qz;
  out[6] = az * qw + aw * qz + ax * qy - ay * qx;
  out[7] = aw * qw - ax * qx - ay * qy - az * qz;
  return out;
}
/**
 * Rotates a dual quat by a given quaternion (q * a)
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat} q quaternion to rotate by
 * @param {ReadonlyQuat2} a the dual quaternion to rotate
 * @returns {quat2} out
 */

function rotateByQuatPrepend(out, q, a) {
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3],
      bx = a[0],
      by = a[1],
      bz = a[2],
      bw = a[3];
  out[0] = qx * bw + qw * bx + qy * bz - qz * by;
  out[1] = qy * bw + qw * by + qz * bx - qx * bz;
  out[2] = qz * bw + qw * bz + qx * by - qy * bx;
  out[3] = qw * bw - qx * bx - qy * by - qz * bz;
  bx = a[4];
  by = a[5];
  bz = a[6];
  bw = a[7];
  out[4] = qx * bw + qw * bx + qy * bz - qz * by;
  out[5] = qy * bw + qw * by + qz * bx - qx * bz;
  out[6] = qz * bw + qw * bz + qx * by - qy * bx;
  out[7] = qw * bw - qx * bx - qy * by - qz * bz;
  return out;
}
/**
 * Rotates a dual quat around a given axis. Does the normalisation automatically
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the dual quaternion to rotate
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @param {Number} rad how far the rotation should be
 * @returns {quat2} out
 */

function rotateAroundAxis(out, a, axis, rad) {
  //Special case for rad = 0
  if (Math.abs(rad) < _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"]) {
    return copy(out, a);
  }

  var axisLength = Math.hypot(axis[0], axis[1], axis[2]);
  rad = rad * 0.5;
  var s = Math.sin(rad);
  var bx = s * axis[0] / axisLength;
  var by = s * axis[1] / axisLength;
  var bz = s * axis[2] / axisLength;
  var bw = Math.cos(rad);
  var ax1 = a[0],
      ay1 = a[1],
      az1 = a[2],
      aw1 = a[3];
  out[0] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
  out[1] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
  out[2] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
  out[3] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
  var ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7];
  out[4] = ax * bw + aw * bx + ay * bz - az * by;
  out[5] = ay * bw + aw * by + az * bx - ax * bz;
  out[6] = az * bw + aw * bz + ax * by - ay * bx;
  out[7] = aw * bw - ax * bx - ay * by - az * bz;
  return out;
}
/**
 * Adds two dual quat's
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the first operand
 * @param {ReadonlyQuat2} b the second operand
 * @returns {quat2} out
 * @function
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  out[6] = a[6] + b[6];
  out[7] = a[7] + b[7];
  return out;
}
/**
 * Multiplies two dual quat's
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a the first operand
 * @param {ReadonlyQuat2} b the second operand
 * @returns {quat2} out
 */

function multiply(out, a, b) {
  var ax0 = a[0],
      ay0 = a[1],
      az0 = a[2],
      aw0 = a[3],
      bx1 = b[4],
      by1 = b[5],
      bz1 = b[6],
      bw1 = b[7],
      ax1 = a[4],
      ay1 = a[5],
      az1 = a[6],
      aw1 = a[7],
      bx0 = b[0],
      by0 = b[1],
      bz0 = b[2],
      bw0 = b[3];
  out[0] = ax0 * bw0 + aw0 * bx0 + ay0 * bz0 - az0 * by0;
  out[1] = ay0 * bw0 + aw0 * by0 + az0 * bx0 - ax0 * bz0;
  out[2] = az0 * bw0 + aw0 * bz0 + ax0 * by0 - ay0 * bx0;
  out[3] = aw0 * bw0 - ax0 * bx0 - ay0 * by0 - az0 * bz0;
  out[4] = ax0 * bw1 + aw0 * bx1 + ay0 * bz1 - az0 * by1 + ax1 * bw0 + aw1 * bx0 + ay1 * bz0 - az1 * by0;
  out[5] = ay0 * bw1 + aw0 * by1 + az0 * bx1 - ax0 * bz1 + ay1 * bw0 + aw1 * by0 + az1 * bx0 - ax1 * bz0;
  out[6] = az0 * bw1 + aw0 * bz1 + ax0 * by1 - ay0 * bx1 + az1 * bw0 + aw1 * bz0 + ax1 * by0 - ay1 * bx0;
  out[7] = aw0 * bw1 - ax0 * bx1 - ay0 * by1 - az0 * bz1 + aw1 * bw0 - ax1 * bx0 - ay1 * by0 - az1 * bz0;
  return out;
}
/**
 * Alias for {@link quat2.multiply}
 * @function
 */

var mul = multiply;
/**
 * Scales a dual quat by a scalar number
 *
 * @param {quat2} out the receiving dual quat
 * @param {ReadonlyQuat2} a the dual quat to scale
 * @param {Number} b amount to scale the dual quat by
 * @returns {quat2} out
 * @function
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  out[6] = a[6] * b;
  out[7] = a[7] * b;
  return out;
}
/**
 * Calculates the dot product of two dual quat's (The dot product of the real parts)
 *
 * @param {ReadonlyQuat2} a the first operand
 * @param {ReadonlyQuat2} b the second operand
 * @returns {Number} dot product of a and b
 * @function
 */

var dot = _quat_js__WEBPACK_IMPORTED_MODULE_1__["dot"];
/**
 * Performs a linear interpolation between two dual quats's
 * NOTE: The resulting dual quaternions won't always be normalized (The error is most noticeable when t = 0.5)
 *
 * @param {quat2} out the receiving dual quat
 * @param {ReadonlyQuat2} a the first operand
 * @param {ReadonlyQuat2} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat2} out
 */

function lerp(out, a, b, t) {
  var mt = 1 - t;
  if (dot(a, b) < 0) t = -t;
  out[0] = a[0] * mt + b[0] * t;
  out[1] = a[1] * mt + b[1] * t;
  out[2] = a[2] * mt + b[2] * t;
  out[3] = a[3] * mt + b[3] * t;
  out[4] = a[4] * mt + b[4] * t;
  out[5] = a[5] * mt + b[5] * t;
  out[6] = a[6] * mt + b[6] * t;
  out[7] = a[7] * mt + b[7] * t;
  return out;
}
/**
 * Calculates the inverse of a dual quat. If they are normalized, conjugate is cheaper
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a dual quat to calculate inverse of
 * @returns {quat2} out
 */

function invert(out, a) {
  var sqlen = squaredLength(a);
  out[0] = -a[0] / sqlen;
  out[1] = -a[1] / sqlen;
  out[2] = -a[2] / sqlen;
  out[3] = a[3] / sqlen;
  out[4] = -a[4] / sqlen;
  out[5] = -a[5] / sqlen;
  out[6] = -a[6] / sqlen;
  out[7] = a[7] / sqlen;
  return out;
}
/**
 * Calculates the conjugate of a dual quat
 * If the dual quaternion is normalized, this function is faster than quat2.inverse and produces the same result.
 *
 * @param {quat2} out the receiving quaternion
 * @param {ReadonlyQuat2} a quat to calculate conjugate of
 * @returns {quat2} out
 */

function conjugate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = a[3];
  out[4] = -a[4];
  out[5] = -a[5];
  out[6] = -a[6];
  out[7] = a[7];
  return out;
}
/**
 * Calculates the length of a dual quat
 *
 * @param {ReadonlyQuat2} a dual quat to calculate length of
 * @returns {Number} length of a
 * @function
 */

var length = _quat_js__WEBPACK_IMPORTED_MODULE_1__["length"];
/**
 * Alias for {@link quat2.length}
 * @function
 */

var len = length;
/**
 * Calculates the squared length of a dual quat
 *
 * @param {ReadonlyQuat2} a dual quat to calculate squared length of
 * @returns {Number} squared length of a
 * @function
 */

var squaredLength = _quat_js__WEBPACK_IMPORTED_MODULE_1__["squaredLength"];
/**
 * Alias for {@link quat2.squaredLength}
 * @function
 */

var sqrLen = squaredLength;
/**
 * Normalize a dual quat
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {ReadonlyQuat2} a dual quaternion to normalize
 * @returns {quat2} out
 * @function
 */

function normalize(out, a) {
  var magnitude = squaredLength(a);

  if (magnitude > 0) {
    magnitude = Math.sqrt(magnitude);
    var a0 = a[0] / magnitude;
    var a1 = a[1] / magnitude;
    var a2 = a[2] / magnitude;
    var a3 = a[3] / magnitude;
    var b0 = a[4];
    var b1 = a[5];
    var b2 = a[6];
    var b3 = a[7];
    var a_dot_b = a0 * b0 + a1 * b1 + a2 * b2 + a3 * b3;
    out[0] = a0;
    out[1] = a1;
    out[2] = a2;
    out[3] = a3;
    out[4] = (b0 - a0 * a_dot_b) / magnitude;
    out[5] = (b1 - a1 * a_dot_b) / magnitude;
    out[6] = (b2 - a2 * a_dot_b) / magnitude;
    out[7] = (b3 - a3 * a_dot_b) / magnitude;
  }

  return out;
}
/**
 * Returns a string representation of a dual quatenion
 *
 * @param {ReadonlyQuat2} a dual quaternion to represent as a string
 * @returns {String} string representation of the dual quat
 */

function str(a) {
  return "quat2(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ")";
}
/**
 * Returns whether or not the dual quaternions have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyQuat2} a the first dual quaternion.
 * @param {ReadonlyQuat2} b the second dual quaternion.
 * @returns {Boolean} true if the dual quaternions are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7];
}
/**
 * Returns whether or not the dual quaternions have approximately the same elements in the same position.
 *
 * @param {ReadonlyQuat2} a the first dual quat.
 * @param {ReadonlyQuat2} b the second dual quat.
 * @returns {Boolean} true if the dual quats are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5],
      a6 = a[6],
      a7 = a[7];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3],
      b4 = b[4],
      b5 = b[5],
      b6 = b[6],
      b7 = b[7];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a7), Math.abs(b7));
}

/***/ }),

/***/ "./node_modules/gl-matrix/esm/vec2.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/vec2.js ***!
  \********************************************/
/*! exports provided: create, clone, fromValues, copy, set, add, subtract, multiply, divide, ceil, floor, min, max, round, scale, scaleAndAdd, distance, squaredDistance, length, squaredLength, negate, inverse, normalize, dot, cross, lerp, random, transformMat2, transformMat2d, transformMat3, transformMat4, rotate, angle, zero, str, exactEquals, equals, len, sub, mul, div, dist, sqrDist, sqrLen, forEach */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "create", function() { return create; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "clone", function() { return clone; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromValues", function() { return fromValues; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "copy", function() { return copy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "set", function() { return set; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "add", function() { return add; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "subtract", function() { return subtract; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiply", function() { return multiply; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "divide", function() { return divide; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ceil", function() { return ceil; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "floor", function() { return floor; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "min", function() { return min; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "max", function() { return max; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "round", function() { return round; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "scale", function() { return scale; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "scaleAndAdd", function() { return scaleAndAdd; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "distance", function() { return distance; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "squaredDistance", function() { return squaredDistance; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "length", function() { return length; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "squaredLength", function() { return squaredLength; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "negate", function() { return negate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "inverse", function() { return inverse; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "normalize", function() { return normalize; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dot", function() { return dot; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "cross", function() { return cross; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "lerp", function() { return lerp; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "random", function() { return random; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "transformMat2", function() { return transformMat2; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "transformMat2d", function() { return transformMat2d; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "transformMat3", function() { return transformMat3; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "transformMat4", function() { return transformMat4; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotate", function() { return rotate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "angle", function() { return angle; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "zero", function() { return zero; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "str", function() { return str; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "exactEquals", function() { return exactEquals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "equals", function() { return equals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "len", function() { return len; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sub", function() { return sub; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "mul", function() { return mul; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "div", function() { return div; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dist", function() { return dist; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sqrDist", function() { return sqrDist; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sqrLen", function() { return sqrLen; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "forEach", function() { return forEach; });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 2 Dimensional Vector
 * @module vec2
 */

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](2);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"] != Float32Array) {
    out[0] = 0;
    out[1] = 0;
  }

  return out;
}
/**
 * Creates a new vec2 initialized with values from an existing vector
 *
 * @param {ReadonlyVec2} a vector to clone
 * @returns {vec2} a new 2D vector
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](2);
  out[0] = a[0];
  out[1] = a[1];
  return out;
}
/**
 * Creates a new vec2 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} a new 2D vector
 */

function fromValues(x, y) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](2);
  out[0] = x;
  out[1] = y;
  return out;
}
/**
 * Copy the values from one vec2 to another
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the source vector
 * @returns {vec2} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  return out;
}
/**
 * Set the components of a vec2 to the given values
 *
 * @param {vec2} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} out
 */

function set(out, x, y) {
  out[0] = x;
  out[1] = y;
  return out;
}
/**
 * Adds two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  return out;
}
/**
 * Multiplies two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  return out;
}
/**
 * Divides two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  return out;
}
/**
 * Math.ceil the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to ceil
 * @returns {vec2} out
 */

function ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  return out;
}
/**
 * Math.floor the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to floor
 * @returns {vec2} out
 */

function floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  return out;
}
/**
 * Returns the minimum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  return out;
}
/**
 * Returns the maximum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  return out;
}
/**
 * Math.round the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to round
 * @returns {vec2} out
 */

function round(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  return out;
}
/**
 * Scales a vec2 by a scalar number
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec2} out
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  return out;
}
/**
 * Adds two vec2's after scaling the second operand by a scalar value
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec2} out
 */

function scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec2's
 *
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {Number} distance between a and b
 */

function distance(a, b) {
  var x = b[0] - a[0],
      y = b[1] - a[1];
  return Math.hypot(x, y);
}
/**
 * Calculates the squared euclidian distance between two vec2's
 *
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {Number} squared distance between a and b
 */

function squaredDistance(a, b) {
  var x = b[0] - a[0],
      y = b[1] - a[1];
  return x * x + y * y;
}
/**
 * Calculates the length of a vec2
 *
 * @param {ReadonlyVec2} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0],
      y = a[1];
  return Math.hypot(x, y);
}
/**
 * Calculates the squared length of a vec2
 *
 * @param {ReadonlyVec2} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */

function squaredLength(a) {
  var x = a[0],
      y = a[1];
  return x * x + y * y;
}
/**
 * Negates the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to negate
 * @returns {vec2} out
 */

function negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  return out;
}
/**
 * Returns the inverse of the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to invert
 * @returns {vec2} out
 */

function inverse(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  return out;
}
/**
 * Normalize a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to normalize
 * @returns {vec2} out
 */

function normalize(out, a) {
  var x = a[0],
      y = a[1];
  var len = x * x + y * y;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  return out;
}
/**
 * Calculates the dot product of two vec2's
 *
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}
/**
 * Computes the cross product of two vec2's
 * Note that the cross product must by definition produce a 3D vector
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec3} out
 */

function cross(out, a, b) {
  var z = a[0] * b[1] - a[1] * b[0];
  out[0] = out[1] = 0;
  out[2] = z;
  return out;
}
/**
 * Performs a linear interpolation between two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec2} out
 */

function lerp(out, a, b, t) {
  var ax = a[0],
      ay = a[1];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec2} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec2} out
 */

function random(out, scale) {
  scale = scale || 1.0;
  var r = _common_js__WEBPACK_IMPORTED_MODULE_0__["RANDOM"]() * 2.0 * Math.PI;
  out[0] = Math.cos(r) * scale;
  out[1] = Math.sin(r) * scale;
  return out;
}
/**
 * Transforms the vec2 with a mat2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to transform
 * @param {ReadonlyMat2} m matrix to transform with
 * @returns {vec2} out
 */

function transformMat2(out, a, m) {
  var x = a[0],
      y = a[1];
  out[0] = m[0] * x + m[2] * y;
  out[1] = m[1] * x + m[3] * y;
  return out;
}
/**
 * Transforms the vec2 with a mat2d
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to transform
 * @param {ReadonlyMat2d} m matrix to transform with
 * @returns {vec2} out
 */

function transformMat2d(out, a, m) {
  var x = a[0],
      y = a[1];
  out[0] = m[0] * x + m[2] * y + m[4];
  out[1] = m[1] * x + m[3] * y + m[5];
  return out;
}
/**
 * Transforms the vec2 with a mat3
 * 3rd vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to transform
 * @param {ReadonlyMat3} m matrix to transform with
 * @returns {vec2} out
 */

function transformMat3(out, a, m) {
  var x = a[0],
      y = a[1];
  out[0] = m[0] * x + m[3] * y + m[6];
  out[1] = m[1] * x + m[4] * y + m[7];
  return out;
}
/**
 * Transforms the vec2 with a mat4
 * 3rd vector component is implicitly '0'
 * 4th vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec2} out
 */

function transformMat4(out, a, m) {
  var x = a[0];
  var y = a[1];
  out[0] = m[0] * x + m[4] * y + m[12];
  out[1] = m[1] * x + m[5] * y + m[13];
  return out;
}
/**
 * Rotate a 2D vector
 * @param {vec2} out The receiving vec2
 * @param {ReadonlyVec2} a The vec2 point to rotate
 * @param {ReadonlyVec2} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec2} out
 */

function rotate(out, a, b, rad) {
  //Translate point to the origin
  var p0 = a[0] - b[0],
      p1 = a[1] - b[1],
      sinC = Math.sin(rad),
      cosC = Math.cos(rad); //perform rotation and translate to correct position

  out[0] = p0 * cosC - p1 * sinC + b[0];
  out[1] = p0 * sinC + p1 * cosC + b[1];
  return out;
}
/**
 * Get the angle between two 2D vectors
 * @param {ReadonlyVec2} a The first operand
 * @param {ReadonlyVec2} b The second operand
 * @returns {Number} The angle in radians
 */

function angle(a, b) {
  var x1 = a[0],
      y1 = a[1],
      x2 = b[0],
      y2 = b[1],
      // mag is the product of the magnitudes of a and b
  mag = Math.sqrt(x1 * x1 + y1 * y1) * Math.sqrt(x2 * x2 + y2 * y2),
      // mag &&.. short circuits if mag == 0
  cosine = mag && (x1 * x2 + y1 * y2) / mag; // Math.min(Math.max(cosine, -1), 1) clamps the cosine between -1 and 1

  return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
/**
 * Set the components of a vec2 to zero
 *
 * @param {vec2} out the receiving vector
 * @returns {vec2} out
 */

function zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {ReadonlyVec2} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

function str(a) {
  return "vec2(" + a[0] + ", " + a[1] + ")";
}
/**
 * Returns whether or not the vectors exactly have the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyVec2} a The first vector.
 * @param {ReadonlyVec2} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {ReadonlyVec2} a The first vector.
 * @param {ReadonlyVec2} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1];
  var b0 = b[0],
      b1 = b[1];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a1), Math.abs(b1));
}
/**
 * Alias for {@link vec2.length}
 * @function
 */

var len = length;
/**
 * Alias for {@link vec2.subtract}
 * @function
 */

var sub = subtract;
/**
 * Alias for {@link vec2.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link vec2.divide}
 * @function
 */

var div = divide;
/**
 * Alias for {@link vec2.distance}
 * @function
 */

var dist = distance;
/**
 * Alias for {@link vec2.squaredDistance}
 * @function
 */

var sqrDist = squaredDistance;
/**
 * Alias for {@link vec2.squaredLength}
 * @function
 */

var sqrLen = squaredLength;
/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach = function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 2;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }

    return a;
  };
}();

/***/ }),

/***/ "./node_modules/gl-matrix/esm/vec3.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/vec3.js ***!
  \********************************************/
/*! exports provided: create, clone, length, fromValues, copy, set, add, subtract, multiply, divide, ceil, floor, min, max, round, scale, scaleAndAdd, distance, squaredDistance, squaredLength, negate, inverse, normalize, dot, cross, lerp, hermite, bezier, random, transformMat4, transformMat3, transformQuat, rotateX, rotateY, rotateZ, angle, zero, str, exactEquals, equals, sub, mul, div, dist, sqrDist, len, sqrLen, forEach */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "create", function() { return create; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "clone", function() { return clone; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "length", function() { return length; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromValues", function() { return fromValues; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "copy", function() { return copy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "set", function() { return set; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "add", function() { return add; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "subtract", function() { return subtract; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiply", function() { return multiply; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "divide", function() { return divide; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ceil", function() { return ceil; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "floor", function() { return floor; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "min", function() { return min; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "max", function() { return max; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "round", function() { return round; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "scale", function() { return scale; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "scaleAndAdd", function() { return scaleAndAdd; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "distance", function() { return distance; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "squaredDistance", function() { return squaredDistance; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "squaredLength", function() { return squaredLength; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "negate", function() { return negate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "inverse", function() { return inverse; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "normalize", function() { return normalize; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dot", function() { return dot; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "cross", function() { return cross; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "lerp", function() { return lerp; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "hermite", function() { return hermite; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "bezier", function() { return bezier; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "random", function() { return random; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "transformMat4", function() { return transformMat4; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "transformMat3", function() { return transformMat3; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "transformQuat", function() { return transformQuat; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateX", function() { return rotateX; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateY", function() { return rotateY; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "rotateZ", function() { return rotateZ; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "angle", function() { return angle; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "zero", function() { return zero; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "str", function() { return str; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "exactEquals", function() { return exactEquals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "equals", function() { return equals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sub", function() { return sub; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "mul", function() { return mul; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "div", function() { return div; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dist", function() { return dist; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sqrDist", function() { return sqrDist; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "len", function() { return len; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sqrLen", function() { return sqrLen; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "forEach", function() { return forEach; });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](3);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"] != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {ReadonlyVec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](3);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
/**
 * Calculates the length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.hypot(x, y, z);
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */

function fromValues(x, y, z) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the source vector
 * @returns {vec3} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */

function set(out, x, y, z) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}
/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  return out;
}
/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  return out;
}
/**
 * Math.ceil the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to ceil
 * @returns {vec3} out
 */

function ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  out[2] = Math.ceil(a[2]);
  return out;
}
/**
 * Math.floor the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to floor
 * @returns {vec3} out
 */

function floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  out[2] = Math.floor(a[2]);
  return out;
}
/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  return out;
}
/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  return out;
}
/**
 * Math.round the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to round
 * @returns {vec3} out
 */

function round(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  out[2] = Math.round(a[2]);
  return out;
}
/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}
/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */

function scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} distance between a and b
 */

function distance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return Math.hypot(x, y, z);
}
/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} squared distance between a and b
 */

function squaredDistance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return x * x + y * y + z * z;
}
/**
 * Calculates the squared length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */

function squaredLength(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return x * x + y * y + z * z;
}
/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to negate
 * @returns {vec3} out
 */

function negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  return out;
}
/**
 * Returns the inverse of the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to invert
 * @returns {vec3} out
 */

function inverse(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Calculates the dot product of two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function cross(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2];
  var bx = b[0],
      by = b[1],
      bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function lerp(out, a, b, t) {
  var ax = a[0];
  var ay = a[1];
  var az = a[2];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  return out;
}
/**
 * Performs a hermite interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {ReadonlyVec3} c the third operand
 * @param {ReadonlyVec3} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function hermite(out, a, b, c, d, t) {
  var factorTimes2 = t * t;
  var factor1 = factorTimes2 * (2 * t - 3) + 1;
  var factor2 = factorTimes2 * (t - 2) + t;
  var factor3 = factorTimes2 * (t - 1);
  var factor4 = factorTimes2 * (3 - 2 * t);
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
/**
 * Performs a bezier interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {ReadonlyVec3} c the third operand
 * @param {ReadonlyVec3} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function bezier(out, a, b, c, d, t) {
  var inverseFactor = 1 - t;
  var inverseFactorTimesTwo = inverseFactor * inverseFactor;
  var factorTimes2 = t * t;
  var factor1 = inverseFactorTimesTwo * inverseFactor;
  var factor2 = 3 * t * inverseFactorTimesTwo;
  var factor3 = 3 * factorTimes2 * inverseFactor;
  var factor4 = factorTimes2 * t;
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */

function random(out, scale) {
  scale = scale || 1.0;
  var r = _common_js__WEBPACK_IMPORTED_MODULE_0__["RANDOM"]() * 2.0 * Math.PI;
  var z = _common_js__WEBPACK_IMPORTED_MODULE_0__["RANDOM"]() * 2.0 - 1.0;
  var zScale = Math.sqrt(1.0 - z * z) * scale;
  out[0] = Math.cos(r) * zScale;
  out[1] = Math.sin(r) * zScale;
  out[2] = z * scale;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat3} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */

function transformMat3(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  out[0] = x * m[0] + y * m[3] + z * m[6];
  out[1] = x * m[1] + y * m[4] + z * m[7];
  out[2] = x * m[2] + y * m[5] + z * m[8];
  return out;
}
/**
 * Transforms the vec3 with a quat
 * Can also be used for dual quaternions. (Multiply it with the real part)
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyQuat} q quaternion to transform with
 * @returns {vec3} out
 */

function transformQuat(out, a, q) {
  // benchmarks: https://jsperf.com/quaternion-transform-vec3-implementations-fixed
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3];
  var x = a[0],
      y = a[1],
      z = a[2]; // var qvec = [qx, qy, qz];
  // var uv = vec3.cross([], qvec, a);

  var uvx = qy * z - qz * y,
      uvy = qz * x - qx * z,
      uvz = qx * y - qy * x; // var uuv = vec3.cross([], qvec, uv);

  var uuvx = qy * uvz - qz * uvy,
      uuvy = qz * uvx - qx * uvz,
      uuvz = qx * uvy - qy * uvx; // vec3.scale(uv, uv, 2 * w);

  var w2 = qw * 2;
  uvx *= w2;
  uvy *= w2;
  uvz *= w2; // vec3.scale(uuv, uuv, 2);

  uuvx *= 2;
  uuvy *= 2;
  uuvz *= 2; // return vec3.add(out, a, vec3.add(out, uv, uuv));

  out[0] = x + uvx + uuvx;
  out[1] = y + uvy + uuvy;
  out[2] = z + uvz + uuvz;
  return out;
}
/**
 * Rotate a 3D vector around the x-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateX(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0];
  r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
  r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateY(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
  r[1] = p[1];
  r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateZ(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
  r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
  r[2] = p[2]; //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Get the angle between two 3D vectors
 * @param {ReadonlyVec3} a The first operand
 * @param {ReadonlyVec3} b The second operand
 * @returns {Number} The angle in radians
 */

function angle(a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2],
      bx = b[0],
      by = b[1],
      bz = b[2],
      mag1 = Math.sqrt(ax * ax + ay * ay + az * az),
      mag2 = Math.sqrt(bx * bx + by * by + bz * bz),
      mag = mag1 * mag2,
      cosine = mag && dot(a, b) / mag;
  return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
/**
 * Set the components of a vec3 to zero
 *
 * @param {vec3} out the receiving vector
 * @returns {vec3} out
 */

function zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  out[2] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {ReadonlyVec3} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

function str(a) {
  return "vec3(" + a[0] + ", " + a[1] + ", " + a[2] + ")";
}
/**
 * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyVec3} a The first vector.
 * @param {ReadonlyVec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {ReadonlyVec3} a The first vector.
 * @param {ReadonlyVec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a2), Math.abs(b2));
}
/**
 * Alias for {@link vec3.subtract}
 * @function
 */

var sub = subtract;
/**
 * Alias for {@link vec3.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link vec3.divide}
 * @function
 */

var div = divide;
/**
 * Alias for {@link vec3.distance}
 * @function
 */

var dist = distance;
/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 */

var sqrDist = squaredDistance;
/**
 * Alias for {@link vec3.length}
 * @function
 */

var len = length;
/**
 * Alias for {@link vec3.squaredLength}
 * @function
 */

var sqrLen = squaredLength;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach = function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
}();

/***/ }),

/***/ "./node_modules/gl-matrix/esm/vec4.js":
/*!********************************************!*\
  !*** ./node_modules/gl-matrix/esm/vec4.js ***!
  \********************************************/
/*! exports provided: create, clone, fromValues, copy, set, add, subtract, multiply, divide, ceil, floor, min, max, round, scale, scaleAndAdd, distance, squaredDistance, length, squaredLength, negate, inverse, normalize, dot, cross, lerp, random, transformMat4, transformQuat, zero, str, exactEquals, equals, sub, mul, div, dist, sqrDist, len, sqrLen, forEach */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "create", function() { return create; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "clone", function() { return clone; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromValues", function() { return fromValues; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "copy", function() { return copy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "set", function() { return set; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "add", function() { return add; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "subtract", function() { return subtract; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "multiply", function() { return multiply; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "divide", function() { return divide; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ceil", function() { return ceil; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "floor", function() { return floor; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "min", function() { return min; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "max", function() { return max; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "round", function() { return round; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "scale", function() { return scale; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "scaleAndAdd", function() { return scaleAndAdd; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "distance", function() { return distance; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "squaredDistance", function() { return squaredDistance; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "length", function() { return length; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "squaredLength", function() { return squaredLength; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "negate", function() { return negate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "inverse", function() { return inverse; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "normalize", function() { return normalize; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dot", function() { return dot; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "cross", function() { return cross; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "lerp", function() { return lerp; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "random", function() { return random; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "transformMat4", function() { return transformMat4; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "transformQuat", function() { return transformQuat; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "zero", function() { return zero; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "str", function() { return str; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "exactEquals", function() { return exactEquals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "equals", function() { return equals; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sub", function() { return sub; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "mul", function() { return mul; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "div", function() { return div; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dist", function() { return dist; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sqrDist", function() { return sqrDist; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "len", function() { return len; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sqrLen", function() { return sqrLen; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "forEach", function() { return forEach; });
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./common.js */ "./node_modules/gl-matrix/esm/common.js");

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */

function create() {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](4);

  if (_common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"] != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Creates a new vec4 initialized with values from an existing vector
 *
 * @param {ReadonlyVec4} a vector to clone
 * @returns {vec4} a new 4D vector
 */

function clone(a) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](4);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Creates a new vec4 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} a new 4D vector
 */

function fromValues(x, y, z, w) {
  var out = new _common_js__WEBPACK_IMPORTED_MODULE_0__["ARRAY_TYPE"](4);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
/**
 * Copy the values from one vec4 to another
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the source vector
 * @returns {vec4} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Set the components of a vec4 to the given values
 *
 * @param {vec4} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} out
 */

function set(out, x, y, z, w) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
/**
 * Adds two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  return out;
}
/**
 * Multiplies two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  out[3] = a[3] * b[3];
  return out;
}
/**
 * Divides two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  out[3] = a[3] / b[3];
  return out;
}
/**
 * Math.ceil the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to ceil
 * @returns {vec4} out
 */

function ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  out[2] = Math.ceil(a[2]);
  out[3] = Math.ceil(a[3]);
  return out;
}
/**
 * Math.floor the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to floor
 * @returns {vec4} out
 */

function floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  out[2] = Math.floor(a[2]);
  out[3] = Math.floor(a[3]);
  return out;
}
/**
 * Returns the minimum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  out[3] = Math.min(a[3], b[3]);
  return out;
}
/**
 * Returns the maximum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  out[3] = Math.max(a[3], b[3]);
  return out;
}
/**
 * Math.round the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to round
 * @returns {vec4} out
 */

function round(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  out[2] = Math.round(a[2]);
  out[3] = Math.round(a[3]);
  return out;
}
/**
 * Scales a vec4 by a scalar number
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec4} out
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  return out;
}
/**
 * Adds two vec4's after scaling the second operand by a scalar value
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec4} out
 */

function scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec4's
 *
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {Number} distance between a and b
 */

function distance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  var w = b[3] - a[3];
  return Math.hypot(x, y, z, w);
}
/**
 * Calculates the squared euclidian distance between two vec4's
 *
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {Number} squared distance between a and b
 */

function squaredDistance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  var w = b[3] - a[3];
  return x * x + y * y + z * z + w * w;
}
/**
 * Calculates the length of a vec4
 *
 * @param {ReadonlyVec4} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  return Math.hypot(x, y, z, w);
}
/**
 * Calculates the squared length of a vec4
 *
 * @param {ReadonlyVec4} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */

function squaredLength(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  return x * x + y * y + z * z + w * w;
}
/**
 * Negates the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to negate
 * @returns {vec4} out
 */

function negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = -a[3];
  return out;
}
/**
 * Returns the inverse of the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to invert
 * @returns {vec4} out
 */

function inverse(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  out[3] = 1.0 / a[3];
  return out;
}
/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to normalize
 * @returns {vec4} out
 */

function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  var len = x * x + y * y + z * z + w * w;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }

  out[0] = x * len;
  out[1] = y * len;
  out[2] = z * len;
  out[3] = w * len;
  return out;
}
/**
 * Calculates the dot product of two vec4's
 *
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}
/**
 * Returns the cross-product of three vectors in a 4-dimensional space
 *
 * @param {ReadonlyVec4} result the receiving vector
 * @param {ReadonlyVec4} U the first vector
 * @param {ReadonlyVec4} V the second vector
 * @param {ReadonlyVec4} W the third vector
 * @returns {vec4} result
 */

function cross(out, u, v, w) {
  var A = v[0] * w[1] - v[1] * w[0],
      B = v[0] * w[2] - v[2] * w[0],
      C = v[0] * w[3] - v[3] * w[0],
      D = v[1] * w[2] - v[2] * w[1],
      E = v[1] * w[3] - v[3] * w[1],
      F = v[2] * w[3] - v[3] * w[2];
  var G = u[0];
  var H = u[1];
  var I = u[2];
  var J = u[3];
  out[0] = H * F - I * E + J * D;
  out[1] = -(G * F) + I * C - J * B;
  out[2] = G * E - H * C + J * A;
  out[3] = -(G * D) + H * B - I * A;
  return out;
}
/**
 * Performs a linear interpolation between two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec4} out
 */

function lerp(out, a, b, t) {
  var ax = a[0];
  var ay = a[1];
  var az = a[2];
  var aw = a[3];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  out[3] = aw + t * (b[3] - aw);
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec4} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec4} out
 */

function random(out, scale) {
  scale = scale || 1.0; // Marsaglia, George. Choosing a Point from the Surface of a
  // Sphere. Ann. Math. Statist. 43 (1972), no. 2, 645--646.
  // http://projecteuclid.org/euclid.aoms/1177692644;

  var v1, v2, v3, v4;
  var s1, s2;

  do {
    v1 = _common_js__WEBPACK_IMPORTED_MODULE_0__["RANDOM"]() * 2 - 1;
    v2 = _common_js__WEBPACK_IMPORTED_MODULE_0__["RANDOM"]() * 2 - 1;
    s1 = v1 * v1 + v2 * v2;
  } while (s1 >= 1);

  do {
    v3 = _common_js__WEBPACK_IMPORTED_MODULE_0__["RANDOM"]() * 2 - 1;
    v4 = _common_js__WEBPACK_IMPORTED_MODULE_0__["RANDOM"]() * 2 - 1;
    s2 = v3 * v3 + v4 * v4;
  } while (s2 >= 1);

  var d = Math.sqrt((1 - s1) / s2);
  out[0] = scale * v1;
  out[1] = scale * v2;
  out[2] = scale * v3 * d;
  out[3] = scale * v4 * d;
  return out;
}
/**
 * Transforms the vec4 with a mat4.
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec4} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2],
      w = a[3];
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
  return out;
}
/**
 * Transforms the vec4 with a quat
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the vector to transform
 * @param {ReadonlyQuat} q quaternion to transform with
 * @returns {vec4} out
 */

function transformQuat(out, a, q) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3]; // calculate quat * vec

  var ix = qw * x + qy * z - qz * y;
  var iy = qw * y + qz * x - qx * z;
  var iz = qw * z + qx * y - qy * x;
  var iw = -qx * x - qy * y - qz * z; // calculate result * inverse quat

  out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
  out[3] = a[3];
  return out;
}
/**
 * Set the components of a vec4 to zero
 *
 * @param {vec4} out the receiving vector
 * @returns {vec4} out
 */

function zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  out[2] = 0.0;
  out[3] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {ReadonlyVec4} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

function str(a) {
  return "vec4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
}
/**
 * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyVec4} a The first vector.
 * @param {ReadonlyVec4} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {ReadonlyVec4} a The first vector.
 * @param {ReadonlyVec4} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  return Math.abs(a0 - b0) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= _common_js__WEBPACK_IMPORTED_MODULE_0__["EPSILON"] * Math.max(1.0, Math.abs(a3), Math.abs(b3));
}
/**
 * Alias for {@link vec4.subtract}
 * @function
 */

var sub = subtract;
/**
 * Alias for {@link vec4.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link vec4.divide}
 * @function
 */

var div = divide;
/**
 * Alias for {@link vec4.distance}
 * @function
 */

var dist = distance;
/**
 * Alias for {@link vec4.squaredDistance}
 * @function
 */

var sqrDist = squaredDistance;
/**
 * Alias for {@link vec4.length}
 * @function
 */

var len = length;
/**
 * Alias for {@link vec4.squaredLength}
 * @function
 */

var sqrLen = squaredLength;
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach = function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
}();

/***/ }),

/***/ "./node_modules/tslib/tslib.es6.js":
/*!*****************************************!*\
  !*** ./node_modules/tslib/tslib.es6.js ***!
  \*****************************************/
/*! exports provided: __extends, __assign, __rest, __decorate, __param, __metadata, __awaiter, __generator, __createBinding, __exportStar, __values, __read, __spread, __spreadArrays, __spreadArray, __await, __asyncGenerator, __asyncDelegator, __asyncValues, __makeTemplateObject, __importStar, __importDefault, __classPrivateFieldGet, __classPrivateFieldSet */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__extends", function() { return __extends; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__assign", function() { return __assign; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__rest", function() { return __rest; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__decorate", function() { return __decorate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__param", function() { return __param; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__metadata", function() { return __metadata; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__awaiter", function() { return __awaiter; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__generator", function() { return __generator; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__createBinding", function() { return __createBinding; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__exportStar", function() { return __exportStar; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__values", function() { return __values; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__read", function() { return __read; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__spread", function() { return __spread; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__spreadArrays", function() { return __spreadArrays; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__spreadArray", function() { return __spreadArray; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__await", function() { return __await; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__asyncGenerator", function() { return __asyncGenerator; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__asyncDelegator", function() { return __asyncDelegator; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__asyncValues", function() { return __asyncValues; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__makeTemplateObject", function() { return __makeTemplateObject; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__importStar", function() { return __importStar; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__importDefault", function() { return __importDefault; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__classPrivateFieldGet", function() { return __classPrivateFieldGet; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__classPrivateFieldSet", function() { return __classPrivateFieldSet; });
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    }
    return __assign.apply(this, arguments);
}

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
}

function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

var __createBinding = Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
});

function __exportStar(m, o) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

/** @deprecated */
function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

/** @deprecated */
function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || from);
}

function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

function __makeTemplateObject(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};

var __setModuleDefault = Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
};

function __importStar(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
}

function __importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { default: mod };
}

function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}


/***/ }),

/***/ "./src/animation.ts":
/*!**************************!*\
  !*** ./src/animation.ts ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Animation = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
/**
 * Represents an animation.
 */
var Animation = /** @class */ (function (_super) {
    tslib_1.__extends(Animation, _super);
    /**
     * Creates a new animation with the specified name.
     * @param name Name for the animation.
     */
    function Animation(name) {
        var _this = _super.call(this) || this;
        _this.name = name;
        /** The speed that the animation will play at. */
        _this.speed = 1;
        /** A value indicating if the animation is looping. */
        _this.loop = false;
        return _this;
    }
    /**
     * Starts playing the animation using the specified ticker.
     * @param ticker The ticker to use for updating the animation. If a ticker
     * is not given, the shared ticker will be used.
     */
    Animation.prototype.play = function (ticker) {
        var _this = this;
        if (ticker === void 0) { ticker = PIXI.Ticker.shared; }
        this.position = 0;
        if (!this._ticker) {
            this._update = function () {
                _this.update(ticker.deltaMS / 1000 * _this.speed);
            };
            this._ticker = ticker.add(this._update);
        }
    };
    /**
     * Stops playing the animation.
     */
    Animation.prototype.stop = function () {
        if (this._ticker && this._update) {
            this._ticker.remove(this._update);
            this._ticker = this._update = undefined;
        }
    };
    /**
     * Updates the animation by the specified delta time.
     * @param delta The time in seconds since last frame.
     */
    Animation.prototype.update = function (delta) {
        this.position += delta;
        if (this.position < this.duration) {
            return;
        }
        if (this.loop) {
            if (this.position > this.duration) {
                this.position = this.position % this.duration;
            }
        }
        else {
            this.position = this.duration;
            this.stop();
        }
        this.emit("complete");
    };
    return Animation;
}(PIXI.utils.EventEmitter));
exports.Animation = Animation;


/***/ }),

/***/ "./src/camera/camera-orbit-control.ts":
/*!********************************************!*\
  !*** ./src/camera/camera-orbit-control.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CameraOrbitControl = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
var camera_1 = __webpack_require__(/*! ./camera */ "./src/camera/camera.ts");
var quat_1 = __webpack_require__(/*! ../math/quat */ "./src/math/quat.ts");
var vec3_1 = __webpack_require__(/*! ../math/vec3 */ "./src/math/vec3.ts");
/**
 * Allows the user to control the camera by orbiting the target.
 */
var CameraOrbitControl = /** @class */ (function () {
    /**
     * Creates a new camera orbit control.
     * @param element The element for listening to user events.
     * @param camera The camera to control. If not set, the main camera will be used
     * by default.
     */
    function CameraOrbitControl(element, camera) {
        var _this = this;
        if (camera === void 0) { camera = camera_1.Camera.main; }
        this.camera = camera;
        this._distance = 5;
        this._grabbed = false;
        this._angles = new PIXI.ObservablePoint(function () {
            _this._angles.x = Math.min(Math.max(0, _this._angles.x), 85);
        }, undefined, 0, 0);
        /** Target position (x, y, z) to orbit. */
        this.target = { x: 0, y: 0, z: 0 };
        /** Allows the camera to be controlled by user. */
        this.allowControl = true;
        this.camera.renderer.on("prerender", function () {
            _this.updateCamera();
        });
        this.camera.renderer.plugins.interaction.on("mousedown", function (e) {
            if (!e.stopped) {
                _this._grabbed = true;
            }
        });
        element.addEventListener("mouseup", function () {
            _this._grabbed = false;
        });
        element.addEventListener("mousemove", function (event) {
            if (_this.allowControl && event.buttons === 1 && _this._grabbed) {
                _this._angles.x += event.movementY * 0.5;
                _this._angles.y -= event.movementX * 0.5;
            }
        });
        element.addEventListener("mousewheel", function (event) {
            if (_this.allowControl) {
                _this.distance += event.deltaY * 0.01;
                event.preventDefault();
            }
        });
    }
    Object.defineProperty(CameraOrbitControl.prototype, "angles", {
        /**
         * Orientation euler angles (x-axis and y-axis). The angle for the x-axis
         * will be clamped between -85 and 85 degrees.
         */
        get: function () {
            return this._angles;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Updates the position and rotation of the camera.
     */
    CameraOrbitControl.prototype.updateCamera = function () {
        var rot = quat_1.Quat.fromEuler(this._angles.x, this._angles.y, 0, new Float32Array(4));
        var dir = vec3_1.Vec3.transformQuat(vec3_1.Vec3.set(0, 0, 1, new Float32Array(3)), rot, new Float32Array(3));
        var pos = vec3_1.Vec3.subtract(vec3_1.Vec3.set(this.target.x, this.target.y, this.target.z, new Float32Array(3)), vec3_1.Vec3.scale(dir, this.distance, new Float32Array(3)), new Float32Array(3));
        this.camera.position.set(pos[0], pos[1], pos[2]);
        this.camera.rotationQuaternion.set(rot[0], rot[1], rot[2], rot[3]);
    };
    Object.defineProperty(CameraOrbitControl.prototype, "distance", {
        /**
         * Distance between camera and the target. Default value is 5.
         */
        get: function () {
            return this._distance;
        },
        set: function (value) {
            this._distance = Math.min(Math.max(value, 0.01), Number.MAX_SAFE_INTEGER);
        },
        enumerable: false,
        configurable: true
    });
    return CameraOrbitControl;
}());
exports.CameraOrbitControl = CameraOrbitControl;


/***/ }),

/***/ "./src/camera/camera.ts":
/*!******************************!*\
  !*** ./src/camera/camera.ts ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Camera = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
var container_1 = __webpack_require__(/*! ../container */ "./src/container.ts");
var mat4_1 = __webpack_require__(/*! ../math/mat4 */ "./src/math/mat4.ts");
var ray_1 = __webpack_require__(/*! ../math/ray */ "./src/math/ray.ts");
var vec3_1 = __webpack_require__(/*! ../math/vec3 */ "./src/math/vec3.ts");
var vec4_1 = __webpack_require__(/*! ../math/vec4 */ "./src/math/vec4.ts");
var matrix_component_1 = __webpack_require__(/*! ../transform/matrix-component */ "./src/transform/matrix-component.ts");
var observable_point_1 = __webpack_require__(/*! ../transform/observable-point */ "./src/transform/observable-point.ts");
var vec3 = new Float32Array(3);
var mat4 = new Float32Array(16);
var vec4 = new Float32Array(4);
/**
 * Camera is a device from which the world is viewed.
 */
var Camera = /** @class */ (function (_super) {
    tslib_1.__extends(Camera, _super);
    /**
     * Creates a new camera using the specified renderer. By default the camera
     * looks towards negative z and is positioned at z = 5.
     * @param renderer Renderer to use.
     */
    function Camera(renderer) {
        var _this = _super.call(this) || this;
        _this.renderer = renderer;
        _this._transformId = 0;
        _this._orthographic = false;
        _this._orthographicSize = 10;
        _this._obliqueness = new PIXI.ObservablePoint(function () {
            _this._transformId++;
        }, undefined);
        _this._fieldOfView = 60;
        _this._near = 0.1;
        _this._far = 1000;
        var aspect = renderer.width / renderer.height;
        var localID = -1;
        _this.renderer.on("prerender", function () {
            if (!_this._aspect) {
                // When there is no specific aspect set, this is used for the 
                // projection matrix to always update each frame (in case when the 
                // renderer aspect ratio has changed).
                if (renderer.width / renderer.height !== aspect) {
                    _this._transformId++;
                    aspect = renderer.width / renderer.height;
                }
            }
            // @ts-ignore: _localID do exist, but be careful if this changes.
            if (!_this.parent && localID !== _this.transform._localID) {
                // When the camera is not attached to the scene hierarchy the transform 
                // needs to be updated manually.
                _this.transform.updateTransform();
                // @ts-ignore: _localID do exist, but be careful if this changes.
                localID = _this.transform._localID;
            }
        });
        if (!Camera.main) {
            Camera.main = _this;
        }
        _this.transform.position.z = 5;
        _this.transform.rotationQuaternion.setEulerAngles(0, 180, 0);
        return _this;
    }
    Object.defineProperty(Camera.prototype, "transformId", {
        get: function () {
            return this.transform._worldID + this._transformId;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Camera.prototype, "obliqueness", {
        /**
         * Used for making the frustum oblique, which means that one side is at a
         * smaller angle to the centre line than the opposite side. Only works with
         * perspective projection.
         */
        get: function () {
            return this._obliqueness;
        },
        set: function (value) {
            this._obliqueness.copyFrom(value);
        },
        enumerable: false,
        configurable: true
    });
    Camera.prototype.destroy = function (options) {
        _super.prototype.destroy.call(this, options);
        if (this === Camera.main) {
            // @ts-ignore It's ok, main camera was destroyed.
            Camera.main = undefined;
        }
    };
    Object.defineProperty(Camera.prototype, "orthographicSize", {
        /**
         * The camera's half-size when in orthographic mode. The visible area from
         * center of the screen to the top.
         */
        get: function () {
            return this._orthographicSize;
        },
        set: function (value) {
            if (this._orthographicSize !== value) {
                this._orthographicSize = value;
                this._transformId++;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Camera.prototype, "orthographic", {
        /**
         * Camera will render objects uniformly, with no sense of perspective.
         */
        get: function () {
            return this._orthographic;
        },
        set: function (value) {
            if (this._orthographic !== value) {
                this._orthographic = value;
                this._transformId++;
            }
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Converts screen coordinates to a ray.
     * @param x Screen x coordinate.
     * @param y Screen y coordinate.
     * @param viewSize The size of the view when not rendering to the entire screen.
     */
    Camera.prototype.screenToRay = function (x, y, viewSize) {
        if (viewSize === void 0) { viewSize = this.renderer.screen; }
        var screen = this.screenToWorld(x, y, 1, undefined, viewSize);
        if (screen) {
            if (this.orthographic) {
                return new ray_1.Ray(screen.array, this.worldTransform.forward);
            }
            return new ray_1.Ray(this.worldTransform.position, vec3_1.Vec3.subtract(screen.array, this.worldTransform.position, vec3));
        }
    };
    /**
     * Converts screen coordinates to world coordinates.
     * @param x Screen x coordinate.
     * @param y Screen y coordinate.
     * @param distance Distance from the camera.
     * @param point Point to set.
     * @param viewSize The size of the view when not rendering to the entire screen.
     */
    Camera.prototype.screenToWorld = function (x, y, distance, point, viewSize) {
        var _a;
        if (point === void 0) { point = new observable_point_1.ObservablePoint3D(function () { }, undefined); }
        if (viewSize === void 0) { viewSize = this.renderer.screen; }
        // Make sure the transform is updated in case something has been changed, 
        // otherwise it may be using wrong values.
        this.transform.updateTransform((_a = this.parent) === null || _a === void 0 ? void 0 : _a.transform);
        var far = this.far;
        // Before doing the calculations, the far clip plane is changed to the same 
        // value as distance from the camera. By doing this we can just set z value 
        // for the clip space to 1 and the desired z position will be correct.
        this.far = distance;
        var invertedViewProjection = mat4_1.Mat4.invert(this.viewProjection, mat4);
        if (invertedViewProjection === null) {
            return;
        }
        var clipSpace = vec4_1.Vec4.set((x / viewSize.width) * 2 - 1, ((y / viewSize.height) * 2 - 1) * -1, 1, 1, vec4);
        this.far = far;
        var worldSpace = vec4_1.Vec4.transformMat4(clipSpace, invertedViewProjection, vec4);
        worldSpace[3] = 1.0 / worldSpace[3];
        for (var i = 0; i < 3; i++) {
            worldSpace[i] *= worldSpace[3];
        }
        return point.set(worldSpace[0], worldSpace[1], worldSpace[2]);
    };
    /**
     * Converts world coordinates to screen coordinates.
     * @param x World x coordinate.
     * @param y World y coordinate.
     * @param z World z coordinate.
     * @param point Point to set.
     * @param viewSize The size of the view when not rendering to the entire screen.
     */
    Camera.prototype.worldToScreen = function (x, y, z, point, viewSize) {
        var _a;
        if (point === void 0) { point = new PIXI.Point(); }
        if (viewSize === void 0) { viewSize = this.renderer.screen; }
        // Make sure the transform is updated in case something has been changed, 
        // otherwise it may be using wrong values.
        this.transform.updateTransform((_a = this.parent) === null || _a === void 0 ? void 0 : _a.transform);
        var worldSpace = vec4_1.Vec4.set(x, y, z, 1, vec4);
        var clipSpace = vec4_1.Vec4.transformMat4(vec4_1.Vec4.transformMat4(worldSpace, this.view, vec4), this.projection, vec4);
        if (clipSpace[3] !== 0) {
            for (var i = 0; i < 3; i++) {
                clipSpace[i] /= clipSpace[3];
            }
        }
        return point.set((clipSpace[0] + 1) / 2 * viewSize.width, viewSize.height - (clipSpace[1] + 1) / 2 * viewSize.height);
    };
    Object.defineProperty(Camera.prototype, "aspect", {
        /**
         * The aspect ratio (width divided by height). If not set, the aspect ratio of
         * the renderer will be used by default.
         */
        get: function () {
            return this._aspect;
        },
        set: function (value) {
            if (this._aspect !== value) {
                this._aspect = value;
                this._transformId++;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Camera.prototype, "fieldOfView", {
        /** The vertical field of view in degrees, 60 is the default value. */
        get: function () {
            return this._fieldOfView;
        },
        set: function (value) {
            if (this._fieldOfView !== value) {
                this._fieldOfView = value;
                this._transformId++;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Camera.prototype, "near", {
        /** The near clipping plane distance, 0.1 is the default value. */
        get: function () {
            return this._near;
        },
        set: function (value) {
            if (this._near !== value) {
                this._near = value;
                this._transformId++;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Camera.prototype, "far", {
        /** The far clipping plane distance, 1000 is the default value. */
        get: function () {
            return this._far;
        },
        set: function (value) {
            if (this._far !== value) {
                this._far = value;
                this._transformId++;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Camera.prototype, "projection", {
        /** Returns the projection matrix. */
        get: function () {
            var _this = this;
            if (!this._projection) {
                this._projection = new matrix_component_1.MatrixComponent(this, 16, function (data) {
                    var aspect = _this._aspect || _this.renderer.width / _this.renderer.height;
                    if (_this._orthographic) {
                        mat4_1.Mat4.ortho(-_this._orthographicSize * aspect, _this._orthographicSize * aspect, -_this._orthographicSize, _this._orthographicSize, _this._near, _this._far, data);
                    }
                    else {
                        mat4_1.Mat4.perspective(_this._fieldOfView * PIXI.DEG_TO_RAD, aspect, _this._near, _this._far, data);
                        data[8] = _this._obliqueness.x;
                        data[9] = _this._obliqueness.y;
                    }
                });
            }
            return this._projection.array;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Camera.prototype, "view", {
        /** Returns the view matrix. */
        get: function () {
            var _this = this;
            if (!this._view) {
                this._view = new matrix_component_1.MatrixComponent(this, 16, function (data) {
                    var target = vec3_1.Vec3.add(_this.worldTransform.position, _this.worldTransform.forward, vec3);
                    mat4_1.Mat4.lookAt(_this.worldTransform.position, target, _this.worldTransform.up, data);
                });
            }
            return this._view.array;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Camera.prototype, "viewProjection", {
        /** Returns the view projection matrix. */
        get: function () {
            var _this = this;
            if (!this._viewProjection) {
                this._viewProjection = new matrix_component_1.MatrixComponent(this, 16, function (data) {
                    mat4_1.Mat4.multiply(_this.projection, _this.view, data);
                });
            }
            return this._viewProjection.array;
        },
        enumerable: false,
        configurable: true
    });
    return Camera;
}(container_1.Container3D));
exports.Camera = Camera;
PIXI.Renderer.registerPlugin("camera", Camera);


/***/ }),

/***/ "./src/capabilities.ts":
/*!*****************************!*\
  !*** ./src/capabilities.ts ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Capabilities = void 0;
var Capabilities;
(function (Capabilities) {
    var _maxVertexUniformVectors;
    function getMaxVertexUniformVectors(renderer) {
        if (_maxVertexUniformVectors !== undefined) {
            return _maxVertexUniformVectors;
        }
        var gl = renderer.gl;
        _maxVertexUniformVectors = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
        return _maxVertexUniformVectors;
    }
    Capabilities.getMaxVertexUniformVectors = getMaxVertexUniformVectors;
    var _isFloatTextureSupported;
    function isFloatingPointTextureSupported(renderer) {
        if (renderer.context.webGLVersion === 2) {
            return true;
        }
        if (_isFloatTextureSupported !== undefined) {
            return _isFloatTextureSupported;
        }
        var gl = renderer.gl;
        _isFloatTextureSupported = !!gl.getExtension("OES_texture_float");
        return _isFloatTextureSupported;
    }
    Capabilities.isFloatingPointTextureSupported = isFloatingPointTextureSupported;
    var _isHalfFloatFramebufferSupported;
    function isHalfFloatFramebufferSupported(renderer) {
        if (renderer.context.webGLVersion === 2) {
            return true;
        }
        if (_isHalfFloatFramebufferSupported !== undefined) {
            return _isHalfFloatFramebufferSupported;
        }
        var gl = renderer.gl;
        var ext = gl.getExtension("OES_texture_half_float");
        if (!ext) {
            return false;
        }
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 8, 8, 0, gl.RGBA, ext.HALF_FLOAT_OES, null);
        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        var attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, texture, 0);
        _isHalfFloatFramebufferSupported = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        return _isHalfFloatFramebufferSupported;
    }
    Capabilities.isHalfFloatFramebufferSupported = isHalfFloatFramebufferSupported;
    var _isFloatFramebufferSupported;
    function isFloatFramebufferSupported(renderer) {
        if (renderer.context.webGLVersion === 2) {
            return true;
        }
        if (_isFloatFramebufferSupported !== undefined) {
            return _isFloatFramebufferSupported;
        }
        var gl = renderer.gl;
        var ext = gl.getExtension("OES_texture_float");
        if (!ext) {
            return false;
        }
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 8, 8, 0, gl.RGBA, gl.FLOAT, null);
        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        var attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, texture, 0);
        _isFloatFramebufferSupported = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        return _isFloatFramebufferSupported;
    }
    Capabilities.isFloatFramebufferSupported = isFloatFramebufferSupported;
    var _isFloatLinearSupported;
    function supportsFloatLinear(renderer) {
        if (_isFloatLinearSupported !== undefined) {
            return _isFloatLinearSupported;
        }
        var gl = renderer.gl;
        _isFloatLinearSupported = gl.getExtension("OES_texture_float_linear") !== null;
        return _isFloatLinearSupported;
    }
    Capabilities.supportsFloatLinear = supportsFloatLinear;
    function isShaderTextureLodSupported(renderer) {
        if (renderer.context.webGLVersion === 2) {
            return true;
        }
        return renderer.gl.getExtension("EXT_shader_texture_lod") !== null;
    }
    Capabilities.isShaderTextureLodSupported = isShaderTextureLodSupported;
    var _isInstancingSupported;
    function isInstancingSupported(renderer) {
        if (_isInstancingSupported !== undefined) {
            return _isInstancingSupported;
        }
        var gl = renderer.gl;
        _isInstancingSupported = gl.getExtension("ANGLE_instanced_arrays") !== undefined;
        return _isInstancingSupported;
    }
    Capabilities.isInstancingSupported = isInstancingSupported;
})(Capabilities = exports.Capabilities || (exports.Capabilities = {}));


/***/ }),

/***/ "./src/color.ts":
/*!**********************!*\
  !*** ./src/color.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Color = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/**
 * Represents a color containing RGBA components.
 */
var Color = /** @class */ (function () {
    /**
     * Creates a new color with the specified components (in range 0-1).
     * @param r The R (red) component.
     * @param g The G (green) component.
     * @param b The B (blue) component.
     * @param a The A (alpha) component.
     */
    function Color(r, g, b, a) {
        if (r === void 0) { r = 0; }
        if (g === void 0) { g = 0; }
        if (b === void 0) { b = 0; }
        if (a === void 0) { a = 1; }
        this._array4 = new Float32Array([r, g, b, a]);
        this._array3 = this._array4.subarray(0, 3);
    }
    /**
     * Creates a new color with the specified components (in range 0-255).
     * @param r The R (red) component.
     * @param g The G (green) component.
     * @param b The B (blue) component.
     * @param a The A (alpha) component.
     */
    Color.fromBytes = function (r, g, b, a) {
        if (r === void 0) { r = 0; }
        if (g === void 0) { g = 0; }
        if (b === void 0) { b = 0; }
        if (a === void 0) { a = 255; }
        return new Color(r / 255, g / 255, b / 255, a / 255);
    };
    /**
     * Creates a new color from the specified hex value.
     * @param hex The hex value as a string or a number.
     */
    Color.fromHex = function (hex) {
        if (typeof hex === "string") {
            hex = parseInt(hex.replace(/[^0-9A-F]/gi, ""), 16);
        }
        return Color.fromBytes((hex >> 16) & 255, (hex >> 8) & 255, hex & 255);
    };
    Object.defineProperty(Color.prototype, "rgb", {
        /** The color as an typed array containing RGB. */
        get: function () {
            return this._array3;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Color.prototype, "rgba", {
        /** The color as an typed array containing RGBA. */
        get: function () {
            return this._array4;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Color.prototype, "r", {
        /** The R (red) component. */
        get: function () {
            return this._array4[0];
        },
        set: function (value) {
            this._array4[0] = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Color.prototype, "g", {
        /** The G (green) component. */
        get: function () {
            return this._array4[1];
        },
        set: function (value) {
            this._array4[1] = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Color.prototype, "b", {
        /** The B (blue) component. */
        get: function () {
            return this._array4[2];
        },
        set: function (value) {
            this._array4[2] = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Color.prototype, "a", {
        /** The A (alpha) component. */
        get: function () {
            return this._array4[3];
        },
        set: function (value) {
            this._array4[3] = value;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Creates a new color from the specified source.
     * @param source The source to create the color from.
     */
    Color.from = function (source) {
        return new (Color.bind.apply(Color, tslib_1.__spreadArray([void 0], tslib_1.__read(source))))();
    };
    return Color;
}());
exports.Color = Color;


/***/ }),

/***/ "./src/container.ts":
/*!**************************!*\
  !*** ./src/container.ts ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Container3D = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
var transform_1 = __webpack_require__(/*! ./transform/transform */ "./src/transform/transform.ts");
/**
 * A container represents a collection of 3D objects.
 */
var Container3D = /** @class */ (function (_super) {
    tslib_1.__extends(Container3D, _super);
    function Container3D() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.transform = new transform_1.Transform3D();
        return _this;
    }
    Object.defineProperty(Container3D.prototype, "position", {
        get: function () {
            return this.transform.position;
        },
        set: function (value) {
            this.transform.position.copyFrom(value);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Container3D.prototype, "scale", {
        get: function () {
            return this.transform.scale;
        },
        set: function (value) {
            this.transform.scale.copyFrom(value);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Container3D.prototype, "rotationQuaternion", {
        /** The quaternion rotation of the object. */
        get: function () {
            return this.transform.rotationQuaternion;
        },
        set: function (value) {
            this.transform.rotationQuaternion.copyFrom(value);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Container3D.prototype, "z", {
        /** The position of the object on the z axis relative to the local
         * coordinates of the parent. */
        get: function () {
            return this.transform.position.z;
        },
        set: function (value) {
            this.transform.position.z = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Container3D.prototype, "localTransform", {
        get: function () {
            return this.transform.localTransform;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Container3D.prototype, "worldTransform", {
        get: function () {
            return this.transform.worldTransform;
        },
        enumerable: false,
        configurable: true
    });
    return Container3D;
}(PIXI.Container));
exports.Container3D = Container3D;


/***/ }),

/***/ "./src/cubemap/cubemap-resource.ts":
/*!*****************************************!*\
  !*** ./src/cubemap/cubemap-resource.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CubemapResource = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var cube_resource_1 = __webpack_require__(/*! ../resource/cube-resource */ "./src/resource/cube-resource.ts");
var CubemapResource = /** @class */ (function (_super) {
    tslib_1.__extends(CubemapResource, _super);
    function CubemapResource(source, levels) {
        if (levels === void 0) { levels = 1; }
        var _this = _super.call(this, source) || this;
        _this.levels = levels;
        return _this;
    }
    CubemapResource.prototype.style = function (renderer) {
        var gl = renderer.gl;
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (this.levels > 1) {
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        }
        else {
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        return true;
    };
    return CubemapResource;
}(cube_resource_1.CubeResource));
exports.CubemapResource = CubemapResource;


/***/ }),

/***/ "./src/cubemap/cubemap.ts":
/*!********************************!*\
  !*** ./src/cubemap/cubemap.ts ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Cubemap = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var mipmap_resource_1 = __webpack_require__(/*! ./mipmap-resource */ "./src/cubemap/mipmap-resource.ts");
var cubemap_resource_1 = __webpack_require__(/*! ./cubemap-resource */ "./src/cubemap/cubemap-resource.ts");
var buffer_resource_1 = __webpack_require__(/*! ../resource/buffer-resource */ "./src/resource/buffer-resource.ts");
/**
 * Cubemap which supports multiple user specified mipmaps.
 */
var Cubemap = /** @class */ (function (_super) {
    tslib_1.__extends(Cubemap, _super);
    function Cubemap() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(Cubemap, "faces", {
        /** Returns an array of faces. */
        get: function () {
            return ["posx", "negx", "posy", "negy", "posz", "negz"];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Cubemap.prototype, "levels", {
        /** Returns the number of mipmap levels. */
        get: function () {
            return this.resource.levels;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Creates a new cubemap from the specified faces.
     * @param faces The faces to create the cubemap from.
     */
    Cubemap.fromFaces = function (faces) {
        var array = Array.isArray(faces) ? faces : [faces];
        var resources = Cubemap.faces.map(function (face, index) {
            return new mipmap_resource_1.MipmapResource(array.map(function (f) { return f[face]; }), pixi_js_1.TARGETS.TEXTURE_CUBE_MAP_POSITIVE_X + index);
        });
        return new Cubemap(new cubemap_resource_1.CubemapResource(resources, array.length));
    };
    /**
     * Creates a new cubemap from the specified colors.
     * @param posx The color for positive x.
     * @param negx The color for negative x.
     * @param posy The color for positive y.
     * @param negy The color for negative y.
     * @param posz The color for positive z.
     * @param negz The color for negative z.
     */
    Cubemap.fromColors = function (posx, negx, posy, negy, posz, negz) {
        if (negx === void 0) { negx = posx; }
        if (posy === void 0) { posy = posx; }
        if (negy === void 0) { negy = posx; }
        if (posz === void 0) { posz = posx; }
        if (negz === void 0) { negz = posx; }
        var resources = [];
        var colors = [posx, negx, posy, negy, posz, negz];
        for (var i = 0; i < colors.length; i++) {
            var resource = new buffer_resource_1.BufferResource(new Uint8Array(colors[i].rgba.map(function (c) { return c * 255; })), { width: 1, height: 1 });
            var texture = new pixi_js_1.Texture(new pixi_js_1.BaseTexture(resource, {
                type: pixi_js_1.TYPES.UNSIGNED_BYTE,
                format: pixi_js_1.FORMATS.RGB,
                alphaMode: pixi_js_1.ALPHA_MODES.NO_PREMULTIPLIED_ALPHA,
            }));
            resources.push(new mipmap_resource_1.MipmapResource([texture], pixi_js_1.TARGETS.TEXTURE_CUBE_MAP_POSITIVE_X + i));
        }
        return new Cubemap(new cubemap_resource_1.CubemapResource(resources, 1));
    };
    return Cubemap;
}(pixi_js_1.BaseTexture));
exports.Cubemap = Cubemap;


/***/ }),

/***/ "./src/cubemap/mipmap-resource.ts":
/*!****************************************!*\
  !*** ./src/cubemap/mipmap-resource.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MipmapResource = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var array_resource_1 = __webpack_require__(/*! ../resource/array-resource */ "./src/resource/array-resource.ts");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var base_image_resource_1 = __webpack_require__(/*! ../resource/base-image-resource */ "./src/resource/base-image-resource.ts");
var buffer_resource_1 = __webpack_require__(/*! ../resource/buffer-resource */ "./src/resource/buffer-resource.ts");
var MipmapResource = /** @class */ (function (_super) {
    tslib_1.__extends(MipmapResource, _super);
    function MipmapResource(source, target) {
        var _this = _super.call(this, source) || this;
        _this.target = target;
        return _this;
    }
    MipmapResource.prototype.upload = function (renderer, baseTexture) {
        renderer.gl.pixelStorei(renderer.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, baseTexture.alphaMode === pixi_js_1.ALPHA_MODES.UNPACK);
        for (var i = 0; i < this.items.length; i++) {
            var resource = this.items[i].resource;
            if (resource instanceof buffer_resource_1.BufferResource) {
                renderer.gl.texImage2D(this.target, i, baseTexture.format, resource.width, resource.height, 0, baseTexture.format, baseTexture.type, resource.data);
            }
            if (resource instanceof base_image_resource_1.BaseImageResource) {
                renderer.gl.texImage2D(this.target, i, baseTexture.format, baseTexture.format, baseTexture.type, resource.source);
            }
        }
        return true;
    };
    return MipmapResource;
}(array_resource_1.ArrayResource));
exports.MipmapResource = MipmapResource;


/***/ }),

/***/ "./src/debug.ts":
/*!**********************!*\
  !*** ./src/debug.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Debug = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
var Debug;
(function (Debug) {
    var messages = [];
    var eventEmitter = new PIXI.utils.EventEmitter();
    function on(event, fn, context) {
        eventEmitter.on(event, fn, context);
    }
    Debug.on = on;
    function warn(message, args) {
        if (!messages.includes(message)) {
            messages.push(message);
            var formatted = formatMessage(message, args);
            console.warn("PIXI3D: " + formatted);
            eventEmitter.emit("warn", formatted);
        }
    }
    Debug.warn = warn;
    function error(message, args) {
        if (!messages.includes(message)) {
            messages.push(message);
            var formatted = formatMessage(message, args);
            console.error("PIXI3D: " + formatted);
            eventEmitter.emit("error", formatted);
        }
    }
    Debug.error = error;
    function formatMessage(message, args) {
        var formatted = message;
        var match;
        while ((match = /{(\w*)}/g.exec(formatted)) !== null && args) {
            formatted = formatted.replace(match[0], args[match[1]]);
        }
        return formatted;
    }
})(Debug = exports.Debug || (exports.Debug = {}));


/***/ }),

/***/ "./src/gltf/animation/gltf-animation.ts":
/*!**********************************************!*\
  !*** ./src/gltf/animation/gltf-animation.ts ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFAnimation = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var animation_1 = __webpack_require__(/*! ../../animation */ "./src/animation.ts");
/**
 * Represents an animation loaded from a glTF model.
 */
var glTFAnimation = /** @class */ (function (_super) {
    tslib_1.__extends(glTFAnimation, _super);
    /**
     * Creates a new glTF animation.
     * @param channels The channels used by this animation.
     * @param name The name for the animation.
     */
    function glTFAnimation(channels, name) {
        var e_1, _a;
        var _this = _super.call(this, name) || this;
        _this._duration = 0;
        _this._position = 0;
        _this._channels = [];
        try {
            for (var channels_1 = tslib_1.__values(channels), channels_1_1 = channels_1.next(); !channels_1_1.done; channels_1_1 = channels_1.next()) {
                var channel = channels_1_1.value;
                _this._duration = Math.max(_this._duration, channel.duration);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (channels_1_1 && !channels_1_1.done && (_a = channels_1.return)) _a.call(channels_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        _this._channels = channels;
        return _this;
    }
    Object.defineProperty(glTFAnimation.prototype, "duration", {
        /** The duration (in seconds) of this animation. */
        get: function () {
            return this._duration;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(glTFAnimation.prototype, "position", {
        /** The current position (in seconds) of this animation. */
        get: function () {
            return this._position;
        },
        set: function (value) {
            var e_2, _a;
            this._position = value;
            try {
                for (var _b = tslib_1.__values(this._channels), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var channel = _c.value;
                    channel.position = this._position;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        },
        enumerable: false,
        configurable: true
    });
    return glTFAnimation;
}(animation_1.Animation));
exports.glTFAnimation = glTFAnimation;


/***/ }),

/***/ "./src/gltf/animation/gltf-channel.ts":
/*!********************************************!*\
  !*** ./src/gltf/animation/gltf-channel.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFChannel = void 0;
/**
 * Represents an glTF animation channel which targets a specific node.
 */
var glTFChannel = /** @class */ (function () {
    /**
     * Creates a new channel with the specified input and interpolation.
     * @param input An array of inputs representing linear time in seconds.
     * @param interpolation The interpolation method to use.
     */
    function glTFChannel(input, interpolation) {
        this._position = 0;
        this._frame = 0;
        this._input = input;
        this._interpolation = interpolation;
    }
    Object.defineProperty(glTFChannel.prototype, "position", {
        /** The position (in seconds) for this channel. */
        get: function () {
            return this._position;
        },
        set: function (value) {
            this.setPosition(value);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(glTFChannel.prototype, "duration", {
        /** The duration (in seconds) for this channel. */
        get: function () {
            return this._input[this._input.length - 1];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(glTFChannel.prototype, "frame", {
        /** The current frame for this channel. */
        get: function () {
            return this._frame;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(glTFChannel.prototype, "length", {
        /** The number of frames for this channel. */
        get: function () {
            return this._input.length;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Sets the position and updates the current frame and animation.
     * @param position The position to set for this channel.
     */
    glTFChannel.prototype.setPosition = function (position) {
        this._position = position;
        this._frame = this.calculateFrame(this._position);
        this.updateTarget(this._interpolation.interpolate(this._frame, this.calculateFramePosition(this._frame, this._position)));
    };
    /**
     * Updates the channel with the specified delta time in seconds.
     * @param delta The time (in seconds) since last frame.
     */
    glTFChannel.prototype.update = function (delta) {
        this.position += delta;
    };
    /**
     * Calculates the position within the specified frame.
     * @param frame The frame to calculate the position in.
     * @param position The position of this channel.
     */
    glTFChannel.prototype.calculateFramePosition = function (frame, position) {
        if (frame === this._input.length - 1) {
            return 1;
        }
        return (position - this._input[frame]) / (this._input[frame + 1] - this._input[frame]);
    };
    /**
     * Calculates the current frame for the specified position.
     * @param position The position of this channel.
     */
    glTFChannel.prototype.calculateFrame = function (position) {
        if (position < this._input[0]) {
            return 0;
        }
        for (var i = 0; i < this._input.length - 1; i++) {
            if (position >= this._input[i] && position < this._input[i + 1]) {
                return i;
            }
        }
        return this._input.length - 1;
    };
    glTFChannel.from = function (input, output, interpolation, path, target) {
        if (path === "translation") {
            return new gltf_translation_1.glTFTranslation(target.transform, input, gltf_interpolation_1.glTFInterpolation.from(interpolation, input, output, 3));
        }
        if (path === "scale") {
            return new gltf_scale_1.glTFScale(target.transform, input, gltf_interpolation_1.glTFInterpolation.from(interpolation, input, output, 3));
        }
        if (path === "rotation") {
            if (interpolation === "LINEAR") {
                return new gltf_rotation_1.glTFRotation(target.transform, input, new gltf_spherical_linear_1.glTFSphericalLinear(output));
            }
            return new gltf_rotation_1.glTFRotation(target.transform, input, gltf_interpolation_1.glTFInterpolation.from(interpolation, input, output, 4));
        }
        if (path === "weights") {
            var weights = target.children[0].targetWeights;
            if (!weights) {
                return undefined;
            }
            return new gltf_weights_1.glTFWeights(weights, input, gltf_interpolation_1.glTFInterpolation.from(interpolation, input, output, weights.length));
        }
        throw new Error("PIXI3D: Unknown channel path \"" + path + "\"");
    };
    return glTFChannel;
}());
exports.glTFChannel = glTFChannel;
var gltf_interpolation_1 = __webpack_require__(/*! ./gltf-interpolation */ "./src/gltf/animation/gltf-interpolation.ts");
var gltf_spherical_linear_1 = __webpack_require__(/*! ./gltf-spherical-linear */ "./src/gltf/animation/gltf-spherical-linear.ts");
var gltf_scale_1 = __webpack_require__(/*! ./gltf-scale */ "./src/gltf/animation/gltf-scale.ts");
var gltf_weights_1 = __webpack_require__(/*! ./gltf-weights */ "./src/gltf/animation/gltf-weights.ts");
var gltf_rotation_1 = __webpack_require__(/*! ./gltf-rotation */ "./src/gltf/animation/gltf-rotation.ts");
var gltf_translation_1 = __webpack_require__(/*! ./gltf-translation */ "./src/gltf/animation/gltf-translation.ts");


/***/ }),

/***/ "./src/gltf/animation/gltf-cubic-spline.ts":
/*!*************************************************!*\
  !*** ./src/gltf/animation/gltf-cubic-spline.ts ***!
  \*************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFCubicSpline = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var gltf_interpolation_1 = __webpack_require__(/*! ./gltf-interpolation */ "./src/gltf/animation/gltf-interpolation.ts");
var glTFCubicSpline = /** @class */ (function (_super) {
    tslib_1.__extends(glTFCubicSpline, _super);
    function glTFCubicSpline(_input, _output, _stride) {
        var _this = _super.call(this) || this;
        _this._input = _input;
        _this._output = _output;
        _this._stride = _stride;
        _this._data = new Float32Array(_stride);
        return _this;
    }
    glTFCubicSpline.prototype.interpolate = function (frame, position) {
        var diff = this._input[frame + 1] - this._input[frame];
        var pos1 = (frame + 0) * this._stride * 3;
        var pos2 = (frame + 1) * this._stride * 3;
        for (var i = 0; i < this._stride; i++) {
            this._data[i] = glTFCubicSpline.calculate(position, this._output[pos1 + i + 1 * this._stride], this._output[pos2 + i + 1 * this._stride], diff * this._output[pos2 + i], diff * this._output[pos1 + i + 2 * this._stride]);
        }
        return this._data;
    };
    glTFCubicSpline.calculate = function (t, p0, p1, m0, m1) {
        return ((2 * (Math.pow(t, 3)) - 3 * (Math.pow(t, 2)) + 1) * p0) + (((Math.pow(t, 3)) - 2 * (Math.pow(t, 2)) + t) * m0) + ((-2 * (Math.pow(t, 3)) + 3 * (Math.pow(t, 2))) * p1) + (((Math.pow(t, 3)) - (Math.pow(t, 2))) * m1);
    };
    return glTFCubicSpline;
}(gltf_interpolation_1.glTFInterpolation));
exports.glTFCubicSpline = glTFCubicSpline;


/***/ }),

/***/ "./src/gltf/animation/gltf-interpolation.ts":
/*!**************************************************!*\
  !*** ./src/gltf/animation/gltf-interpolation.ts ***!
  \**************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFInterpolation = void 0;
/**
 * Represents a specific interpolation method.
 */
var glTFInterpolation = /** @class */ (function () {
    function glTFInterpolation() {
    }
    glTFInterpolation.from = function (type, input, output, stride) {
        switch (type) {
            case "LINEAR": {
                return new gltf_linear_1.glTFLinear(output, stride);
            }
            case "CUBICSPLINE": {
                return new gltf_cubic_spline_1.glTFCubicSpline(input, output, stride);
            }
            case "STEP": {
                return new gltf_step_1.glTFStep(output, stride);
            }
        }
        throw new Error("PIXI3D: Unknown interpolation type \"" + type + "\"");
    };
    return glTFInterpolation;
}());
exports.glTFInterpolation = glTFInterpolation;
// Fixes circular dependency in webpack
var gltf_linear_1 = __webpack_require__(/*! ./gltf-linear */ "./src/gltf/animation/gltf-linear.ts");
var gltf_cubic_spline_1 = __webpack_require__(/*! ./gltf-cubic-spline */ "./src/gltf/animation/gltf-cubic-spline.ts");
var gltf_step_1 = __webpack_require__(/*! ./gltf-step */ "./src/gltf/animation/gltf-step.ts");


/***/ }),

/***/ "./src/gltf/animation/gltf-linear.ts":
/*!*******************************************!*\
  !*** ./src/gltf/animation/gltf-linear.ts ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFLinear = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var gltf_interpolation_1 = __webpack_require__(/*! ./gltf-interpolation */ "./src/gltf/animation/gltf-interpolation.ts");
var glTFLinear = /** @class */ (function (_super) {
    tslib_1.__extends(glTFLinear, _super);
    function glTFLinear(_output, _stride) {
        var _this = _super.call(this) || this;
        _this._output = _output;
        _this._stride = _stride;
        _this._data = new Float32Array(_stride);
        return _this;
    }
    glTFLinear.prototype.interpolate = function (frame, position) {
        var pos1 = (frame + 0) * this._stride;
        var pos2 = (frame + 1) * this._stride;
        for (var i = 0; i < this._stride; i++) {
            if (this._output.length > pos2) {
                this._data[i] = (1 - position) * this._output[pos1 + i] + position * this._output[pos2 + i];
            }
            else {
                this._data[i] = this._output[pos1 + i];
            }
        }
        return this._data;
    };
    return glTFLinear;
}(gltf_interpolation_1.glTFInterpolation));
exports.glTFLinear = glTFLinear;


/***/ }),

/***/ "./src/gltf/animation/gltf-rotation.ts":
/*!*********************************************!*\
  !*** ./src/gltf/animation/gltf-rotation.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFRotation = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var gltf_channel_1 = __webpack_require__(/*! ./gltf-channel */ "./src/gltf/animation/gltf-channel.ts");
var glTFRotation = /** @class */ (function (_super) {
    tslib_1.__extends(glTFRotation, _super);
    function glTFRotation(transform, input, interpolation) {
        var _this = _super.call(this, input, interpolation) || this;
        _this._transform = transform;
        return _this;
    }
    glTFRotation.prototype.updateTarget = function (data) {
        this._transform.rotationQuaternion.set(data[0], data[1], data[2], data[3]);
    };
    return glTFRotation;
}(gltf_channel_1.glTFChannel));
exports.glTFRotation = glTFRotation;


/***/ }),

/***/ "./src/gltf/animation/gltf-scale.ts":
/*!******************************************!*\
  !*** ./src/gltf/animation/gltf-scale.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFScale = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var gltf_channel_1 = __webpack_require__(/*! ./gltf-channel */ "./src/gltf/animation/gltf-channel.ts");
var glTFScale = /** @class */ (function (_super) {
    tslib_1.__extends(glTFScale, _super);
    function glTFScale(transform, input, interpolation) {
        var _this = _super.call(this, input, interpolation) || this;
        _this._transform = transform;
        return _this;
    }
    glTFScale.prototype.updateTarget = function (data) {
        this._transform.scale.set(data[0], data[1], data[2]);
    };
    return glTFScale;
}(gltf_channel_1.glTFChannel));
exports.glTFScale = glTFScale;


/***/ }),

/***/ "./src/gltf/animation/gltf-spherical-linear.ts":
/*!*****************************************************!*\
  !*** ./src/gltf/animation/gltf-spherical-linear.ts ***!
  \*****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFSphericalLinear = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var quat_1 = __webpack_require__(/*! ../../math/quat */ "./src/math/quat.ts");
var gltf_interpolation_1 = __webpack_require__(/*! ./gltf-interpolation */ "./src/gltf/animation/gltf-interpolation.ts");
var glTFSphericalLinear = /** @class */ (function (_super) {
    tslib_1.__extends(glTFSphericalLinear, _super);
    function glTFSphericalLinear(_output) {
        var _this = _super.call(this) || this;
        _this._output = _output;
        _this._data = new Float32Array(4);
        return _this;
    }
    glTFSphericalLinear.prototype.interpolate = function (frame, position) {
        var pos1 = (frame + 0) * 4;
        var pos2 = (frame + 1) * 4;
        var a = quat_1.Quat.set(this._output[pos1], this._output[pos1 + 1], this._output[pos1 + 2], this._output[pos1 + 3], new Float32Array(4));
        if (this._output.length <= pos2) {
            return quat_1.Quat.normalize(a, this._data);
        }
        var b = quat_1.Quat.set(this._output[pos2], this._output[pos2 + 1], this._output[pos2 + 2], this._output[pos2 + 3], new Float32Array(4));
        return quat_1.Quat.normalize(quat_1.Quat.slerp(a, b, position, this._data), this._data);
    };
    return glTFSphericalLinear;
}(gltf_interpolation_1.glTFInterpolation));
exports.glTFSphericalLinear = glTFSphericalLinear;


/***/ }),

/***/ "./src/gltf/animation/gltf-step.ts":
/*!*****************************************!*\
  !*** ./src/gltf/animation/gltf-step.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFStep = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var gltf_interpolation_1 = __webpack_require__(/*! ./gltf-interpolation */ "./src/gltf/animation/gltf-interpolation.ts");
var glTFStep = /** @class */ (function (_super) {
    tslib_1.__extends(glTFStep, _super);
    function glTFStep(_output, _stride) {
        var _this = _super.call(this) || this;
        _this._output = _output;
        _this._stride = _stride;
        _this._data = new Float32Array(_stride);
        return _this;
    }
    glTFStep.prototype.interpolate = function (frame) {
        for (var i = 0; i < this._stride; i++) {
            this._data[i] = this._output[frame * this._stride + i];
        }
        return this._data;
    };
    return glTFStep;
}(gltf_interpolation_1.glTFInterpolation));
exports.glTFStep = glTFStep;


/***/ }),

/***/ "./src/gltf/animation/gltf-translation.ts":
/*!************************************************!*\
  !*** ./src/gltf/animation/gltf-translation.ts ***!
  \************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFTranslation = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var gltf_channel_1 = __webpack_require__(/*! ./gltf-channel */ "./src/gltf/animation/gltf-channel.ts");
var glTFTranslation = /** @class */ (function (_super) {
    tslib_1.__extends(glTFTranslation, _super);
    function glTFTranslation(transform, input, interpolation) {
        var _this = _super.call(this, input, interpolation) || this;
        _this._transform = transform;
        return _this;
    }
    glTFTranslation.prototype.updateTarget = function (data) {
        this._transform.position.set(data[0], data[1], data[2]);
    };
    return glTFTranslation;
}(gltf_channel_1.glTFChannel));
exports.glTFTranslation = glTFTranslation;


/***/ }),

/***/ "./src/gltf/animation/gltf-weights.ts":
/*!********************************************!*\
  !*** ./src/gltf/animation/gltf-weights.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFWeights = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var gltf_channel_1 = __webpack_require__(/*! ./gltf-channel */ "./src/gltf/animation/gltf-channel.ts");
var glTFWeights = /** @class */ (function (_super) {
    tslib_1.__extends(glTFWeights, _super);
    function glTFWeights(weights, input, interpolation) {
        var _this = _super.call(this, input, interpolation) || this;
        _this._weights = weights;
        return _this;
    }
    glTFWeights.prototype.updateTarget = function (data) {
        for (var i = 0; i < data.length; i++) {
            this._weights[i] = data[i];
        }
    };
    return glTFWeights;
}(gltf_channel_1.glTFChannel));
exports.glTFWeights = glTFWeights;


/***/ }),

/***/ "./src/gltf/gltf-asset.ts":
/*!********************************!*\
  !*** ./src/gltf/gltf-asset.ts ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFAsset = void 0;
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
/**
 * glTF assets are JSON files plus supporting external data.
 */
var glTFAsset = /** @class */ (function () {
    /**
     * Creates a new glTF asset using the specified JSON descriptor.
     * @param descriptor The JSON descriptor to create the asset from.
     * @param buffers The buffers used by this asset.
     * @param images The images used by this asset.
     */
    function glTFAsset(descriptor, buffers, images) {
        if (buffers === void 0) { buffers = []; }
        if (images === void 0) { images = []; }
        this.descriptor = descriptor;
        this.buffers = buffers;
        this.images = images;
    }
    /**
     * Loads a new glTF asset (including resources) using the specified JSON
     * descriptor.
     * @param descriptor The JSON descriptor to create the asset from.
     * @param loader The resource loader to use for external resources. The
     * loader can be empty when all resources in the descriptor is embedded.
     */
    glTFAsset.load = function (descriptor, loader) {
        var asset = new glTFAsset(descriptor);
        var _loop_1 = function (i) {
            var buffer = descriptor.buffers[i];
            if (glTFAsset.isEmbeddedResource(buffer.uri)) {
                asset.buffers[i] = createBufferFromBase64(buffer.uri);
            }
            else {
                if (!loader) {
                    throw new Error("PIXI3D: A resource loader is required when buffer is not embedded.");
                }
                loader.load(buffer.uri, function (resource) {
                    asset.buffers[i] = resource.data;
                });
            }
        };
        for (var i = 0; i < descriptor.buffers.length; i++) {
            _loop_1(i);
        }
        if (!descriptor.images) {
            return asset;
        }
        var _loop_2 = function (i) {
            var image = descriptor.images[i];
            if (glTFAsset.isEmbeddedResource(image.uri)) {
                asset.images[i] = pixi_js_1.Texture.from(image.uri);
            }
            else {
                if (!loader) {
                    throw new Error("PIXI3D: A resource loader is required when image is not embedded.");
                }
                loader.load(image.uri, function (resource) {
                    if (resource.texture) {
                        asset.images[i] = resource.texture;
                    }
                });
            }
        };
        for (var i = 0; i < descriptor.images.length; i++) {
            _loop_2(i);
        }
        return asset;
    };
    /**
     * Returns a value indicating if the specified data buffer is a valid glTF.
     * @param buffer The buffer data to validate.
     */
    glTFAsset.isValidBuffer = function (buffer) {
        var header = new Uint32Array(buffer, 0, 3);
        if (header[0] === 0x46546C67 && header[1] === 2) {
            return true;
        }
        return false;
    };
    /**
     * Returns a value indicating if the specified uri is embedded.
     * @param uri The uri to check.
     */
    glTFAsset.isEmbeddedResource = function (uri) {
        return uri.startsWith("data:");
    };
    /**
     * Creates a new glTF asset from binary (glb) buffer data.
     * @param data The binary buffer data to read from.
     * @param cb The function which gets called when the asset has been
     * created.
     */
    glTFAsset.fromBuffer = function (data, cb) {
        var chunks = [];
        var offset = 3 * 4;
        while (offset < data.byteLength) {
            var header = new Uint32Array(data, offset, 3);
            chunks.push({
                length: header[0], type: header[1], offset: offset + 2 * 4
            });
            offset += header[0] + 2 * 4;
        }
        var json = new Uint8Array(data, chunks[0].offset, chunks[0].length);
        var descriptor = JSON.parse(new TextDecoder("utf-8").decode(json));
        var buffers = [];
        for (var i = 1; i < chunks.length; i++) {
            buffers.push(data.slice(chunks[i].offset, chunks[i].offset + chunks[i].length));
        }
        if (!descriptor.images || descriptor.images.length === 0) {
            cb(new glTFAsset(descriptor, buffers));
        }
        var images = [];
        var loaded = 0;
        var loadImageFromBuffer = function (index) {
            var image = descriptor.images[index];
            if (image.bufferView === undefined) {
                return;
            }
            var view = descriptor.bufferViews[image.bufferView];
            var buffer = buffers[view.buffer];
            var array = new Uint8Array(buffer, view.byteOffset, view.byteLength);
            var blob = new Blob([array], { "type": image.mimeType });
            var reader = new FileReader();
            reader.onload = function () {
                images[index] = pixi_js_1.Texture.from(reader.result);
                if (++loaded === descriptor.images.length) {
                    cb(new glTFAsset(descriptor, buffers, images));
                }
            };
            reader.readAsDataURL(blob);
        };
        for (var i = 0; descriptor.images && i < descriptor.images.length; i++) {
            loadImageFromBuffer(i);
        }
    };
    return glTFAsset;
}());
exports.glTFAsset = glTFAsset;
function createBufferFromBase64(value) {
    return Uint8Array.from(atob(value.split(",")[1]), function (c) { return c.charCodeAt(0); }).buffer;
}


/***/ }),

/***/ "./src/gltf/gltf-attribute.ts":
/*!************************************!*\
  !*** ./src/gltf/gltf-attribute.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFAttribute = void 0;
/**
 * Represents data for a specific geometry attribute.
 */
var glTFAttribute = /** @class */ (function () {
    function glTFAttribute(buffer, componentType, stride, min, max) {
        if (stride === void 0) { stride = 0; }
        this.buffer = buffer;
        this.componentType = componentType;
        this.stride = stride;
        this.min = min;
        this.max = max;
    }
    glTFAttribute.from = function (componentType, buffer, offset, size, stride, min, max) {
        switch (componentType) {
            case 5125: return new glTFAttribute(new Uint32Array(buffer, offset, size), componentType, stride, min, max);
            case 5126: return new glTFAttribute(new Float32Array(buffer, offset, size), componentType, stride, min, max);
            case 5120: return new glTFAttribute(new Int8Array(buffer, offset, size), componentType, stride, min, max);
            case 5121: return new glTFAttribute(new Uint8Array(buffer, offset, size), componentType, stride, min, max);
            case 5122: return new glTFAttribute(new Int16Array(buffer, offset, size), componentType, stride, min, max);
            case 5123: return new glTFAttribute(new Uint16Array(buffer, offset, size), componentType, stride, min, max);
            default: {
                throw new Error("PIXI3D: Unknown component type \"" + componentType + "\".");
            }
        }
    };
    return glTFAttribute;
}());
exports.glTFAttribute = glTFAttribute;


/***/ }),

/***/ "./src/gltf/gltf-material.ts":
/*!***********************************!*\
  !*** ./src/gltf/gltf-material.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFMaterial = void 0;
/**
 * glTF defines materials using a common set of parameters that are based on
 * widely used material representations from Physically-Based Rendering (PBR).
 */
var glTFMaterial = /** @class */ (function () {
    function glTFMaterial() {
        this.alphaCutoff = 0.5;
        this.alphaMode = "OPAQUE";
        this.doubleSided = false;
        this.roughness = 1;
        this.metallic = 1;
        this.emissiveFactor = [0, 0, 0];
        this.baseColor = [1, 1, 1, 1];
        this.unlit = false;
    }
    return glTFMaterial;
}());
exports.glTFMaterial = glTFMaterial;


/***/ }),

/***/ "./src/gltf/gltf-parser.ts":
/*!*********************************!*\
  !*** ./src/gltf/gltf-parser.ts ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFParser = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
var gltf_channel_1 = __webpack_require__(/*! ./animation/gltf-channel */ "./src/gltf/animation/gltf-channel.ts");
var gltf_animation_1 = __webpack_require__(/*! ./animation/gltf-animation */ "./src/gltf/animation/gltf-animation.ts");
var gltf_attribute_1 = __webpack_require__(/*! ./gltf-attribute */ "./src/gltf/gltf-attribute.ts");
var gltf_material_1 = __webpack_require__(/*! ./gltf-material */ "./src/gltf/gltf-material.ts");
var mesh_1 = __webpack_require__(/*! ../mesh/mesh */ "./src/mesh/mesh.ts");
var container_1 = __webpack_require__(/*! ../container */ "./src/container.ts");
var standard_material_1 = __webpack_require__(/*! ../material/standard/standard-material */ "./src/material/standard/standard-material.ts");
var mesh_geometry_1 = __webpack_require__(/*! ../mesh/geometry/mesh-geometry */ "./src/mesh/geometry/mesh-geometry.ts");
var model_1 = __webpack_require__(/*! ../model */ "./src/model.ts");
var matrix4_1 = __webpack_require__(/*! ../transform/matrix4 */ "./src/transform/matrix4.ts");
var skin_1 = __webpack_require__(/*! ../skinning/skin */ "./src/skinning/skin.ts");
var joint_1 = __webpack_require__(/*! ../skinning/joint */ "./src/skinning/joint.ts");
/**
 * Parses glTF assets and creates models and meshes.
 */
var glTFParser = /** @class */ (function () {
    /**
     * Creates a new parser using the specified asset.
     * @param asset The asset to parse.
     * @param materialFactory The material factory to use.
     */
    function glTFParser(asset, materialFactory) {
        var _a;
        this._textures = [];
        this._asset = asset;
        this._materialFactory = materialFactory || standard_material_1.StandardMaterial;
        this._descriptor = this._asset.descriptor;
        for (var i = 0; i < ((_a = this._descriptor.textures) === null || _a === void 0 ? void 0 : _a.length); i++) {
            this._textures.push(this.parseTexture(i));
        }
    }
    /**
     * Creates a model from the specified asset.
     * @param asset The asset to create the model from.
     * @param materialFactory The material factory to use.
     */
    glTFParser.createModel = function (asset, materialFactory) {
        return new glTFParser(asset, materialFactory).parseModel();
    };
    /**
     * Creates a mesh from the specified asset.
     * @param asset The asset to create the mesh from.
     * @param materialFactory The material factory to use.
     * @param mesh The mesh index in the JSON descriptor.
     */
    glTFParser.createMesh = function (asset, materialFactory, mesh) {
        if (mesh === void 0) { mesh = 0; }
        return new glTFParser(asset, materialFactory).parseMesh(mesh);
    };
    /**
     * Creates a new buffer view from the specified accessor.
     * @param accessor The accessor object or index.
     */
    glTFParser.prototype.parseBuffer = function (accessor) {
        if (accessor === undefined) {
            return undefined;
        }
        if (typeof accessor === "number") {
            accessor = this._asset.descriptor.accessors[accessor];
        }
        var bufferView = this._descriptor.bufferViews[accessor.bufferView || 0];
        var offset = accessor.byteOffset || 0;
        if (bufferView.byteOffset !== undefined) {
            offset += bufferView.byteOffset;
        }
        var size = accessor.count * componentCount[accessor.type];
        if (bufferView.byteStride !== undefined && bufferView.byteStride !== 0) {
            size = bufferView.byteStride / componentSize[accessor.componentType] * (accessor.count - 1) + componentCount[accessor.type];
        }
        var buffer = this._asset.buffers[bufferView.buffer];
        return gltf_attribute_1.glTFAttribute.from(accessor.componentType, buffer, offset, size, bufferView.byteStride, accessor.min, accessor.max);
    };
    /**
     * Creates an animation from the specified animation.
     * @param animation The source animation object or index.
     * @param nodes The array of nodes which are potential targets for the animation.
     */
    glTFParser.prototype.parseAnimation = function (animation, nodes) {
        var e_1, _a;
        if (typeof animation === "number") {
            animation = this._asset.descriptor.animations[animation];
        }
        var channels = [];
        try {
            for (var _b = tslib_1.__values(animation.channels), _c = _b.next(); !_c.done; _c = _b.next()) {
                var channel = _c.value;
                var sampler = animation.samplers[channel.sampler];
                var input = this.parseBuffer(sampler.input);
                if (input === undefined) {
                    continue;
                }
                var output = this.parseBuffer(sampler.output);
                if (output === undefined) {
                    continue;
                }
                var animationChannel = gltf_channel_1.glTFChannel.from(input.buffer, output.buffer, sampler.interpolation || "LINEAR", channel.target.path, nodes[channel.target.node]);
                if (animationChannel) {
                    channels.push(animationChannel);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return new gltf_animation_1.glTFAnimation(channels, animation.name);
    };
    /**
     * Creates a material from the specified source.
     * @param material The source material object or index.
     */
    glTFParser.prototype.parseMaterial = function (material) {
        if (typeof material === "number") {
            material = this._asset.descriptor.materials[material];
        }
        var result = new gltf_material_1.glTFMaterial();
        if (!material) {
            return this._materialFactory.create(result);
        }
        if (material.occlusionTexture !== undefined) {
            result.occlusionTexture = this._textures[material.occlusionTexture.index].clone();
            result.occlusionTexture.strength = material.occlusionTexture.strength;
            result.occlusionTexture.texCoord = material.occlusionTexture.texCoord;
            if (material.occlusionTexture.extensions && material.occlusionTexture.extensions.KHR_texture_transform) {
                result.occlusionTexture.transform = material.occlusionTexture.extensions.KHR_texture_transform;
                if (material.occlusionTexture.extensions.KHR_texture_transform.texCoord !== undefined) {
                    result.occlusionTexture.texCoord = material.occlusionTexture.extensions.KHR_texture_transform.texCoord;
                }
            }
        }
        if (material.normalTexture !== undefined) {
            result.normalTexture = this._textures[material.normalTexture.index].clone();
            result.normalTexture.scale = material.normalTexture.scale || 1;
            result.normalTexture.texCoord = material.normalTexture.texCoord;
            if (material.normalTexture.extensions && material.normalTexture.extensions.KHR_texture_transform) {
                result.normalTexture.transform = material.normalTexture.extensions.KHR_texture_transform;
                if (material.normalTexture.extensions.KHR_texture_transform.texCoord !== undefined) {
                    result.normalTexture.texCoord = material.normalTexture.extensions.KHR_texture_transform.texCoord;
                }
            }
        }
        if (material.emissiveTexture !== undefined) {
            result.emissiveTexture = this._textures[material.emissiveTexture.index].clone();
            result.emissiveTexture.texCoord = material.emissiveTexture.texCoord;
            if (material.emissiveTexture.extensions && material.emissiveTexture.extensions.KHR_texture_transform) {
                result.emissiveTexture.transform = material.emissiveTexture.extensions.KHR_texture_transform;
                if (material.emissiveTexture.extensions.KHR_texture_transform.texCoord !== undefined) {
                    result.emissiveTexture.texCoord = material.emissiveTexture.extensions.KHR_texture_transform.texCoord;
                }
            }
        }
        if (material.doubleSided !== undefined) {
            result.doubleSided = material.doubleSided;
        }
        if (material.emissiveFactor) {
            result.emissiveFactor = material.emissiveFactor;
        }
        if (material.alphaMode) {
            result.alphaMode = material.alphaMode;
        }
        if (material.alphaCutoff !== undefined) {
            result.alphaCutoff = material.alphaCutoff;
        }
        var pbr = material.pbrMetallicRoughness;
        if ((pbr === null || pbr === void 0 ? void 0 : pbr.metallicRoughnessTexture) !== undefined) {
            result.metallicRoughnessTexture = this._textures[pbr.metallicRoughnessTexture.index].clone();
            result.metallicRoughnessTexture.texCoord = pbr.metallicRoughnessTexture.texCoord;
            if (pbr.metallicRoughnessTexture.extensions && pbr.metallicRoughnessTexture.extensions.KHR_texture_transform) {
                result.metallicRoughnessTexture.transform = pbr.metallicRoughnessTexture.extensions.KHR_texture_transform;
                if (pbr.metallicRoughnessTexture.extensions.KHR_texture_transform.texCoord !== undefined) {
                    result.metallicRoughnessTexture.texCoord = pbr.metallicRoughnessTexture.extensions.KHR_texture_transform.texCoord;
                }
            }
        }
        if (pbr === null || pbr === void 0 ? void 0 : pbr.baseColorFactor) {
            result.baseColor = pbr.baseColorFactor;
        }
        if ((pbr === null || pbr === void 0 ? void 0 : pbr.baseColorTexture) !== undefined) {
            result.baseColorTexture = this._textures[pbr.baseColorTexture.index].clone();
            result.baseColorTexture.texCoord = pbr.baseColorTexture.texCoord;
            if (pbr.baseColorTexture.extensions && pbr.baseColorTexture.extensions.KHR_texture_transform) {
                result.baseColorTexture.transform = pbr.baseColorTexture.extensions.KHR_texture_transform;
                if (pbr.baseColorTexture.extensions.KHR_texture_transform.texCoord !== undefined) {
                    result.baseColorTexture.texCoord = pbr.baseColorTexture.extensions.KHR_texture_transform.texCoord;
                }
            }
        }
        if ((pbr === null || pbr === void 0 ? void 0 : pbr.metallicFactor) !== undefined) {
            result.metallic = pbr.metallicFactor;
        }
        if ((pbr === null || pbr === void 0 ? void 0 : pbr.roughnessFactor) !== undefined) {
            result.roughness = pbr.roughnessFactor;
        }
        if (material.extensions) {
            result.unlit = material.extensions["KHR_materials_unlit"] !== undefined;
        }
        return this._materialFactory.create(result);
    };
    /**
     * Returns the texture used by the specified object.
     * @param source The source object or index.
     */
    glTFParser.prototype.parseTexture = function (index) {
        var texture = this._descriptor.textures[index];
        var image = this._asset.images[texture.source];
        var result = new PIXI.Texture(new PIXI.BaseTexture(image.baseTexture.resource, {
            wrapMode: PIXI.WRAP_MODES.REPEAT,
            // Went back and forth about NO_PREMULTIPLIED_ALPHA. The default in
            // PixiJS is to have premultiplied alpha textures, but this may not work
            // so well when rendering objects as opaque (which have alpha equal to 0).
            // In that case it's impossible to retrieve the original RGB values, 
            // because they are all zero when using premultiplied alpha. Both the glTF
            // Sample Viewer and Babylon.js uses NO_PREMULTIPLIED_ALPHA so decided to
            // do the same.
            alphaMode: PIXI.ALPHA_MODES.NO_PREMULTIPLIED_ALPHA
        }));
        if (this._descriptor.samplers && texture.sampler !== undefined) {
            var sampler = this._descriptor.samplers[texture.sampler];
            switch (sampler.wrapS) {
                case 10497:
                    result.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
                    break;
                case 33648:
                    result.baseTexture.wrapMode = PIXI.WRAP_MODES.MIRRORED_REPEAT;
                    break;
                case 33071:
                    result.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
                    break;
            }
        }
        return result;
    };
    /**
     * Creates an array of meshes from the specified mesh.
     * @param mesh The source mesh object or index.
     * @returns An array which contain arrays of meshes. This is because of the
     * structure used in glTF, where each mesh contain a number of primitives.
     * Read more about this in discussion at https://github.com/KhronosGroup/glTF/issues/821
     */
    glTFParser.prototype.parseMesh = function (mesh) {
        var _this = this;
        if (typeof mesh === "number") {
            mesh = this._asset.descriptor.meshes[mesh];
        }
        var weights = mesh.weights || [];
        return mesh.primitives.map(function (primitive) {
            return Object.assign(_this.parsePrimitive(primitive), {
                name: mesh.name,
                targetWeights: weights
            });
        });
    };
    /**
     * Creates a skin from the specified source.
     * @param skin The source skin object or index.
     * @param target The target container for the skin.
     * @param nodes The array of nodes which are potential targets for the animation.
     */
    glTFParser.prototype.parseSkin = function (skin, target, nodes) {
        if (typeof skin === "number") {
            skin = this._asset.descriptor.skins[skin];
        }
        return new skin_1.Skin(target, skin.joints.map(function (joint) { return nodes[joint]; }));
    };
    /**
     * Creates a mesh from the specified primitive.
     * @param primitive The source primitive object.
     */
    glTFParser.prototype.parsePrimitive = function (primitive) {
        var attributes = primitive.attributes, targets = primitive.targets;
        var geometry = Object.assign(new mesh_geometry_1.MeshGeometry3D(), {
            indices: this.parseBuffer(primitive.indices),
            positions: this.parseBuffer(attributes["POSITION"]),
            normals: this.parseBuffer(attributes["NORMAL"]),
            tangents: this.parseBuffer(attributes["TANGENT"]),
            joints: this.parseBuffer(attributes["JOINTS_0"]),
            weights: this.parseBuffer(attributes["WEIGHTS_0"]),
        });
        for (var i = 0; true; i++) {
            var buffer = this.parseBuffer(attributes["TEXCOORD_" + i]);
            if (buffer === undefined) {
                break;
            }
            geometry.uvs = geometry.uvs || [];
            geometry.uvs.push(buffer);
        }
        if (targets) {
            for (var i = 0; i < targets.length; i++) {
                geometry.targets = geometry.targets || [];
                geometry.targets.push({
                    positions: this.parseBuffer(targets[i]["POSITION"]),
                    normals: this.parseBuffer(targets[i]["NORMAL"]),
                    tangents: this.parseBuffer(targets[i]["TANGENT"])
                });
            }
        }
        var material;
        if (primitive.material !== undefined) {
            material = this.parseMaterial(this._asset.descriptor.materials[primitive.material]);
        }
        else {
            material = this.parseMaterial();
        }
        return new mesh_1.Mesh3D(geometry, material);
    };
    /**
     * Creates a container or joint from the specified node index.
     * @param node The index of the node.
     */
    glTFParser.prototype.parseNode = function (index) {
        var e_2, _a;
        var node = this._asset.descriptor.nodes[index];
        var joint;
        try {
            for (var _b = tslib_1.__values(this._asset.descriptor.skins || []), _c = _b.next(); !_c.done; _c = _b.next()) {
                var skin = _c.value;
                var i = skin.joints.indexOf(index);
                if (i >= 0) {
                    // This node is a joint
                    var inverseBindMatrices = this.parseBuffer(skin.inverseBindMatrices);
                    var inverseBindMatrix = inverseBindMatrices === null || inverseBindMatrices === void 0 ? void 0 : inverseBindMatrices.buffer.slice(i * 16, i * 16 + 16);
                    joint = Object.assign(new joint_1.Joint(inverseBindMatrix), {
                        name: node.name
                    });
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        var container = joint || Object.assign(new container_1.Container3D(), {
            name: node.name
        });
        if (node.translation) {
            container.position.set(node.translation[0], node.translation[1], node.translation[2]);
        }
        if (node.rotation) {
            container.rotationQuaternion.set(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]);
        }
        if (node.scale) {
            container.scale.set(node.scale[0], node.scale[1], node.scale[2]);
        }
        if (node.matrix) {
            container.transform.setFromMatrix(new matrix4_1.Matrix4(node.matrix));
        }
        return container;
    };
    glTFParser.prototype.parseModel = function () {
        var e_3, _a, e_4, _b;
        var _this = this;
        var nodes = this._descriptor.nodes.map(function (n, i) {
            return _this.parseNode(i);
        });
        var scene = this._descriptor.scenes[this._asset.descriptor.scene || 0];
        var model = new model_1.Model();
        var createHierarchy = function (parent, node) {
            var e_5, _a, e_6, _b;
            var mesh = _this._asset.descriptor.nodes[node].mesh;
            var skin;
            if (_this._asset.descriptor.nodes[node].skin !== undefined) {
                skin = _this.parseSkin(_this._asset.descriptor.nodes[node].skin, nodes[node], nodes);
            }
            if (mesh !== undefined) {
                try {
                    for (var _c = tslib_1.__values(_this.parseMesh(mesh)), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var primitive = _d.value;
                        model.meshes.push(nodes[node].addChild(primitive));
                        model.meshes[model.meshes.length - 1].skin = skin;
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
            }
            parent.addChild(nodes[node]);
            if (!_this._asset.descriptor.nodes[node].children) {
                return;
            }
            try {
                for (var _e = tslib_1.__values(_this._asset.descriptor.nodes[node].children), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var child = _f.value;
                    createHierarchy(nodes[node], child);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_6) throw e_6.error; }
            }
        };
        try {
            for (var _c = tslib_1.__values(scene.nodes), _d = _c.next(); !_d.done; _d = _c.next()) {
                var node = _d.value;
                createHierarchy(model, node);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_3) throw e_3.error; }
        }
        if (this._asset.descriptor.animations) {
            try {
                for (var _e = tslib_1.__values(this._asset.descriptor.animations), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var animation = _f.value;
                    model.animations.push(this.parseAnimation(animation, nodes));
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
        return model;
    };
    return glTFParser;
}());
exports.glTFParser = glTFParser;
var componentCount = {
    SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16
};
var componentSize = (_a = {},
    _a[5120] = 1,
    _a[5121] = 1,
    _a[5122] = 2,
    _a[5123] = 2,
    _a[5125] = 4,
    _a[5126] = 4,
    _a);


/***/ }),

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Quat = exports.Mat4 = exports.Vec3 = exports.Plane = exports.Ray = exports.AABB = exports.PostProcessingSprite = exports.ShadowQuality = exports.ShadowCastingLight = exports.ShadowRenderPass = exports.Joint = exports.Skin = exports.PickingInteraction = exports.PickingHitArea = exports.InstancedStandardMaterial = exports.StandardMaterialTexture = exports.StandardMaterialOcclusionTexture = exports.StandardMaterialNormalTexture = exports.StandardMaterialDebugMode = exports.StandardMaterialAlphaMode = exports.StandardMaterial = exports.Skybox = exports.ShaderSourceLoader = exports.Cubemap = exports.CubemapLoader = exports.TextureTransform = exports.MaterialRenderSortType = exports.Material = exports.MaterialRenderPass = exports.StandardPipeline = exports.ImageBasedLighting = exports.LightingEnvironment = exports.Light = exports.LightType = exports.Animation = exports.InstancedModel = exports.Model = exports.MeshShader = exports.MeshGeometry3D = exports.Mesh3D = exports.CameraOrbitControl = exports.Camera = exports.Container3D = exports.Matrix4 = exports.Transform3D = exports.ObservableQuaternion = exports.ObservablePoint3D = exports.glTFAsset = exports.glTFBinaryLoader = exports.glTFLoader = void 0;
exports.Debug = exports.SpriteBillboardType = exports.SpriteBatchRenderer = exports.Sprite3D = exports.CubemapResource = exports.Color = void 0;
var gltf_loader_1 = __webpack_require__(/*! ./loader/gltf-loader */ "./src/loader/gltf-loader.ts");
Object.defineProperty(exports, "glTFLoader", { enumerable: true, get: function () { return gltf_loader_1.glTFLoader; } });
var gltf_binary_loader_1 = __webpack_require__(/*! ./loader/gltf-binary-loader */ "./src/loader/gltf-binary-loader.ts");
Object.defineProperty(exports, "glTFBinaryLoader", { enumerable: true, get: function () { return gltf_binary_loader_1.glTFBinaryLoader; } });
var gltf_asset_1 = __webpack_require__(/*! ./gltf/gltf-asset */ "./src/gltf/gltf-asset.ts");
Object.defineProperty(exports, "glTFAsset", { enumerable: true, get: function () { return gltf_asset_1.glTFAsset; } });
var observable_point_1 = __webpack_require__(/*! ./transform/observable-point */ "./src/transform/observable-point.ts");
Object.defineProperty(exports, "ObservablePoint3D", { enumerable: true, get: function () { return observable_point_1.ObservablePoint3D; } });
var observable_quaternion_1 = __webpack_require__(/*! ./transform/observable-quaternion */ "./src/transform/observable-quaternion.ts");
Object.defineProperty(exports, "ObservableQuaternion", { enumerable: true, get: function () { return observable_quaternion_1.ObservableQuaternion; } });
var transform_1 = __webpack_require__(/*! ./transform/transform */ "./src/transform/transform.ts");
Object.defineProperty(exports, "Transform3D", { enumerable: true, get: function () { return transform_1.Transform3D; } });
var matrix4_1 = __webpack_require__(/*! ./transform/matrix4 */ "./src/transform/matrix4.ts");
Object.defineProperty(exports, "Matrix4", { enumerable: true, get: function () { return matrix4_1.Matrix4; } });
var container_1 = __webpack_require__(/*! ./container */ "./src/container.ts");
Object.defineProperty(exports, "Container3D", { enumerable: true, get: function () { return container_1.Container3D; } });
var camera_1 = __webpack_require__(/*! ./camera/camera */ "./src/camera/camera.ts");
Object.defineProperty(exports, "Camera", { enumerable: true, get: function () { return camera_1.Camera; } });
var camera_orbit_control_1 = __webpack_require__(/*! ./camera/camera-orbit-control */ "./src/camera/camera-orbit-control.ts");
Object.defineProperty(exports, "CameraOrbitControl", { enumerable: true, get: function () { return camera_orbit_control_1.CameraOrbitControl; } });
var mesh_1 = __webpack_require__(/*! ./mesh/mesh */ "./src/mesh/mesh.ts");
Object.defineProperty(exports, "Mesh3D", { enumerable: true, get: function () { return mesh_1.Mesh3D; } });
var mesh_geometry_1 = __webpack_require__(/*! ./mesh/geometry/mesh-geometry */ "./src/mesh/geometry/mesh-geometry.ts");
Object.defineProperty(exports, "MeshGeometry3D", { enumerable: true, get: function () { return mesh_geometry_1.MeshGeometry3D; } });
var mesh_shader_1 = __webpack_require__(/*! ./mesh/mesh-shader */ "./src/mesh/mesh-shader.ts");
Object.defineProperty(exports, "MeshShader", { enumerable: true, get: function () { return mesh_shader_1.MeshShader; } });
var model_1 = __webpack_require__(/*! ./model */ "./src/model.ts");
Object.defineProperty(exports, "Model", { enumerable: true, get: function () { return model_1.Model; } });
var instanced_model_1 = __webpack_require__(/*! ./instanced-model */ "./src/instanced-model.ts");
Object.defineProperty(exports, "InstancedModel", { enumerable: true, get: function () { return instanced_model_1.InstancedModel; } });
var animation_1 = __webpack_require__(/*! ./animation */ "./src/animation.ts");
Object.defineProperty(exports, "Animation", { enumerable: true, get: function () { return animation_1.Animation; } });
var light_type_1 = __webpack_require__(/*! ./lighting/light-type */ "./src/lighting/light-type.ts");
Object.defineProperty(exports, "LightType", { enumerable: true, get: function () { return light_type_1.LightType; } });
var light_1 = __webpack_require__(/*! ./lighting/light */ "./src/lighting/light.ts");
Object.defineProperty(exports, "Light", { enumerable: true, get: function () { return light_1.Light; } });
var lighting_environment_1 = __webpack_require__(/*! ./lighting/lighting-environment */ "./src/lighting/lighting-environment.ts");
Object.defineProperty(exports, "LightingEnvironment", { enumerable: true, get: function () { return lighting_environment_1.LightingEnvironment; } });
var image_based_lighting_1 = __webpack_require__(/*! ./lighting/image-based-lighting */ "./src/lighting/image-based-lighting.ts");
Object.defineProperty(exports, "ImageBasedLighting", { enumerable: true, get: function () { return image_based_lighting_1.ImageBasedLighting; } });
var standard_pipeline_1 = __webpack_require__(/*! ./pipeline/standard-pipeline */ "./src/pipeline/standard-pipeline.ts");
Object.defineProperty(exports, "StandardPipeline", { enumerable: true, get: function () { return standard_pipeline_1.StandardPipeline; } });
var material_render_pass_1 = __webpack_require__(/*! ./pipeline/material-render-pass */ "./src/pipeline/material-render-pass.ts");
Object.defineProperty(exports, "MaterialRenderPass", { enumerable: true, get: function () { return material_render_pass_1.MaterialRenderPass; } });
var material_1 = __webpack_require__(/*! ./material/material */ "./src/material/material.ts");
Object.defineProperty(exports, "Material", { enumerable: true, get: function () { return material_1.Material; } });
var material_render_sort_type_1 = __webpack_require__(/*! ./material/material-render-sort-type */ "./src/material/material-render-sort-type.ts");
Object.defineProperty(exports, "MaterialRenderSortType", { enumerable: true, get: function () { return material_render_sort_type_1.MaterialRenderSortType; } });
var texture_transform_1 = __webpack_require__(/*! ./texture/texture-transform */ "./src/texture/texture-transform.ts");
Object.defineProperty(exports, "TextureTransform", { enumerable: true, get: function () { return texture_transform_1.TextureTransform; } });
var cubemap_loader_1 = __webpack_require__(/*! ./loader/cubemap-loader */ "./src/loader/cubemap-loader.ts");
Object.defineProperty(exports, "CubemapLoader", { enumerable: true, get: function () { return cubemap_loader_1.CubemapLoader; } });
var cubemap_1 = __webpack_require__(/*! ./cubemap/cubemap */ "./src/cubemap/cubemap.ts");
Object.defineProperty(exports, "Cubemap", { enumerable: true, get: function () { return cubemap_1.Cubemap; } });
var shader_source_loader_1 = __webpack_require__(/*! ./loader/shader-source-loader */ "./src/loader/shader-source-loader.ts");
Object.defineProperty(exports, "ShaderSourceLoader", { enumerable: true, get: function () { return shader_source_loader_1.ShaderSourceLoader; } });
var skybox_1 = __webpack_require__(/*! ./skybox/skybox */ "./src/skybox/skybox.ts");
Object.defineProperty(exports, "Skybox", { enumerable: true, get: function () { return skybox_1.Skybox; } });
var standard_material_1 = __webpack_require__(/*! ./material/standard/standard-material */ "./src/material/standard/standard-material.ts");
Object.defineProperty(exports, "StandardMaterial", { enumerable: true, get: function () { return standard_material_1.StandardMaterial; } });
var standard_material_alpha_mode_1 = __webpack_require__(/*! ./material/standard/standard-material-alpha-mode */ "./src/material/standard/standard-material-alpha-mode.ts");
Object.defineProperty(exports, "StandardMaterialAlphaMode", { enumerable: true, get: function () { return standard_material_alpha_mode_1.StandardMaterialAlphaMode; } });
var standard_material_debug_mode_1 = __webpack_require__(/*! ./material/standard/standard-material-debug-mode */ "./src/material/standard/standard-material-debug-mode.ts");
Object.defineProperty(exports, "StandardMaterialDebugMode", { enumerable: true, get: function () { return standard_material_debug_mode_1.StandardMaterialDebugMode; } });
var standard_material_normal_texture_1 = __webpack_require__(/*! ./material/standard/standard-material-normal-texture */ "./src/material/standard/standard-material-normal-texture.ts");
Object.defineProperty(exports, "StandardMaterialNormalTexture", { enumerable: true, get: function () { return standard_material_normal_texture_1.StandardMaterialNormalTexture; } });
var standard_material_occlusion_texture_1 = __webpack_require__(/*! ./material/standard/standard-material-occlusion-texture */ "./src/material/standard/standard-material-occlusion-texture.ts");
Object.defineProperty(exports, "StandardMaterialOcclusionTexture", { enumerable: true, get: function () { return standard_material_occlusion_texture_1.StandardMaterialOcclusionTexture; } });
var standard_material_texture_1 = __webpack_require__(/*! ./material/standard/standard-material-texture */ "./src/material/standard/standard-material-texture.ts");
Object.defineProperty(exports, "StandardMaterialTexture", { enumerable: true, get: function () { return standard_material_texture_1.StandardMaterialTexture; } });
var instanced_standard_material_1 = __webpack_require__(/*! ./material/standard/instanced-standard-material */ "./src/material/standard/instanced-standard-material.ts");
Object.defineProperty(exports, "InstancedStandardMaterial", { enumerable: true, get: function () { return instanced_standard_material_1.InstancedStandardMaterial; } });
var picking_hitarea_1 = __webpack_require__(/*! ./picking/picking-hitarea */ "./src/picking/picking-hitarea.ts");
Object.defineProperty(exports, "PickingHitArea", { enumerable: true, get: function () { return picking_hitarea_1.PickingHitArea; } });
var picking_interaction_1 = __webpack_require__(/*! ./picking/picking-interaction */ "./src/picking/picking-interaction.ts");
Object.defineProperty(exports, "PickingInteraction", { enumerable: true, get: function () { return picking_interaction_1.PickingInteraction; } });
var skin_1 = __webpack_require__(/*! ./skinning/skin */ "./src/skinning/skin.ts");
Object.defineProperty(exports, "Skin", { enumerable: true, get: function () { return skin_1.Skin; } });
var joint_1 = __webpack_require__(/*! ./skinning/joint */ "./src/skinning/joint.ts");
Object.defineProperty(exports, "Joint", { enumerable: true, get: function () { return joint_1.Joint; } });
var shadow_render_pass_1 = __webpack_require__(/*! ./shadow/shadow-render-pass */ "./src/shadow/shadow-render-pass.ts");
Object.defineProperty(exports, "ShadowRenderPass", { enumerable: true, get: function () { return shadow_render_pass_1.ShadowRenderPass; } });
var shadow_casting_light_1 = __webpack_require__(/*! ./shadow/shadow-casting-light */ "./src/shadow/shadow-casting-light.ts");
Object.defineProperty(exports, "ShadowCastingLight", { enumerable: true, get: function () { return shadow_casting_light_1.ShadowCastingLight; } });
var shadow_quality_1 = __webpack_require__(/*! ./shadow/shadow-quality */ "./src/shadow/shadow-quality.ts");
Object.defineProperty(exports, "ShadowQuality", { enumerable: true, get: function () { return shadow_quality_1.ShadowQuality; } });
var post_processing_sprite_1 = __webpack_require__(/*! ./sprite/post-processing-sprite */ "./src/sprite/post-processing-sprite.ts");
Object.defineProperty(exports, "PostProcessingSprite", { enumerable: true, get: function () { return post_processing_sprite_1.PostProcessingSprite; } });
var aabb_1 = __webpack_require__(/*! ./math/aabb */ "./src/math/aabb.ts");
Object.defineProperty(exports, "AABB", { enumerable: true, get: function () { return aabb_1.AABB; } });
var ray_1 = __webpack_require__(/*! ./math/ray */ "./src/math/ray.ts");
Object.defineProperty(exports, "Ray", { enumerable: true, get: function () { return ray_1.Ray; } });
var plane_1 = __webpack_require__(/*! ./math/plane */ "./src/math/plane.ts");
Object.defineProperty(exports, "Plane", { enumerable: true, get: function () { return plane_1.Plane; } });
var vec3_1 = __webpack_require__(/*! ./math/vec3 */ "./src/math/vec3.ts");
Object.defineProperty(exports, "Vec3", { enumerable: true, get: function () { return vec3_1.Vec3; } });
var mat4_1 = __webpack_require__(/*! ./math/mat4 */ "./src/math/mat4.ts");
Object.defineProperty(exports, "Mat4", { enumerable: true, get: function () { return mat4_1.Mat4; } });
var quat_1 = __webpack_require__(/*! ./math/quat */ "./src/math/quat.ts");
Object.defineProperty(exports, "Quat", { enumerable: true, get: function () { return quat_1.Quat; } });
var color_1 = __webpack_require__(/*! ./color */ "./src/color.ts");
Object.defineProperty(exports, "Color", { enumerable: true, get: function () { return color_1.Color; } });
var cubemap_resource_1 = __webpack_require__(/*! ./cubemap/cubemap-resource */ "./src/cubemap/cubemap-resource.ts");
Object.defineProperty(exports, "CubemapResource", { enumerable: true, get: function () { return cubemap_resource_1.CubemapResource; } });
var sprite_1 = __webpack_require__(/*! ./sprite/sprite */ "./src/sprite/sprite.ts");
Object.defineProperty(exports, "Sprite3D", { enumerable: true, get: function () { return sprite_1.Sprite3D; } });
var sprite_batch_renderer_1 = __webpack_require__(/*! ./sprite/sprite-batch-renderer */ "./src/sprite/sprite-batch-renderer.ts");
Object.defineProperty(exports, "SpriteBatchRenderer", { enumerable: true, get: function () { return sprite_batch_renderer_1.SpriteBatchRenderer; } });
var sprite_billboard_type_1 = __webpack_require__(/*! ./sprite/sprite-billboard-type */ "./src/sprite/sprite-billboard-type.ts");
Object.defineProperty(exports, "SpriteBillboardType", { enumerable: true, get: function () { return sprite_billboard_type_1.SpriteBillboardType; } });
var debug_1 = __webpack_require__(/*! ./debug */ "./src/debug.ts");
Object.defineProperty(exports, "Debug", { enumerable: true, get: function () { return debug_1.Debug; } });


/***/ }),

/***/ "./src/instanced-model.ts":
/*!********************************!*\
  !*** ./src/instanced-model.ts ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.InstancedModel = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var container_1 = __webpack_require__(/*! ./container */ "./src/container.ts");
var mesh_1 = __webpack_require__(/*! ./mesh/mesh */ "./src/mesh/mesh.ts");
function clone(node, parent, meshes) {
    var e_1, _a;
    try {
        for (var _b = tslib_1.__values(node.children), _c = _b.next(); !_c.done; _c = _b.next()) {
            var child = _c.value;
            if (child instanceof mesh_1.Mesh3D) {
                var mesh = child.createInstance();
                mesh.name = child.name;
                meshes.push(parent.addChild(mesh));
            }
            else if (child instanceof container_1.Container3D) {
                var copy = parent.addChild(new container_1.Container3D());
                copy.name = node.name;
                copy.position = child.position;
                copy.scale = child.scale;
                copy.rotationQuaternion = child.rotationQuaternion;
                clone(child, copy, meshes);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
/**
 * Represents an instance of a model.
 */
var InstancedModel = /** @class */ (function (_super) {
    tslib_1.__extends(InstancedModel, _super);
    /**
     * Creates a new model instance from the specified model.
     * @param model The model to create instance from.
     */
    function InstancedModel(model) {
        var _this = _super.call(this) || this;
        /** The meshes included in the model. */
        _this.meshes = [];
        clone(model, _this, _this.meshes);
        return _this;
    }
    return InstancedModel;
}(container_1.Container3D));
exports.InstancedModel = InstancedModel;


/***/ }),

/***/ "./src/lighting/assets/lut-ggx.png":
/*!*****************************************!*\
  !*** ./src/lighting/assets/lut-ggx.png ***!
  \*****************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = ("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAADAFBMVEX/AACvAwC4BgC1BQD7AAD3AQDzAQD+AAD9AAD8AQDpAQC/CACxAwD5BgDACwCtAwDxAQC9CADDEQCrAwC7BwC4AQDfAQB+AADvAQD1AQD7AwB7AABrAADHAQDCDgDiAQCyBQCRAQD5AAC1AQDYAQDNAQCpAQCUAQCeAQB0AABhAAD3BwCnAQDCBwCMAACOAAD6BABvAADFAgDsAQD4AACIAADEDADKAQDnAQCfAQCoAwDuEADqFACAAACFAACKAADzCwCCAAC/AQCbAgDKDQDwDgC9AQDBAgCiAAC7AQCkAADlAQD0CACzAQDjGwBoAADEFgB4AAD2CADGEQDGDADQAQDbAQDGCADSAQDNCwDWAQDdAQDUAQBlAAB2AADJCADBGgCVAgDOEADtAQBxAADSDADBFgCZAADnGADXDADcIgDKEgDDAQBcAADQLQCkAwDSEADPCADfHgClAgDXBwDTCADkDACYAAC9IACxLgCiAwCZAgDIFgDINgDdDADxCgDuCACSAQDnEADqCgCPAQBYAAC+HADYJgDLMACWAADOFgDbEQCtMwDSGwCGAADLBgC4JwDbGADaDADBIACoVQDRIQCgAgCxTQDHGwDVKQC6IwDCPACRbADGIQDMGwBUAADgEQDgBwDXEgDkFQDkBgCHdgDnCQDSFQC1KgDWFwDgFwDgDACaRwDCJwCcAADLKAC4LwC2RwDELwCYZADLIACkPQDcBgC9KACFXgDrEAB/ZQCoOgDGKAC+LgDYHACpTwC6QwCWTQB5bQCiWwCcAgCfQgBxdACMVgCzNAB9fwCeYADXIQC4NwC+NgCxOgCHbQCRUQDDNwCrOQDRJwCnRQCYWQCuQQBnfQC+QACNZABziwBskAAY4QCXAgB4hQBghgBllwC1QACtSACfTgBfngCPXABYpQChSAC7PAB/dwCeVABTkQBKnABRrABBuwA4wwBcjgBKtAByfAAxywBApQA3sAAo1QBshgAK8QAY0QBXmgAkxgBPpAAqugBFrgA1uwB98tmWAAAOvklEQVR4nO3Ye1jW5RnA8d+Wtmmews2yJTlXrVWUmUNLt5xSVrpygqJZQShMwqWYOHSWhvMwkSESRRaej5hT8ZiJpCvDI5annGYecmpaOWdhHnff93O6n+f3exFc17yubTfG1V9+P8/9/F54X73Tp/fs+fqfX37xj8///um+3X/bu27GjDfeWLT+ry+//OqrC9/56PXXX3hh9HPPvTZq1LPP9u//2GO9e7du3bpVq1YPPtimTZuOHTvfAVO7dtOmN9xwQ40aNb6P8z01XqXm/4DTp09//b+9gT2n91zZDezZc6U3sOcKb+CbKw745hvo/7cALkcAgLNwA198fsUAZ8+epUfg8081YNF/EnD2/NmzX14UN3AZG+j8LQDOn7948YsLdAO7964jwHof4DUOeKuSgEoJCPDVhQvn5CPgXsEHLqD3twy4eP4rGAM4OqNMAEqqBGgaCKiM4KLsnzvz7wIucwUIOHXqFAD2nagS4EEGCHkHlSBcwPypc8fPnDmxu7xcAtZXFtAxEFClS7iA/ePHj585se+T8r0nsY+vQgQsrAqA/zC2VnApwgXKHz9z7MSJ8vKT66oM6GwDggQVE85h/tgx6H+iALvoVVgJQBsNqOAOLiUAwLHj1P+k/OTJo0fLynYtWrQdAQeCAI+FBFyu4MyZYzjQ37lTAbYDoAQ28M47RwAw2g94CwFD1UMQBHAFoQ0EOCH7a9dAf9eu7ds/gwUcsAGjLEArDehMAHEHFQpCIPadwDr2d0IfF4B9Adh/5MgmDdggANM4IPAOKhIEMPbp/tq1a9esWbFr1yEEHATA/v1HPpKArQLQXwBaM4C6g6oILM1umRf9MgUoEYAjHPCsAfCHwFqBJagMwSsvL9+p+2tWLN91CAEHAbBDAIoAsHXraxsUYFqGfQfOCmzBpQme6K8V+1+xAvqH8AYObyPAJgLMl4DC/oUIyNCAoXwFwYJLGby9J+HhXyvPv2L58kOHtsACDpZs2wGAjQgoQsDWDRtWwQYKC6dN660BQ4cGrUAIOKEihLdO9CmP/fcPbVl9EBagAEVFRfMBkEeAQgRMQwAKhqKAraBJU74DhxBK4a07KvKiv/z997cA4DABNm+0AatyJECuYJgEKEETJahWrUYIQ8DviaNH1xwVedO3ASsJkAeA/oV0BxkZGbiCYQgY2rGjuITqtWs3byIJ1aoZQqCBabwZKi/6CFgt+wgoFhvII0COWIEGGAEAqtdurgRNqlmEChFeWVkZy8u+BhQX0wbmWwApGNbKABre0bB69eYkAEITIbAMoRQIKMO6Of+bb7733ra3P9y8uXTjgmIQrFzpBwzPGP7WMLaChjDVDQG/BRkCJN4b8MtH1k1/yRIDmAeAxQDIQgAIJtMGADA8tEBMtWqhERri7cI5dEjkZf+9JW8DoLR0AQDm+QCTBQBGCOoRoaEhMINBhHJ4i/Bnn8xTXy6AAxYbQM5kAAy0BTBXw4Qg2Agfw4O3PyDYIvK6//aHY0s5YPHEvKw5c1YJwOSBAwcKAAmuB0A9LQgkuAhG8dZvhxF1kRcLGDsW+wuWLQNAAQDysrJAAIBMIcjImKkFQ68fWq/j1RaBDC4iEEKA1dtlXpyfFjB2EADGIaAAARMJMDUnM1OtYOZMtoJ6MA4hpMF2eJ/hrD64+k19fNEfO2jQbAUAwcSJCJgzNVMLZhoBGhwCM4RU0CDgIIy/X0p9CZgoATlCMHeuLbgepp5LEAaFCKXwXj5Ygj/7Dx+WeeiPpfMPmj2bALkCkJU1a9asOVMVgAvu9RG0QSK0ws/wSkpKDsu+yBNA9MdNWJaeC4D8fNjAmFlZCEDBi3O1gAj39uw5rKcmuAaFMAoOAcDhkm0wS7aZvOqPW5aePk8DxsAKJEAKpmsBEHoSga+BIwzDcjRv7h04cIDnqY8PIC1gQjpuIB8BYyyAEExHQc2ZNYfXvNclaIOFYAwlQcCBHdu2URx+/snzE2CCAOQCYIjcQD8QjM8cLwXTpxNhZs2aKDAEaTAIR8Eh3sIDO2g+xBlr+uNEHwDxCBgyhlbQDwTJ48cLwZQpStByuCHYBoYIYMB4C/djfbPKD1LHFxcAgHgBSEFAPwAkJyvBlCmS0KFlSyS4Bo2wFI7D2w+zGWdsqdtHwMj43PhO0EdAQgIA+iVrwZQpFqGmJAiDD+EyJEQD4HdPqcrLPgBGjoyPj+/UCQEpCQkkSHQE02k6KEKAwVK4DO/Ikf0bN5ZSvlTl9QNAfQB0QoAUJCrB0qVLzQ46dCACM0iEUVgMDQHARhwSLJhtHV8vQAJIkJjIBZJwUwiDQjCF65CABTSiLvoT0kdCHwBJkDeAxEQlGCAE0nCTFDCDi7AZyuFtwllAgtnjFjh57Cc5G0BDWlryABwh6IEAmg7GIBFKwRi2w/sA+8ViAzovnj8EJBEgOjoaAVHqDkCQNmDAeC3o0aBBkEEhtIIzeirAB5uKN8Gb3+JlOLpu+hKAhKjuOImpBEgbwJeAhgYNLINEaIVhcAcAioqpD4IJSEhPF4+f6gMgDPPRKVFRJEhNlQJJ6Np1aVcUEEEaNEIpDIM5UOLBR6+i4iK5gGWyrvpiA2FhtIGoaFcgAANuvrkrInr0sPbAEEEM5fBeQME8GpkXdXX+pKQwBaDpLgmpaS4Bpoe7CEuhGRzijSZA0Tx46wNf6bmqD6cfqfpCEBMVowipqZrw5JNCoAwMYRQWgzlaImD0ShzcQK6Yker1Z/oIiIkhQTYTkOFJmCeeGPDEzS7Cp3AcAuKNnj9aAApyhSCeJkn35QoiY3DioqLi4rKzu2cLQrfULt26pXUTBhhmsBUWw3J48Nl7PgDgnWeBvy/rYeFhkTAkoMmmIUOXLmDoRgaDcBWKYTsI4j1HggI58fG5/PyqHx4eKQWxcUEEMrgIo1AM7WAQbyv0F8+nem5BfH7g+RUgMiYWhgGyb7lFAAIQUsEY2mEgDQAAAvjotbgA3/zmF+R3gt9++vxJ4bB904+MlWMbYCyEUIRkMAhIALB1MU1BPgri8/F3j9p+nSTR9wli+UU4CEshGcphQ1Di4T+ACUE+Tic58vEPNxPpGgSiRYsW2dktblHTJZihHBqiJd7WPCGYKABKIG6/TlIditP3iIjICJjY2AgJaNSoURz810JNgEIytENDtMTLy8P+RBx895vP+2EyXocmIjxCT7NmzWLhT2xss0Y0LfwKy6Egfok3Ko+GBPDecwjrh1t9EKiJlQY9jVwGdwRCtMTbkLdB5qkP7770+cOsvEWQ06dPAIM7QkI0xduwAf/1JcsIojtFq3yS069zjRxot2/fnr6179PHZgQ6LIhFAQDk87LGjNEAGHMBTllPe3f6WJBG1rSowOKtWoWCiVn42S8lRfSjzQOg+9daQ4i2OMESzWlUEaWFAKzCKxCAISkKEM4X4NTlPKSmbVsfpY89AVtRGASskn3YgALwPo/+gM0j1z7ykG/asgm09HHuCAFz5mTNmiUBKSkuILgO/aCpqqZPMy8HAXMMgG2g6v2KOG2DOV5OjgCAIIEAQAiL9PV1+Lt8fhhiqgACQI4AzEpIUBuAXzl2P6BdUb/SJHB4hQYgriAK+5G8789fJeYnlZlLoDiANhAVHRPQ97Vxfl3ZqciFgBwCwOfOlAT4+BWjAeb4/vhVVzWmv7tx48Y8VUtO5WUEmDp1zqx++MlX98PVj5+gfGM1svadKkwtNmTwCguhP3Vqv34JQIhiC3D6dtzXrRtybEBd+aUHATkCADcAnz8V4Bp1Ab48a/NQ/VBzq/1Vt775ql+/LgIy3Q3wBZi8rNttq1T1qX8rADIlICGKAGwBvM/PbrXZX3e/nDsrnkfpjxxvWmFmjtpAlAbQr1+nz+tW3G0+b+bRS443bbLeALsBp6/zfOsmjak7Te/hwLlPfuEfNgTI1IAYC8D7Tp7i+rR9+wZkX1Fznzu34cj/B8BkAUhM6C5fhE6/sezrPB1dxfv27Tt48GAryiowf6lg2rVrpwGJGhBBAKtv57Eu44NpXnnlYRW+ze62k/PbkCMByQDorgF6AVaf8verel9ZV2dmXTf5ezEfq/kTHwFITsYFdKfXAFuA7rt5FtdtWeZRlntGzE/VvKTGBsQhIIIWENCnZ17nRR3K74q2KausSb7E5sdq/kjDAVEAiBU3IBeg+ip/P+bl4eno78KoY4u0DPMqy8m5W85dd92FgBcJQDcA/Yg61gJ438qr+h9UW6RNmVdVTs8DarwMAIxXgFi2AKtv52Ud4jAyTm23zLM6+cDP+ViAOPjszxbg9k2ezi7qIq7OrdIm7Eb/bOaXOA5APIJiAVZfHV/m6fCmzto6bYWtJs6v1HgZAzUgLk7dgLwA3rfydHiqO3GTtsJu9RdmADCXAKnyBtgC3D48eioPh6ezm7qImzYvO9nr+AQC1AU4fXr0VF5unuombtqs7O/+yIwNiIyANwJsAbIv13+buHuZ99V13LSdsMn+Rs3TEpAGAHoEQvX18Vle1dXRVdzfdsNPi/kZjA2I4AC8ANaX2w/KO3HetsumK6dXLw2AF4F4BCrq06On825dxe12ULmXmHtgHIBeAF2A24cXXnDe1EO07fI9em68UQFSu2drAFuA7os89WXeqeujO20rzcJqLIC5AbmA55+nPj++P8/PruPs3Fb6RjaP4xgAPoNqAbVUv29AXyyf8vrwvjo7tz/9uJqnnnrKG64B4gbEAswFqP4zKn+3nXfr+uSBbVamuf12CUjkAL2Avub+nzHHD8izuj65G/elxTgbEDeACxAPQIi+P8/q5ujB7dutEYC0tNTsuKAFsH6IvDy8r27HA9q/EyMBiRyAL4FL9HneHN49Oo8HtGFGjCBAMgPQDcAC6ALg5w/vh8zze684ztJiFKA7/RTAR4BugBaALwDTt4+v887hWd2N+9ojRkyaNIkAA+gZjIiQN0ALUBfg9HX+OjsfWPfHrTYNB4gbkAugC4D+x9QX128f38mHrPvik/gogH4EGtfSC4ALkH08v1y/yYu77+XmA+vBcZx/AeDdATn/vA1ZAAAAAElFTkSuQmCC");

/***/ }),

/***/ "./src/lighting/image-based-lighting.ts":
/*!**********************************************!*\
  !*** ./src/lighting/image-based-lighting.ts ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageBasedLighting = void 0;
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
/**
 * Collection of components used for image-based lighting (IBL), a
 * rendering technique which involves capturing an omnidirectional representation
 * of real-world light information as an image.
 */
var ImageBasedLighting = /** @class */ (function () {
    /**
     * Creates a new image-based lighting object.
     * @param diffuse Cubemap used for the diffuse component.
     * @param specular Cubemap used for the specular component.
     */
    function ImageBasedLighting(diffuse, specular) {
        this._diffuse = diffuse;
        this._specular = specular;
    }
    Object.defineProperty(ImageBasedLighting.prototype, "diffuse", {
        /** Cube texture used for the diffuse component. */
        get: function () {
            return this._diffuse;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImageBasedLighting.prototype, "specular", {
        /** Cube mipmap texture used for the specular component. */
        get: function () {
            return this._specular;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImageBasedLighting.prototype, "valid", {
        /**
         * Value indicating if this object is valid to be used for rendering.
         */
        get: function () {
            return this._diffuse.valid &&
                this._specular.valid && (!this.lookupBrdf || this.lookupBrdf.valid);
        },
        enumerable: false,
        configurable: true
    });
    /** The default BRDF integration map lookup texture. */
    ImageBasedLighting.defaultLookupBrdf = pixi_js_1.Texture.from(__webpack_require__(/*! ./assets/lut-ggx.png */ "./src/lighting/assets/lut-ggx.png").default, {
        mipmap: pixi_js_1.MIPMAP_MODES.OFF
    });
    return ImageBasedLighting;
}());
exports.ImageBasedLighting = ImageBasedLighting;


/***/ }),

/***/ "./src/lighting/light-type.ts":
/*!************************************!*\
  !*** ./src/lighting/light-type.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.LightType = void 0;
var LightType;
(function (LightType) {
    /**
     * A light that is located at a point and emits light in a cone shape.
     */
    LightType["spot"] = "spot";
    /**
     * A light that is located infinitely far away, and emits light in one
     * direction only.
     */
    LightType["directional"] = "directional";
    /**
     * A light that is located at a point and emits light in all directions
     * equally.
     */
    LightType["point"] = "point";
    LightType["ambient"] = "ambient";
})(LightType = exports.LightType || (exports.LightType = {}));


/***/ }),

/***/ "./src/lighting/light.ts":
/*!*******************************!*\
  !*** ./src/lighting/light.ts ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Light = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var color_1 = __webpack_require__(/*! ../color */ "./src/color.ts");
var container_1 = __webpack_require__(/*! ../container */ "./src/container.ts");
var light_type_1 = __webpack_require__(/*! ./light-type */ "./src/lighting/light-type.ts");
var Light = /** @class */ (function (_super) {
    tslib_1.__extends(Light, _super);
    function Light() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /** The type of the light. */
        _this.type = light_type_1.LightType.point;
        /** The color of the light. */
        _this.color = new color_1.Color(1, 1, 1);
        /** The range of the light. */
        _this.range = 10;
        /** The intensity of the light. */
        _this.intensity = 10;
        /** The inner cone angle specified in degrees. */
        _this.innerConeAngle = 0;
        /** The outer cone angle specified in degrees. */
        _this.outerConeAngle = 45;
        return _this;
    }
    return Light;
}(container_1.Container3D));
exports.Light = Light;


/***/ }),

/***/ "./src/lighting/lighting-environment.ts":
/*!**********************************************!*\
  !*** ./src/lighting/lighting-environment.ts ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.LightingEnvironment = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
/**
 * A lighting environment represents the different lighting conditions for a
 * specific object or an entire scene.
 */
var LightingEnvironment = /** @class */ (function () {
    /**
     * Creates a new lighting environment using the specified renderer.
     * @param renderer The renderer to use.
     */
    function LightingEnvironment(renderer, imageBasedLighting) {
        var _this = this;
        this.renderer = renderer;
        /** The lights affecting this lighting environment. */
        this.lights = [];
        this.renderer.on("prerender", function () {
            var e_1, _a;
            try {
                for (var _b = tslib_1.__values(_this.lights), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var light = _c.value;
                    // Make sure the transform has been updated in the case where the light
                    // is not part of the stage hierarchy.
                    if (!light.parent) {
                        light.transform.updateTransform();
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
        if (!LightingEnvironment.main) {
            LightingEnvironment.main = this;
        }
        this.imageBasedLighting = imageBasedLighting;
    }
    LightingEnvironment.prototype.destroy = function () {
    };
    Object.defineProperty(LightingEnvironment.prototype, "valid", {
        /** Value indicating if this object is valid to be used for rendering. */
        get: function () {
            return !this.imageBasedLighting || this.imageBasedLighting.valid;
        },
        enumerable: false,
        configurable: true
    });
    return LightingEnvironment;
}());
exports.LightingEnvironment = LightingEnvironment;
pixi_js_1.Renderer.registerPlugin("lighting", LightingEnvironment);


/***/ }),

/***/ "./src/loader/cubemap-loader.ts":
/*!**************************************!*\
  !*** ./src/loader/cubemap-loader.ts ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CubemapLoader = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
var cubemap_1 = __webpack_require__(/*! ../cubemap/cubemap */ "./src/cubemap/cubemap.ts");
exports.CubemapLoader = {
    use: function (resource, next) {
        if (resource.extension !== "cubemap") {
            return next();
        }
        var loader = this;
        var mipmaps = resource.data.map(function (mipmap) {
            return cubemap_1.Cubemap.faces.map(function (face) {
                return resource.url.substring(0, resource.url.lastIndexOf("/") + 1) + mipmap.replace("{{face}}", face);
            });
        });
        // The list of urls (faces and mipmaps) which needs to be loaded before the 
        // cubemap should be created.
        var urls = mipmaps.reduce(function (acc, val) { return acc.concat(val); }, []);
        loader.add(urls.filter(function (url) { return !loader.resources[url]; }).map(function (url) {
            return { parentResource: resource, url: url };
        }));
        var completed = 0;
        // Listen for resources being loaded.
        var binding = loader.onLoad.add(function (loader, res) {
            if (urls.includes(res.url)) {
                if (++completed === urls.length) {
                    // All resources used by cubemap has been loaded.
                    var textures = mipmaps.map(function (face) {
                        return {
                            posx: PIXI.Texture.from(face[0]),
                            negx: PIXI.Texture.from(face[1]),
                            posy: PIXI.Texture.from(face[2]),
                            negy: PIXI.Texture.from(face[3]),
                            posz: PIXI.Texture.from(face[4]),
                            negz: PIXI.Texture.from(face[5]),
                        };
                    });
                    resource.cubemap = cubemap_1.Cubemap.fromFaces(textures);
                    binding.detach();
                }
            }
        });
        next();
    },
    add: function () {
        PIXI.LoaderResource.setExtensionXhrType("cubemap", PIXI.LoaderResource.XHR_RESPONSE_TYPE.JSON);
    }
};
PIXI.Loader.registerPlugin(exports.CubemapLoader);


/***/ }),

/***/ "./src/loader/gltf-binary-loader.ts":
/*!******************************************!*\
  !*** ./src/loader/gltf-binary-loader.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFBinaryLoader = void 0;
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var gltf_asset_1 = __webpack_require__(/*! ../gltf/gltf-asset */ "./src/gltf/gltf-asset.ts");
exports.glTFBinaryLoader = {
    use: function (resource, next) {
        if (resource.extension !== "glb") {
            return next();
        }
        if (gltf_asset_1.glTFAsset.isValidBuffer(resource.data)) {
            gltf_asset_1.glTFAsset.fromBuffer(resource.data, function (gltf) {
                Object.assign(resource, { gltf: gltf });
                next();
            });
        }
        else {
            return next();
        }
    },
    add: function () {
        pixi_js_1.LoaderResource.setExtensionXhrType("glb", pixi_js_1.LoaderResource.XHR_RESPONSE_TYPE.BUFFER);
    }
};
pixi_js_1.Loader.registerPlugin(exports.glTFBinaryLoader);


/***/ }),

/***/ "./src/loader/gltf-loader.ts":
/*!***********************************!*\
  !*** ./src/loader/gltf-loader.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.glTFLoader = void 0;
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var gltf_asset_1 = __webpack_require__(/*! ../gltf/gltf-asset */ "./src/gltf/gltf-asset.ts");
exports.glTFLoader = {
    use: function (resource, next) {
        if (resource.extension !== "gltf") {
            return next();
        }
        var loader = this;
        Object.assign(resource, {
            gltf: gltf_asset_1.glTFAsset.load(resource.data, new glTFExternalResourceLoader(loader, resource))
        });
        next();
    },
    add: function () {
        pixi_js_1.LoaderResource.setExtensionXhrType("bin", pixi_js_1.LoaderResource.XHR_RESPONSE_TYPE.BUFFER);
        pixi_js_1.LoaderResource.setExtensionXhrType("gltf", pixi_js_1.LoaderResource.XHR_RESPONSE_TYPE.JSON);
    }
};
pixi_js_1.Loader.registerPlugin(exports.glTFLoader);
var glTFExternalResourceLoader = /** @class */ (function () {
    function glTFExternalResourceLoader(_loader, _resource) {
        this._loader = _loader;
        this._resource = _resource;
    }
    glTFExternalResourceLoader.prototype.load = function (uri, onComplete) {
        var url = this._resource.url.substring(0, this._resource.url.lastIndexOf("/") + 1) + uri;
        if (!this._loader.resources[url]) {
            // The resource does not exists and needs to be loaded.
            // @ts-ignore
            this._loader.add({ parentResource: this._resource, url: url, onComplete: onComplete });
        }
        else if (this._loader.resources[url].data) {
            // The resource already exists, just use that one.
            onComplete(this._loader.resources[url]);
        }
        else {
            // The resource is in queue to be loaded, wait for it.
            var binding_1 = this._loader.onProgress.add(function (_, resource) {
                if (resource.url === url) {
                    onComplete(resource);
                    binding_1.detach();
                }
            });
        }
    };
    return glTFExternalResourceLoader;
}());


/***/ }),

/***/ "./src/loader/shader-source-loader.ts":
/*!********************************************!*\
  !*** ./src/loader/shader-source-loader.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ShaderSourceLoader = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
var EXTENSIONS = ["glsl", "vert", "frag"];
exports.ShaderSourceLoader = {
    use: function (resource, next) {
        if (!EXTENSIONS.includes(resource.extension)) {
            return next();
        }
        next();
    },
    add: function () {
        var e_1, _a;
        try {
            for (var EXTENSIONS_1 = tslib_1.__values(EXTENSIONS), EXTENSIONS_1_1 = EXTENSIONS_1.next(); !EXTENSIONS_1_1.done; EXTENSIONS_1_1 = EXTENSIONS_1.next()) {
                var ext = EXTENSIONS_1_1.value;
                PIXI.LoaderResource.setExtensionXhrType(ext, PIXI.LoaderResource.XHR_RESPONSE_TYPE.TEXT);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (EXTENSIONS_1_1 && !EXTENSIONS_1_1.done && (_a = EXTENSIONS_1.return)) _a.call(EXTENSIONS_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
};
PIXI.Loader.registerPlugin(exports.ShaderSourceLoader);


/***/ }),

/***/ "./src/material/material-render-sort-type.ts":
/*!***************************************************!*\
  !*** ./src/material/material-render-sort-type.ts ***!
  \***************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialRenderSortType = void 0;
var MaterialRenderSortType;
(function (MaterialRenderSortType) {
    MaterialRenderSortType["opaque"] = "opaque";
    MaterialRenderSortType["transparent"] = "transparent";
})(MaterialRenderSortType = exports.MaterialRenderSortType || (exports.MaterialRenderSortType = {}));


/***/ }),

/***/ "./src/material/material.ts":
/*!**********************************!*\
  !*** ./src/material/material.ts ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Material = void 0;
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var material_render_sort_type_1 = __webpack_require__(/*! ./material-render-sort-type */ "./src/material/material-render-sort-type.ts");
/**
 * Materials are used to render a mesh with a specific visual appearance.
 */
var Material = /** @class */ (function () {
    function Material() {
        this._renderSortType = material_render_sort_type_1.MaterialRenderSortType.opaque;
        /** State used to render a mesh. */
        this.state = Object.assign(new pixi_js_1.State(), {
            culling: true, clockwiseFrontFace: false, depthTest: true
        });
        /** Draw mode used to render a mesh. */
        this.drawMode = pixi_js_1.DRAW_MODES.TRIANGLES;
        /**
         * Sort type used to render a mesh. Transparent materials will be rendered
         * after opaque materials.
         */
        this.renderSortType = material_render_sort_type_1.MaterialRenderSortType.opaque;
    }
    Object.defineProperty(Material.prototype, "depthMask", {
        /**
         * Value indicating if writing into the depth buffer is enabled or disabled.
         * Depth mask feature is only available in PixiJS 6.0+ and won't have any
         * effects in previous versions.
         */
        get: function () {
            return this.state.depthMask;
        },
        set: function (value) {
            this.state.depthMask = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Material.prototype, "doubleSided", {
        /**
         * Value indicating if the material is double sided. When set to true, the
         * culling state will be set to false.
         */
        get: function () {
            return !this.state.culling;
        },
        set: function (value) {
            this.state.culling = !value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Material.prototype, "blendMode", {
        /** Blend mode used to render a mesh. */
        get: function () {
            return this.state.blendMode;
        },
        set: function (value) {
            this.state.blendMode = value;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Destroys the material and it's used resources.
     */
    Material.prototype.destroy = function () { };
    Object.defineProperty(Material.prototype, "isInstancingSupported", {
        /**
         * Returns a value indicating if this material supports instancing.
         */
        get: function () {
            return false;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Creates a new instanced version of this material.
     */
    Material.prototype.createInstance = function () {
        return undefined;
    };
    /**
     * Renders the specified mesh.
     * @param mesh The mesh to render.
     * @param renderer The renderer to use.
     */
    Material.prototype.render = function (mesh, renderer) {
        if (!this._shader) {
            this._shader = this.createShader(mesh, renderer);
            if (!this._shader) {
                // The shader couldn't be created for some reason. Just ignore it and 
                // try again at next render. The required assets may not have been loaded 
                // yet, so maybe we are waiting for those.
                return;
            }
        }
        if (this.updateUniforms) {
            this.updateUniforms(mesh, this._shader);
        }
        this._shader.render(mesh, renderer, this.state, this.drawMode);
    };
    return Material;
}());
exports.Material = Material;


/***/ }),

/***/ "./src/material/standard/instanced-standard-material.ts":
/*!**************************************************************!*\
  !*** ./src/material/standard/instanced-standard-material.ts ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.InstancedStandardMaterial = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var color_1 = __webpack_require__(/*! ../../color */ "./src/color.ts");
/** Material for instanced meshes which uses the standard material. */
var InstancedStandardMaterial = /** @class */ (function () {
    /** Creates a new instanced standard material from the specified material. */
    function InstancedStandardMaterial(material) {
        this.baseColor = new (color_1.Color.bind.apply(color_1.Color, tslib_1.__spreadArray([void 0], tslib_1.__read(material.baseColor.rgba))))();
    }
    return InstancedStandardMaterial;
}());
exports.InstancedStandardMaterial = InstancedStandardMaterial;


/***/ }),

/***/ "./src/material/standard/shader/metallic-roughness.frag":
/*!**************************************************************!*\
  !*** ./src/material/standard/shader/metallic-roughness.frag ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "#version VERSION\n\n//\n// This fragment shader defines a reference implementation for Physically Based Shading of\n// a microfacet surface material defined by a glTF model.\n//\n// References:\n// [1] Real Shading in Unreal Engine 4\n//     http://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf\n// [2] Physically Based Shading at Disney\n//     http://blog.selfshadow.com/publications/s2012-shading-course/burley/s2012_pbs_disney_brdf_notes_v3.pdf\n// [3] README.md - Environment Maps\n//     https://github.com/KhronosGroup/glTF-WebGL-PBR/#environment-maps\n// [4] \"An Inexpensive BRDF Model for Physically based Rendering\" by Christophe Schlick\n//     https://www.cs.virginia.edu/~jdl/bib/appearance/analytic%20models/schlick94b.pdf\n\n#define FEATURES\n\n#if defined(WEBGL1) //&& defined(USE_TEX_LOD)\n#extension GL_EXT_shader_texture_lod : enable\n#endif\n\n#if defined(WEBGL1)\n#extension GL_OES_standard_derivatives : enable\n#endif\n\n#if defined(WEBGL1) && defined(USE_HDR)\n#extension GL_OES_texture_float : enable\n#extension GL_OES_texture_float_linear : enable\n#endif\n\n#ifdef GL_FRAGMENT_PRECISION_HIGH\n  precision highp float;\n#else\n  precision mediump float;\n#endif\n\nvec4 _texture(sampler2D sampler, vec2 coord)\n{\n#ifdef WEBGL2\n    return texture(sampler, coord);\n#else\n    return texture2D(sampler, coord);\n#endif\n}\n\nvec4 _texture(samplerCube sampler, vec3 coord)\n{\n#ifdef WEBGL2\n    return texture(sampler, coord);\n#else\n    return textureCube(sampler, coord);\n#endif\n}\nvec4 _textureLod(sampler2D sampler, vec2 coord, float lod)\n{\n#ifdef WEBGL2\n    return textureLod(sampler, coord, lod);\n#endif\n#if defined(WEBGL1) && defined(GL_EXT_shader_texture_lod) \n    return texture2DLodEXT(sampler, coord, lod);\n#endif\n    return vec4(0.0);\n}\n\nvec4 _textureLod(samplerCube sampler, vec3 coord, float lod)\n{\n#ifdef WEBGL2\n    return textureLod(sampler, coord, lod);\n#endif\n#if defined(WEBGL1) && defined(GL_EXT_shader_texture_lod) \n    return textureCubeLodEXT(sampler, coord, lod);\n#endif\n    return vec4(0.0);\n}\nvec3 _dFdx(vec3 coord)\n{\n#if defined(WEBGL2) || defined(GL_OES_standard_derivatives)\n    return dFdx(coord);\n#endif\n    return vec3(0.0);\n}\n\nvec3 _dFdy(vec3 coord)\n{\n#if defined(WEBGL2) || defined(GL_OES_standard_derivatives)\n    return dFdy(coord);\n#endif\n    return vec3(0.0);\n}\nFRAG_IN vec2 v_UVCoord1;\nFRAG_IN vec2 v_UVCoord2;\n\n// General Material\n#ifdef HAS_NORMAL_MAP\nuniform sampler2D u_NormalSampler;\nuniform float u_NormalScale;\nuniform int u_NormalUVSet;\nuniform mat3 u_NormalUVTransform;\n#endif\n\n#ifdef HAS_EMISSIVE_MAP\nuniform sampler2D u_EmissiveSampler;\nuniform int u_EmissiveUVSet;\nuniform vec3 u_EmissiveFactor;\nuniform mat3 u_EmissiveUVTransform;\n#endif\n\n#ifdef HAS_OCCLUSION_MAP\nuniform sampler2D u_OcclusionSampler;\nuniform int u_OcclusionUVSet;\nuniform float u_OcclusionStrength;\nuniform mat3 u_OcclusionUVTransform;\n#endif\n\n// Metallic Roughness Material\n#ifdef HAS_BASE_COLOR_MAP\nuniform sampler2D u_BaseColorSampler;\nuniform int u_BaseColorUVSet;\nuniform mat3 u_BaseColorUVTransform;\n#endif\n\n#ifdef HAS_METALLIC_ROUGHNESS_MAP\nuniform sampler2D u_MetallicRoughnessSampler;\nuniform int u_MetallicRoughnessUVSet;\nuniform mat3 u_MetallicRoughnessUVTransform;\n#endif\n\n// Specular Glossiness Material\n#ifdef HAS_DIFFUSE_MAP\nuniform sampler2D u_DiffuseSampler;\nuniform int u_DiffuseUVSet;\nuniform mat3 u_DiffuseUVTransform;\n#endif\n\n#ifdef HAS_SPECULAR_GLOSSINESS_MAP\nuniform sampler2D u_SpecularGlossinessSampler;\nuniform int u_SpecularGlossinessUVSet;\nuniform mat3 u_SpecularGlossinessUVTransform;\n#endif\n\n// IBL\n#ifdef USE_IBL\nuniform samplerCube u_DiffuseEnvSampler;\nuniform samplerCube u_SpecularEnvSampler;\nuniform sampler2D u_brdfLUT;\n#endif\n\n#ifdef USE_SHADOW_MAPPING\nuniform sampler2D u_ShadowSampler;\n#endif\n\nvec2 getNormalUV()\n{\n    vec3 uv = vec3(v_UVCoord1, 1.0);\n#ifdef HAS_NORMAL_MAP\n    uv.xy = u_NormalUVSet < 1 ? v_UVCoord1 : v_UVCoord2;\n    #ifdef HAS_NORMAL_UV_TRANSFORM\n    uv = u_NormalUVTransform * uv;\n    #endif\n#endif\n    return uv.xy;\n}\n\nvec2 getEmissiveUV()\n{\n    vec3 uv = vec3(v_UVCoord1, 1.0);\n#ifdef HAS_EMISSIVE_MAP\n    uv.xy = u_EmissiveUVSet < 1 ? v_UVCoord1 : v_UVCoord2;\n    #ifdef HAS_EMISSIVE_UV_TRANSFORM\n    uv = u_EmissiveUVTransform * uv;\n    #endif\n#endif\n\n    return uv.xy;\n}\n\nvec2 getOcclusionUV()\n{\n    vec3 uv = vec3(v_UVCoord1, 1.0);\n#ifdef HAS_OCCLUSION_MAP\n    uv.xy = u_OcclusionUVSet < 1 ? v_UVCoord1 : v_UVCoord2;\n    #ifdef HAS_OCCLUSION_UV_TRANSFORM\n    uv = u_OcclusionUVTransform * uv;\n    #endif\n#endif\n    return uv.xy;\n}\n\nvec2 getBaseColorUV()\n{\n    vec3 uv = vec3(v_UVCoord1, 1.0);\n#ifdef HAS_BASE_COLOR_MAP\n    uv.xy = u_BaseColorUVSet < 1 ? v_UVCoord1 : v_UVCoord2;\n    #ifdef HAS_BASECOLOR_UV_TRANSFORM\n    uv = u_BaseColorUVTransform * uv;\n    #endif\n#endif\n    return uv.xy;\n}\n\nvec2 getMetallicRoughnessUV()\n{\n    vec3 uv = vec3(v_UVCoord1, 1.0);\n#ifdef HAS_METALLIC_ROUGHNESS_MAP\n    uv.xy = u_MetallicRoughnessUVSet < 1 ? v_UVCoord1 : v_UVCoord2;\n    #ifdef HAS_METALLICROUGHNESS_UV_TRANSFORM\n    uv = u_MetallicRoughnessUVTransform * uv;\n    #endif\n#endif\n    return uv.xy;\n}\n\nvec2 getSpecularGlossinessUV()\n{\n    vec3 uv = vec3(v_UVCoord1, 1.0);\n#ifdef HAS_SPECULAR_GLOSSINESS_MAP\n    uv.xy = u_SpecularGlossinessUVSet < 1 ? v_UVCoord1 : v_UVCoord2;\n    #ifdef HAS_SPECULARGLOSSINESS_UV_TRANSFORM\n    uv = u_SpecularGlossinessUVTransform * uv;\n    #endif\n#endif\n    return uv.xy;\n}\n\nvec2 getDiffuseUV()\n{\n    vec3 uv = vec3(v_UVCoord1, 1.0);\n#ifdef HAS_DIFFUSE_MAP\n    uv.xy = u_DiffuseUVSet < 1 ? v_UVCoord1 : v_UVCoord2;\n    #ifdef HAS_DIFFUSE_UV_TRANSFORM\n    uv = u_DiffuseUVTransform * uv;\n    #endif\n#endif\n    return uv.xy;\n}\n\n// textures.glsl needs to be included\n\nconst float M_PI = 3.141592653589793;\nconst float c_MinReflectance = 0.04;\n\nFRAG_IN vec3 v_Position;\n\n#ifdef HAS_NORMALS\n#ifdef HAS_TANGENTS\nFRAG_IN mat3 v_TBN;\n#else\nFRAG_IN vec3 v_Normal;\n#endif\n#endif\n\n#ifdef HAS_VERTEX_COLOR_VEC3\nFRAG_IN vec3 v_Color;\n#endif\n#ifdef HAS_VERTEX_COLOR_VEC4\nFRAG_IN vec4 v_Color;\n#endif\n\nstruct AngularInfo\n{\n    float NdotL;                  // cos angle between normal and light direction\n    float NdotV;                  // cos angle between normal and view direction\n    float NdotH;                  // cos angle between normal and half vector\n    float LdotH;                  // cos angle between light direction and half vector\n\n    float VdotH;                  // cos angle between view direction and half vector\n\n    vec3 padding;\n};\n\nvec4 getVertexColor()\n{\n   vec4 color = vec4(1.0, 1.0, 1.0, 1.0);\n\n#ifdef HAS_VERTEX_COLOR_VEC3\n    color.rgb = v_Color;\n#endif\n#ifdef HAS_VERTEX_COLOR_VEC4\n    color = v_Color;\n#endif\n\n   return color;\n}\n\n// Find the normal for this fragment, pulling either from a predefined normal map\n// or from the interpolated mesh normal and tangent attributes.\nvec3 getNormal()\n{\n    vec2 UV = getNormalUV();\n\n    // Retrieve the tangent space matrix\n#ifndef HAS_TANGENTS\n    vec3 pos_dx = _dFdx(v_Position);\n    vec3 pos_dy = _dFdy(v_Position);\n    vec3 tex_dx = _dFdx(vec3(UV, 0.0));\n    vec3 tex_dy = _dFdy(vec3(UV, 0.0));\n    vec3 t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);\n\n#ifdef HAS_NORMALS\n    vec3 ng = normalize(v_Normal);\n#else\n    vec3 ng = cross(pos_dx, pos_dy);\n#endif\n\n    t = normalize(t - ng * dot(ng, t));\n    vec3 b = normalize(cross(ng, t));\n    mat3 tbn = mat3(t, b, ng);\n#else // HAS_TANGENTS\n    mat3 tbn = v_TBN;\n#endif\n\n#ifdef HAS_NORMAL_MAP\n    vec3 n = _texture(u_NormalSampler, UV).rgb;\n    n = normalize(tbn * ((2.0 * n - 1.0) * vec3(u_NormalScale, u_NormalScale, 1.0)));\n#else\n    // The tbn matrix is linearly interpolated, so we need to re-normalize\n    vec3 n = normalize(tbn[2].xyz);\n#endif\n\n    return n;\n}\n\nfloat getPerceivedBrightness(vec3 vector)\n{\n    return sqrt(0.299 * vector.r * vector.r + 0.587 * vector.g * vector.g + 0.114 * vector.b * vector.b);\n}\n\n// https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness/examples/convert-between-workflows/js/three.pbrUtilities.js#L34\nfloat solveMetallic(vec3 diffuse, vec3 specular, float oneMinusSpecularStrength) {\n    float specularBrightness = getPerceivedBrightness(specular);\n\n    if (specularBrightness < c_MinReflectance) {\n        return 0.0;\n    }\n\n    float diffuseBrightness = getPerceivedBrightness(diffuse);\n\n    float a = c_MinReflectance;\n    float b = diffuseBrightness * oneMinusSpecularStrength / (1.0 - c_MinReflectance) + specularBrightness - 2.0 * c_MinReflectance;\n    float c = c_MinReflectance - specularBrightness;\n    float D = b * b - 4.0 * a * c;\n\n    return clamp((-b + sqrt(D)) / (2.0 * a), 0.0, 1.0);\n}\n\nAngularInfo getAngularInfo(vec3 pointToLight, vec3 normal, vec3 view)\n{\n    // Standard one-letter names\n    vec3 n = normalize(normal);           // Outward direction of surface point\n    vec3 v = normalize(view);             // Direction from surface point to view\n    vec3 l = normalize(pointToLight);     // Direction from surface point to light\n    vec3 h = normalize(l + v);            // Direction of the vector between l and v\n\n    float NdotL = clamp(dot(n, l), 0.0, 1.0);\n    float NdotV = clamp(dot(n, v), 0.0, 1.0);\n    float NdotH = clamp(dot(n, h), 0.0, 1.0);\n    float LdotH = clamp(dot(l, h), 0.0, 1.0);\n    float VdotH = clamp(dot(v, h), 0.0, 1.0);\n\n    return AngularInfo(\n        NdotL,\n        NdotV,\n        NdotH,\n        LdotH,\n        VdotH,\n        vec3(0, 0, 0)\n    );\n}\n\n#ifdef USE_SHADOW_MAPPING\nFRAG_IN vec4 v_PositionLightSpace;\n#endif\n\nfloat linstep(float low, float high, float v)\n{\n    return clamp((v-low) / (high-low), 0.0, 1.0);\n}\n\n#ifdef USE_SHADOW_MAPPING\nfloat getShadowContribution()\n{\n    vec3 coords = v_PositionLightSpace.xyz / v_PositionLightSpace.w * 0.5 + 0.5;\n    if (coords.z < 0.01 || coords.z > 0.99 || coords.x < 0.01 || coords.x > 0.99 || coords.y < 0.01 || coords.y > 0.99) {\n        return 1.0;\n    }\n    vec2 moments = vec2(1.0) - _texture(u_ShadowSampler, coords.xy).xy;\n    float p = step(coords.z, moments.x);\n    float variance = max(moments.y - moments.x * moments.x, 0.00002);\n    float d = coords.z - moments.x;\n    float pMax = linstep(0.2, 1.0, variance / (variance + d*d));\n    return min(max(p, pMax), 1.0);\n}\n#endif\nuniform float u_Exposure;\n\nconst float GAMMA = 2.2;\nconst float INV_GAMMA = 1.0 / GAMMA;\n\n// linear to sRGB approximation\n// see http://chilliant.blogspot.com/2012/08/srgb-approximations-for-hlsl.html\nvec3 LINEARtoSRGB(vec3 color)\n{\n    return pow(color, vec3(INV_GAMMA));\n}\n\n// sRGB to linear approximation\n// see http://chilliant.blogspot.com/2012/08/srgb-approximations-for-hlsl.html\nvec4 SRGBtoLINEAR(vec4 srgbIn)\n{\n    return vec4(pow(srgbIn.xyz, vec3(GAMMA)), srgbIn.w);\n}\n\n// Uncharted 2 tone map\n// see: http://filmicworlds.com/blog/filmic-tonemapping-operators/\nvec3 toneMapUncharted2Impl(vec3 color)\n{\n    const float A = 0.15;\n    const float B = 0.50;\n    const float C = 0.10;\n    const float D = 0.20;\n    const float E = 0.02;\n    const float F = 0.30;\n    return ((color*(A*color+C*B)+D*E)/(color*(A*color+B)+D*F))-E/F;\n}\n\nvec3 toneMapUncharted(vec3 color)\n{\n    const float W = 11.2;\n    color = toneMapUncharted2Impl(color * 2.0);\n    vec3 whiteScale = 1.0 / toneMapUncharted2Impl(vec3(W));\n    return LINEARtoSRGB(color * whiteScale);\n}\n\n// Hejl Richard tone map\n// see: http://filmicworlds.com/blog/filmic-tonemapping-operators/\nvec3 toneMapHejlRichard(vec3 color)\n{\n    color = max(vec3(0.0), color - vec3(0.004));\n    return (color*(6.2*color+.5))/(color*(6.2*color+1.7)+0.06);\n}\n\n// ACES tone map\n// see: https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/\nvec3 toneMapACES(vec3 color)\n{\n    const float A = 2.51;\n    const float B = 0.03;\n    const float C = 2.43;\n    const float D = 0.59;\n    const float E = 0.14;\n    return LINEARtoSRGB(clamp((color * (A * color + B)) / (color * (C * color + D) + E), 0.0, 1.0));\n}\n\nvec3 toneMap(vec3 color)\n{\n    color *= u_Exposure;\n\n#ifdef TONEMAP_UNCHARTED\n    return toneMapUncharted(color);\n#endif\n\n#ifdef TONEMAP_HEJLRICHARD\n    return toneMapHejlRichard(color);\n#endif\n\n#ifdef TONEMAP_ACES\n    return toneMapACES(color);\n#endif\n\n    return LINEARtoSRGB(color);\n}\n\n\n// KHR_lights_punctual extension.\n// see https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_lights_punctual\n\nstruct Light\n{\n    vec3 direction;\n    float range;\n\n    vec3 color;\n    float intensity;\n\n    vec3 position;\n    float innerConeCos;\n\n    float outerConeCos;\n    int type;\n\n    vec2 padding;\n};\n\nconst int LightType_Directional = 0;\nconst int LightType_Point = 1;\nconst int LightType_Spot = 2;\nconst int LightType_Ambient = 3;\n\n#ifdef USE_PUNCTUAL\nuniform Light u_Lights[LIGHT_COUNT];\n#endif\n\n#if defined(MATERIAL_SPECULARGLOSSINESS) || defined(MATERIAL_METALLICROUGHNESS)\nuniform float u_MetallicFactor;\nuniform float u_RoughnessFactor;\nuniform vec4 u_BaseColorFactor;\n#endif\n\n#ifdef USE_INSTANCING\nFRAG_IN vec4 v_BaseColorFactor;\n#endif\n\n#ifdef MATERIAL_SPECULARGLOSSINESS\nuniform vec3 u_SpecularFactor;\nuniform vec4 u_DiffuseFactor;\nuniform float u_GlossinessFactor;\n#endif\n\n#ifdef ALPHAMODE_MASK\nuniform float u_AlphaCutoff;\n#endif\n\n#ifdef USE_SHADOW_MAPPING\nuniform int u_ShadowLightIndex;\n#endif\n\nuniform vec3 u_Camera;\n\nuniform int u_MipCount;\n\nstruct MaterialInfo\n{\n    float perceptualRoughness;    // roughness value, as authored by the model creator (input to shader)\n    vec3 reflectance0;            // full reflectance color (normal incidence angle)\n\n    float alphaRoughness;         // roughness mapped to a more linear change in the roughness (proposed by [2])\n    vec3 diffuseColor;            // color contribution from diffuse lighting\n\n    vec3 reflectance90;           // reflectance color at grazing angle\n    vec3 specularColor;           // color contribution from specular lighting\n};\n\n// Calculation of the lighting contribution from an optional Image Based Light source.\n// Precomputed Environment Maps are required uniform inputs and are computed as outlined in [1].\n// See our README.md on Environment Maps [3] for additional discussion.\n#ifdef USE_IBL\nvec3 getIBLContribution(MaterialInfo materialInfo, vec3 n, vec3 v)\n{\n    float NdotV = clamp(dot(n, v), 0.0, 1.0);\n\n    float lod = clamp(materialInfo.perceptualRoughness * float(u_MipCount), 0.0, float(u_MipCount));\n    vec3 reflection = normalize(reflect(-v, n));\n\n    vec2 brdfSamplePoint = clamp(vec2(NdotV, materialInfo.perceptualRoughness), vec2(0.0, 0.0), vec2(1.0, 1.0));\n    // retrieve a scale and bias to F0. See [1], Figure 3\n    vec2 brdf = _texture(u_brdfLUT, brdfSamplePoint).rg;\n\n    vec4 diffuseSample = _texture(u_DiffuseEnvSampler, n);\n\n#ifdef USE_TEX_LOD\n    vec4 specularSample = _textureLod(u_SpecularEnvSampler, reflection, lod);\n#else\n    vec4 specularSample = _texture(u_SpecularEnvSampler, reflection);\n#endif\n\n#ifdef USE_HDR\n    // Already linear.\n    vec3 diffuseLight = diffuseSample.rgb;\n    vec3 specularLight = specularSample.rgb;\n#else\n    vec3 diffuseLight = SRGBtoLINEAR(diffuseSample).rgb;\n    vec3 specularLight = SRGBtoLINEAR(specularSample).rgb;\n#endif\n\n    vec3 diffuse = diffuseLight * materialInfo.diffuseColor;\n    vec3 specular = specularLight * (materialInfo.specularColor * brdf.x + brdf.y);\n\n    return diffuse + specular;\n}\n#endif\n\n// Lambert lighting\n// see https://seblagarde.wordpress.com/2012/01/08/pi-or-not-to-pi-in-game-lighting-equation/\nvec3 diffuse(MaterialInfo materialInfo)\n{\n    return materialInfo.diffuseColor / M_PI;\n}\n\n// The following equation models the Fresnel reflectance term of the spec equation (aka F())\n// Implementation of fresnel from [4], Equation 15\nvec3 specularReflection(MaterialInfo materialInfo, AngularInfo angularInfo)\n{\n    return materialInfo.reflectance0 + (materialInfo.reflectance90 - materialInfo.reflectance0) * pow(clamp(1.0 - angularInfo.VdotH, 0.0, 1.0), 5.0);\n}\n\n// Smith Joint GGX\n// Note: Vis = G / (4 * NdotL * NdotV)\n// see Eric Heitz. 2014. Understanding the Masking-Shadowing Function in Microfacet-Based BRDFs. Journal of Computer Graphics Techniques, 3\n// see Real-Time Rendering. Page 331 to 336.\n// see https://google.github.io/filament/Filament.md.html#materialsystem/specularbrdf/geometricshadowing(specularg)\nfloat visibilityOcclusion(MaterialInfo materialInfo, AngularInfo angularInfo)\n{\n    float NdotL = angularInfo.NdotL;\n    float NdotV = angularInfo.NdotV;\n    float alphaRoughnessSq = materialInfo.alphaRoughness * materialInfo.alphaRoughness;\n\n    float GGXV = NdotL * sqrt(NdotV * NdotV * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);\n    float GGXL = NdotV * sqrt(NdotL * NdotL * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);\n\n    float GGX = GGXV + GGXL;\n    if (GGX > 0.0)\n    {\n        return 0.5 / GGX;\n    }\n    return 0.0;\n}\n\n// The following equation(s) model the distribution of microfacet normals across the area being drawn (aka D())\n// Implementation from \"Average Irregularity Representation of a Roughened Surface for Ray Reflection\" by T. S. Trowbridge, and K. P. Reitz\n// Follows the distribution function recommended in the SIGGRAPH 2013 course notes from EPIC Games [1], Equation 3.\nfloat microfacetDistribution(MaterialInfo materialInfo, AngularInfo angularInfo)\n{\n    float alphaRoughnessSq = materialInfo.alphaRoughness * materialInfo.alphaRoughness;\n    float f = (angularInfo.NdotH * alphaRoughnessSq - angularInfo.NdotH) * angularInfo.NdotH + 1.0;\n    return alphaRoughnessSq / (M_PI * f * f);\n}\n\nvec3 getPointShade(vec3 pointToLight, MaterialInfo materialInfo, vec3 normal, vec3 view)\n{\n    AngularInfo angularInfo = getAngularInfo(pointToLight, normal, view);\n\n    if (angularInfo.NdotL > 0.0 || angularInfo.NdotV > 0.0)\n    {\n        // Calculate the shading terms for the microfacet specular shading model\n        vec3 F = specularReflection(materialInfo, angularInfo);\n        float Vis = visibilityOcclusion(materialInfo, angularInfo);\n        float D = microfacetDistribution(materialInfo, angularInfo);\n\n        // Calculation of analytical lighting contribution\n        vec3 diffuseContrib = (1.0 - F) * diffuse(materialInfo);\n        vec3 specContrib = F * Vis * D;\n\n        // Obtain final intensity as reflectance (BRDF) scaled by the energy of the light (cosine law)\n        return angularInfo.NdotL * (diffuseContrib + specContrib);\n    }\n\n    return vec3(0.0, 0.0, 0.0);\n}\n\nvec3 getPointShadeAmbient(vec3 pointToLight, MaterialInfo materialInfo, vec3 normal, vec3 view)\n{\n    AngularInfo angularInfo = getAngularInfo(pointToLight, normal, view);\n\n    if (angularInfo.NdotL > 0.0 || angularInfo.NdotV > 0.0)\n    {\n        // Calculate the shading terms for the microfacet specular shading model\n        vec3 F = specularReflection(materialInfo, angularInfo);\n        float Vis = visibilityOcclusion(materialInfo, angularInfo);\n        float D = microfacetDistribution(materialInfo, angularInfo);\n\n        // Calculation of analytical lighting contribution\n        vec3 diffuseContrib = (1.0 - F) * diffuse(materialInfo);\n        vec3 specContrib = F * Vis * D;\n\n        // Obtain final intensity as reflectance (BRDF) scaled by the energy of the light (cosine law)\n        return angularInfo.NdotL * (diffuseContrib + specContrib);\n    }\n\n    return vec3(0.0, 0.0, 0.0);\n}\n\n// https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_lights_punctual/README.md#range-property\nfloat getRangeAttenuation(float range, float distance)\n{\n    if (range <= 0.0)\n    {\n        // negative range means unlimited\n        return 1.0;\n    }\n    return max(min(1.0 - pow(distance / range, 4.0), 1.0), 0.0) / pow(distance, 2.0);\n}\n\n// https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_lights_punctual/README.md#inner-and-outer-cone-angles\nfloat getSpotAttenuation(vec3 pointToLight, vec3 spotDirection, float outerConeCos, float innerConeCos)\n{\n    float actualCos = dot(normalize(spotDirection), normalize(-pointToLight));\n    if (actualCos > outerConeCos)\n    {\n        if (actualCos < innerConeCos)\n        {\n            return smoothstep(outerConeCos, innerConeCos, actualCos);\n        }\n        return 1.0;\n    }\n    return 0.0;\n}\n\nvec3 applyDirectionalLight(Light light, MaterialInfo materialInfo, vec3 normal, vec3 view, float shadow)\n{\n    vec3 pointToLight = -light.direction;\n    vec3 shade = getPointShade(pointToLight, materialInfo, normal, view) * shadow;\n    return light.intensity * light.color * shade;\n}\n\nvec3 applyAmbientLight(Light light, MaterialInfo materialInfo, vec3 normal, vec3 view)\n{\n    vec3 pointToLight = normal;\n    vec3 shade = getPointShadeAmbient(pointToLight, materialInfo, normal, view);\n    return light.intensity * light.color * shade * 0.1;\n}\n\nvec3 applyPointLight(Light light, MaterialInfo materialInfo, vec3 normal, vec3 view)\n{\n    vec3 pointToLight = light.position - v_Position;\n    float distance = length(pointToLight);\n    float attenuation = getRangeAttenuation(light.range, distance);\n    vec3 shade = getPointShade(pointToLight, materialInfo, normal, view);\n    return attenuation * light.intensity * light.color * shade;\n}\n\nvec3 applySpotLight(Light light, MaterialInfo materialInfo, vec3 normal, vec3 view, float shadow)\n{\n    vec3 pointToLight = light.position - v_Position;\n    float distance = length(pointToLight);\n    float rangeAttenuation = getRangeAttenuation(light.range, distance);\n    float spotAttenuation = getSpotAttenuation(pointToLight, light.direction, light.outerConeCos, light.innerConeCos);\n    vec3 shade = getPointShade(pointToLight, materialInfo, normal, view) * shadow;\n    return rangeAttenuation * spotAttenuation * light.intensity * light.color * shade;\n}\n\n#ifdef WEBGL2\n    out vec4 FRAG_COLOR;\n#endif\n\nvoid main()\n{\n    // Metallic and Roughness material properties are packed together\n    // In glTF, these factors can be specified by fixed scalar values\n    // or from a metallic-roughness map\n    float perceptualRoughness = 0.0;\n    float metallic = 0.0;\n    vec4 baseColor = vec4(0.0, 0.0, 0.0, 1.0);\n    vec3 diffuseColor = vec3(0.0);\n    vec3 specularColor= vec3(0.0);\n    vec3 f0 = vec3(0.04);\n\n#ifdef MATERIAL_SPECULARGLOSSINESS\n\n#ifdef HAS_SPECULAR_GLOSSINESS_MAP\n    vec4 sgSample = SRGBtoLINEAR(_texture(u_SpecularGlossinessSampler, getSpecularGlossinessUV()));\n    perceptualRoughness = (1.0 - sgSample.a * u_GlossinessFactor); // glossiness to roughness\n    f0 = sgSample.rgb * u_SpecularFactor; // specular\n#else\n    f0 = u_SpecularFactor;\n    perceptualRoughness = 1.0 - u_GlossinessFactor;\n#endif // ! HAS_SPECULAR_GLOSSINESS_MAP\n\n#ifdef HAS_DIFFUSE_MAP\n    baseColor = SRGBtoLINEAR(_texture(u_DiffuseSampler, getDiffuseUV())) * u_DiffuseFactor;\n#else\n    baseColor = u_DiffuseFactor;\n#endif // !HAS_DIFFUSE_MAP\n\n    baseColor *= getVertexColor();\n\n    // f0 = specular\n    specularColor = f0;\n    float oneMinusSpecularStrength = 1.0 - max(max(f0.r, f0.g), f0.b);\n    diffuseColor = baseColor.rgb * oneMinusSpecularStrength;\n\n#ifdef DEBUG_METALLIC\n    // do conversion between metallic M-R and S-G metallic\n    metallic = solveMetallic(baseColor.rgb, specularColor, oneMinusSpecularStrength);\n#endif // ! DEBUG_METALLIC\n\n#endif // ! MATERIAL_SPECULARGLOSSINESS\n\n#ifdef MATERIAL_METALLICROUGHNESS\n\n#ifdef HAS_METALLIC_ROUGHNESS_MAP\n    // Roughness is stored in the 'g' channel, metallic is stored in the 'b' channel.\n    // This layout intentionally reserves the 'r' channel for (optional) occlusion map data\n    vec4 mrSample = _texture(u_MetallicRoughnessSampler, getMetallicRoughnessUV());\n    perceptualRoughness = mrSample.g * u_RoughnessFactor;\n    metallic = mrSample.b * u_MetallicFactor;\n#else\n    metallic = u_MetallicFactor;\n    perceptualRoughness = u_RoughnessFactor;\n#endif\n\n    vec4 baseColorFactor = u_BaseColorFactor;\n#ifdef USE_INSTANCING\n    baseColorFactor = v_BaseColorFactor;\n#endif\n\n    // The albedo may be defined from a base texture or a flat color\n#ifdef HAS_BASE_COLOR_MAP\n    baseColor = SRGBtoLINEAR(_texture(u_BaseColorSampler, getBaseColorUV())) * baseColorFactor;\n#else\n    baseColor = baseColorFactor;\n#endif\n\n    baseColor *= getVertexColor();\n\n    diffuseColor = baseColor.rgb * (vec3(1.0) - f0) * (1.0 - metallic);\n\n    specularColor = mix(f0, baseColor.rgb, metallic);\n\n#endif // ! MATERIAL_METALLICROUGHNESS\n\n#ifdef ALPHAMODE_MASK\n    if(baseColor.a < u_AlphaCutoff)\n    {\n        discard;\n    }\n    baseColor.a = 1.0;\n#endif\n\n#ifdef ALPHAMODE_OPAQUE\n    baseColor.a = 1.0;\n#endif\n\n#ifdef MATERIAL_UNLIT\n    FRAG_COLOR = vec4(LINEARtoSRGB(baseColor.rgb) * baseColor.a, baseColor.a);\n    return;\n#endif\n\n    perceptualRoughness = clamp(perceptualRoughness, 0.0, 1.0);\n    metallic = clamp(metallic, 0.0, 1.0);\n\n    // Roughness is authored as perceptual roughness; as is convention,\n    // convert to material roughness by squaring the perceptual roughness [2].\n    float alphaRoughness = perceptualRoughness * perceptualRoughness;\n\n    // Compute reflectance.\n    float reflectance = max(max(specularColor.r, specularColor.g), specularColor.b);\n\n    vec3 specularEnvironmentR0 = specularColor.rgb;\n    // Anything less than 2% is physically impossible and is instead considered to be shadowing. Compare to \"Real-Time-Rendering\" 4th editon on page 325.\n    vec3 specularEnvironmentR90 = vec3(clamp(reflectance * 50.0, 0.0, 1.0));\n\n    MaterialInfo materialInfo = MaterialInfo(\n        perceptualRoughness,\n        specularEnvironmentR0,\n        alphaRoughness,\n        diffuseColor,\n        specularEnvironmentR90,\n        specularColor\n    );\n\n    // LIGHTING\n\n    vec3 color = vec3(0.0, 0.0, 0.0);\n    vec3 normal = getNormal();\n    vec3 view = normalize(u_Camera - v_Position);\n\n    float shadow = 1.0;\n    #ifdef USE_SHADOW_MAPPING\n        shadow = getShadowContribution();\n    #endif\n\n#ifdef USE_PUNCTUAL\n    for (int i = 0; i < LIGHT_COUNT; ++i)\n    {\n        float shadowContribution = shadow;\n        #ifdef USE_SHADOW_MAPPING\n        if (u_ShadowLightIndex != i) \n        {\n            shadowContribution = 1.0;\n        }\n        #endif\n        Light light = u_Lights[i];\n        if (light.type == LightType_Directional)\n        {\n            color += applyDirectionalLight(light, materialInfo, normal, view, shadowContribution);\n        }\n        else if (light.type == LightType_Point)\n        {\n            color += applyPointLight(light, materialInfo, normal, view);\n        }\n        else if (light.type == LightType_Spot)\n        {\n            color += applySpotLight(light, materialInfo, normal, view, shadowContribution);\n        }\n        else if (light.type == LightType_Ambient)\n        {\n            color += applyAmbientLight(light, materialInfo, normal, view);\n        }\n    }\n#endif\n\n    // Calculate lighting contribution from image based lighting source (IBL)\n#ifdef USE_IBL\n    color += getIBLContribution(materialInfo, normal, view);\n#endif\n\n    float ao = 1.0;\n    // Apply optional PBR terms for additional (optional) shading\n#ifdef HAS_OCCLUSION_MAP\n    ao = _texture(u_OcclusionSampler,  getOcclusionUV()).r;\n    color = mix(color, color * ao, u_OcclusionStrength);\n#endif\n\n    vec3 emissive = vec3(0);\n#ifdef HAS_EMISSIVE_MAP\n    emissive = SRGBtoLINEAR(_texture(u_EmissiveSampler, getEmissiveUV())).rgb * u_EmissiveFactor;\n    color += emissive;\n#endif\n\n#ifndef DEBUG_OUTPUT // no debug\n\n   // regular shading\n    FRAG_COLOR = vec4(toneMap(color) * baseColor.a, baseColor.a);\n\n#else // debug output\n\n    #ifdef DEBUG_METALLIC\n        FRAG_COLOR.rgb = vec3(metallic);\n    #endif\n\n    #ifdef DEBUG_ROUGHNESS\n        FRAG_COLOR.rgb = vec3(perceptualRoughness);\n    #endif\n\n    #ifdef DEBUG_NORMAL\n        #ifdef HAS_NORMAL_MAP\n            FRAG_COLOR.rgb = _texture(u_NormalSampler, getNormalUV()).rgb;\n        #else\n            FRAG_COLOR.rgb = vec3(0.5, 0.5, 1.0);\n        #endif\n    #endif\n\n    #ifdef DEBUG_BASECOLOR\n        FRAG_COLOR.rgb = LINEARtoSRGB(baseColor.rgb);\n    #endif\n\n    #ifdef DEBUG_OCCLUSION\n        FRAG_COLOR.rgb = vec3(ao);\n    #endif\n\n    #ifdef DEBUG_EMISSIVE\n        FRAG_COLOR.rgb = LINEARtoSRGB(emissive);\n    #endif\n\n    #ifdef DEBUG_F0\n        FRAG_COLOR.rgb = vec3(f0);\n    #endif\n\n    #ifdef DEBUG_ALPHA\n        FRAG_COLOR.rgb = vec3(baseColor.a);\n    #endif\n\n    FRAG_COLOR.a = 1.0;\n\n#endif // !DEBUG_OUTPUT\n}\n"

/***/ }),

/***/ "./src/material/standard/shader/primitive.vert":
/*!*****************************************************!*\
  !*** ./src/material/standard/shader/primitive.vert ***!
  \*****************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "#version VERSION\n\n#define FEATURES\n\nvec4 _texture(sampler2D sampler, vec2 coord)\n{\n#ifdef WEBGL2\n    return texture(sampler, coord);\n#else\n    return texture2D(sampler, coord);\n#endif\n}\n\nvec4 _texture(samplerCube sampler, vec3 coord)\n{\n#ifdef WEBGL2\n    return texture(sampler, coord);\n#else\n    return textureCube(sampler, coord);\n#endif\n}\n#ifdef HAS_TARGET_POSITION0\nVERT_IN vec3 a_Target_Position0;\n#endif\n\n#ifdef HAS_TARGET_POSITION1\nVERT_IN vec3 a_Target_Position1;\n#endif\n\n#ifdef HAS_TARGET_POSITION2\nVERT_IN vec3 a_Target_Position2;\n#endif\n\n#ifdef HAS_TARGET_POSITION3\nVERT_IN vec3 a_Target_Position3;\n#endif\n\n#ifdef HAS_TARGET_POSITION4\nVERT_IN vec3 a_Target_Position4;\n#endif\n\n#ifdef HAS_TARGET_POSITION5\nVERT_IN vec3 a_Target_Position5;\n#endif\n\n#ifdef HAS_TARGET_POSITION6\nVERT_IN vec3 a_Target_Position6;\n#endif\n\n#ifdef HAS_TARGET_POSITION7\nVERT_IN vec3 a_Target_Position7;\n#endif\n\n#ifdef HAS_TARGET_NORMAL0\nVERT_IN vec3 a_Target_Normal0;\n#endif\n\n#ifdef HAS_TARGET_NORMAL1\nVERT_IN vec3 a_Target_Normal1;\n#endif\n\n#ifdef HAS_TARGET_NORMAL2\nVERT_IN vec3 a_Target_Normal2;\n#endif\n\n#ifdef HAS_TARGET_NORMAL3\nVERT_IN vec3 a_Target_Normal3;\n#endif\n\n#ifdef HAS_TARGET_TANGENT0\nVERT_IN vec3 a_Target_Tangent0;\n#endif\n\n#ifdef HAS_TARGET_TANGENT1\nVERT_IN vec3 a_Target_Tangent1;\n#endif\n\n#ifdef HAS_TARGET_TANGENT2\nVERT_IN vec3 a_Target_Tangent2;\n#endif\n\n#ifdef HAS_TARGET_TANGENT3\nVERT_IN vec3 a_Target_Tangent3;\n#endif\n\n#ifdef USE_MORPHING\nuniform float u_morphWeights[WEIGHT_COUNT];\n#endif\n\n#ifdef HAS_JOINT_SET1\nVERT_IN vec4 a_Joint1;\n#endif\n\n#ifdef HAS_JOINT_SET2\nVERT_IN vec4 a_Joint2;\n#endif\n\n#ifdef HAS_WEIGHT_SET1\nVERT_IN vec4 a_Weight1;\n#endif\n\n#ifdef HAS_WEIGHT_SET2\nVERT_IN vec4 a_Weight2;\n#endif\n\n#ifdef USE_SKINNING\n#ifdef USE_SKINNING_TEXTURE\nuniform sampler2D u_jointMatrixSampler;\nuniform sampler2D u_jointNormalMatrixSampler;\n#else\nuniform mat4 u_jointMatrix[JOINT_COUNT];\nuniform mat4 u_jointNormalMatrix[JOINT_COUNT];\n#endif\n#endif\n\n// these offsets assume the texture is 4 pixels across\n#define ROW0_U ((0.5 + 0.0) / 4.0)\n#define ROW1_U ((0.5 + 1.0) / 4.0)\n#define ROW2_U ((0.5 + 2.0) / 4.0)\n#define ROW3_U ((0.5 + 3.0) / 4.0)\n\n#ifdef USE_SKINNING\nmat4 getJointMatrix(float boneNdx) {\n    #ifdef USE_SKINNING_TEXTURE\n    float v = (boneNdx + 0.5) / float(JOINT_COUNT);\n    return mat4(\n        _texture(u_jointMatrixSampler, vec2(ROW0_U, v)),\n        _texture(u_jointMatrixSampler, vec2(ROW1_U, v)),\n        _texture(u_jointMatrixSampler, vec2(ROW2_U, v)),\n        _texture(u_jointMatrixSampler, vec2(ROW3_U, v))\n    );\n    #else\n    return u_jointMatrix[int(boneNdx)];\n    #endif\n}\n\nmat4 getJointNormalMatrix(float boneNdx) {\n    #ifdef USE_SKINNING_TEXTURE\n    float v = (boneNdx + 0.5) / float(JOINT_COUNT);\n    return mat4(\n        _texture(u_jointNormalMatrixSampler, vec2(ROW0_U, v)),\n        _texture(u_jointNormalMatrixSampler, vec2(ROW1_U, v)),\n        _texture(u_jointNormalMatrixSampler, vec2(ROW2_U, v)),\n        _texture(u_jointNormalMatrixSampler, vec2(ROW3_U, v))\n    );\n    #else\n    return u_jointNormalMatrix[int(boneNdx)];\n    #endif\n}\n\nmat4 getSkinningMatrix()\n{\n    mat4 skin = mat4(0);\n\n    #if defined(HAS_WEIGHT_SET1) && defined(HAS_JOINT_SET1)\n    skin +=\n        a_Weight1.x * getJointMatrix(a_Joint1.x) +\n        a_Weight1.y * getJointMatrix(a_Joint1.y) +\n        a_Weight1.z * getJointMatrix(a_Joint1.z) +\n        a_Weight1.w * getJointMatrix(a_Joint1.w);\n    #endif\n\n    return skin;\n}\n\nmat4 getSkinningNormalMatrix()\n{\n    mat4 skin = mat4(0);\n\n    #if defined(HAS_WEIGHT_SET1) && defined(HAS_JOINT_SET1)\n    skin +=\n        a_Weight1.x * getJointNormalMatrix(a_Joint1.x) +\n        a_Weight1.y * getJointNormalMatrix(a_Joint1.y) +\n        a_Weight1.z * getJointNormalMatrix(a_Joint1.z) +\n        a_Weight1.w * getJointNormalMatrix(a_Joint1.w);\n    #endif\n\n    return skin;\n}\n#endif // !USE_SKINNING\n\n#ifdef USE_MORPHING\nvec4 getTargetPosition()\n{\n    vec4 pos = vec4(0);\n\n#ifdef HAS_TARGET_POSITION0\n    pos.xyz += u_morphWeights[0] * a_Target_Position0;\n#endif\n\n#ifdef HAS_TARGET_POSITION1\n    pos.xyz += u_morphWeights[1] * a_Target_Position1;\n#endif\n\n#ifdef HAS_TARGET_POSITION2\n    pos.xyz += u_morphWeights[2] * a_Target_Position2;\n#endif\n\n#ifdef HAS_TARGET_POSITION3\n    pos.xyz += u_morphWeights[3] * a_Target_Position3;\n#endif\n\n#ifdef HAS_TARGET_POSITION4\n    pos.xyz += u_morphWeights[4] * a_Target_Position4;\n#endif\n\n    return pos;\n}\n\nvec4 getTargetNormal()\n{\n    vec4 normal = vec4(0);\n\n#ifdef HAS_TARGET_NORMAL0\n    normal.xyz += u_morphWeights[0] * a_Target_Normal0;\n#endif\n\n#ifdef HAS_TARGET_NORMAL1\n    normal.xyz += u_morphWeights[1] * a_Target_Normal1;\n#endif\n\n#ifdef HAS_TARGET_NORMAL2\n    normal.xyz += u_morphWeights[2] * a_Target_Normal2;\n#endif\n\n#ifdef HAS_TARGET_NORMAL3\n    normal.xyz += u_morphWeights[3] * a_Target_Normal3;\n#endif\n\n#ifdef HAS_TARGET_NORMAL4\n    normal.xyz += u_morphWeights[4] * a_Target_Normal4;\n#endif\n\n    return normal;\n}\n\nvec4 getTargetTangent()\n{\n    vec4 tangent = vec4(0);\n\n#ifdef HAS_TARGET_TANGENT0\n    tangent.xyz += u_morphWeights[0] * a_Target_Tangent0;\n#endif\n\n#ifdef HAS_TARGET_TANGENT1\n    tangent.xyz += u_morphWeights[1] * a_Target_Tangent1;\n#endif\n\n#ifdef HAS_TARGET_TANGENT2\n    tangent.xyz += u_morphWeights[2] * a_Target_Tangent2;\n#endif\n\n#ifdef HAS_TARGET_TANGENT3\n    tangent.xyz += u_morphWeights[3] * a_Target_Tangent3;\n#endif\n\n#ifdef HAS_TARGET_TANGENT4\n    tangent.xyz += u_morphWeights[4] * a_Target_Tangent4;\n#endif\n\n    return tangent;\n}\n\n#endif // !USE_MORPHING\n\n\nVERT_IN vec4 a_Position;\nVERT_OUT vec3 v_Position;\n\n#ifdef USE_INSTANCING\nVERT_IN vec4 a_ModelMatrix0;\nVERT_IN vec4 a_ModelMatrix1;\nVERT_IN vec4 a_ModelMatrix2;\nVERT_IN vec4 a_ModelMatrix3;\n#endif\n\n#ifdef USE_INSTANCING\nVERT_IN vec4 a_BaseColorFactor;\nVERT_OUT vec4 v_BaseColorFactor;\n#endif\n\n#ifdef USE_INSTANCING\nVERT_IN vec4 a_NormalMatrix0;\nVERT_IN vec4 a_NormalMatrix1;\nVERT_IN vec4 a_NormalMatrix2;\nVERT_IN vec4 a_NormalMatrix3;\n#endif\n\n#ifdef HAS_NORMALS\nVERT_IN vec4 a_Normal;\n#endif\n\n#ifdef HAS_TANGENTS\nVERT_IN vec4 a_Tangent;\n#endif\n\n#ifdef HAS_NORMALS\n#ifdef HAS_TANGENTS\nVERT_OUT mat3 v_TBN;\n#else\nVERT_OUT vec3 v_Normal;\n#endif\n#endif\n\n#ifdef HAS_UV_SET1\nVERT_IN vec2 a_UV1;\n#endif\n\n#ifdef HAS_UV_SET2\nVERT_IN vec2 a_UV2;\n#endif\n\nVERT_OUT vec2 v_UVCoord1;\nVERT_OUT vec2 v_UVCoord2;\n\n#ifdef HAS_VERTEX_COLOR_VEC3\nVERT_IN vec3 a_Color;\nVERT_OUT vec3 v_Color;\n#endif\n\n#ifdef HAS_VERTEX_COLOR_VEC4\nVERT_IN vec4 a_Color;\nVERT_OUT vec4 v_Color;\n#endif\n\nuniform mat4 u_ViewProjectionMatrix;\nuniform mat4 u_ModelMatrix;\nuniform mat4 u_NormalMatrix;\n\n#ifdef USE_SHADOW_MAPPING\nuniform mat4 u_LightViewProjectionMatrix;\nVERT_OUT vec4 v_PositionLightSpace;\n#endif\n\nvec4 getPosition()\n{\n    vec4 pos = a_Position;\n\n#ifdef USE_MORPHING\n    pos += getTargetPosition();\n#endif\n\n#ifdef USE_SKINNING\n    pos = getSkinningMatrix() * pos;\n#endif\n\n    return pos;\n}\n\n#ifdef HAS_NORMALS\nvec4 getNormal()\n{\n    vec4 normal = a_Normal;\n\n#ifdef USE_MORPHING\n    normal += getTargetNormal();\n#endif\n\n#ifdef USE_SKINNING\n    normal = getSkinningNormalMatrix() * normal;\n#endif\n\n    return normalize(normal);\n}\n#endif\n\n#ifdef HAS_TANGENTS\nvec4 getTangent()\n{\n    vec4 tangent = a_Tangent;\n\n#ifdef USE_MORPHING\n    tangent += getTargetTangent();\n#endif\n\n#ifdef USE_SKINNING\n    tangent = getSkinningMatrix() * tangent;\n#endif\n\n    return normalize(tangent);\n}\n#endif\n\nvoid main()\n{\n    mat4 modelMatrix = u_ModelMatrix;\n    #ifdef USE_INSTANCING\n        modelMatrix = mat4(a_ModelMatrix0, a_ModelMatrix1, a_ModelMatrix2, a_ModelMatrix3);\n    #endif\n    vec4 pos = modelMatrix * getPosition();\n    v_Position = vec3(pos.xyz) / pos.w;\n\n    mat4 normalMatrix = u_NormalMatrix;\n    #ifdef USE_INSTANCING\n        normalMatrix = mat4(a_NormalMatrix0, a_NormalMatrix1, a_NormalMatrix2, a_NormalMatrix3);\n    #endif\n\n    #ifdef HAS_NORMALS\n    #ifdef HAS_TANGENTS\n    vec4 tangent = getTangent();\n    vec3 normalW = normalize(vec3(normalMatrix * vec4(getNormal().xyz, 0.0)));\n    vec3 tangentW = normalize(vec3(modelMatrix * vec4(tangent.xyz, 0.0)));\n    vec3 bitangentW = cross(normalW, tangentW) * tangent.w;\n    v_TBN = mat3(tangentW, bitangentW, normalW);\n    #else // !HAS_TANGENTS\n    v_Normal = normalize(vec3(normalMatrix * vec4(getNormal().xyz, 0.0)));\n    #endif\n    #endif // !HAS_NORMALS\n\n    v_UVCoord1 = vec2(0.0, 0.0);\n    v_UVCoord2 = vec2(0.0, 0.0);\n\n    #ifdef HAS_UV_SET1\n    v_UVCoord1 = a_UV1;\n    #endif\n\n    #ifdef HAS_UV_SET2\n    v_UVCoord2 = a_UV2;\n    #endif\n\n    #if defined(HAS_VERTEX_COLOR_VEC3) || defined(HAS_VERTEX_COLOR_VEC4)\n    v_Color = a_Color;\n    #endif\n\n    #ifdef USE_SHADOW_MAPPING\n    v_PositionLightSpace = u_LightViewProjectionMatrix * pos;\n    #endif\n\n    #ifdef USE_INSTANCING\n    v_BaseColorFactor = a_BaseColorFactor;\n    #endif\n\n    gl_Position = u_ViewProjectionMatrix * pos;\n}\n"

/***/ }),

/***/ "./src/material/standard/standard-material-alpha-mode.ts":
/*!***************************************************************!*\
  !*** ./src/material/standard/standard-material-alpha-mode.ts ***!
  \***************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardMaterialAlphaMode = void 0;
var StandardMaterialAlphaMode;
(function (StandardMaterialAlphaMode) {
    /**
     * The rendered output is fully opaque and any alpha value is ignored.
     */
    StandardMaterialAlphaMode["opaque"] = "opaque";
    /**
     * The rendered output is either fully opaque or fully transparent depending
     * on the alpha value and the specified alpha cutoff value. This mode is used
     * to simulate geometry such as tree leaves or wire fences.
     */
    StandardMaterialAlphaMode["mask"] = "mask";
    /**
     * The rendered output is combined with the background using the normal
     * painting operation (i.e. the Porter and Duff over operator). This mode is
     * used to simulate geometry such as guaze cloth or animal fur.
     */
    StandardMaterialAlphaMode["blend"] = "blend";
})(StandardMaterialAlphaMode = exports.StandardMaterialAlphaMode || (exports.StandardMaterialAlphaMode = {}));


/***/ }),

/***/ "./src/material/standard/standard-material-debug-mode.ts":
/*!***************************************************************!*\
  !*** ./src/material/standard/standard-material-debug-mode.ts ***!
  \***************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardMaterialDebugMode = void 0;
var StandardMaterialDebugMode;
(function (StandardMaterialDebugMode) {
    StandardMaterialDebugMode["alpha"] = "alpha";
    StandardMaterialDebugMode["emissive"] = "emissive";
    StandardMaterialDebugMode["f0"] = "f0";
    StandardMaterialDebugMode["metallic"] = "metallic";
    StandardMaterialDebugMode["normal"] = "normal";
    StandardMaterialDebugMode["occlusion"] = "occlusion";
    StandardMaterialDebugMode["roughness"] = "roughness";
})(StandardMaterialDebugMode = exports.StandardMaterialDebugMode || (exports.StandardMaterialDebugMode = {}));


/***/ }),

/***/ "./src/material/standard/standard-material-factory.ts":
/*!************************************************************!*\
  !*** ./src/material/standard/standard-material-factory.ts ***!
  \************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardMaterialFactory = void 0;
var gltf_material_1 = __webpack_require__(/*! ../../gltf/gltf-material */ "./src/gltf/gltf-material.ts");
var texture_transform_1 = __webpack_require__(/*! ../../texture/texture-transform */ "./src/texture/texture-transform.ts");
var material_render_sort_type_1 = __webpack_require__(/*! ../material-render-sort-type */ "./src/material/material-render-sort-type.ts");
var color_1 = __webpack_require__(/*! ../../color */ "./src/color.ts");
var standard_material_1 = __webpack_require__(/*! ./standard-material */ "./src/material/standard/standard-material.ts");
var standard_material_alpha_mode_1 = __webpack_require__(/*! ./standard-material-alpha-mode */ "./src/material/standard/standard-material-alpha-mode.ts");
var standard_material_normal_texture_1 = __webpack_require__(/*! ./standard-material-normal-texture */ "./src/material/standard/standard-material-normal-texture.ts");
var standard_material_occlusion_texture_1 = __webpack_require__(/*! ./standard-material-occlusion-texture */ "./src/material/standard/standard-material-occlusion-texture.ts");
var standard_material_texture_1 = __webpack_require__(/*! ./standard-material-texture */ "./src/material/standard/standard-material-texture.ts");
var StandardMaterialFactory = /** @class */ (function () {
    function StandardMaterialFactory() {
    }
    StandardMaterialFactory.prototype.create = function (source) {
        var material = new standard_material_1.StandardMaterial();
        if (!(source instanceof gltf_material_1.glTFMaterial)) {
            return material;
        }
        material.baseColor = color_1.Color.from(source.baseColor);
        if (source.baseColorTexture) {
            material.baseColorTexture = new standard_material_texture_1.StandardMaterialTexture(source.baseColorTexture.baseTexture, source.baseColorTexture.texCoord);
            material.baseColorTexture.transform =
                this.createTextureTransform(source.baseColorTexture);
        }
        material.metallic = source.metallic;
        material.roughness = source.roughness;
        if (source.metallicRoughnessTexture) {
            material.metallicRoughnessTexture = new standard_material_texture_1.StandardMaterialTexture(source.metallicRoughnessTexture.baseTexture, source.metallicRoughnessTexture.texCoord);
            material.metallicRoughnessTexture.transform =
                this.createTextureTransform(source.metallicRoughnessTexture);
        }
        material.emissive = color_1.Color.from(source.emissiveFactor);
        if (source.emissiveTexture) {
            material.emissiveTexture = new standard_material_texture_1.StandardMaterialTexture(source.emissiveTexture.baseTexture, source.emissiveTexture.texCoord);
            material.emissiveTexture.transform =
                this.createTextureTransform(source.emissiveTexture);
        }
        switch (source.alphaMode) {
            case "BLEND": {
                material.alphaMode = standard_material_alpha_mode_1.StandardMaterialAlphaMode.blend;
                material.renderSortType = material_render_sort_type_1.MaterialRenderSortType.transparent;
                break;
            }
            case "MASK": {
                material.alphaMode = standard_material_alpha_mode_1.StandardMaterialAlphaMode.mask;
                break;
            }
            case "OPAQUE": {
                material.alphaMode = standard_material_alpha_mode_1.StandardMaterialAlphaMode.opaque;
                break;
            }
        }
        material.unlit = source.unlit;
        material.doubleSided = source.doubleSided;
        material.alphaCutoff = source.alphaCutoff;
        if (source.normalTexture) {
            material.normalTexture = new standard_material_normal_texture_1.StandardMaterialNormalTexture(source.normalTexture.baseTexture, source.normalTexture.scale, source.normalTexture.texCoord);
            material.normalTexture.transform =
                this.createTextureTransform(source.normalTexture);
        }
        if (source.occlusionTexture) {
            material.occlusionTexture = new standard_material_occlusion_texture_1.StandardMaterialOcclusionTexture(source.occlusionTexture.baseTexture, source.occlusionTexture.strength, source.occlusionTexture.texCoord);
            material.occlusionTexture.transform =
                this.createTextureTransform(source.occlusionTexture);
        }
        return material;
    };
    StandardMaterialFactory.prototype.createTextureTransform = function (texture) {
        if (texture.transform) {
            var transform = new texture_transform_1.TextureTransform();
            if (texture.transform.offset) {
                transform.offset.x = texture.transform.offset[0];
                transform.offset.y = texture.transform.offset[1];
            }
            if (texture.transform.rotation !== undefined) {
                transform.rotation = texture.transform.rotation;
            }
            if (texture.transform.scale) {
                transform.scale.x = texture.transform.scale[0];
                transform.scale.y = texture.transform.scale[1];
            }
            return transform;
        }
    };
    return StandardMaterialFactory;
}());
exports.StandardMaterialFactory = StandardMaterialFactory;


/***/ }),

/***/ "./src/material/standard/standard-material-feature-set.ts":
/*!****************************************************************!*\
  !*** ./src/material/standard/standard-material-feature-set.ts ***!
  \****************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardMaterialFeatureSet = void 0;
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var standard_material_alpha_mode_1 = __webpack_require__(/*! ./standard-material-alpha-mode */ "./src/material/standard/standard-material-alpha-mode.ts");
var standard_material_debug_mode_1 = __webpack_require__(/*! ./standard-material-debug-mode */ "./src/material/standard/standard-material-debug-mode.ts");
var capabilities_1 = __webpack_require__(/*! ../../capabilities */ "./src/capabilities.ts");
var standard_material_matrix_texture_1 = __webpack_require__(/*! ./standard-material-matrix-texture */ "./src/material/standard/standard-material-matrix-texture.ts");
var debug_1 = __webpack_require__(/*! ../../debug */ "./src/debug.ts");
var message_1 = __webpack_require__(/*! ../../message */ "./src/message.ts");
var StandardMaterialFeatureSet;
(function (StandardMaterialFeatureSet) {
    function build(renderer, mesh, geometry, material, lightingEnvironment) {
        var features = [];
        if (mesh.instances.length > 0) {
            features.push("USE_INSTANCING 1");
        }
        if (renderer.context.webGLVersion === 1) {
            features.push("WEBGL1 1");
        }
        if (renderer.context.webGLVersion === 2) {
            features.push("WEBGL2 1");
        }
        if (geometry.normals) {
            features.push("HAS_NORMALS 1");
        }
        if (geometry.uvs && geometry.uvs[0]) {
            features.push("HAS_UV_SET1 1");
        }
        if (geometry.uvs && geometry.uvs[1]) {
            features.push("HAS_UV_SET2 1");
        }
        if (geometry.tangents) {
            features.push("HAS_TANGENTS 1");
        }
        if (geometry.targets) {
            for (var i = 0; i < geometry.targets.length; i++) {
                if (geometry.targets[i].positions) {
                    features.push("HAS_TARGET_POSITION" + i);
                }
                if (geometry.targets[i].normals) {
                    features.push("HAS_TARGET_NORMAL" + i);
                }
                if (geometry.targets[i].tangents) {
                    features.push("HAS_TARGET_TANGENT" + i);
                }
            }
            if (mesh.targetWeights) {
                features.push("WEIGHT_COUNT " + mesh.targetWeights.length);
                features.push("USE_MORPHING 1");
            }
        }
        if (geometry.joints) {
            features.push("HAS_JOINT_SET1 1");
        }
        if (geometry.weights) {
            features.push("HAS_WEIGHT_SET1 1");
        }
        if (mesh.skin) {
            addSkinningFeatures(mesh, features, renderer);
        }
        if (material.unlit) {
            features.push("MATERIAL_UNLIT 1");
        }
        features.push("MATERIAL_METALLICROUGHNESS 1");
        if (lightingEnvironment.lights.length > 0) {
            features.push("LIGHT_COUNT " + lightingEnvironment.lights.length);
            features.push("USE_PUNCTUAL 1");
        }
        if (lightingEnvironment.imageBasedLighting) {
            if (!lightingEnvironment.imageBasedLighting.valid) {
                return undefined;
            }
            if (capabilities_1.Capabilities.isShaderTextureLodSupported(renderer)) {
                features.push("USE_TEX_LOD 1");
            }
            else {
                debug_1.Debug.warn(message_1.Message.imageBasedLightingShaderTextureLodNotSupported);
            }
            features.push("USE_IBL 1");
        }
        if (material.shadowCastingLight) {
            features.push("USE_SHADOW_MAPPING 1");
        }
        if (material.baseColorTexture) {
            if (!material.baseColorTexture.valid) {
                return undefined;
            }
            if (material.baseColorTexture.transform) {
                features.push("HAS_BASECOLOR_UV_TRANSFORM 1");
            }
            features.push("HAS_BASE_COLOR_MAP 1");
        }
        if (material.emissiveTexture) {
            if (!material.emissiveTexture.valid) {
                return undefined;
            }
            if (material.emissiveTexture.transform) {
                features.push("HAS_EMISSIVE_UV_TRANSFORM 1");
            }
            features.push("HAS_EMISSIVE_MAP 1");
        }
        if (material.normalTexture) {
            if (!material.normalTexture.valid) {
                return undefined;
            }
            if (material.normalTexture.transform) {
                features.push("HAS_NORMAL_UV_TRANSFORM 1");
            }
            features.push("HAS_NORMAL_MAP 1");
        }
        if (material.metallicRoughnessTexture) {
            if (!material.metallicRoughnessTexture.valid) {
                return undefined;
            }
            if (material.metallicRoughnessTexture.transform) {
                features.push("HAS_METALLICROUGHNESS_UV_TRANSFORM 1");
            }
            features.push("HAS_METALLIC_ROUGHNESS_MAP 1");
        }
        if (material.occlusionTexture) {
            if (!material.occlusionTexture.valid) {
                return undefined;
            }
            if (material.occlusionTexture.transform) {
                features.push("HAS_OCCLUSION_UV_TRANSFORM 1");
            }
            features.push("HAS_OCCLUSION_MAP 1");
        }
        switch (material.alphaMode) {
            case standard_material_alpha_mode_1.StandardMaterialAlphaMode.opaque: {
                features.push("ALPHAMODE_OPAQUE 1");
                break;
            }
            case standard_material_alpha_mode_1.StandardMaterialAlphaMode.mask: {
                features.push("ALPHAMODE_MASK 1");
                break;
            }
        }
        if (material.debugMode) {
            features.push("DEBUG_OUTPUT 1");
        }
        switch (material.debugMode) {
            case standard_material_debug_mode_1.StandardMaterialDebugMode.alpha: {
                features.push("DEBUG_ALPHA 1");
                break;
            }
            case standard_material_debug_mode_1.StandardMaterialDebugMode.emissive: {
                features.push("DEBUG_EMISSIVE 1");
                break;
            }
            case standard_material_debug_mode_1.StandardMaterialDebugMode.f0: {
                features.push("DEBUG_F0 1");
                break;
            }
            case standard_material_debug_mode_1.StandardMaterialDebugMode.metallic: {
                features.push("DEBUG_METALLIC 1");
                break;
            }
            case standard_material_debug_mode_1.StandardMaterialDebugMode.normal: {
                features.push("DEBUG_NORMAL 1");
                break;
            }
            case standard_material_debug_mode_1.StandardMaterialDebugMode.occlusion: {
                features.push("DEBUG_OCCLUSION 1");
                break;
            }
            case standard_material_debug_mode_1.StandardMaterialDebugMode.roughness: {
                features.push("DEBUG_ROUGHNESS 1");
                break;
            }
        }
        return features;
    }
    StandardMaterialFeatureSet.build = build;
    function addSkinningFeatures(mesh, features, renderer) {
        if (!mesh.skin) {
            return;
        }
        var uniformsRequiredForOtherFeatures = 20;
        var availableVertexUniforms = capabilities_1.Capabilities.getMaxVertexUniformVectors(renderer) - uniformsRequiredForOtherFeatures;
        var uniformsRequiredPerJoint = 8; // 4 per matrix times 2 (matrices and normals)
        var maxJointCount = Math.floor(availableVertexUniforms / uniformsRequiredPerJoint);
        var uniformsSupported = mesh.skin.joints.length <= maxJointCount;
        var addFeatureSetForUniforms = function () {
            var _a;
            features.push("USE_SKINNING 1");
            features.push("JOINT_COUNT " + ((_a = mesh.skin) === null || _a === void 0 ? void 0 : _a.joints.length));
        };
        var addFeatureSetForTextures = function () {
            var _a;
            features.push("USE_SKINNING 1");
            features.push("JOINT_COUNT " + ((_a = mesh.skin) === null || _a === void 0 ? void 0 : _a.joints.length));
            features.push("USE_SKINNING_TEXTURE 1");
        };
        // @ts-ignore Use PixiJS's already existing settings object for now.
        if (pixi_js_1.settings.PREFER_UNIFORMS_WHEN_UPLOADING_SKIN_JOINTS) {
            if (uniformsSupported) {
                addFeatureSetForUniforms();
                return;
            }
            if (standard_material_matrix_texture_1.StandardMaterialMatrixTexture.isSupported(renderer)) {
                addFeatureSetForTextures();
                return;
            }
            else {
                debug_1.Debug.error(message_1.Message.meshVertexSkinningNumberOfJointsNotSupported, {
                    joints: mesh.skin.joints.length,
                    maxJoints: maxJointCount
                });
            }
        }
        else {
            if (standard_material_matrix_texture_1.StandardMaterialMatrixTexture.isSupported(renderer)) {
                addFeatureSetForTextures();
                return;
            }
            debug_1.Debug.warn(message_1.Message.meshVertexSkinningFloatingPointTexturesNotSupported);
            if (uniformsSupported) {
                addFeatureSetForUniforms();
            }
            else {
                debug_1.Debug.error(message_1.Message.meshVertexSkinningNumberOfJointsNotSupported, {
                    joints: mesh.skin.joints.length,
                    maxJoints: maxJointCount
                });
            }
        }
    }
    function hasSkinningTextureFeature(features) {
        return features.includes("USE_SKINNING_TEXTURE 1");
    }
    StandardMaterialFeatureSet.hasSkinningTextureFeature = hasSkinningTextureFeature;
})(StandardMaterialFeatureSet = exports.StandardMaterialFeatureSet || (exports.StandardMaterialFeatureSet = {}));


/***/ }),

/***/ "./src/material/standard/standard-material-matrix-texture.ts":
/*!*******************************************************************!*\
  !*** ./src/material/standard/standard-material-matrix-texture.ts ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardMaterialMatrixTexture = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var buffer_resource_1 = __webpack_require__(/*! ../../resource/buffer-resource */ "./src/resource/buffer-resource.ts");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var capabilities_1 = __webpack_require__(/*! ../../capabilities */ "./src/capabilities.ts");
var StandardMaterialMatrixTexture = /** @class */ (function (_super) {
    tslib_1.__extends(StandardMaterialMatrixTexture, _super);
    function StandardMaterialMatrixTexture(matrixCount) {
        var _this = this;
        var buffer = new Float32Array(matrixCount * 16);
        var resource = new buffer_resource_1.BufferResource(buffer, { width: 4, height: matrixCount });
        _this = _super.call(this, new pixi_js_1.BaseTexture(resource, {
            mipmap: pixi_js_1.MIPMAP_MODES.OFF,
            wrapMode: pixi_js_1.WRAP_MODES.CLAMP,
            scaleMode: pixi_js_1.SCALE_MODES.NEAREST,
            format: pixi_js_1.FORMATS.RGBA,
            type: pixi_js_1.TYPES.FLOAT,
            alphaMode: pixi_js_1.ALPHA_MODES.NO_PREMULTIPLIED_ALPHA,
            resolution: 1
        })) || this;
        _this._buffer = buffer;
        return _this;
    }
    StandardMaterialMatrixTexture.isSupported = function (renderer) {
        return capabilities_1.Capabilities.isFloatingPointTextureSupported(renderer);
    };
    StandardMaterialMatrixTexture.prototype.updateBuffer = function (buffer) {
        this._buffer.set(buffer);
        this.baseTexture.resource.update();
    };
    return StandardMaterialMatrixTexture;
}(pixi_js_1.Texture));
exports.StandardMaterialMatrixTexture = StandardMaterialMatrixTexture;


/***/ }),

/***/ "./src/material/standard/standard-material-normal-texture.ts":
/*!*******************************************************************!*\
  !*** ./src/material/standard/standard-material-normal-texture.ts ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardMaterialNormalTexture = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var standard_material_texture_1 = __webpack_require__(/*! ./standard-material-texture */ "./src/material/standard/standard-material-texture.ts");
/**
 * Represents a texture which holds specific data for a normal map.
 */
var StandardMaterialNormalTexture = /** @class */ (function (_super) {
    tslib_1.__extends(StandardMaterialNormalTexture, _super);
    /**
     * Creates a new texture from the specified base texture.
     * @param baseTexture The base texture.
     * @param scale The scale of the normal.
     * @param uvSet The uv set to use (0 or 1).
     */
    function StandardMaterialNormalTexture(baseTexture, scale, uvSet) {
        var _this = _super.call(this, baseTexture, uvSet) || this;
        _this.scale = scale;
        _this.uvSet = uvSet;
        return _this;
    }
    return StandardMaterialNormalTexture;
}(standard_material_texture_1.StandardMaterialTexture));
exports.StandardMaterialNormalTexture = StandardMaterialNormalTexture;


/***/ }),

/***/ "./src/material/standard/standard-material-occlusion-texture.ts":
/*!**********************************************************************!*\
  !*** ./src/material/standard/standard-material-occlusion-texture.ts ***!
  \**********************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardMaterialOcclusionTexture = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var standard_material_texture_1 = __webpack_require__(/*! ./standard-material-texture */ "./src/material/standard/standard-material-texture.ts");
/**
 * Represents a texture which holds specific data for a occlusion map.
 */
var StandardMaterialOcclusionTexture = /** @class */ (function (_super) {
    tslib_1.__extends(StandardMaterialOcclusionTexture, _super);
    /**
     * Creates a new texture from the specified base texture.
     * @param baseTexture The base texture.
     * @param strength The strength of the occlusion.
     * @param uvSet The uv set to use (0 or 1).
     */
    function StandardMaterialOcclusionTexture(baseTexture, strength, uvSet) {
        var _this = _super.call(this, baseTexture, uvSet) || this;
        _this.strength = strength;
        _this.uvSet = uvSet;
        return _this;
    }
    return StandardMaterialOcclusionTexture;
}(standard_material_texture_1.StandardMaterialTexture));
exports.StandardMaterialOcclusionTexture = StandardMaterialOcclusionTexture;


/***/ }),

/***/ "./src/material/standard/standard-material-skin-uniforms.ts":
/*!******************************************************************!*\
  !*** ./src/material/standard/standard-material-skin-uniforms.ts ***!
  \******************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardMaterialSkinUniforms = void 0;
var standard_material_matrix_texture_1 = __webpack_require__(/*! ./standard-material-matrix-texture */ "./src/material/standard/standard-material-matrix-texture.ts");
var StandardMaterialSkinUniforms = /** @class */ (function () {
    function StandardMaterialSkinUniforms() {
    }
    StandardMaterialSkinUniforms.prototype.enableJointMatrixTextures = function (jointsCount) {
        if (!this._jointMatrixTexture) {
            this._jointMatrixTexture = new standard_material_matrix_texture_1.StandardMaterialMatrixTexture(jointsCount);
        }
        if (!this._jointNormalTexture) {
            this._jointNormalTexture = new standard_material_matrix_texture_1.StandardMaterialMatrixTexture(jointsCount);
        }
    };
    StandardMaterialSkinUniforms.prototype.destroy = function () {
        var _a, _b;
        (_a = this._jointNormalTexture) === null || _a === void 0 ? void 0 : _a.destroy(true);
        (_b = this._jointMatrixTexture) === null || _b === void 0 ? void 0 : _b.destroy(true);
    };
    StandardMaterialSkinUniforms.prototype.update = function (mesh, shader) {
        if (!mesh.skin) {
            return;
        }
        if (this._jointMatrixTexture) {
            this._jointMatrixTexture.updateBuffer(mesh.skin.jointMatrices);
            shader.uniforms.u_jointMatrixSampler = this._jointMatrixTexture;
        }
        else {
            shader.uniforms.u_jointMatrix = mesh.skin.jointMatrices;
        }
        if (this._jointNormalTexture) {
            this._jointNormalTexture.updateBuffer(mesh.skin.jointNormalMatrices);
            shader.uniforms.u_jointNormalMatrixSampler = this._jointNormalTexture;
        }
        else {
            shader.uniforms.u_jointNormalMatrix = mesh.skin.jointNormalMatrices;
        }
    };
    return StandardMaterialSkinUniforms;
}());
exports.StandardMaterialSkinUniforms = StandardMaterialSkinUniforms;


/***/ }),

/***/ "./src/material/standard/standard-material-texture.ts":
/*!************************************************************!*\
  !*** ./src/material/standard/standard-material-texture.ts ***!
  \************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardMaterialTexture = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
/**
 * Represents a texture which can have a transform.
 */
var StandardMaterialTexture = /** @class */ (function (_super) {
    tslib_1.__extends(StandardMaterialTexture, _super);
    /**
     * Creates a new texture from the specified base texture.
     * @param baseTexture The base texture.
     * @param uvSet The uv set to use (0 or 1).
     */
    function StandardMaterialTexture(baseTexture, uvSet) {
        var _this = _super.call(this, baseTexture) || this;
        _this.uvSet = uvSet;
        return _this;
    }
    return StandardMaterialTexture;
}(pixi_js_1.Texture));
exports.StandardMaterialTexture = StandardMaterialTexture;


/***/ }),

/***/ "./src/material/standard/standard-material.ts":
/*!****************************************************!*\
  !*** ./src/material/standard/standard-material.ts ***!
  \****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardMaterial = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var light_type_1 = __webpack_require__(/*! ../../lighting/light-type */ "./src/lighting/light-type.ts");
var standard_material_feature_set_1 = __webpack_require__(/*! ./standard-material-feature-set */ "./src/material/standard/standard-material-feature-set.ts");
var standard_shader_1 = __webpack_require__(/*! ./standard-shader */ "./src/material/standard/standard-shader.ts");
var material_1 = __webpack_require__(/*! ../material */ "./src/material/material.ts");
var camera_1 = __webpack_require__(/*! ../../camera/camera */ "./src/camera/camera.ts");
var lighting_environment_1 = __webpack_require__(/*! ../../lighting/lighting-environment */ "./src/lighting/lighting-environment.ts");
var standard_material_alpha_mode_1 = __webpack_require__(/*! ./standard-material-alpha-mode */ "./src/material/standard/standard-material-alpha-mode.ts");
var standard_material_skin_uniforms_1 = __webpack_require__(/*! ./standard-material-skin-uniforms */ "./src/material/standard/standard-material-skin-uniforms.ts");
var color_1 = __webpack_require__(/*! ../../color */ "./src/color.ts");
var instanced_standard_material_1 = __webpack_require__(/*! ./instanced-standard-material */ "./src/material/standard/instanced-standard-material.ts");
var standard_material_factory_1 = __webpack_require__(/*! ./standard-material-factory */ "./src/material/standard/standard-material-factory.ts");
var image_based_lighting_1 = __webpack_require__(/*! ../../lighting/image-based-lighting */ "./src/lighting/image-based-lighting.ts");
var __1 = __webpack_require__(/*! ../.. */ "./src/index.ts");
var shaders = {};
var getLightingEnvironmentConfigId = function (env) {
    return env ? (env.lights.length + (env.imageBasedLighting ? 0.5 : 0)) : 0;
};
/**
 * The standard material is using Physically-Based Rendering (PBR) which makes
 * it suitable to represent a wide range of different surfaces. It's the default
 * material when loading models from file.
 */
var StandardMaterial = /** @class */ (function (_super) {
    tslib_1.__extends(StandardMaterial, _super);
    function StandardMaterial() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._lightingEnvironmentConfigId = 0;
        _this._unlit = false;
        _this._alphaMode = standard_material_alpha_mode_1.StandardMaterialAlphaMode.opaque;
        _this._baseColor = new Float32Array(4);
        _this._instancingEnabled = false;
        _this._skinUniforms = new standard_material_skin_uniforms_1.StandardMaterialSkinUniforms();
        /** The roughness of the material. */
        _this.roughness = 1;
        /** The metalness of the material. */
        _this.metallic = 1;
        /** The base color of the material. */
        _this.baseColor = new color_1.Color(1, 1, 1, 1);
        /** The cutoff threshold when alpha mode is set to "mask". */
        _this.alphaCutoff = 0.5;
        /** The emissive color of the material. */
        _this.emissive = new color_1.Color(0, 0, 0);
        /** The exposure (brightness) of the material. */
        _this.exposure = 1;
        return _this;
    }
    Object.defineProperty(StandardMaterial.prototype, "baseColorTexture", {
        /** The base color texture. */
        get: function () {
            return this._baseColorTexture;
        },
        set: function (value) {
            if (value !== this._baseColorTexture) {
                this.invalidateShader();
                if (!(value === null || value === void 0 ? void 0 : value.transform) && (value === null || value === void 0 ? void 0 : value.frame) && !(value === null || value === void 0 ? void 0 : value.noFrame)) {
                    value.transform = __1.TextureTransform.fromTexture(value);
                }
                this._baseColorTexture = value;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StandardMaterial.prototype, "metallicRoughnessTexture", {
        /** The metallic-roughness texture. */
        get: function () {
            return this._metallicRoughnessTexture;
        },
        set: function (value) {
            if (value !== this._metallicRoughnessTexture) {
                this.invalidateShader();
                if (!(value === null || value === void 0 ? void 0 : value.transform) && (value === null || value === void 0 ? void 0 : value.frame) && !(value === null || value === void 0 ? void 0 : value.noFrame)) {
                    value.transform = __1.TextureTransform.fromTexture(value);
                }
                this._metallicRoughnessTexture = value;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StandardMaterial.prototype, "normalTexture", {
        /** The normal map texture. */
        get: function () {
            return this._normalTexture;
        },
        set: function (value) {
            if (value !== this._normalTexture) {
                this.invalidateShader();
                if (!(value === null || value === void 0 ? void 0 : value.transform) && (value === null || value === void 0 ? void 0 : value.frame) && !(value === null || value === void 0 ? void 0 : value.noFrame)) {
                    value.transform = __1.TextureTransform.fromTexture(value);
                }
                this._normalTexture = value;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StandardMaterial.prototype, "occlusionTexture", {
        /** The occlusion map texture. */
        get: function () {
            return this._occlusionTexture;
        },
        set: function (value) {
            if (value !== this._occlusionTexture) {
                this.invalidateShader();
                if (!(value === null || value === void 0 ? void 0 : value.transform) && (value === null || value === void 0 ? void 0 : value.frame) && !(value === null || value === void 0 ? void 0 : value.noFrame)) {
                    value.transform = __1.TextureTransform.fromTexture(value);
                }
                this._occlusionTexture = value;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StandardMaterial.prototype, "emissiveTexture", {
        /** The emissive map texture. */
        get: function () {
            return this._emissiveTexture;
        },
        set: function (value) {
            if (value !== this._emissiveTexture) {
                this.invalidateShader();
                if (!(value === null || value === void 0 ? void 0 : value.transform) && (value === null || value === void 0 ? void 0 : value.frame) && !(value === null || value === void 0 ? void 0 : value.noFrame)) {
                    value.transform = __1.TextureTransform.fromTexture(value);
                }
                this._emissiveTexture = value;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StandardMaterial.prototype, "alphaMode", {
        /** The alpha rendering mode of the material. */
        get: function () {
            return this._alphaMode;
        },
        set: function (value) {
            if (this._alphaMode !== value) {
                this._alphaMode = value;
                this.invalidateShader();
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StandardMaterial.prototype, "shadowCastingLight", {
        /** The shadow casting light of the material. */
        get: function () {
            return this._shadowCastingLight;
        },
        set: function (value) {
            if (value !== this._shadowCastingLight) {
                this.invalidateShader();
                this._shadowCastingLight = value;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StandardMaterial.prototype, "debugMode", {
        /** The debug rendering mode of the material. */
        get: function () {
            return this._debugMode;
        },
        set: function (value) {
            if (this._debugMode !== value) {
                this.invalidateShader();
                this._debugMode = value;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StandardMaterial.prototype, "lightingEnvironment", {
        /**
         * Lighting environment used when rendering a mesh. If this value is not set,
         * the main lighting environment will be used by default.
         */
        get: function () {
            return this._lightingEnvironment;
        },
        set: function (value) {
            if (value !== this._lightingEnvironment) {
                this.invalidateShader();
                this._lightingEnvironmentConfigId = getLightingEnvironmentConfigId(value);
                this._lightingEnvironment = value;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StandardMaterial.prototype, "unlit", {
        /**
         * Value indicating if the material is unlit. If this value if set to true,
         * all lighting is disabled and only the base color will be used.
         */
        get: function () {
            return this._unlit;
        },
        set: function (value) {
            if (this._unlit !== value) {
                this._unlit = value;
                this.invalidateShader();
            }
        },
        enumerable: false,
        configurable: true
    });
    StandardMaterial.prototype.destroy = function () {
        var _a, _b, _c, _d, _e;
        (_a = this._baseColorTexture) === null || _a === void 0 ? void 0 : _a.destroy();
        (_b = this._normalTexture) === null || _b === void 0 ? void 0 : _b.destroy();
        (_c = this._emissiveTexture) === null || _c === void 0 ? void 0 : _c.destroy();
        (_d = this._occlusionTexture) === null || _d === void 0 ? void 0 : _d.destroy();
        (_e = this._metallicRoughnessTexture) === null || _e === void 0 ? void 0 : _e.destroy();
        this._skinUniforms.destroy();
    };
    /**
     * Invalidates the shader so it can be rebuilt with the current features.
     */
    StandardMaterial.prototype.invalidateShader = function () {
        this._shader = undefined;
    };
    /**
     * Creates a new standard material from the specified source.
     * @param source Source from which the material is created.
     */
    StandardMaterial.create = function (source) {
        return new standard_material_factory_1.StandardMaterialFactory().create(source);
    };
    StandardMaterial.prototype.render = function (mesh, renderer) {
        if (!this._instancingEnabled && mesh.instances.length > 0) {
            // Invalidate shader when instancing was enabled.
            this.invalidateShader();
            this._instancingEnabled = mesh.instances.length > 0;
        }
        var lighting = this.lightingEnvironment || lighting_environment_1.LightingEnvironment.main;
        var configId = getLightingEnvironmentConfigId(lighting);
        if (configId !== this._lightingEnvironmentConfigId) {
            // Invalidate shader when the lighting config has changed.
            this.invalidateShader();
            this._lightingEnvironmentConfigId = configId;
        }
        _super.prototype.render.call(this, mesh, renderer);
    };
    Object.defineProperty(StandardMaterial.prototype, "isInstancingSupported", {
        get: function () {
            return true;
        },
        enumerable: false,
        configurable: true
    });
    StandardMaterial.prototype.createInstance = function () {
        return new instanced_standard_material_1.InstancedStandardMaterial(this);
    };
    StandardMaterial.prototype.createShader = function (mesh, renderer) {
        var e_1, _a;
        if (renderer.context.webGLVersion === 1) {
            var extensions = ["EXT_shader_texture_lod", "OES_standard_derivatives"];
            try {
                for (var extensions_1 = tslib_1.__values(extensions), extensions_1_1 = extensions_1.next(); !extensions_1_1.done; extensions_1_1 = extensions_1.next()) {
                    var ext = extensions_1_1.value;
                    if (!renderer.gl.getExtension(ext)) {
                        // Log warning?
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (extensions_1_1 && !extensions_1_1.done && (_a = extensions_1.return)) _a.call(extensions_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        var lightingEnvironment = this.lightingEnvironment || lighting_environment_1.LightingEnvironment.main;
        var features = standard_material_feature_set_1.StandardMaterialFeatureSet.build(renderer, mesh, mesh.geometry, this, lightingEnvironment);
        if (!features) {
            // The shader features couldn't be built, some resources may still be 
            // loading. Don't worry, we will retry creating shader at next render.
            return undefined;
        }
        if (mesh.skin && standard_material_feature_set_1.StandardMaterialFeatureSet.hasSkinningTextureFeature(features)) {
            this._skinUniforms.enableJointMatrixTextures(mesh.skin.joints.length);
        }
        var checksum = features.join(",");
        if (!shaders[checksum]) {
            shaders[checksum] = standard_shader_1.StandardShader.build(renderer, features);
        }
        return shaders[checksum];
    };
    StandardMaterial.prototype.updateUniforms = function (mesh, shader) {
        var _a, _b, _c, _d, _e;
        this._baseColor.set(this.baseColor.rgb);
        this._baseColor[3] = this.baseColor.a * mesh.worldAlpha;
        var camera = this.camera || camera_1.Camera.main;
        if (mesh.skin) {
            this._skinUniforms.update(mesh, shader);
        }
        shader.uniforms.u_Camera = camera.worldTransform.position;
        shader.uniforms.u_ViewProjectionMatrix = camera.viewProjection;
        shader.uniforms.u_Exposure = this.exposure;
        shader.uniforms.u_MetallicFactor = this.metallic;
        shader.uniforms.u_RoughnessFactor = this.roughness;
        shader.uniforms.u_BaseColorFactor = this._baseColor;
        shader.uniforms.u_ModelMatrix = mesh.worldTransform.array;
        shader.uniforms.u_NormalMatrix = mesh.transform.normalTransform.array;
        if (this._alphaMode === standard_material_alpha_mode_1.StandardMaterialAlphaMode.mask) {
            shader.uniforms.u_AlphaCutoff = this.alphaCutoff;
        }
        if (mesh.targetWeights) {
            shader.uniforms.u_morphWeights = mesh.targetWeights;
        }
        if ((_a = this.baseColorTexture) === null || _a === void 0 ? void 0 : _a.valid) {
            shader.uniforms.u_BaseColorSampler = this.baseColorTexture;
            shader.uniforms.u_BaseColorUVSet = this.baseColorTexture.uvSet || 0;
            if (this.baseColorTexture.transform) {
                shader.uniforms.u_BaseColorUVTransform = this.baseColorTexture.transform.array;
            }
        }
        var lightingEnvironment = this.lightingEnvironment || lighting_environment_1.LightingEnvironment.main;
        for (var i = 0; i < lightingEnvironment.lights.length; i++) {
            var light = lightingEnvironment.lights[i];
            var type = 0;
            switch (light.type) {
                case light_type_1.LightType.point:
                    type = 1;
                    break;
                case light_type_1.LightType.directional:
                    type = 0;
                    break;
                case light_type_1.LightType.spot:
                    type = 2;
                    break;
                case light_type_1.LightType.ambient:
                    type = 3;
                    break;
            }
            shader.uniforms["u_Lights[" + i + "].type"] = type;
            shader.uniforms["u_Lights[" + i + "].position"] = light.worldTransform.position;
            shader.uniforms["u_Lights[" + i + "].direction"] = light.worldTransform.forward;
            shader.uniforms["u_Lights[" + i + "].range"] = light.range;
            shader.uniforms["u_Lights[" + i + "].color"] = light.color.rgb;
            shader.uniforms["u_Lights[" + i + "].intensity"] = light.intensity;
            shader.uniforms["u_Lights[" + i + "].innerConeCos"] = Math.cos(light.innerConeAngle * pixi_js_1.DEG_TO_RAD);
            shader.uniforms["u_Lights[" + i + "].outerConeCos"] = Math.cos(light.outerConeAngle * pixi_js_1.DEG_TO_RAD);
        }
        if (this._shadowCastingLight) {
            shader.uniforms.u_ShadowSampler = this._shadowCastingLight.shadowTexture;
            shader.uniforms.u_LightViewProjectionMatrix = this._shadowCastingLight.lightViewProjection;
            shader.uniforms.u_ShadowLightIndex = lightingEnvironment.lights.indexOf(this._shadowCastingLight.light);
        }
        var imageBasedLighting = lightingEnvironment.imageBasedLighting;
        if (imageBasedLighting === null || imageBasedLighting === void 0 ? void 0 : imageBasedLighting.valid) {
            shader.uniforms.u_DiffuseEnvSampler = imageBasedLighting.diffuse;
            shader.uniforms.u_SpecularEnvSampler = imageBasedLighting.specular;
            shader.uniforms.u_brdfLUT = imageBasedLighting.lookupBrdf || image_based_lighting_1.ImageBasedLighting.defaultLookupBrdf;
            shader.uniforms.u_MipCount = imageBasedLighting.specular.levels - 1;
        }
        if ((_b = this.emissiveTexture) === null || _b === void 0 ? void 0 : _b.valid) {
            shader.uniforms.u_EmissiveSampler = this.emissiveTexture;
            shader.uniforms.u_EmissiveUVSet = this.emissiveTexture.uvSet || 0;
            shader.uniforms.u_EmissiveFactor = this.emissive.rgb;
            if (this.emissiveTexture.transform) {
                shader.uniforms.u_EmissiveUVTransform = this.emissiveTexture.transform.array;
            }
        }
        if ((_c = this.normalTexture) === null || _c === void 0 ? void 0 : _c.valid) {
            shader.uniforms.u_NormalSampler = this.normalTexture;
            shader.uniforms.u_NormalScale = this.normalTexture.scale || 1;
            shader.uniforms.u_NormalUVSet = this.normalTexture.uvSet || 0;
            if (this.normalTexture.transform) {
                shader.uniforms.u_NormalUVTransform = this.normalTexture.transform.array;
            }
        }
        if ((_d = this.metallicRoughnessTexture) === null || _d === void 0 ? void 0 : _d.valid) {
            shader.uniforms.u_MetallicRoughnessSampler = this.metallicRoughnessTexture;
            shader.uniforms.u_MetallicRoughnessUVSet = this.metallicRoughnessTexture.uvSet || 0;
            if (this.metallicRoughnessTexture.transform) {
                shader.uniforms.u_MetallicRoughnessUVTransform = this.metallicRoughnessTexture.transform.array;
            }
        }
        if ((_e = this.occlusionTexture) === null || _e === void 0 ? void 0 : _e.valid) {
            shader.uniforms.u_OcclusionSampler = this.occlusionTexture;
            shader.uniforms.u_OcclusionStrength = this.occlusionTexture.strength || 1;
            shader.uniforms.u_OcclusionUVSet = this.occlusionTexture.uvSet || 0;
            if (this.occlusionTexture.transform) {
                shader.uniforms.u_OcclusionUVTransform = this.occlusionTexture.transform.array;
            }
        }
    };
    return StandardMaterial;
}(material_1.Material));
exports.StandardMaterial = StandardMaterial;


/***/ }),

/***/ "./src/material/standard/standard-shader-instancing.ts":
/*!*************************************************************!*\
  !*** ./src/material/standard/standard-shader-instancing.ts ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardShaderInstancing = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
var StandardShaderInstancing = /** @class */ (function () {
    function StandardShaderInstancing() {
        this._maxInstances = 200;
        this._modelMatrix = [
            new PIXI.Buffer(), new PIXI.Buffer(), new PIXI.Buffer(), new PIXI.Buffer()
        ];
        this._normalMatrix = [
            new PIXI.Buffer(), new PIXI.Buffer(), new PIXI.Buffer(), new PIXI.Buffer()
        ];
        this._baseColor = new PIXI.Buffer();
        this.expandBuffers(this._maxInstances);
    }
    StandardShaderInstancing.prototype.expandBuffers = function (instanceCount) {
        while (instanceCount > this._maxInstances) {
            this._maxInstances += Math.floor(this._maxInstances * 0.5);
        }
        for (var i = 0; i < 4; i++) {
            this._modelMatrix[i].update(new Float32Array(4 * this._maxInstances));
            this._normalMatrix[i].update(new Float32Array(4 * this._maxInstances));
        }
        this._baseColor.update(new Float32Array(4 * this._maxInstances));
    };
    StandardShaderInstancing.prototype.updateBuffers = function (instances) {
        if (instances.length > this._maxInstances) {
            this.expandBuffers(instances.length);
        }
        var bufferIndex = 0;
        for (var i = 0; i < instances.length; i++) {
            if (!instances[i].worldVisible || !instances[i].renderable) {
                continue;
            }
            var normal = instances[i].transform.normalTransform.array;
            for (var j = 0; j < 4; j++) {
                this._normalMatrix[j].data
                    .set(normal.slice(j * 4, j * 4 + 4), bufferIndex * 4);
            }
            var model = instances[i].worldTransform.array;
            for (var j = 0; j < 4; j++) {
                this._modelMatrix[j].data
                    .set(model.slice(j * 4, j * 4 + 4), bufferIndex * 4);
            }
            var material = instances[i].material;
            this._baseColor.data
                .set(material.baseColor.rgba, bufferIndex * 4);
            bufferIndex++;
        }
        for (var i = 0; i < 4; i++) {
            this._modelMatrix[i].update();
            this._normalMatrix[i].update();
        }
        this._baseColor.update();
    };
    StandardShaderInstancing.prototype.addGeometryAttributes = function (geometry) {
        for (var i = 0; i < 4; i++) {
            geometry.addAttribute("a_ModelMatrix" + i, this._modelMatrix[i], 4, false, undefined, 0, undefined, true);
        }
        for (var i = 0; i < 4; i++) {
            geometry.addAttribute("a_NormalMatrix" + i, this._normalMatrix[i], 4, false, undefined, 0, undefined, true);
        }
        geometry.addAttribute("a_BaseColorFactor", this._baseColor, 4, false, undefined, 0, undefined, true);
    };
    return StandardShaderInstancing;
}());
exports.StandardShaderInstancing = StandardShaderInstancing;


/***/ }),

/***/ "./src/material/standard/standard-shader-source.ts":
/*!*********************************************************!*\
  !*** ./src/material/standard/standard-shader-source.ts ***!
  \*********************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardShaderSource = void 0;
var StandardShaderSource;
(function (StandardShaderSource) {
    function build(source, features, renderer) {
        if (renderer.context.webGLVersion === 1) {
            source = source.replace(/VERSION/, "100")
                .replace(/VERT_IN/g, "attribute")
                .replace(/VERT_OUT/g, "varying")
                .replace(/FRAG_COLOR/g, "gl_FragColor")
                .replace(/FRAG_IN/g, "varying");
        }
        if (renderer.context.webGLVersion === 2) {
            source = source.replace(/VERSION/, "300 es")
                .replace(/VERT_IN/g, "in")
                .replace(/VERT_OUT/g, "out")
                .replace(/FRAG_COLOR/g, "g_finalColor")
                .replace(/FRAG_IN/g, "in");
        }
        return source.replace(/#define FEATURES/, features.map(function (value) { return "#define " + value; }).join("\n"));
    }
    StandardShaderSource.build = build;
})(StandardShaderSource = exports.StandardShaderSource || (exports.StandardShaderSource = {}));


/***/ }),

/***/ "./src/material/standard/standard-shader.ts":
/*!**************************************************!*\
  !*** ./src/material/standard/standard-shader.ts ***!
  \**************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardShader = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
var mesh_shader_1 = __webpack_require__(/*! ../../mesh/mesh-shader */ "./src/mesh/mesh-shader.ts");
var standard_shader_instancing_1 = __webpack_require__(/*! ./standard-shader-instancing */ "./src/material/standard/standard-shader-instancing.ts");
var standard_shader_source_1 = __webpack_require__(/*! ./standard-shader-source */ "./src/material/standard/standard-shader-source.ts");
var StandardShader = /** @class */ (function (_super) {
    tslib_1.__extends(StandardShader, _super);
    function StandardShader() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._instancing = new standard_shader_instancing_1.StandardShaderInstancing();
        return _this;
    }
    StandardShader.build = function (renderer, features) {
        var vert = __webpack_require__(/*! ./shader/primitive.vert */ "./src/material/standard/shader/primitive.vert");
        var frag = __webpack_require__(/*! ./shader/metallic-roughness.frag */ "./src/material/standard/shader/metallic-roughness.frag");
        var program = PIXI.Program.from(standard_shader_source_1.StandardShaderSource.build(vert, features, renderer), standard_shader_source_1.StandardShaderSource.build(frag, features, renderer));
        return new StandardShader(program);
    };
    Object.defineProperty(StandardShader.prototype, "name", {
        get: function () {
            return "standard-shader";
        },
        enumerable: false,
        configurable: true
    });
    StandardShader.prototype.createShaderGeometry = function (geometry, instanced) {
        var result = _super.prototype.createShaderGeometry.call(this, geometry, instanced);
        if (instanced) {
            this._instancing.addGeometryAttributes(result);
        }
        if (geometry.targets) {
            for (var i = 0; i < geometry.targets.length; i++) {
                var positions = geometry.targets[i].positions;
                if (positions) {
                    result.addAttribute("a_Target_Position" + i, new PIXI.Buffer(positions.buffer), 3, false, positions.componentType, positions.stride);
                }
                var normals = geometry.targets[i].normals;
                if (normals) {
                    result.addAttribute("a_Target_Normal" + i, new PIXI.Buffer(normals.buffer), 3, false, normals.componentType, normals.stride);
                }
                var tangents = geometry.targets[i].tangents;
                if (tangents) {
                    result.addAttribute("a_Target_Tangent" + i, new PIXI.Buffer(tangents.buffer), 3, false, tangents.componentType, tangents.stride);
                }
            }
        }
        if (geometry.uvs && geometry.uvs[1]) {
            result.addAttribute("a_UV2", new PIXI.Buffer(geometry.uvs[1].buffer), 2, false, geometry.uvs[1].componentType, geometry.uvs[1].stride);
        }
        if (geometry.joints) {
            result.addAttribute("a_Joint1", new PIXI.Buffer(geometry.joints.buffer), 4, false, geometry.joints.componentType, geometry.joints.stride);
        }
        if (geometry.weights) {
            result.addAttribute("a_Weight1", new PIXI.Buffer(geometry.weights.buffer), 4, false, geometry.weights.componentType, geometry.weights.stride);
        }
        return result;
    };
    StandardShader.prototype.render = function (mesh, renderer, state, drawMode) {
        if (mesh.instances.length > 0) {
            this._instancing.updateBuffers(mesh.instances);
        }
        _super.prototype.render.call(this, mesh, renderer, state, drawMode);
    };
    return StandardShader;
}(mesh_shader_1.MeshShader));
exports.StandardShader = StandardShader;


/***/ }),

/***/ "./src/math/aabb.ts":
/*!**************************!*\
  !*** ./src/math/aabb.ts ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.AABB = void 0;
var __1 = __webpack_require__(/*! .. */ "./src/index.ts");
/**
 * Axis-aligned bounding box.
 */
var AABB = /** @class */ (function () {
    function AABB() {
        var _this = this;
        this._onChanged = function () {
            _this._center.set((_this._min.x + _this._max.x) / 2, (_this._min.y + _this._max.y) / 2, (_this._min.z + _this._max.z) / 2);
            _this._extents.set(Math.abs(_this._max.x - _this._center.x), Math.abs(_this._max.y - _this._center.y), Math.abs(_this._max.z - _this._center.z));
            _this._size.set(_this._extents.x * 2, _this._extents.y * 2, _this._extents.z * 2);
        };
        this._min = new __1.ObservablePoint3D(this._onChanged, this);
        this._max = new __1.ObservablePoint3D(this._onChanged, this);
        this._center = new __1.ObservablePoint3D(function () { }, this);
        this._size = new __1.ObservablePoint3D(function () { }, this);
        this._extents = new __1.ObservablePoint3D(function () { }, this);
    }
    Object.defineProperty(AABB.prototype, "min", {
        /** The minimal point of the bounding box. */
        get: function () {
            return this._min;
        },
        set: function (value) {
            this._min.copyFrom(value);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AABB.prototype, "max", {
        /** The maximal point of the bounding box. */
        get: function () {
            return this._max;
        },
        set: function (value) {
            this._max.copyFrom(value);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AABB.prototype, "center", {
        /** The center of the bounding box. */
        get: function () {
            return this._center;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AABB.prototype, "size", {
        /** The size of the bounding box. */
        get: function () {
            return this._size;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AABB.prototype, "extents", {
        /** The extents of the bounding box. */
        get: function () {
            return this._extents;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Creates a new bounding box from the specified source.
     * @param source The source to create the bounding box from.
     */
    AABB.from = function (source) {
        var aabb = new AABB();
        aabb.min.setFrom(source.min);
        aabb.max.setFrom(source.max);
        return aabb;
    };
    /**
     * Grows the bounding box to include the point.
     * @param point The point to include.
     */
    AABB.prototype.encapsulate = function (point) {
        this._min.x = Math.min(this._min.x, point.x);
        this._min.y = Math.min(this._min.y, point.y);
        this._min.z = Math.min(this._min.z, point.z);
        this._max.x = Math.max(this._max.x, point.x);
        this._max.y = Math.max(this._max.y, point.y);
        this._max.z = Math.max(this._max.z, point.z);
    };
    return AABB;
}());
exports.AABB = AABB;


/***/ }),

/***/ "./src/math/mat3.ts":
/*!**************************!*\
  !*** ./src/math/mat3.ts ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Mat3 = void 0;
var gl_matrix_1 = __webpack_require__(/*! gl-matrix */ "./node_modules/gl-matrix/esm/index.js");
var Mat3 = /** @class */ (function () {
    function Mat3() {
    }
    Mat3.multiply = function (a, b, out) {
        if (out === void 0) { out = new Float32Array(9); }
        return gl_matrix_1.mat3.multiply(out, a, b);
    };
    return Mat3;
}());
exports.Mat3 = Mat3;


/***/ }),

/***/ "./src/math/mat4.ts":
/*!**************************!*\
  !*** ./src/math/mat4.ts ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Mat4 = void 0;
var gl_matrix_1 = __webpack_require__(/*! gl-matrix */ "./node_modules/gl-matrix/esm/index.js");
var Mat4 = /** @class */ (function () {
    function Mat4() {
    }
    Mat4.getTranslation = function (mat, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.mat4.getTranslation(out, mat);
    };
    Mat4.create = function () {
        return gl_matrix_1.mat4.create();
    };
    Mat4.translate = function (mat, v, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.translate(out, mat, v);
    };
    Mat4.getScaling = function (mat, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.mat4.getScaling(out, mat);
    };
    Mat4.getRotation = function (mat, out) {
        if (out === void 0) { out = new Float32Array(4); }
        return gl_matrix_1.mat4.getRotation(out, mat);
    };
    Mat4.copy = function (a, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.copy(out, a);
    };
    Mat4.fromQuat = function (q, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.fromQuat(out, q);
    };
    Mat4.fromRotationTranslationScale = function (q, v, s, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.fromRotationTranslationScale(out, q, v, s);
    };
    Mat4.fromRotation = function (rad, axis, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.fromRotation(out, rad, axis);
    };
    Mat4.fromScaling = function (v, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.fromScaling(out, v);
    };
    Mat4.fromTranslation = function (v, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.fromTranslation(out, v);
    };
    Mat4.multiply = function (a, b, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.multiply(out, a, b);
    };
    Mat4.lookAt = function (eye, center, up, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.lookAt(out, eye, center, up);
    };
    Mat4.identity = function (out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.identity(out);
    };
    Mat4.perspective = function (fovy, aspect, near, far, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.perspective(out, fovy, aspect, near, far);
    };
    Mat4.ortho = function (left, right, bottom, top, near, far, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.ortho(out, left, right, bottom, top, near, far);
    };
    Mat4.invert = function (a, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.invert(out, a);
    };
    Mat4.transpose = function (a, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.transpose(out, a);
    };
    Mat4.targetTo = function (eye, target, up, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.targetTo(out, eye, target, up);
    };
    Mat4.rotateX = function (a, rad, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.rotateX(out, a, rad);
    };
    Mat4.rotateY = function (a, rad, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.rotateY(out, a, rad);
    };
    Mat4.rotateZ = function (a, rad, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.rotateZ(out, a, rad);
    };
    Mat4.rotate = function (a, rad, axis, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.rotate(out, a, rad, axis);
    };
    Mat4.scale = function (a, v, out) {
        if (out === void 0) { out = new Float32Array(16); }
        return gl_matrix_1.mat4.scale(out, a, v);
    };
    return Mat4;
}());
exports.Mat4 = Mat4;


/***/ }),

/***/ "./src/math/plane.ts":
/*!***************************!*\
  !*** ./src/math/plane.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Plane = void 0;
var vec3_1 = __webpack_require__(/*! ./vec3 */ "./src/math/vec3.ts");
function approximately(a, b) {
    return Math.abs(a - b) <= EPSILON * Math.max(1.0, Math.abs(a), Math.abs(b));
}
var EPSILON = 0.000001;
var Plane = /** @class */ (function () {
    function Plane(normal, distance) {
        this.distance = distance;
        this._normal = new Float32Array(3);
        vec3_1.Vec3.normalize(normal, this._normal);
    }
    Object.defineProperty(Plane.prototype, "normal", {
        get: function () {
            return this._normal;
        },
        enumerable: false,
        configurable: true
    });
    Plane.prototype.rayCast = function (ray) {
        var vdot = vec3_1.Vec3.dot(ray.direction, this.normal);
        if (approximately(vdot, 0)) {
            return 0;
        }
        var ndot = -vec3_1.Vec3.dot(ray.origin, this.normal) - this.distance;
        return ndot / vdot;
    };
    return Plane;
}());
exports.Plane = Plane;


/***/ }),

/***/ "./src/math/quat.ts":
/*!**************************!*\
  !*** ./src/math/quat.ts ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Quat = void 0;
var gl_matrix_1 = __webpack_require__(/*! gl-matrix */ "./node_modules/gl-matrix/esm/index.js");
var Quat = /** @class */ (function () {
    function Quat() {
    }
    Quat.set = function (x, y, z, w, out) {
        if (out === void 0) { out = new Float32Array(4); }
        return gl_matrix_1.quat.set(out, x, y, z, w);
    };
    Quat.fromValues = function (x, y, z, w) {
        return gl_matrix_1.quat.fromValues(x, y, z, w);
    };
    Quat.create = function () {
        return gl_matrix_1.quat.create();
    };
    Quat.normalize = function (a, out) {
        if (out === void 0) { out = new Float32Array(4); }
        return gl_matrix_1.quat.normalize(out, a);
    };
    Quat.slerp = function (a, b, t, out) {
        if (out === void 0) { out = new Float32Array(4); }
        return gl_matrix_1.quat.slerp(out, a, b, t);
    };
    Quat.fromEuler = function (x, y, z, out) {
        if (out === void 0) { out = new Float32Array(4); }
        return gl_matrix_1.quat.fromEuler(out, x, y, z);
    };
    Quat.conjugate = function (a, out) {
        if (out === void 0) { out = new Float32Array(4); }
        return gl_matrix_1.quat.conjugate(out, a);
    };
    Quat.rotateX = function (a, rad, out) {
        if (out === void 0) { out = new Float32Array(4); }
        return gl_matrix_1.quat.rotateX(out, a, rad);
    };
    Quat.rotateY = function (a, rad, out) {
        if (out === void 0) { out = new Float32Array(4); }
        return gl_matrix_1.quat.rotateY(out, a, rad);
    };
    Quat.rotateZ = function (a, rad, out) {
        if (out === void 0) { out = new Float32Array(4); }
        return gl_matrix_1.quat.rotateZ(out, a, rad);
    };
    return Quat;
}());
exports.Quat = Quat;


/***/ }),

/***/ "./src/math/ray.ts":
/*!*************************!*\
  !*** ./src/math/ray.ts ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Ray = void 0;
var vec3_1 = __webpack_require__(/*! ./vec3 */ "./src/math/vec3.ts");
var Ray = /** @class */ (function () {
    function Ray(origin, direction) {
        this._direction = new Float32Array(3);
        this._origin = new Float32Array(3);
        vec3_1.Vec3.copy(origin, this._origin);
        vec3_1.Vec3.normalize(direction, this._direction);
    }
    Object.defineProperty(Ray.prototype, "origin", {
        get: function () {
            return this._origin;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Ray.prototype, "direction", {
        get: function () {
            return this._direction;
        },
        enumerable: false,
        configurable: true
    });
    Ray.prototype.getPoint = function (distance, point) {
        if (point === void 0) { point = new Float32Array(3); }
        return vec3_1.Vec3.add(this._origin, vec3_1.Vec3.scale(this._direction, distance, point), point);
    };
    return Ray;
}());
exports.Ray = Ray;


/***/ }),

/***/ "./src/math/vec3.ts":
/*!**************************!*\
  !*** ./src/math/vec3.ts ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Vec3 = void 0;
var gl_matrix_1 = __webpack_require__(/*! gl-matrix */ "./node_modules/gl-matrix/esm/index.js");
var Vec3 = /** @class */ (function () {
    function Vec3() {
    }
    Vec3.set = function (x, y, z, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.vec3.set(out, x, y, z);
    };
    Vec3.fromValues = function (x, y, z) {
        return gl_matrix_1.vec3.fromValues(x, y, z);
    };
    Vec3.create = function () {
        return gl_matrix_1.vec3.create();
    };
    Vec3.add = function (a, b, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.vec3.add(out, a, b);
    };
    Vec3.transformQuat = function (a, q, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.vec3.transformQuat(out, a, q);
    };
    Vec3.subtract = function (a, b, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.vec3.subtract(out, a, b);
    };
    Vec3.scale = function (a, b, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.vec3.scale(out, a, b);
    };
    Vec3.dot = function (a, b) {
        return gl_matrix_1.vec3.dot(a, b);
    };
    Vec3.normalize = function (a, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.vec3.normalize(out, a);
    };
    Vec3.cross = function (a, b, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.vec3.cross(out, a, b);
    };
    Vec3.transformMat4 = function (a, m, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.vec3.transformMat4(out, a, m);
    };
    Vec3.copy = function (a, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.vec3.copy(out, a);
    };
    Vec3.magnitude = function (a) {
        return gl_matrix_1.vec3.length(a);
    };
    Vec3.inverse = function (a, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.vec3.inverse(out, a);
    };
    Vec3.negate = function (a, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.vec3.negate(out, a);
    };
    Vec3.multiply = function (a, b, out) {
        if (out === void 0) { out = new Float32Array(3); }
        return gl_matrix_1.vec3.multiply(out, a, b);
    };
    Vec3.distance = function (a, b) {
        return gl_matrix_1.vec3.distance(a, b);
    };
    Vec3.squaredDistance = function (a, b) {
        return gl_matrix_1.vec3.squaredDistance(a, b);
    };
    return Vec3;
}());
exports.Vec3 = Vec3;


/***/ }),

/***/ "./src/math/vec4.ts":
/*!**************************!*\
  !*** ./src/math/vec4.ts ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Vec4 = void 0;
var gl_matrix_1 = __webpack_require__(/*! gl-matrix */ "./node_modules/gl-matrix/esm/index.js");
var Vec4 = /** @class */ (function () {
    function Vec4() {
    }
    Vec4.set = function (x, y, z, w, out) {
        if (out === void 0) { out = new Float32Array(4); }
        return gl_matrix_1.vec4.set(out, x, y, z, w);
    };
    Vec4.transformMat4 = function (a, m, out) {
        if (out === void 0) { out = new Float32Array(4); }
        return gl_matrix_1.vec4.transformMat4(out, a, m);
    };
    Vec4.fromValues = function (x, y, z, w) {
        return gl_matrix_1.vec4.fromValues(x, y, z, w);
    };
    return Vec4;
}());
exports.Vec4 = Vec4;


/***/ }),

/***/ "./src/mesh/geometry/cube-geometry.ts":
/*!********************************************!*\
  !*** ./src/mesh/geometry/cube-geometry.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CubeGeometry = void 0;
var mesh_geometry_1 = __webpack_require__(/*! ./mesh-geometry */ "./src/mesh/geometry/mesh-geometry.ts");
var CubeGeometry;
(function (CubeGeometry) {
    function create() {
        return Object.assign(new mesh_geometry_1.MeshGeometry3D(), {
            positions: {
                buffer: new Float32Array([-1, 1, 1, -1, -1, -1, -1, -1, 1, -1, 1, -1,
                    -1, 1, -1, 1, -1, -1, -1, -1, -1, 1, 1, -1,
                    1, 1, -1, 1, -1, 1, 1, -1, -1, 1, 1, 1,
                    1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, 1,
                    1, -1, 1, -1, -1, -1, 1, -1, -1, -1, -1, 1,
                    -1, 1, 1, 1, 1, -1, -1, 1, -1, 1, 1, 1]) // 20, 21, 22, 23
            },
            indices: {
                buffer: new Uint8Array([0, 1, 2, 0, 3, 1, 4, 5, 6, 4, 7, 5, 8, 9, 10, 8, 11, 9, 12, 13, 14, 12, 15, 13, 16, 17, 18, 16, 19, 17, 20, 21, 22, 20, 23, 21])
            },
            normals: {
                buffer: new Float32Array([-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0])
            },
            uvs: [{
                    buffer: new Float32Array([0.66666, 1, 0.33333, 0.75, 0.33333, 1, 0.66666, 0.75, 0.66666, 0.75, 0.33333, 0.5, 0.33333, 0.75, 0.66666, 0.5, 0.66666, 0.5, 0.33333, 0.25, 0.33333, 0.5, 0.66666, 0.25, 0.66666, 0.25, 0.33333, 0, 0.33333, 0.25, 0.66666, 0, 0.33333, 0.25, 0.125, 0.5, 0.33333, 0.5, 0.125, 0.25, 1.0, 0.25, 0.66666, 0.5, 1.0, 0.5, 0.66666, 0.25])
                }],
            tangents: {
                buffer: new Float32Array([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, -1, 0, 0, 1, -1, 0, 0, 1, -1, 0, 0, 1, -1, 0, 0, 1])
            }
        });
    }
    CubeGeometry.create = create;
})(CubeGeometry = exports.CubeGeometry || (exports.CubeGeometry = {}));


/***/ }),

/***/ "./src/mesh/geometry/mesh-geometry.ts":
/*!********************************************!*\
  !*** ./src/mesh/geometry/mesh-geometry.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MeshGeometry3D = void 0;
/**
 * Geometry with mesh data (i.e. positions, normals, uvs).
 */
var MeshGeometry3D = /** @class */ (function () {
    function MeshGeometry3D() {
        this._shaderGeometry = {};
    }
    /**
     * Returns geometry with attributes required by the specified shader.
     * @param shader The shader to use.
     */
    MeshGeometry3D.prototype.getShaderGeometry = function (shader) {
        return this._shaderGeometry[shader.name];
    };
    /**
     * Creates geometry with attributes required by the specified shader.
     * @param shader The shader to use.
     * @param instanced Value indicating if the geometry will be instanced.
     */
    MeshGeometry3D.prototype.addShaderGeometry = function (shader, instanced) {
        this._shaderGeometry[shader.name] = shader.createShaderGeometry(this, instanced);
    };
    /**
     * Returns a value indicating if geometry with required attributes has been
     * created by the specified shader.
     * @param shader The shader to test.
     * @param instanced Value indicating if the geometry is instanced.
     */
    MeshGeometry3D.prototype.hasShaderGeometry = function (shader, instanced) {
        if (this._shaderGeometry[shader.name]) {
            return !instanced || (instanced && this._shaderGeometry[shader.name].instanced);
        }
        return false;
    };
    /**
     * Destroys the geometry and it's used resources.
     */
    MeshGeometry3D.prototype.destroy = function () {
        for (var name_1 in this._shaderGeometry) {
            this._shaderGeometry[name_1].destroy();
        }
        this._shaderGeometry = {};
    };
    return MeshGeometry3D;
}());
exports.MeshGeometry3D = MeshGeometry3D;


/***/ }),

/***/ "./src/mesh/geometry/plane-geometry.ts":
/*!*********************************************!*\
  !*** ./src/mesh/geometry/plane-geometry.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaneGeometry = void 0;
var mesh_geometry_1 = __webpack_require__(/*! ./mesh-geometry */ "./src/mesh/geometry/mesh-geometry.ts");
var PlaneGeometry;
(function (PlaneGeometry) {
    function create() {
        return Object.assign(new mesh_geometry_1.MeshGeometry3D(), {
            positions: {
                buffer: new Float32Array([-1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 0, 1])
            },
            indices: {
                buffer: new Uint8Array([0, 1, 2, 0, 3, 1])
            },
            normals: {
                buffer: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0])
            },
            uvs: [{
                    buffer: new Float32Array([0, 1, 1, 0, 0, 0, 1, 1])
                }]
        });
    }
    PlaneGeometry.create = create;
})(PlaneGeometry = exports.PlaneGeometry || (exports.PlaneGeometry = {}));


/***/ }),

/***/ "./src/mesh/geometry/quad-geometry.ts":
/*!********************************************!*\
  !*** ./src/mesh/geometry/quad-geometry.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.QuadGeometry = void 0;
var mesh_geometry_1 = __webpack_require__(/*! ./mesh-geometry */ "./src/mesh/geometry/mesh-geometry.ts");
var QuadGeometry;
(function (QuadGeometry) {
    function create() {
        return Object.assign(new mesh_geometry_1.MeshGeometry3D(), {
            positions: {
                buffer: new Float32Array([-1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0])
            },
            indices: {
                buffer: new Uint8Array([0, 2, 1, 0, 1, 3])
            },
            normals: {
                buffer: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1])
            },
            uvs: [{
                    buffer: new Float32Array([0, 0, 1, 1, 0, 1, 1, 0])
                }]
        });
    }
    QuadGeometry.create = create;
})(QuadGeometry = exports.QuadGeometry || (exports.QuadGeometry = {}));


/***/ }),

/***/ "./src/mesh/instanced-mesh.ts":
/*!************************************!*\
  !*** ./src/mesh/instanced-mesh.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.InstancedMesh3D = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var container_1 = __webpack_require__(/*! ../container */ "./src/container.ts");
var InstancedMesh3D = /** @class */ (function (_super) {
    tslib_1.__extends(InstancedMesh3D, _super);
    function InstancedMesh3D(mesh, material) {
        var _this = _super.call(this) || this;
        _this.mesh = mesh;
        _this.material = material;
        return _this;
    }
    InstancedMesh3D.prototype.destroy = function (options) {
        _super.prototype.destroy.call(this, options);
        this.mesh.removeInstance(this);
    };
    return InstancedMesh3D;
}(container_1.Container3D));
exports.InstancedMesh3D = InstancedMesh3D;


/***/ }),

/***/ "./src/mesh/mesh-shader.ts":
/*!*********************************!*\
  !*** ./src/mesh/mesh-shader.ts ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MeshShader = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
/**
 * Shader used specifically to render a mesh.
 */
var MeshShader = /** @class */ (function (_super) {
    tslib_1.__extends(MeshShader, _super);
    function MeshShader() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._state = Object.assign(new pixi_js_1.State(), {
            culling: true, clockwiseFrontFace: false, depthTest: true
        });
        return _this;
    }
    Object.defineProperty(MeshShader.prototype, "name", {
        /** The name of the mesh shader. Used for figuring out if geometry attributes is compatible with the shader. This needs to be set to something different than default value when custom attributes is used. */
        get: function () {
            return "mesh-shader";
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Creates geometry with required attributes used by this shader. Override when using custom attributes.
     * @param geometry The geometry with mesh data.
     * @param instanced Value indicating if the geometry will be instanced.
     */
    MeshShader.prototype.createShaderGeometry = function (geometry, instanced) {
        var result = new pixi_js_1.Geometry();
        if (geometry.indices) {
            if (geometry.indices.buffer.BYTES_PER_ELEMENT === 1) {
                // PixiJS seems to have problems with Uint8Array, let's convert to UNSIGNED_SHORT.
                result.addIndex(new pixi_js_1.Buffer(new Uint16Array(geometry.indices.buffer)));
            }
            else {
                result.addIndex(new pixi_js_1.Buffer(geometry.indices.buffer));
            }
        }
        if (geometry.positions) {
            result.addAttribute("a_Position", new pixi_js_1.Buffer(geometry.positions.buffer), 3, false, geometry.positions.componentType, geometry.positions.stride);
        }
        if (geometry.uvs && geometry.uvs[0]) {
            result.addAttribute("a_UV1", new pixi_js_1.Buffer(geometry.uvs[0].buffer), 2, false, geometry.uvs[0].componentType, geometry.uvs[0].stride);
        }
        if (geometry.normals) {
            result.addAttribute("a_Normal", new pixi_js_1.Buffer(geometry.normals.buffer), 3, false, geometry.normals.componentType, geometry.normals.stride);
        }
        if (geometry.tangents) {
            result.addAttribute("a_Tangent", new pixi_js_1.Buffer(geometry.tangents.buffer), 4, false, geometry.tangents.componentType, geometry.tangents.stride);
        }
        return result;
    };
    /**
     * Renders the geometry of the specified mesh.
     * @param mesh Mesh to render.
     * @param renderer Renderer to use.
     * @param state Rendering state to use.
     * @param drawMode Draw mode to use.
     */
    MeshShader.prototype.render = function (mesh, renderer, state, drawMode) {
        if (state === void 0) { state = this._state; }
        if (drawMode === void 0) { drawMode = pixi_js_1.DRAW_MODES.TRIANGLES; }
        var instanceCount = mesh.instances.filter(function (i) {
            return i.worldVisible && i.renderable;
        }).length;
        var instancing = mesh.instances.length > 0;
        if (!mesh.geometry.hasShaderGeometry(this, instancing)) {
            mesh.geometry.addShaderGeometry(this, instancing);
        }
        var geometry = mesh.geometry.getShaderGeometry(this);
        renderer.shader.bind(this, false);
        renderer.state.set(state);
        renderer.geometry.bind(geometry, this);
        renderer.geometry.draw(drawMode, undefined, undefined, instanceCount);
    };
    return MeshShader;
}(pixi_js_1.Shader));
exports.MeshShader = MeshShader;


/***/ }),

/***/ "./src/mesh/mesh.ts":
/*!**************************!*\
  !*** ./src/mesh/mesh.ts ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Mesh3D = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var plane_geometry_1 = __webpack_require__(/*! ./geometry/plane-geometry */ "./src/mesh/geometry/plane-geometry.ts");
var cube_geometry_1 = __webpack_require__(/*! ./geometry/cube-geometry */ "./src/mesh/geometry/cube-geometry.ts");
var container_1 = __webpack_require__(/*! ../container */ "./src/container.ts");
var quad_geometry_1 = __webpack_require__(/*! ./geometry/quad-geometry */ "./src/mesh/geometry/quad-geometry.ts");
var instanced_mesh_1 = __webpack_require__(/*! ./instanced-mesh */ "./src/mesh/instanced-mesh.ts");
var standard_material_1 = __webpack_require__(/*! ../material/standard/standard-material */ "./src/material/standard/standard-material.ts");
var __1 = __webpack_require__(/*! .. */ "./src/index.ts");
var aabb_1 = __webpack_require__(/*! ../math/aabb */ "./src/math/aabb.ts");
/**
 * Represents a mesh which contains geometry and has a material.
 */
var Mesh3D = /** @class */ (function (_super) {
    tslib_1.__extends(Mesh3D, _super);
    /**
     * Creates a new mesh with the specified geometry and material.
     * @param geometry The geometry for the mesh.
     * @param material The material for the mesh. If the material is empty the mesh won't be rendered.
     */
    function Mesh3D(geometry, material) {
        var _this = _super.call(this) || this;
        _this.geometry = geometry;
        _this.material = material;
        /** The name of the plugin used for rendering the mesh. */
        _this.pluginName = "pipeline";
        /** The enabled render passes for this mesh. */
        _this.enabledRenderPasses = { "material": {} };
        /** Used for sorting the mesh before render. */
        _this.renderSortOrder = 0;
        _this._instances = [];
        if (!geometry) {
            throw new Error("PIXI3D: Geometry is required when creating a mesh.");
        }
        return _this;
    }
    Object.defineProperty(Mesh3D.prototype, "instances", {
        /** An array of instances created from this mesh. */
        get: function () {
            return this._instances;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Creates a new instance of this mesh.
     */
    Mesh3D.prototype.createInstance = function () {
        var _a;
        if (this.material && !this.material.isInstancingSupported) {
            throw new Error("PIXI3D: Can't create instance of mesh, material does not support instancing.");
        }
        return this._instances[this._instances.push(new instanced_mesh_1.InstancedMesh3D(this, (_a = this.material) === null || _a === void 0 ? void 0 : _a.createInstance())) - 1];
    };
    /**
     * Removes an instance from this mesh.
     * @param instance The instance to remove.
     */
    Mesh3D.prototype.removeInstance = function (instance) {
        var index = this._instances.indexOf(instance);
        if (index >= 0) {
            this._instances.splice(index, 1);
        }
    };
    /**
     * Enables the render pass with the specified name.
     * @param name The name of the render pass to enable.
     */
    Mesh3D.prototype.enableRenderPass = function (name, options) {
        if (!this.enabledRenderPasses[name]) {
            this.enabledRenderPasses[name] = options || {};
        }
    };
    /**
     * Disables the render pass with the specified name.
     * @param name The name of the render pass to disable.
     * @param options The options for the render pass.
     */
    Mesh3D.prototype.disableRenderPass = function (name) {
        if (this.enabledRenderPasses[name]) {
            delete this.enabledRenderPasses[name];
        }
    };
    /**
     * Returns a value indicating if the specified render pass is enabled.
     * @param name The name of the render pass to check.
     */
    Mesh3D.prototype.isRenderPassEnabled = function (name) {
        return !!this.enabledRenderPasses[name];
    };
    /**
     * Destroys the mesh and it's used resources.
     */
    Mesh3D.prototype.destroy = function (options) {
        if (options === true || (options && options.geometry)) {
            this.geometry.destroy();
        }
        if (options === true || (options && options.material)) {
            if (this.material) {
                this.material.destroy();
            }
        }
        _super.prototype.destroy.call(this, options);
    };
    Mesh3D.prototype._render = function (renderer) {
        renderer.batch.setObjectRenderer(renderer.plugins[this.pluginName]);
        if (this.skin) {
            this.skin.calculateJointMatrices();
        }
        renderer.plugins[this.pluginName].render(this);
    };
    /**
     * Calculates and returns a axis-aligned bounding box of the mesh in world space.
     */
    Mesh3D.prototype.getBoundingBox = function () {
        var _a, _b;
        if (!((_a = this.geometry.positions) === null || _a === void 0 ? void 0 : _a.min)) {
            return undefined;
        }
        if (!((_b = this.geometry.positions) === null || _b === void 0 ? void 0 : _b.max)) {
            return undefined;
        }
        var min = __1.Vec3.transformMat4(this.geometry.positions.min, this.worldTransform.array);
        var max = __1.Vec3.transformMat4(this.geometry.positions.max, this.worldTransform.array);
        for (var i = 0; i < 3; i++) {
            var temp = min[i];
            min[i] = Math.min(min[i], max[i]);
            max[i] = Math.max(temp, max[i]);
        }
        return aabb_1.AABB.from({ min: min, max: max });
    };
    /**
     * Creates a new quad (flat square) mesh with the specified material.
     * @param material The material to use.
     */
    Mesh3D.createQuad = function (material) {
        if (material === void 0) { material = new standard_material_1.StandardMaterial(); }
        return new Mesh3D(quad_geometry_1.QuadGeometry.create(), material);
    };
    /**
     * Creates a new cube (six faces) mesh with the specified material.
     * @param material The material to use.
     */
    Mesh3D.createCube = function (material) {
        if (material === void 0) { material = new standard_material_1.StandardMaterial(); }
        return new Mesh3D(cube_geometry_1.CubeGeometry.create(), material);
    };
    /**
     * Creates a new plane (flat square) mesh with the specified material.
     * @param material The material to use.
     */
    Mesh3D.createPlane = function (material) {
        if (material === void 0) { material = new standard_material_1.StandardMaterial(); }
        return new Mesh3D(plane_geometry_1.PlaneGeometry.create(), material);
    };
    return Mesh3D;
}(container_1.Container3D));
exports.Mesh3D = Mesh3D;


/***/ }),

/***/ "./src/message.ts":
/*!************************!*\
  !*** ./src/message.ts ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
var Message;
(function (Message) {
    Message["meshVertexSkinningFloatingPointTexturesNotSupported"] = "Mesh is using vertex skinning but floating point textures is not supported on this device/environment. In case of errors, try changing the environment in PixiJS settings. Set \"PIXI.settings.PREFER_ENV = PIXI.ENV.WEBGL2\" before creating a renderer/application.";
    Message["meshVertexSkinningNumberOfJointsNotSupported"] = "Mesh is using vertex skinning but the number of joints ({joints}) is not supported on this device/environment. Max number of supported joints is {maxJoints}, try reducing the number of joints.";
    Message["imageBasedLightingShaderTextureLodNotSupported"] = "Image based lighting is used but shader texture lod is not supported on this device/environment, the material may not be displayed correctly. Try changing the environment in PixiJS settings. Set \"PIXI.settings.PREFER_ENV = PIXI.ENV.WEBGL2\" before creating a renderer/application.";
})(Message = exports.Message || (exports.Message = {}));


/***/ }),

/***/ "./src/model.ts":
/*!**********************!*\
  !*** ./src/model.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Model = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var gltf_parser_1 = __webpack_require__(/*! ./gltf/gltf-parser */ "./src/gltf/gltf-parser.ts");
var container_1 = __webpack_require__(/*! ./container */ "./src/container.ts");
var instanced_model_1 = __webpack_require__(/*! ./instanced-model */ "./src/instanced-model.ts");
var aabb_1 = __webpack_require__(/*! ./math/aabb */ "./src/math/aabb.ts");
/**
 * Represents a model which has been loaded from a file. Contains a hierarchy of meshes and animations.
 */
var Model = /** @class */ (function (_super) {
    tslib_1.__extends(Model, _super);
    function Model() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /** The animations included in the model. */
        _this.animations = [];
        /**
         * The meshes included in the model. Note that this array and the actual
         * childen are not automatically synchronized after the model has been loaded.
         */
        _this.meshes = [];
        return _this;
    }
    /**
     * Creates a new model from a source.
     * @param source The source to create the model from.
     * @param materialFactory The factory to use for creating materials.
     */
    Model.from = function (source, materialFactory) {
        return gltf_parser_1.glTFParser.createModel(source, materialFactory);
    };
    /**
     * Creates a new instance of this model.
     */
    Model.prototype.createInstance = function () {
        return new instanced_model_1.InstancedModel(this);
    };
    /**
     * Calculates and returns a axis-aligned bounding box of the model in world
     * space. The bounding box will encapsulate the meshes included in the model.
     */
    Model.prototype.getBoundingBox = function () {
        this.updateTransform();
        var aabb = new aabb_1.AABB();
        var mesh = this.meshes[0].getBoundingBox();
        if (mesh) {
            aabb.min = mesh.min;
            aabb.max = mesh.max;
        }
        for (var i = 1; i < this.meshes.length; i++) {
            var mesh_1 = this.meshes[i].getBoundingBox();
            if (mesh_1) {
                aabb.encapsulate(mesh_1.min);
                aabb.encapsulate(mesh_1.max);
            }
        }
        return aabb;
    };
    return Model;
}(container_1.Container3D));
exports.Model = Model;


/***/ }),

/***/ "./src/picking/picking-hitarea.ts":
/*!****************************************!*\
  !*** ./src/picking/picking-hitarea.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PickingHitArea = void 0;
var picking_interaction_1 = __webpack_require__(/*! ./picking-interaction */ "./src/picking/picking-interaction.ts");
var picking_id_1 = __webpack_require__(/*! ./picking-id */ "./src/picking/picking-id.ts");
/**
 * Hit area which uses the shape of an object to determine interaction.
 */
var PickingHitArea = /** @class */ (function () {
    /**
     * Creates a new hitarea using the specified object.
     * @param renderer The renderer to use.
     * @param object The model or mesh to use as the shape for hit testing.
     * @param camera The camera to use when rendering the object picking shape.
     * If not set, the main camera will be used as default.
     */
    function PickingHitArea(renderer, object, camera) {
        this.object = object;
        this.camera = camera;
        /** The id which maps to the object. */
        this.id = picking_id_1.PickingId.next();
    }
    PickingHitArea.prototype.contains = function (x, y) {
        return picking_interaction_1.PickingInteraction.main.containsHitArea(x, y, this);
    };
    /**
     * Creates a new hitarea using the specified object.
     * @param object The model or mesh to use as the shape for hit testing.
     */
    PickingHitArea.fromObject = function (object) {
        return new PickingHitArea(undefined, object);
    };
    return PickingHitArea;
}());
exports.PickingHitArea = PickingHitArea;


/***/ }),

/***/ "./src/picking/picking-id.ts":
/*!***********************************!*\
  !*** ./src/picking/picking-id.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PickingId = void 0;
var PickingId;
(function (PickingId) {
    var id = 0;
    function next() {
        id++;
        return new Uint8Array([
            (id >> 16) & 255, (id >> 8) & 255, id & 255
        ]);
    }
    PickingId.next = next;
})(PickingId = exports.PickingId || (exports.PickingId = {}));


/***/ }),

/***/ "./src/picking/picking-interaction.ts":
/*!********************************************!*\
  !*** ./src/picking/picking-interaction.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PickingInteraction = void 0;
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var picking_map_1 = __webpack_require__(/*! ./picking-map */ "./src/picking/picking-map.ts");
/**
 * Manages the picking hit areas by keeping track on which hit areas needs to
 * be checked for interaction. Renders the hit area meshes to a texture which
 * is then used to map a mesh to a x/y coordinate. The picking manager is
 * registered as a renderer plugin.
 */
var PickingInteraction = /** @class */ (function () {
    /**
     * Creates a new picking manager using the specified renderer.
     * @param renderer The renderer to use.
     */
    function PickingInteraction(renderer) {
        this.renderer = renderer;
        this._hitAreas = [];
        this._map = new picking_map_1.PickingMap(this.renderer, 128);
        pixi_js_1.Ticker.shared.add(this._update, this, pixi_js_1.UPDATE_PRIORITY.LOW);
        if (!PickingInteraction.main) {
            PickingInteraction.main = this;
        }
    }
    PickingInteraction.prototype._update = function () {
        if (!this.renderer.plugins) {
            return;
        }
        // Because of how PixiJS interaction works and the design of the picking,
        // the "hitTest" function needs to be called. Otherwise, in some 
        // circumstances; the picking is affected by in which order the interaction 
        // object was added to the heirarchy.
        this.renderer.plugins.interaction.hitTest(new pixi_js_1.Point(0, 0));
        if (this._hitAreas.length > 0) {
            this._map.resizeToAspect();
            this._map.update(this._hitAreas);
            this._hitAreas = [];
        }
    };
    PickingInteraction.prototype.destroy = function () {
        if (this === PickingInteraction.main) {
            // @ts-ignore It's ok, main picking interaction was destroyed.
            PickingInteraction.main = undefined;
        }
        pixi_js_1.Ticker.shared.remove(this._update, this);
    };
    /**
     * Hit tests a area using the specified x/y coordinates.
     * @param x The x coordinate.
     * @param y The y coordinate.
     * @param hitArea The hit area to test.
     */
    PickingInteraction.prototype.containsHitArea = function (x, y, hitArea) {
        if (this._hitAreas.indexOf(hitArea) < 0) {
            this._hitAreas.push(hitArea);
        }
        return this._map.containsId(x, y, hitArea.id);
    };
    return PickingInteraction;
}());
exports.PickingInteraction = PickingInteraction;
pixi_js_1.Renderer.registerPlugin("picking", PickingInteraction);


/***/ }),

/***/ "./src/picking/picking-map.ts":
/*!************************************!*\
  !*** ./src/picking/picking-map.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PickingMap = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var mesh_1 = __webpack_require__(/*! ../mesh/mesh */ "./src/mesh/mesh.ts");
var camera_1 = __webpack_require__(/*! ../camera/camera */ "./src/camera/camera.ts");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var mat4_1 = __webpack_require__(/*! ../math/mat4 */ "./src/math/mat4.ts");
var mesh_shader_1 = __webpack_require__(/*! ../mesh/mesh-shader */ "./src/mesh/mesh-shader.ts");
var PickingMap = /** @class */ (function () {
    function PickingMap(_renderer, size) {
        this._renderer = _renderer;
        this._update = 0;
        this._matrix = new Float32Array(16);
        this._pixels = new Uint8Array(size * size * 4);
        this._output = pixi_js_1.RenderTexture.create({ width: size, height: size });
        this._shader = new mesh_shader_1.MeshShader(pixi_js_1.Program.from(__webpack_require__(/*! ./shader/picking.vert */ "./src/picking/shader/picking.vert"), __webpack_require__(/*! ./shader/picking.frag */ "./src/picking/shader/picking.frag")));
        this._output.framebuffer.addDepthTexture();
    }
    PickingMap.prototype.destroy = function () {
        this._output.destroy(true);
        this._shader.destroy();
    };
    PickingMap.prototype.resizeToAspect = function () {
        var aspect = this._renderer.width / this._renderer.height;
        var aspectWidth = Math.floor(this._output.height * aspect);
        if (this._output.width !== aspectWidth) {
            this._pixels = new Uint8Array(aspectWidth * this._output.height * 4);
            this._output.resize(aspectWidth, this._output.height);
        }
    };
    PickingMap.prototype.containsId = function (x, y, id) {
        var _a = this._renderer.screen, width = _a.width, height = _a.height;
        x = Math.floor(x / width * this._output.width);
        y = Math.floor((height - y) / height * this._output.height);
        for (var i = 0; i < 3; i++) {
            if (id[i] !== this._pixels[(y * this._output.width + x) * 4 + i]) {
                return false;
            }
        }
        return true;
    };
    PickingMap.prototype.update = function (hitAreas) {
        var e_1, _a;
        this._renderer.renderTexture.bind(this._output);
        if (this._update++ % 2 === 0) {
            // For performance reasons, the update method alternates between rendering 
            // the meshes and reading the pixels from the rendered texture.
            this._renderer.renderTexture.clear();
            try {
                for (var hitAreas_1 = tslib_1.__values(hitAreas), hitAreas_1_1 = hitAreas_1.next(); !hitAreas_1_1.done; hitAreas_1_1 = hitAreas_1.next()) {
                    var hitArea = hitAreas_1_1.value;
                    this.renderHitArea(hitArea);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (hitAreas_1_1 && !hitAreas_1_1.done && (_a = hitAreas_1.return)) _a.call(hitAreas_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        else {
            var gl = this._renderer.gl;
            gl.readPixels(0, 0, this._output.width, this._output.height, gl.RGBA, gl.UNSIGNED_BYTE, this._pixels);
        }
        this._renderer.renderTexture.bind(undefined);
    };
    PickingMap.prototype.renderHitArea = function (hitArea) {
        var e_2, _a;
        var uniforms = this._shader.uniforms;
        var meshes = hitArea.object instanceof mesh_1.Mesh3D ? [hitArea.object] : hitArea.object.meshes;
        var camera = hitArea.camera || camera_1.Camera.main;
        try {
            for (var meshes_1 = tslib_1.__values(meshes), meshes_1_1 = meshes_1.next(); !meshes_1_1.done; meshes_1_1 = meshes_1.next()) {
                var mesh = meshes_1_1.value;
                uniforms.u_Id = hitArea.id;
                uniforms.u_ModelViewProjection = mat4_1.Mat4.multiply(camera.viewProjection, mesh.transform.worldTransform.array, this._matrix);
                this._shader.render(mesh, this._renderer);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (meshes_1_1 && !meshes_1_1.done && (_a = meshes_1.return)) _a.call(meshes_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
    return PickingMap;
}());
exports.PickingMap = PickingMap;


/***/ }),

/***/ "./src/picking/shader/picking.frag":
/*!*****************************************!*\
  !*** ./src/picking/shader/picking.frag ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "#version 100\n\n#ifdef GL_FRAGMENT_PRECISION_HIGH\n  precision highp float;\n#else\n  precision mediump float;\n#endif\n\nuniform vec3 u_Id;\n\nvoid main() {\n  gl_FragColor = vec4(u_Id / 255.0, 1.0);\n}"

/***/ }),

/***/ "./src/picking/shader/picking.vert":
/*!*****************************************!*\
  !*** ./src/picking/shader/picking.vert ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "#version 100\n\nattribute vec3 a_Position;\n\nuniform mat4 u_ModelViewProjection;\n\nvoid main() {\n  gl_Position = u_ModelViewProjection * vec4(a_Position, 1.0);\n}"

/***/ }),

/***/ "./src/pipeline/material-render-pass.ts":
/*!**********************************************!*\
  !*** ./src/pipeline/material-render-pass.ts ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialRenderPass = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var color_1 = __webpack_require__(/*! ../color */ "./src/color.ts");
/**
 * Pass used for rendering materials.
 */
var MaterialRenderPass = /** @class */ (function () {
    /**
     * Creates a new material render pass.
     * @param renderer The renderer to use.
     * @param name The name of the render pass.
     */
    function MaterialRenderPass(renderer, name) {
        this.renderer = renderer;
        this.name = name;
        /** The color (r,g,b,a) used for clearing the render texture. If this value is empty, the render texture will not be cleared. */
        this.clearColor = new color_1.Color(0, 0, 0, 0);
    }
    Object.defineProperty(MaterialRenderPass.prototype, "renderTexture", {
        /** The texture used when rendering to a texture. */
        get: function () {
            return this._renderTexture;
        },
        set: function (value) {
            this._renderTexture = value;
        },
        enumerable: false,
        configurable: true
    });
    MaterialRenderPass.prototype.clear = function () {
        if (this._renderTexture && this.clearColor) {
            var current = this.renderer.renderTexture.current;
            this.renderer.renderTexture.bind(this._renderTexture);
            this.renderer.renderTexture.clear(Array.from(this.clearColor.rgba));
            this.renderer.renderTexture.bind(current);
        }
    };
    MaterialRenderPass.prototype.render = function (meshes) {
        var e_1, _a;
        var current = this.renderer.renderTexture.current;
        if (this._renderTexture) {
            this.renderer.renderTexture.bind(this._renderTexture);
        }
        try {
            for (var meshes_1 = tslib_1.__values(meshes), meshes_1_1 = meshes_1.next(); !meshes_1_1.done; meshes_1_1 = meshes_1.next()) {
                var mesh = meshes_1_1.value;
                if (mesh.material) {
                    mesh.material.render(mesh, this.renderer);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (meshes_1_1 && !meshes_1_1.done && (_a = meshes_1.return)) _a.call(meshes_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (this._renderTexture) {
            this.renderer.renderTexture.bind(current);
        }
    };
    return MaterialRenderPass;
}());
exports.MaterialRenderPass = MaterialRenderPass;


/***/ }),

/***/ "./src/pipeline/standard-pipeline.ts":
/*!*******************************************!*\
  !*** ./src/pipeline/standard-pipeline.ts ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardPipeline = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var material_render_pass_1 = __webpack_require__(/*! ./material-render-pass */ "./src/pipeline/material-render-pass.ts");
var shadow_render_pass_1 = __webpack_require__(/*! ../shadow/shadow-render-pass */ "./src/shadow/shadow-render-pass.ts");
var post_processing_sprite_1 = __webpack_require__(/*! ../sprite/post-processing-sprite */ "./src/sprite/post-processing-sprite.ts");
var model_1 = __webpack_require__(/*! ../model */ "./src/model.ts");
var standard_material_1 = __webpack_require__(/*! ../material/standard/standard-material */ "./src/material/standard/standard-material.ts");
var material_render_sort_type_1 = __webpack_require__(/*! ../material/material-render-sort-type */ "./src/material/material-render-sort-type.ts");
/**
 * The standard pipeline renders meshes using the set render passes. It's
 * created and used by default.
 */
var StandardPipeline = /** @class */ (function (_super) {
    tslib_1.__extends(StandardPipeline, _super);
    /**
     * Creates a new standard pipeline using the specified renderer.
     * @param renderer The renderer to use.
     */
    function StandardPipeline(renderer) {
        var _this = _super.call(this, renderer) || this;
        _this.renderer = renderer;
        _this._meshes = [];
        /** The pass used for rendering materials. */
        _this.materialPass = new material_render_pass_1.MaterialRenderPass(_this.renderer, "material");
        /** The pass used for rendering shadows. */
        _this.shadowPass = new shadow_render_pass_1.ShadowRenderPass(_this.renderer, "shadow");
        /** The array of render passes. Each mesh will be rendered with these passes (if it has been enabled on that mesh). */
        _this.renderPasses = [
            _this.shadowPass, _this.materialPass,
        ];
        renderer.on("prerender", function () {
            var e_1, _a;
            try {
                for (var _b = tslib_1.__values(_this.renderPasses), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var pass = _c.value;
                    if (pass.clear) {
                        pass.clear();
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
        return _this;
    }
    /**
     * Creates a new post processing sprite and sets the material pass to render
     * to it's texture.
     * @param options The options when creating the sprite.
     */
    StandardPipeline.prototype.createPostProcessingSprite = function (options) {
        var sprite = new post_processing_sprite_1.PostProcessingSprite(this.renderer, options);
        this.materialPass.renderTexture = sprite.renderTexture;
        return sprite;
    };
    /**
     * Adds a mesh to be rendered.
     * @param mesh The mesh to render.
     */
    StandardPipeline.prototype.render = function (mesh) {
        this._meshes.push(mesh);
    };
    /**
     * Renders the added meshes using the specified render passes.
     */
    StandardPipeline.prototype.flush = function () {
        var e_2, _a;
        this.sort();
        var _loop_1 = function (pass) {
            pass.render(this_1._meshes.filter(function (mesh) { return mesh.isRenderPassEnabled(pass.name); }));
        };
        var this_1 = this;
        try {
            for (var _b = tslib_1.__values(this.renderPasses), _c = _b.next(); !_c.done; _c = _b.next()) {
                var pass = _c.value;
                _loop_1(pass);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        this._meshes = [];
    };
    /**
     * Sorts the meshes by rendering order.
     */
    StandardPipeline.prototype.sort = function () {
        this._meshes.sort(function (a, b) {
            if (!a.material || !b.material) {
                return 0;
            }
            if (a.material.renderSortType !== b.material.renderSortType) {
                return a.material.renderSortType === material_render_sort_type_1.MaterialRenderSortType.transparent ? 1 : -1;
            }
            return a.renderSortOrder - b.renderSortOrder;
        });
    };
    /**
     * Enables shadows for the specified object. Adds the shadow render pass to
     * the specified object and enables the standard material to use the casting
     * light.
     * @param object The mesh or model to enable shadows for.
     * @param light The shadow casting light to associate with the
     * object when using the standard material.
     */
    StandardPipeline.prototype.enableShadows = function (object, light) {
        var e_3, _a;
        var meshes = object instanceof model_1.Model ? object.meshes : [object];
        try {
            for (var meshes_1 = tslib_1.__values(meshes), meshes_1_1 = meshes_1.next(); !meshes_1_1.done; meshes_1_1 = meshes_1.next()) {
                var mesh = meshes_1_1.value;
                if (light && mesh.material instanceof standard_material_1.StandardMaterial) {
                    mesh.material.shadowCastingLight = light;
                }
                mesh.enableRenderPass(this.shadowPass.name);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (meshes_1_1 && !meshes_1_1.done && (_a = meshes_1.return)) _a.call(meshes_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        if (light) {
            this.shadowPass.addShadowCastingLight(light);
        }
    };
    /**
     * Disables shadows for the specified object.
     * @param object The mesh or model to disable shadows for.
     */
    StandardPipeline.prototype.disableShadows = function (object) {
        var e_4, _a;
        var meshes = object instanceof model_1.Model ? object.meshes : [object];
        try {
            for (var meshes_2 = tslib_1.__values(meshes), meshes_2_1 = meshes_2.next(); !meshes_2_1.done; meshes_2_1 = meshes_2.next()) {
                var mesh = meshes_2_1.value;
                if (mesh.material instanceof standard_material_1.StandardMaterial) {
                    mesh.material.shadowCastingLight = undefined;
                }
                mesh.disableRenderPass(this.shadowPass.name);
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (meshes_2_1 && !meshes_2_1.done && (_a = meshes_2.return)) _a.call(meshes_2);
            }
            finally { if (e_4) throw e_4.error; }
        }
    };
    return StandardPipeline;
}(pixi_js_1.ObjectRenderer));
exports.StandardPipeline = StandardPipeline;
pixi_js_1.Renderer.registerPlugin("pipeline", StandardPipeline);


/***/ }),

/***/ "./src/resource/array-resource.ts":
/*!****************************************!*\
  !*** ./src/resource/array-resource.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayResource = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
// @ts-ignore
exports.ArrayResource = PIXI.ArrayResource || PIXI.resources.ArrayResource;


/***/ }),

/***/ "./src/resource/base-image-resource.ts":
/*!*********************************************!*\
  !*** ./src/resource/base-image-resource.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseImageResource = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
// @ts-ignore
exports.BaseImageResource = PIXI.BaseImageResource || PIXI.resources.BaseImageResource;


/***/ }),

/***/ "./src/resource/buffer-resource.ts":
/*!*****************************************!*\
  !*** ./src/resource/buffer-resource.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.BufferResource = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
// @ts-ignore
exports.BufferResource = PIXI.BufferResource || PIXI.resources.BufferResource;


/***/ }),

/***/ "./src/resource/cube-resource.ts":
/*!***************************************!*\
  !*** ./src/resource/cube-resource.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CubeResource = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
// @ts-ignore
exports.CubeResource = PIXI.CubeResource || PIXI.resources.CubeResource;


/***/ }),

/***/ "./src/shadow/shader/gaussian-blur.frag":
/*!**********************************************!*\
  !*** ./src/shadow/shader/gaussian-blur.frag ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "#version 100\n\n#ifdef GL_FRAGMENT_PRECISION_HIGH\n  precision highp float;\n#else\n  precision mediump float;\n#endif\n\nvarying vec2 v_UV1;\n\nuniform vec2 u_BlurScale;\nuniform sampler2D u_FilterSampler;\n\nvoid main() {\n  vec4 color = vec4(0.0);\n\n  color += texture2D(u_FilterSampler, v_UV1 + (vec2(-3.0) * u_BlurScale.xy)) * (1.0/64.0);\n  color += texture2D(u_FilterSampler, v_UV1 + (vec2(-2.0) * u_BlurScale.xy)) * (6.0/64.0);\n  color += texture2D(u_FilterSampler, v_UV1 + (vec2(-1.0) * u_BlurScale.xy)) * (15.0/64.0);\n  color += texture2D(u_FilterSampler, v_UV1 + (vec2(+0.0) * u_BlurScale.xy)) * (20.0/64.0);\n  color += texture2D(u_FilterSampler, v_UV1 + (vec2(+1.0) * u_BlurScale.xy)) * (15.0/64.0);\n  color += texture2D(u_FilterSampler, v_UV1 + (vec2(+2.0) * u_BlurScale.xy)) * (6.0/64.0);\n  color += texture2D(u_FilterSampler, v_UV1 + (vec2(+3.0) * u_BlurScale.xy)) * (1.0/64.0);\n\n  gl_FragColor = color;\n}"

/***/ }),

/***/ "./src/shadow/shader/gaussian-blur.vert":
/*!**********************************************!*\
  !*** ./src/shadow/shader/gaussian-blur.vert ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "#version 100\n\nattribute vec3 a_Position;\nattribute vec2 a_UV1;\n\nvarying vec2 v_UV1;\n\nvoid main() {\n  v_UV1 = a_UV1;\n  gl_Position = vec4(a_Position, 1.0);\n}"

/***/ }),

/***/ "./src/shadow/shader/shadow.frag":
/*!***************************************!*\
  !*** ./src/shadow/shader/shadow.frag ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "#version 100\n\n#extension GL_OES_standard_derivatives : enable\n\n#ifdef GL_FRAGMENT_PRECISION_HIGH\n  precision highp float;\n#else\n  precision mediump float;\n#endif\n\nvoid main() {\n  float depth = gl_FragCoord.z;\n  float dx = 0.0;\n  float dy = 0.0;\n\n  #ifdef GL_OES_standard_derivatives\n    dx = dFdx(depth);\n    dy = dFdy(depth);\n  #endif\n\n  float moment2 = depth * depth + 0.25 * (dx * dx + dy * dy);\n  gl_FragColor = vec4(1.0 - depth, 1.0 - moment2, 0.0, 0.0);\n}"

/***/ }),

/***/ "./src/shadow/shader/shadow.vert":
/*!***************************************!*\
  !*** ./src/shadow/shader/shadow.vert ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "#version 100\n\n#define FEATURES\n\nattribute vec3 a_Position;\n\n#ifdef USE_SKINNING\nattribute vec4 a_Joint1;\nattribute vec4 a_Weight1;\n#endif\n\nuniform mat4 u_ViewProjectionMatrix;\nuniform mat4 u_ModelMatrix;\n\n#ifdef USE_SKINNING\n  #ifdef USE_SKINNING_TEXTURE\n    uniform sampler2D u_jointMatrixSampler;\n  #else\n    uniform mat4 u_jointMatrix[MAX_JOINT_COUNT];\n  #endif\n#endif\n\n// these offsets assume the texture is 4 pixels across\n#define ROW0_U ((0.5 + 0.0) / 4.0)\n#define ROW1_U ((0.5 + 1.0) / 4.0)\n#define ROW2_U ((0.5 + 2.0) / 4.0)\n#define ROW3_U ((0.5 + 3.0) / 4.0)\n\n#ifdef USE_SKINNING\nmat4 getJointMatrix(float boneNdx) {\n    #ifdef USE_SKINNING_TEXTURE\n    float v = (boneNdx + 0.5) / float(MAX_JOINT_COUNT);\n    return mat4(\n        texture2D(u_jointMatrixSampler, vec2(ROW0_U, v)),\n        texture2D(u_jointMatrixSampler, vec2(ROW1_U, v)),\n        texture2D(u_jointMatrixSampler, vec2(ROW2_U, v)),\n        texture2D(u_jointMatrixSampler, vec2(ROW3_U, v))\n    );\n    #else\n    return u_jointMatrix[int(boneNdx)];\n    #endif\n}\n\nmat4 getSkinningMatrix()\n{\n    mat4 skin = mat4(0);\n    skin +=\n        a_Weight1.x * getJointMatrix(a_Joint1.x) +\n        a_Weight1.y * getJointMatrix(a_Joint1.y) +\n        a_Weight1.z * getJointMatrix(a_Joint1.z) +\n        a_Weight1.w * getJointMatrix(a_Joint1.w);\n    return skin;\n}\n#endif\n\nvoid main() {\n  vec4 pos = vec4(a_Position, 1.0);\n  #ifdef USE_SKINNING\n    pos = getSkinningMatrix() * pos;\n  #endif\n  gl_Position = u_ViewProjectionMatrix * u_ModelMatrix * pos;\n}"

/***/ }),

/***/ "./src/shadow/shadow-casting-light.ts":
/*!********************************************!*\
  !*** ./src/shadow/shadow-casting-light.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowCastingLight = void 0;
var light_type_1 = __webpack_require__(/*! ../lighting/light-type */ "./src/lighting/light-type.ts");
var capabilities_1 = __webpack_require__(/*! ../capabilities */ "./src/capabilities.ts");
var shadow_texture_1 = __webpack_require__(/*! ./shadow-texture */ "./src/shadow/shadow-texture.ts");
var shadow_math_1 = __webpack_require__(/*! ./shadow-math */ "./src/shadow/shadow-math.ts");
var shadow_quality_1 = __webpack_require__(/*! ./shadow-quality */ "./src/shadow/shadow-quality.ts");
/**
 * Contains the required components used for rendering a shadow casted by a light.
 */
var ShadowCastingLight = /** @class */ (function () {
    /**
     * Creates a new shadow casting light used for rendering a shadow texture.
     * @param renderer The renderer to use.
     * @param light The light which is casting the shadow.
     * @param options The options to use when creating the shadow texture.
     */
    function ShadowCastingLight(renderer, light, options) {
        this.renderer = renderer;
        this.light = light;
        this._lightViewProjection = new Float32Array(16);
        /** The softness of the edges for the shadow. */
        this.softness = 0;
        /**
         * The area in units of the shadow when using directional lights. Reducing
         * the area will improve the quality of the shadow.
         */
        this.shadowArea = 50;
        /**
         * Value indicating if the shadow should follow the specified camera. If the
         * camera is not set, the main camera will be used as default. Only available
         * when using directional lights.
         */
        this.followCamera = true;
        if (light.type === light_type_1.LightType.point) {
            throw new Error("PIXI3D: Only directional and spot lights are supported as shadow casters.");
        }
        var _a = options || {}, _b = _a.shadowTextureSize, shadowTextureSize = _b === void 0 ? 1024 : _b, _c = _a.quality, quality = _c === void 0 ? shadow_quality_1.ShadowQuality.medium : _c;
        this._shadowTexture = shadow_texture_1.ShadowTexture.create(renderer, shadowTextureSize, quality);
        this._shadowTexture.baseTexture.framebuffer.addDepthTexture();
        this._filterTexture = shadow_texture_1.ShadowTexture.create(renderer, shadowTextureSize, quality);
    }
    Object.defineProperty(ShadowCastingLight.prototype, "lightViewProjection", {
        /** The light view projection matrix. */
        get: function () {
            return this._lightViewProjection;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ShadowCastingLight.prototype, "shadowTexture", {
        /**
         * The rendered shadow texture.
         */
        get: function () {
            return this._shadowTexture;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ShadowCastingLight.prototype, "filterTexture", {
        /**
         * The rendered filter texture.
         */
        get: function () {
            return this._filterTexture;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Destroys the shadow casting light and it's used resources.
     */
    ShadowCastingLight.prototype.destroy = function () {
        this._shadowTexture.destroy(true);
        this._filterTexture.destroy(true);
    };
    /**
     * Clears the rendered shadow texture.
     */
    ShadowCastingLight.prototype.clear = function () {
        this.renderer.renderTexture.bind(this._shadowTexture);
        this.renderer.renderTexture.clear([0, 0, 0, 0], this.renderer.gl.COLOR_BUFFER_BIT | this.renderer.gl.DEPTH_BUFFER_BIT);
        this.renderer.renderTexture.bind(undefined);
    };
    /**
     * Updates the light view projection matrix.
     */
    ShadowCastingLight.prototype.updateLightViewProjection = function () {
        if (this.light.type === light_type_1.LightType.directional) {
            shadow_math_1.ShadowMath.calculateDirectionalLightViewProjection(this);
        }
        else if (this.light.type === light_type_1.LightType.spot) {
            shadow_math_1.ShadowMath.calculateSpotLightViewProjection(this);
        }
    };
    /**
     * Returns a value indicating if medium quality (16-bit precision) shadows is
     * supported by current platform.
     * @param renderer The renderer to use.
     */
    ShadowCastingLight.isMediumQualitySupported = function (renderer) {
        return capabilities_1.Capabilities.isHalfFloatFramebufferSupported(renderer);
    };
    /**
     * Returns a value indicating if high quality (32-bit precision) shadows is
     * supported by current platform.
     * @param renderer The renderer to use.
     */
    ShadowCastingLight.isHighQualitySupported = function (renderer) {
        return capabilities_1.Capabilities.isFloatFramebufferSupported(renderer);
    };
    return ShadowCastingLight;
}());
exports.ShadowCastingLight = ShadowCastingLight;


/***/ }),

/***/ "./src/shadow/shadow-filter.ts":
/*!*************************************!*\
  !*** ./src/shadow/shadow-filter.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowFilter = void 0;
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var mesh_shader_1 = __webpack_require__(/*! ../mesh/mesh-shader */ "./src/mesh/mesh-shader.ts");
var mesh_1 = __webpack_require__(/*! ../mesh/mesh */ "./src/mesh/mesh.ts");
var ShadowFilter = /** @class */ (function () {
    function ShadowFilter(renderer) {
        this.renderer = renderer;
        this._mesh = mesh_1.Mesh3D.createQuad();
        this._gaussianBlurShader = new mesh_shader_1.MeshShader(pixi_js_1.Program.from(__webpack_require__(/*! ./shader/gaussian-blur.vert */ "./src/shadow/shader/gaussian-blur.vert"), __webpack_require__(/*! ./shader/gaussian-blur.frag */ "./src/shadow/shader/gaussian-blur.frag")));
    }
    ShadowFilter.prototype.applyGaussianBlur = function (light) {
        this.applyBlurScale(light.shadowTexture, light.filterTexture, new Float32Array([0, light.softness / light.shadowTexture.height]));
        this.applyBlurScale(light.filterTexture, light.shadowTexture, new Float32Array([light.softness / light.shadowTexture.width, 0]));
    };
    ShadowFilter.prototype.applyBlurScale = function (input, output, scale) {
        this.renderer.renderTexture.bind(output);
        this.renderer.renderTexture.clear();
        this._gaussianBlurShader.uniforms.u_FilterSampler = input;
        this._gaussianBlurShader.uniforms.u_BlurScale = scale;
        this._gaussianBlurShader.render(this._mesh, this.renderer);
        this.renderer.renderTexture.bind(undefined);
    };
    return ShadowFilter;
}());
exports.ShadowFilter = ShadowFilter;


/***/ }),

/***/ "./src/shadow/shadow-math.ts":
/*!***********************************!*\
  !*** ./src/shadow/shadow-math.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowMath = void 0;
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var mat4_1 = __webpack_require__(/*! ../math/mat4 */ "./src/math/mat4.ts");
var light_type_1 = __webpack_require__(/*! ../lighting/light-type */ "./src/lighting/light-type.ts");
var vec3_1 = __webpack_require__(/*! ../math/vec3 */ "./src/math/vec3.ts");
var quat_1 = __webpack_require__(/*! ../math/quat */ "./src/math/quat.ts");
var camera_1 = __webpack_require__(/*! ../camera/camera */ "./src/camera/camera.ts");
var ShadowMath;
(function (ShadowMath) {
    var _lightProjection = new Float32Array(16);
    var _lightView = new Float32Array(16);
    var _conjugateRotation = new Float32Array(4);
    var _lightSpacePosition = new Float32Array(3);
    var _lightSpaceForward = new Float32Array(3);
    var _cameraTarget = new Float32Array(3);
    var _cameraForward = new Float32Array(3);
    function calculateDirectionalLightViewProjection(shadowCastingLight) {
        if (shadowCastingLight.light.type !== light_type_1.LightType.directional) {
            return;
        }
        var halfShadowArea = shadowCastingLight.shadowArea / 2;
        var worldTexelSize = (halfShadowArea * 2) / shadowCastingLight.shadowArea;
        var lightProjection = mat4_1.Mat4.ortho(-halfShadowArea, halfShadowArea, -halfShadowArea, halfShadowArea, -halfShadowArea, halfShadowArea, _lightProjection);
        var light = shadowCastingLight.light;
        var camera = shadowCastingLight.camera || camera_1.Camera.main;
        if (camera && shadowCastingLight.followCamera) {
            vec3_1.Vec3.scale(camera.worldTransform.forward, halfShadowArea, _cameraForward);
            vec3_1.Vec3.add(camera.worldTransform.position, _cameraForward, _cameraTarget);
            vec3_1.Vec3.transformQuat(_cameraTarget, quat_1.Quat.conjugate(shadowCastingLight.light.worldTransform.rotation, _conjugateRotation), _lightSpacePosition);
            _lightSpacePosition[0] = worldTexelSize *
                Math.floor(_lightSpacePosition[0] / worldTexelSize);
            _lightSpacePosition[1] = worldTexelSize *
                Math.floor(_lightSpacePosition[1] / worldTexelSize);
            vec3_1.Vec3.transformQuat(_lightSpacePosition, light.worldTransform.rotation, _lightSpacePosition);
            vec3_1.Vec3.add(_lightSpacePosition, light.worldTransform.forward, _lightSpaceForward);
            mat4_1.Mat4.lookAt(_lightSpacePosition, _lightSpaceForward, light.worldTransform.up, _lightView);
            mat4_1.Mat4.multiply(lightProjection, _lightView, shadowCastingLight.lightViewProjection);
        }
        else {
            vec3_1.Vec3.add(light.worldTransform.position, shadowCastingLight.light.worldTransform.forward, _cameraTarget);
            mat4_1.Mat4.lookAt(light.worldTransform.position, _cameraTarget, light.worldTransform.up, _lightView);
            mat4_1.Mat4.multiply(lightProjection, _lightView, shadowCastingLight.lightViewProjection);
        }
    }
    ShadowMath.calculateDirectionalLightViewProjection = calculateDirectionalLightViewProjection;
    function calculateSpotLightViewProjection(shadowCastingLight) {
        if (shadowCastingLight.light.type !== light_type_1.LightType.spot) {
            return;
        }
        var light = shadowCastingLight.light;
        mat4_1.Mat4.perspective(light.outerConeAngle * pixi_js_1.DEG_TO_RAD * 2, 1, 2, light.range, _lightProjection);
        vec3_1.Vec3.add(light.worldTransform.position, light.worldTransform.forward, _cameraTarget);
        mat4_1.Mat4.lookAt(light.worldTransform.position, _cameraTarget, light.worldTransform.up, _lightView);
        mat4_1.Mat4.multiply(_lightProjection, _lightView, shadowCastingLight.lightViewProjection);
    }
    ShadowMath.calculateSpotLightViewProjection = calculateSpotLightViewProjection;
})(ShadowMath = exports.ShadowMath || (exports.ShadowMath = {}));


/***/ }),

/***/ "./src/shadow/shadow-quality.ts":
/*!**************************************!*\
  !*** ./src/shadow/shadow-quality.ts ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowQuality = void 0;
var ShadowQuality;
(function (ShadowQuality) {
    /**
     * Low quality (8-bit) shadows.
     */
    ShadowQuality["low"] = "low";
    /**
     * Medium quality (16-bit) shadows.
     */
    ShadowQuality["medium"] = "medium";
    /**
     * High quality (32-bit) shadows.
     */
    ShadowQuality["high"] = "high";
})(ShadowQuality = exports.ShadowQuality || (exports.ShadowQuality = {}));


/***/ }),

/***/ "./src/shadow/shadow-render-pass.ts":
/*!******************************************!*\
  !*** ./src/shadow/shadow-render-pass.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowRenderPass = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var shadow_filter_1 = __webpack_require__(/*! ./shadow-filter */ "./src/shadow/shadow-filter.ts");
var shadow_renderer_1 = __webpack_require__(/*! ./shadow-renderer */ "./src/shadow/shadow-renderer.ts");
/**
 * Pass used for rendering shadows.
 */
var ShadowRenderPass = /** @class */ (function () {
    /**
     * Creates a new shadow render pass using the specified renderer.
     * @param renderer The renderer to use.
     * @param name The name for the render pass.
     */
    function ShadowRenderPass(renderer, name) {
        if (name === void 0) { name = "shadow"; }
        this.renderer = renderer;
        this.name = name;
        this._lights = [];
        this._filter = new shadow_filter_1.ShadowFilter(renderer);
        this._shadow = new shadow_renderer_1.ShadowRenderer(renderer);
    }
    /**
     * Adds a shadow casting light.
     * @param shadowCastingLight The light to add.
     */
    ShadowRenderPass.prototype.addShadowCastingLight = function (shadowCastingLight) {
        if (this._lights.indexOf(shadowCastingLight) < 0) {
            this._lights.push(shadowCastingLight);
        }
    };
    /**
     * Removes a shadow casting light.
     * @param shadowCastingLight The light to remove.
     */
    ShadowRenderPass.prototype.removeShadowCastingLight = function (shadowCastingLight) {
        var index = this._lights.indexOf(shadowCastingLight);
        if (index >= 0) {
            this._lights.splice(index, 1);
        }
    };
    ShadowRenderPass.prototype.clear = function () {
        var e_1, _a;
        try {
            for (var _b = tslib_1.__values(this._lights), _c = _b.next(); !_c.done; _c = _b.next()) {
                var shadowCastingLight = _c.value;
                shadowCastingLight.clear();
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    ShadowRenderPass.prototype.render = function (meshes) {
        var e_2, _a, e_3, _b;
        if (meshes.length === 0 || this._lights.length === 0) {
            return;
        }
        var current = this.renderer.renderTexture.current;
        try {
            for (var _c = tslib_1.__values(this._lights), _d = _c.next(); !_d.done; _d = _c.next()) {
                var shadowCastingLight = _d.value;
                this.renderer.renderTexture.bind(shadowCastingLight.shadowTexture);
                shadowCastingLight.updateLightViewProjection();
                try {
                    for (var meshes_1 = (e_3 = void 0, tslib_1.__values(meshes)), meshes_1_1 = meshes_1.next(); !meshes_1_1.done; meshes_1_1 = meshes_1.next()) {
                        var mesh = meshes_1_1.value;
                        this._shadow.render(mesh, shadowCastingLight);
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (meshes_1_1 && !meshes_1_1.done && (_b = meshes_1.return)) _b.call(meshes_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                if (shadowCastingLight.softness > 0) {
                    this._filter.applyGaussianBlur(shadowCastingLight);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_2) throw e_2.error; }
        }
        this.renderer.renderTexture.bind(current);
    };
    return ShadowRenderPass;
}());
exports.ShadowRenderPass = ShadowRenderPass;


/***/ }),

/***/ "./src/shadow/shadow-renderer.ts":
/*!***************************************!*\
  !*** ./src/shadow/shadow-renderer.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowRenderer = void 0;
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var shadow_shader_1 = __webpack_require__(/*! ./shadow-shader */ "./src/shadow/shadow-shader.ts");
var skinning_shader_1 = __webpack_require__(/*! ./skinning-shader */ "./src/shadow/skinning-shader.ts");
var texture_shader_1 = __webpack_require__(/*! ./texture-shader */ "./src/shadow/texture-shader.ts");
var debug_1 = __webpack_require__(/*! ../debug */ "./src/debug.ts");
var message_1 = __webpack_require__(/*! ../message */ "./src/message.ts");
var ShadowRenderer = /** @class */ (function () {
    function ShadowRenderer(renderer) {
        this.renderer = renderer;
        this._state = Object.assign(new pixi_js_1.State(), {
            depthTest: true, clockwiseFrontFace: false, culling: true, blendMode: pixi_js_1.BLEND_MODES.NONE
        });
        this._shadowShader = new shadow_shader_1.ShadowShader(this.renderer);
    }
    ShadowRenderer.prototype.getSkinningShader = function () {
        if (this._textureShader || this._skinningShader) {
            return this._textureShader || this._skinningShader;
        }
        if (texture_shader_1.TextureShader.isSupported(this.renderer)) {
            this._textureShader = new texture_shader_1.TextureShader(this.renderer);
        }
        else {
            debug_1.Debug.warn(message_1.Message.meshVertexSkinningFloatingPointTexturesNotSupported);
            this._skinningShader = new skinning_shader_1.SkinningShader(this.renderer);
        }
        return this._textureShader || this._skinningShader;
    };
    ShadowRenderer.prototype.render = function (mesh, shadowCastingLight) {
        var shader = this._shadowShader;
        if (mesh.skin) {
            var skinningShader = this.getSkinningShader();
            if (skinningShader && mesh.skin.joints.length > skinningShader.maxSupportedJoints) {
                debug_1.Debug.error(message_1.Message.meshVertexSkinningNumberOfJointsNotSupported, {
                    joints: mesh.skin.joints.length,
                    maxJoints: skinningShader.maxSupportedJoints
                });
            }
            else {
                shader = skinningShader;
            }
        }
        if (shader) {
            shader.updateUniforms(mesh, shadowCastingLight);
            shader.render(mesh, this.renderer, this._state);
        }
    };
    return ShadowRenderer;
}());
exports.ShadowRenderer = ShadowRenderer;


/***/ }),

/***/ "./src/shadow/shadow-shader.ts":
/*!*************************************!*\
  !*** ./src/shadow/shadow-shader.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowShader = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var mesh_shader_1 = __webpack_require__(/*! ../mesh/mesh-shader */ "./src/mesh/mesh-shader.ts");
var standard_shader_source_1 = __webpack_require__(/*! ../material/standard/standard-shader-source */ "./src/material/standard/standard-shader-source.ts");
var ShadowShader = /** @class */ (function (_super) {
    tslib_1.__extends(ShadowShader, _super);
    function ShadowShader(renderer, features) {
        if (features === void 0) { features = []; }
        var _this = this;
        var vert = __webpack_require__(/*! ./shader/shadow.vert */ "./src/shadow/shader/shadow.vert");
        var frag = __webpack_require__(/*! ./shader/shadow.frag */ "./src/shadow/shader/shadow.frag");
        _this = _super.call(this, pixi_js_1.Program.from(standard_shader_source_1.StandardShaderSource.build(vert, features, renderer), standard_shader_source_1.StandardShaderSource.build(frag, features, renderer))) || this;
        return _this;
    }
    Object.defineProperty(ShadowShader.prototype, "maxSupportedJoints", {
        get: function () {
            return 0;
        },
        enumerable: false,
        configurable: true
    });
    ShadowShader.prototype.createShaderGeometry = function (geometry) {
        var result = new pixi_js_1.Geometry();
        if (geometry.indices) {
            if (geometry.indices.buffer.BYTES_PER_ELEMENT === 1) {
                // PIXI seems to have problems with Uint8Array, let's convert to UNSIGNED_SHORT.
                result.addIndex(new pixi_js_1.Buffer(new Uint16Array(geometry.indices.buffer)));
            }
            else {
                result.addIndex(new pixi_js_1.Buffer(geometry.indices.buffer));
            }
        }
        if (geometry.positions) {
            result.addAttribute("a_Position", new pixi_js_1.Buffer(geometry.positions.buffer), 3, false, geometry.positions.componentType, geometry.positions.stride);
        }
        return result;
    };
    Object.defineProperty(ShadowShader.prototype, "name", {
        get: function () {
            return "shadow-shader";
        },
        enumerable: false,
        configurable: true
    });
    ShadowShader.prototype.updateUniforms = function (mesh, shadowCastingLight) {
        this.uniforms.u_ModelMatrix = mesh.worldTransform.array;
        this.uniforms.u_ViewProjectionMatrix = shadowCastingLight.lightViewProjection;
    };
    return ShadowShader;
}(mesh_shader_1.MeshShader));
exports.ShadowShader = ShadowShader;


/***/ }),

/***/ "./src/shadow/shadow-texture.ts":
/*!**************************************!*\
  !*** ./src/shadow/shadow-texture.ts ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowTexture = void 0;
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var capabilities_1 = __webpack_require__(/*! ../capabilities */ "./src/capabilities.ts");
var shadow_quality_1 = __webpack_require__(/*! ./shadow-quality */ "./src/shadow/shadow-quality.ts");
var ShadowTexture;
(function (ShadowTexture) {
    function create(renderer, size, quality) {
        var type = getSupportedType(renderer, quality);
        return pixi_js_1.RenderTexture.create({
            width: size, height: size, type: type, scaleMode: getSupportedScaleMode(renderer)
        });
    }
    ShadowTexture.create = create;
    function getSupportedScaleMode(renderer) {
        if (capabilities_1.Capabilities.supportsFloatLinear(renderer)) {
            return pixi_js_1.SCALE_MODES.LINEAR;
        }
        return pixi_js_1.SCALE_MODES.NEAREST;
    }
    function getSupportedType(renderer, quality) {
        if (quality === shadow_quality_1.ShadowQuality.high) {
            if (capabilities_1.Capabilities.isFloatFramebufferSupported(renderer)) {
                return pixi_js_1.TYPES.FLOAT;
            }
            if (capabilities_1.Capabilities.isHalfFloatFramebufferSupported(renderer)) {
                return pixi_js_1.TYPES.HALF_FLOAT;
            }
        }
        if (quality === shadow_quality_1.ShadowQuality.medium && capabilities_1.Capabilities.isHalfFloatFramebufferSupported(renderer)) {
            return pixi_js_1.TYPES.HALF_FLOAT;
        }
        return pixi_js_1.TYPES.UNSIGNED_BYTE;
    }
})(ShadowTexture = exports.ShadowTexture || (exports.ShadowTexture = {}));


/***/ }),

/***/ "./src/shadow/skinning-shader.ts":
/*!***************************************!*\
  !*** ./src/shadow/skinning-shader.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SkinningShader = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var capabilities_1 = __webpack_require__(/*! ../capabilities */ "./src/capabilities.ts");
var shadow_shader_1 = __webpack_require__(/*! ./shadow-shader */ "./src/shadow/shadow-shader.ts");
var SkinningShader = /** @class */ (function (_super) {
    tslib_1.__extends(SkinningShader, _super);
    function SkinningShader(renderer) {
        var _this = this;
        // When setting the MAX_JOINT_COUNT, it needs to be subtracted by 1 for
        // some reason. Otherwise it will exceeed maximum vertex uniforms.
        var maxJointCount = SkinningShader.getMaxJointCount(renderer) - 1;
        _this = _super.call(this, renderer, ["USE_SKINNING 1", "MAX_JOINT_COUNT " + maxJointCount]) || this;
        _this._maxSupportedJoints = maxJointCount;
        return _this;
    }
    Object.defineProperty(SkinningShader.prototype, "maxSupportedJoints", {
        get: function () {
            return this._maxSupportedJoints;
        },
        enumerable: false,
        configurable: true
    });
    SkinningShader.getMaxJointCount = function (renderer) {
        var uniformsRequiredForOtherFeatures = 8;
        var availableVertexUniforms = capabilities_1.Capabilities.getMaxVertexUniformVectors(renderer) - uniformsRequiredForOtherFeatures;
        var uniformsRequiredPerJoint = 4;
        return Math.floor(availableVertexUniforms / uniformsRequiredPerJoint);
    };
    SkinningShader.prototype.createShaderGeometry = function (geometry) {
        var result = _super.prototype.createShaderGeometry.call(this, geometry);
        if (geometry.joints) {
            result.addAttribute("a_Joint1", new pixi_js_1.Buffer(geometry.joints.buffer), 4, false, geometry.joints.componentType, geometry.joints.stride);
        }
        if (geometry.weights) {
            result.addAttribute("a_Weight1", new pixi_js_1.Buffer(geometry.weights.buffer), 4, false, geometry.weights.componentType, geometry.weights.stride);
        }
        return result;
    };
    Object.defineProperty(SkinningShader.prototype, "name", {
        get: function () {
            return "skinned-shadow-shader";
        },
        enumerable: false,
        configurable: true
    });
    SkinningShader.prototype.updateUniforms = function (mesh, shadowCastingLight) {
        _super.prototype.updateUniforms.call(this, mesh, shadowCastingLight);
        if (!mesh.skin) {
            return;
        }
        this.uniforms.u_jointMatrix = mesh.skin.jointMatrices;
    };
    return SkinningShader;
}(shadow_shader_1.ShadowShader));
exports.SkinningShader = SkinningShader;


/***/ }),

/***/ "./src/shadow/texture-shader.ts":
/*!**************************************!*\
  !*** ./src/shadow/texture-shader.ts ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.TextureShader = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var shadow_shader_1 = __webpack_require__(/*! ./shadow-shader */ "./src/shadow/shadow-shader.ts");
var standard_material_matrix_texture_1 = __webpack_require__(/*! ../material/standard/standard-material-matrix-texture */ "./src/material/standard/standard-material-matrix-texture.ts");
var MAX_SUPPORTED_JOINTS = 256;
var TextureShader = /** @class */ (function (_super) {
    tslib_1.__extends(TextureShader, _super);
    function TextureShader(renderer) {
        var _this = _super.call(this, renderer, [
            "USE_SKINNING 1", "USE_SKINNING_TEXTURE 1", "MAX_JOINT_COUNT " + MAX_SUPPORTED_JOINTS
        ]) || this;
        _this._jointMatrixTexture =
            new standard_material_matrix_texture_1.StandardMaterialMatrixTexture(MAX_SUPPORTED_JOINTS);
        return _this;
    }
    TextureShader.isSupported = function (renderer) {
        return standard_material_matrix_texture_1.StandardMaterialMatrixTexture.isSupported(renderer);
    };
    Object.defineProperty(TextureShader.prototype, "maxSupportedJoints", {
        get: function () {
            return MAX_SUPPORTED_JOINTS;
        },
        enumerable: false,
        configurable: true
    });
    TextureShader.prototype.createShaderGeometry = function (geometry) {
        var result = _super.prototype.createShaderGeometry.call(this, geometry);
        if (geometry.joints) {
            result.addAttribute("a_Joint1", new pixi_js_1.Buffer(geometry.joints.buffer), 4, false, geometry.joints.componentType, geometry.joints.stride);
        }
        if (geometry.weights) {
            result.addAttribute("a_Weight1", new pixi_js_1.Buffer(geometry.weights.buffer), 4, false, geometry.weights.componentType, geometry.weights.stride);
        }
        return result;
    };
    Object.defineProperty(TextureShader.prototype, "name", {
        get: function () {
            return "skinned-shadow-shader";
        },
        enumerable: false,
        configurable: true
    });
    TextureShader.prototype.updateUniforms = function (mesh, shadowCastingLight) {
        _super.prototype.updateUniforms.call(this, mesh, shadowCastingLight);
        if (!mesh.skin) {
            return;
        }
        this._jointMatrixTexture.updateBuffer(mesh.skin.jointMatrices);
        this.uniforms.u_jointMatrixSampler = this._jointMatrixTexture;
    };
    return TextureShader;
}(shadow_shader_1.ShadowShader));
exports.TextureShader = TextureShader;


/***/ }),

/***/ "./src/skinning/joint.ts":
/*!*******************************!*\
  !*** ./src/skinning/joint.ts ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Joint = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var container_1 = __webpack_require__(/*! ../container */ "./src/container.ts");
/**
 * Represents a joint used for vertex skinning.
 */
var Joint = /** @class */ (function (_super) {
    tslib_1.__extends(Joint, _super);
    /**
     * Creates a new joint.
     * @param inverseBindMatrix The inverse of the global transform matrix.
     */
    function Joint(inverseBindMatrix) {
        var _this = _super.call(this) || this;
        _this.inverseBindMatrix = inverseBindMatrix;
        return _this;
    }
    return Joint;
}(container_1.Container3D));
exports.Joint = Joint;


/***/ }),

/***/ "./src/skinning/skin.ts":
/*!******************************!*\
  !*** ./src/skinning/skin.ts ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Skin = void 0;
var mat4_1 = __webpack_require__(/*! ../math/mat4 */ "./src/math/mat4.ts");
/**
 * Represents a skin used for vertex skinning.
 */
var Skin = /** @class */ (function () {
    /**
     * Creates a new skin.
     * @param parent The parent container node for the skin.
     * @param joints The array of joints included in the skin.
     */
    function Skin(parent, joints) {
        this.parent = parent;
        this.joints = joints;
        this._jointMatrices = [];
        this._jointNormalMatrices = [];
        this._transformIds = [];
        /** The joint normal matrices which has been calculated. */
        this.jointNormalMatrices = new Float32Array(this.joints.length * 16);
        /** The joint matrices which has been calculated. */
        this.jointMatrices = new Float32Array(this.joints.length * 16);
        for (var i = 0; i < joints.length; i++) {
            this._transformIds.push(-1);
            this._jointMatrices.push(new Float32Array(this.jointMatrices.buffer, 16 * 4 * i, 16));
            this._jointNormalMatrices.push(new Float32Array(this.jointNormalMatrices.buffer, 16 * 4 * i, 16));
        }
    }
    /**
     * Calculates the joint matrices.
     */
    Skin.prototype.calculateJointMatrices = function () {
        for (var i = 0; i < this.joints.length; i++) {
            if (this.joints[i].transform._worldID === this._transformIds[i]) {
                // The joint transform hasn't changed, no need to calculate.
                continue;
            }
            this._transformIds[i] = this.joints[i].transform._worldID;
            mat4_1.Mat4.multiply(this.joints[i].worldTransform.array, this.joints[i].inverseBindMatrix, this._jointMatrices[i]);
            mat4_1.Mat4.multiply(this.parent.transform.inverseWorldTransform.array, this._jointMatrices[i], this._jointMatrices[i]);
            mat4_1.Mat4.invert(this._jointMatrices[i], this._jointNormalMatrices[i]);
            mat4_1.Mat4.transpose(this._jointNormalMatrices[i], this._jointNormalMatrices[i]);
        }
    };
    return Skin;
}());
exports.Skin = Skin;


/***/ }),

/***/ "./src/skybox/shader/skybox.frag":
/*!***************************************!*\
  !*** ./src/skybox/shader/skybox.frag ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "varying vec3 v_Position;\n\nuniform samplerCube u_EnvironmentSampler;\n\nvoid main() {\n  gl_FragColor = vec4(textureCube(u_EnvironmentSampler, v_Position).rgb, 1.0);\n}"

/***/ }),

/***/ "./src/skybox/shader/skybox.vert":
/*!***************************************!*\
  !*** ./src/skybox/shader/skybox.vert ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "attribute vec3 a_Position;\n\nvarying vec3 v_Position;\n\nuniform mat4 u_ModelMatrix;\nuniform mat4 u_View;\nuniform mat4 u_Projection;\n\nvoid main() {\n  v_Position = a_Position.xyz;\n\n  // Converting the view to 3x3 matrix and then back to 4x4 matrix \n  // removes the translation. We do this because we want the skybox to \n  // be centered around the camera.\n  gl_Position = u_Projection * mat4(mat3(u_View)) * u_ModelMatrix * vec4(a_Position, 1.0);\n}"

/***/ }),

/***/ "./src/skybox/skybox-material.ts":
/*!***************************************!*\
  !*** ./src/skybox/skybox-material.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SkyboxMaterial = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var mesh_shader_1 = __webpack_require__(/*! ../mesh/mesh-shader */ "./src/mesh/mesh-shader.ts");
var camera_1 = __webpack_require__(/*! ../camera/camera */ "./src/camera/camera.ts");
var material_1 = __webpack_require__(/*! ../material/material */ "./src/material/material.ts");
var SkyboxMaterial = /** @class */ (function (_super) {
    tslib_1.__extends(SkyboxMaterial, _super);
    function SkyboxMaterial(cubemap) {
        var _this = _super.call(this) || this;
        _this._cubemap = cubemap;
        _this.state = Object.assign(new pixi_js_1.State(), {
            culling: true, clockwiseFrontFace: true, depthTest: true
        });
        return _this;
    }
    Object.defineProperty(SkyboxMaterial.prototype, "cubemap", {
        get: function () {
            return this._cubemap;
        },
        set: function (value) {
            if (value !== this._cubemap) {
                if (!this._cubemap.valid) {
                    // Remove the shader so it can be rebuilt with the current features. 
                    // It may happen that we set a texture which is not yet valid, in that 
                    // case we don't want to render the skybox until it has become valid.
                    this._shader = undefined;
                }
                this._cubemap = value;
            }
        },
        enumerable: false,
        configurable: true
    });
    SkyboxMaterial.prototype.updateUniforms = function (mesh, shader) {
        var camera = this.camera || camera_1.Camera.main;
        shader.uniforms.u_ModelMatrix = mesh.worldTransform.array;
        shader.uniforms.u_View = camera.view;
        shader.uniforms.u_Projection = camera.projection;
        shader.uniforms.u_EnvironmentSampler = this.cubemap;
    };
    SkyboxMaterial.prototype.render = function (mesh, renderer) {
        // Disable writing to the depth buffer. This is because we want all other 
        // objects to be in-front of the skybox.
        renderer.gl.depthMask(false);
        _super.prototype.render.call(this, mesh, renderer);
        renderer.gl.depthMask(true);
    };
    SkyboxMaterial.prototype.createShader = function () {
        var vert = __webpack_require__(/*! ./shader/skybox.vert */ "./src/skybox/shader/skybox.vert");
        var frag = __webpack_require__(/*! ./shader/skybox.frag */ "./src/skybox/shader/skybox.frag");
        if (this.cubemap.valid) {
            return new mesh_shader_1.MeshShader(pixi_js_1.Program.from(vert, frag));
        }
    };
    return SkyboxMaterial;
}(material_1.Material));
exports.SkyboxMaterial = SkyboxMaterial;


/***/ }),

/***/ "./src/skybox/skybox.ts":
/*!******************************!*\
  !*** ./src/skybox/skybox.ts ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Skybox = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var skybox_material_1 = __webpack_require__(/*! ./skybox-material */ "./src/skybox/skybox-material.ts");
var mesh_1 = __webpack_require__(/*! ../mesh/mesh */ "./src/mesh/mesh.ts");
var container_1 = __webpack_require__(/*! ../container */ "./src/container.ts");
var cubemap_1 = __webpack_require__(/*! ../cubemap/cubemap */ "./src/cubemap/cubemap.ts");
/**
 * A skybox is a method of creating backgrounds in a 3D scene. It consists of
 * a cubemap texture which has six sides. Note that the skybox should be rendered
 * before all other objects in the scene.
 */
var Skybox = /** @class */ (function (_super) {
    tslib_1.__extends(Skybox, _super);
    /**
     * Creates a new skybox using the specified cubemap.
     * @param cubemap Cubemap to use for rendering.
     */
    function Skybox(cubemap) {
        var _this = _super.call(this) || this;
        _this._mesh = _this.addChild(mesh_1.Mesh3D.createCube(new skybox_material_1.SkyboxMaterial(cubemap)));
        return _this;
    }
    Object.defineProperty(Skybox.prototype, "camera", {
        /**
         * Camera used when rendering. If this value is not set, the main camera will
         * be used by default.
         */
        get: function () {
            return this._mesh.material.camera;
        },
        set: function (value) {
            this._mesh.material.camera = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Skybox.prototype, "cubemap", {
        /**
         * The cubemap texture used when rendering.
         */
        get: function () {
            return this._mesh.material.cubemap;
        },
        set: function (value) {
            this._mesh.material.cubemap = value;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Creates a new skybox from the specified source.
     * @param source The source to create the skybox from.
     */
    Skybox.from = function (source) {
        return new Skybox(cubemap_1.Cubemap.fromFaces(source));
    };
    return Skybox;
}(container_1.Container3D));
exports.Skybox = Skybox;


/***/ }),

/***/ "./src/sprite/post-processing-sprite.ts":
/*!**********************************************!*\
  !*** ./src/sprite/post-processing-sprite.ts ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PostProcessingSprite = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
/**
 * Represents a sprite which can have post processing effects. Can be used for
 * rendering 3D objects as 2D sprites.
 */
var PostProcessingSprite = /** @class */ (function (_super) {
    tslib_1.__extends(PostProcessingSprite, _super);
    /**
     * Creates a new post processing sprite using the specified options.
     * @param renderer The renderer to use.
     * @param options The options for the render texture. If both width and height
     * has not been set, it will automatically be resized to the renderer size.
     */
    function PostProcessingSprite(renderer, options) {
        var _this = _super.call(this) || this;
        _this.renderer = renderer;
        _this._tickerRender = function () { };
        var _a = options || {}, _b = _a.width, width = _b === void 0 ? 512 : _b, _c = _a.height, height = _c === void 0 ? 512 : _c, objectToRender = _a.objectToRender, _d = _a.resolution, resolution = _d === void 0 ? 1 : _d;
        _this._renderTexture = pixi_js_1.RenderTexture.create({ width: width, height: height, resolution: resolution });
        /* When rendering to a texture, it's flipped vertically for some reason.
        This will flip it back to it's expected orientation. */
        _this._renderTexture.rotate = 8;
        _this._renderTexture.baseTexture.framebuffer.addDepthTexture();
        _this._texture = _this._renderTexture;
        if (!options || !options.width || !options.height) {
            renderer.on("prerender", function () {
                _this._renderTexture.resize(renderer.screen.width, renderer.screen.height);
            });
        }
        if (objectToRender) {
            _this._tickerRender = function () {
                if (!renderer.gl) {
                    // The renderer was probably destroyed.
                    pixi_js_1.Ticker.shared.remove(_this._tickerRender);
                    return;
                }
                if (_this.worldVisible && _this.worldAlpha > 0 && _this.renderable) {
                    objectToRender && _this.renderObject(objectToRender);
                }
            };
            pixi_js_1.Ticker.shared.add(_this._tickerRender);
        }
        return _this;
    }
    Object.defineProperty(PostProcessingSprite.prototype, "renderTexture", {
        /** The render texture. */
        get: function () {
            return this._renderTexture;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PostProcessingSprite.prototype, "depthTexture", {
        /** The depth texture. */
        get: function () {
            if (this._renderTexture) {
                return this._renderTexture.baseTexture.framebuffer.depthTexture;
            }
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Sets the resolution of the render texture.
     * @param resolution The resolution to set.
     */
    PostProcessingSprite.prototype.setResolution = function (resolution) {
        this._renderTexture.setResolution(resolution);
        this._renderTexture.resize(this._renderTexture.width, this._renderTexture.height, true);
    };
    PostProcessingSprite.prototype.destroy = function (options) {
        pixi_js_1.Ticker.shared.remove(this._tickerRender);
        _super.prototype.destroy.call(this, options);
    };
    /**
     * Updates the sprite's texture by rendering the specified object to it.
     * @param object The object to render.
     */
    PostProcessingSprite.prototype.renderObject = function (object) {
        this.renderer.render(object, this._renderTexture);
    };
    return PostProcessingSprite;
}(pixi_js_1.Sprite));
exports.PostProcessingSprite = PostProcessingSprite;


/***/ }),

/***/ "./src/sprite/projection-sprite.ts":
/*!*****************************************!*\
  !*** ./src/sprite/projection-sprite.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectionSprite = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
var ProjectionSprite = /** @class */ (function (_super) {
    tslib_1.__extends(ProjectionSprite, _super);
    function ProjectionSprite(texture) {
        var _this = _super.call(this, texture) || this;
        _this._pixelsPerUnit = 100;
        _this.modelViewProjection = new Float32Array(16);
        _this.pluginName = "sprite3d";
        return _this;
    }
    Object.defineProperty(ProjectionSprite.prototype, "pixelsPerUnit", {
        get: function () {
            return this._pixelsPerUnit;
        },
        set: function (value) {
            if (value !== this._pixelsPerUnit) {
                // @ts-ignore
                this._transformID = -1;
                this._pixelsPerUnit = value;
            }
        },
        enumerable: false,
        configurable: true
    });
    ProjectionSprite.prototype.calculateVertices = function () {
        var texture = this._texture;
        // @ts-ignore
        if (this._transformID === this.transform._worldID && this._textureID === texture._updateID) {
            return;
        }
        if (this._textureID !== texture._updateID) {
            this.uvs = this._texture._uvs.uvsFloat32;
        }
        // @ts-ignore
        this._transformID = this.transform._worldID;
        this._textureID = texture._updateID;
        var wt = this.transform.worldTransform;
        var orig = texture.orig;
        var anchor = this._anchor;
        var w1 = texture.trim ? texture.trim.x - (anchor._x * orig.width) : -anchor._x * orig.width;
        var w0 = texture.trim ? w1 + texture.trim.width : w1 + orig.width;
        var h1 = texture.trim ? texture.trim.y - (anchor._y * orig.height) : -anchor._y * orig.height;
        var h0 = texture.trim ? h1 + texture.trim.height : h1 + orig.height;
        this.vertexData[0] = ((wt.a * w1) + (wt.c * -h1)) / this._pixelsPerUnit;
        this.vertexData[1] = ((wt.d * -h1) + (wt.b * w1)) / this._pixelsPerUnit;
        this.vertexData[2] = ((wt.a * w0) + (wt.c * -h1)) / this._pixelsPerUnit;
        this.vertexData[3] = ((wt.d * -h1) + (wt.b * w0)) / this._pixelsPerUnit;
        this.vertexData[4] = ((wt.a * w0) + (wt.c * -h0)) / this._pixelsPerUnit;
        this.vertexData[5] = ((wt.d * -h0) + (wt.b * w0)) / this._pixelsPerUnit;
        this.vertexData[6] = ((wt.a * w1) + (wt.c * -h0)) / this._pixelsPerUnit;
        this.vertexData[7] = ((wt.d * -h0) + (wt.b * w1)) / this._pixelsPerUnit;
        if (this.roundPixels) {
            var resolution = PIXI.settings.RESOLUTION;
            for (var i = 0; i < this.vertexData.length; ++i) {
                this.vertexData[i] = Math.round((this.vertexData[i] * resolution | 0) / resolution);
            }
        }
    };
    return ProjectionSprite;
}(PIXI.Sprite));
exports.ProjectionSprite = ProjectionSprite;


/***/ }),

/***/ "./src/sprite/shader/sprite.frag":
/*!***************************************!*\
  !*** ./src/sprite/shader/sprite.frag ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "varying vec2 vTextureCoord;\nvarying vec4 vColor;\nvarying float vTextureId;\n\nuniform sampler2D uSamplers[%count%];\n\nvoid main(void){\n    vec4 color;\n    %forloop%\n    gl_FragColor = vColor * vec4(color.rgb, color.a);\n}"

/***/ }),

/***/ "./src/sprite/shader/sprite.vert":
/*!***************************************!*\
  !*** ./src/sprite/shader/sprite.vert ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "precision highp float;\n\nattribute vec2 aVertexPosition;\n\nattribute vec4 aMatrix0;\nattribute vec4 aMatrix1;\nattribute vec4 aMatrix2;\nattribute vec4 aMatrix3;\n\nattribute vec2 aTextureCoord;\nattribute vec4 aColor;\nattribute float aTextureId;\n\nuniform vec4 tint;\n\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nvarying float vTextureId;\n\nvoid main(void) {\n  mat4 modelMatrix = mat4(aMatrix0, aMatrix1, aMatrix2, aMatrix3);\n\n  gl_Position = modelMatrix * vec4(aVertexPosition.xy, 0.0, 1.0);\n\n  vTextureCoord = vec2(aTextureCoord.x, aTextureCoord.y);\n  vTextureId = aTextureId;\n  vColor = aColor * tint;\n}"

/***/ }),

/***/ "./src/sprite/sprite-batch-geometry.ts":
/*!*********************************************!*\
  !*** ./src/sprite/sprite-batch-geometry.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SpriteBatchGeometry = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
var SpriteBatchGeometry = /** @class */ (function (_super) {
    tslib_1.__extends(SpriteBatchGeometry, _super);
    function SpriteBatchGeometry() {
        var _this = _super.call(this) || this;
        _this.addAttribute("aMatrix0", _this._buffer, 4, false, PIXI.TYPES.FLOAT);
        _this.addAttribute("aMatrix1", _this._buffer, 4, false, PIXI.TYPES.FLOAT);
        _this.addAttribute("aMatrix2", _this._buffer, 4, false, PIXI.TYPES.FLOAT);
        _this.addAttribute("aMatrix3", _this._buffer, 4, false, PIXI.TYPES.FLOAT);
        return _this;
    }
    return SpriteBatchGeometry;
}(PIXI.BatchGeometry));
exports.SpriteBatchGeometry = SpriteBatchGeometry;


/***/ }),

/***/ "./src/sprite/sprite-batch-renderer.ts":
/*!*********************************************!*\
  !*** ./src/sprite/sprite-batch-renderer.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SpriteBatchRenderer = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
var sprite_batch_geometry_1 = __webpack_require__(/*! ./sprite-batch-geometry */ "./src/sprite/sprite-batch-geometry.ts");
var SpriteBatchRenderer = /** @class */ (function (_super) {
    tslib_1.__extends(SpriteBatchRenderer, _super);
    function SpriteBatchRenderer(renderer) {
        var _this = _super.call(this, renderer) || this;
        _this.shaderGenerator = new PIXI.BatchShaderGenerator(__webpack_require__(/*! ./shader/sprite.vert */ "./src/sprite/shader/sprite.vert"), __webpack_require__(/*! ./shader/sprite.frag */ "./src/sprite/shader/sprite.frag"));
        _this.geometryClass = sprite_batch_geometry_1.SpriteBatchGeometry;
        // The vertex size when rendering 2D sprites is 6. Here, 16 is being added 
        // to hold the model matrix.
        _this.vertexSize = 6 + 16;
        Object.assign(_this.state, {
            culling: false, clockwiseFrontFace: false, depthTest: true
        });
        return _this;
    }
    SpriteBatchRenderer.prototype.packInterleavedGeometry = function (element, attributeBuffer, indexBuffer, aIndex, iIndex) {
        var uint32View = attributeBuffer.uint32View, float32View = attributeBuffer.float32View;
        var packedVertices = aIndex / this.vertexSize;
        var uvs = element.uvs;
        var indicies = element.indices;
        var vertexData = element.vertexData;
        var textureId = element._texture.baseTexture._batchLocation;
        var alpha = Math.min(element.worldAlpha, 1.0);
        var argb = (alpha < 1.0
            && element._texture.baseTexture.alphaMode)
            ? PIXI.utils.premultiplyTint(element._tintRGB, alpha)
            : element._tintRGB + (alpha * 255 << 24);
        for (var i = 0; i < vertexData.length; i += 2) {
            float32View[aIndex++] = vertexData[i];
            float32View[aIndex++] = vertexData[i + 1];
            float32View[aIndex++] = uvs[i];
            float32View[aIndex++] = uvs[i + 1];
            uint32View[aIndex++] = argb;
            float32View[aIndex++] = textureId;
            for (var j = 0; j < 16; j++) {
                // @ts-ignore
                float32View[aIndex++] = element.modelViewProjection[j];
            }
        }
        for (var i = 0; i < indicies.length; i++) {
            indexBuffer[iIndex++] = packedVertices + indicies[i];
        }
    };
    return SpriteBatchRenderer;
}(PIXI.AbstractBatchRenderer));
exports.SpriteBatchRenderer = SpriteBatchRenderer;
PIXI.Renderer.registerPlugin("sprite3d", SpriteBatchRenderer);


/***/ }),

/***/ "./src/sprite/sprite-billboard-type.ts":
/*!*********************************************!*\
  !*** ./src/sprite/sprite-billboard-type.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SpriteBillboardType = void 0;
/**
 * Represents different billboard types.
 */
var SpriteBillboardType;
(function (SpriteBillboardType) {
    /**
     * Sprite will be rotated towards the viewer on both the x-plane and y-plane.
     */
    SpriteBillboardType["spherical"] = "spherical";
    /**
     * Sprite will be rotated towards the viewer on the y-plane.
     */
    SpriteBillboardType["cylindrical"] = "cylindrical";
})(SpriteBillboardType = exports.SpriteBillboardType || (exports.SpriteBillboardType = {}));


/***/ }),

/***/ "./src/sprite/sprite.ts":
/*!******************************!*\
  !*** ./src/sprite/sprite.ts ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Sprite3D = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var camera_1 = __webpack_require__(/*! ../camera/camera */ "./src/camera/camera.ts");
var sprite_billboard_type_1 = __webpack_require__(/*! ./sprite-billboard-type */ "./src/sprite/sprite-billboard-type.ts");
var container_1 = __webpack_require__(/*! ../container */ "./src/container.ts");
var mat4_1 = __webpack_require__(/*! ../math/mat4 */ "./src/math/mat4.ts");
var projection_sprite_1 = __webpack_require__(/*! ./projection-sprite */ "./src/sprite/projection-sprite.ts");
/**
 * Represents a sprite in 3D space.
 */
var Sprite3D = /** @class */ (function (_super) {
    tslib_1.__extends(Sprite3D, _super);
    /**
     * Creates a new sprite using the specified texture.
     * @param texture The texture to use.
     */
    function Sprite3D(texture) {
        var _this = _super.call(this) || this;
        _this._modelView = new Float32Array(16);
        _this._sprite = new projection_sprite_1.ProjectionSprite(texture);
        _this._sprite.anchor.set(0.5);
        return _this;
    }
    Object.defineProperty(Sprite3D.prototype, "billboardType", {
        /**
         * The billboard type to use when rendering the sprite. Used for making the
         * sprite always face the viewer.
         */
        get: function () {
            return this._billboardType;
        },
        set: function (value) {
            if (value !== this._billboardType) {
                this._billboardType = value;
                this._cameraTransformId = undefined;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Sprite3D.prototype, "pixelsPerUnit", {
        /** Defines the size of the sprite relative to a unit in world space. */
        get: function () {
            return this._sprite.pixelsPerUnit;
        },
        set: function (value) {
            this._sprite.pixelsPerUnit = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Sprite3D.prototype, "tint", {
        /**
         * The tint applied to the sprite. This is a hex value. A value of 0xFFFFFF
         * will remove any tint effect.
         */
        get: function () {
            return this._sprite.tint;
        },
        set: function (value) {
            this._sprite.tint = value;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Destroys this sprite and optionally its texture and children.
     */
    Sprite3D.prototype.destroy = function (options) {
        _super.prototype.destroy.call(this, options);
        this._sprite.destroy(options);
    };
    /**
     * Renders the sprite.
     * @param renderer The renderer to use.
     */
    Sprite3D.prototype._render = function (renderer) {
        var camera = this.camera || camera_1.Camera.main;
        var update = camera.transformId !== this._cameraTransformId ||
            this._parentID !== this.transform._worldID;
        if (update) {
            var scaling = this.worldTransform.scaling;
            mat4_1.Mat4.multiply(camera.view, this.worldTransform.array, this._modelView);
            switch (this._billboardType) {
                case sprite_billboard_type_1.SpriteBillboardType.spherical: {
                    this._modelView[0] = scaling[0];
                    this._modelView[1] = 0;
                    this._modelView[2] = 0;
                    this._modelView[3] = 0;
                    this._modelView[4] = 0;
                    this._modelView[5] = scaling[1];
                    this._modelView[6] = 0;
                    this._modelView[7] = 0;
                    break;
                }
                case sprite_billboard_type_1.SpriteBillboardType.cylindrical: {
                    this._modelView[0] = scaling[0];
                    this._modelView[1] = 0;
                    this._modelView[2] = 0;
                    this._modelView[3] = 0;
                    this._modelView[8] = 0;
                    this._modelView[9] = 0;
                    this._modelView[10] = 1;
                    this._modelView[11] = 0;
                    break;
                }
            }
            mat4_1.Mat4.multiply(camera.projection, this._modelView, this._sprite.modelViewProjection);
            this._parentID = this.transform._worldID;
            this._cameraTransformId = camera.transformId;
        }
        this._sprite.worldAlpha = this.worldAlpha;
        this._sprite.render(renderer);
    };
    Object.defineProperty(Sprite3D.prototype, "anchor", {
        /**
         * The anchor sets the origin point of the sprite.
         */
        get: function () {
            return this._sprite.anchor;
        },
        set: function (value) {
            this._sprite.anchor = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Sprite3D.prototype, "texture", {
        /** The texture used when rendering the sprite. */
        get: function () {
            return this._sprite.texture;
        },
        set: function (value) {
            this._sprite.texture = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Sprite3D.prototype, "blendMode", {
        /** The blend used when rendering the sprite. */
        get: function () {
            return this._sprite.blendMode;
        },
        set: function (value) {
            this._sprite.blendMode = value;
        },
        enumerable: false,
        configurable: true
    });
    return Sprite3D;
}(container_1.Container3D));
exports.Sprite3D = Sprite3D;


/***/ }),

/***/ "./src/texture/texture-transform.ts":
/*!******************************************!*\
  !*** ./src/texture/texture-transform.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.TextureTransform = void 0;
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var mat3_1 = __webpack_require__(/*! ../math/mat3 */ "./src/math/mat3.ts");
/**
 * Transform used to offset, rotate and scale texture coordinates.
 */
var TextureTransform = /** @class */ (function () {
    function TextureTransform() {
        var _this = this;
        this._rotation = 0;
        this._array = new Float32Array(9);
        this._dirty = true;
        this._translation = new Float32Array([
            1, 0, 0, 0, 1, 0, 0, 0, 1
        ]);
        this._scaling = new Float32Array([
            1, 0, 0, 0, 1, 0, 0, 0, 1
        ]);
        this._rotate = new Float32Array([
            Math.cos(0), -Math.sin(0), 0, Math.sin(0), Math.cos(0), 0, 0, 0, 1
        ]);
        /** The offset for the texture coordinates. */
        this.offset = new pixi_js_1.ObservablePoint(function () {
            _this._translation.set([
                1, 0, 0, 0, 1, 0, _this.offset.x, _this.offset.y, 1
            ]);
            _this._dirty = true;
        }, undefined);
        /** The scale of the texture coordinates. */
        this.scale = new pixi_js_1.ObservablePoint(function () {
            _this._scaling.set([
                _this.scale.x, 0, 0, 0, _this.scale.y, 0, 0, 0, 1
            ]);
            _this._dirty = true;
        }, undefined, 1, 1);
    }
    Object.defineProperty(TextureTransform.prototype, "rotation", {
        /** The rotation for the texture coordinates. */
        get: function () {
            return this._rotation;
        },
        set: function (value) {
            this._rotation = value;
            this._rotate.set([
                Math.cos(value), -Math.sin(value), 0, Math.sin(value), Math.cos(value), 0, 0, 0, 1
            ]);
            this._dirty = true;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TextureTransform.prototype, "array", {
        /** The matrix array. */
        get: function () {
            if (this._dirty) {
                mat3_1.Mat3.multiply(mat3_1.Mat3.multiply(this._translation, this._rotate, this._array), this._scaling, this._array);
                this._dirty = false;
            }
            return this._array;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Creates a transform from the specified texture frame. Can be used when
     * texture is in a spritesheet.
     * @param texture The texture to use.
     */
    TextureTransform.fromTexture = function (texture) {
        var transform = new TextureTransform();
        if (!texture.frame || texture.noFrame) {
            return transform;
        }
        var _a = texture.frame, x = _a.x, y = _a.y, width = _a.width, height = _a.height;
        if (texture.rotate === 0) {
            transform.offset.set(x / texture.baseTexture.width, y / texture.baseTexture.height);
            transform.scale.set(width / texture.baseTexture.width, height / texture.baseTexture.height);
        }
        if (texture.rotate === 2) {
            x = texture.frame.x + texture.frame.width;
            transform.offset.set(x / texture.baseTexture.width, y / texture.baseTexture.height);
            transform.scale.set(height / texture.baseTexture.height, width / texture.baseTexture.width);
            transform.rotation = -90 * pixi_js_1.DEG_TO_RAD;
        }
        return transform;
    };
    return TextureTransform;
}());
exports.TextureTransform = TextureTransform;


/***/ }),

/***/ "./src/transform/matrix-component.ts":
/*!*******************************************!*\
  !*** ./src/transform/matrix-component.ts ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MatrixComponent = void 0;
var MatrixComponent = /** @class */ (function () {
    function MatrixComponent(_parent, size, _update) {
        this._parent = _parent;
        this._update = _update;
        this._array = new Float32Array(size);
    }
    Object.defineProperty(MatrixComponent.prototype, "array", {
        get: function () {
            if (this._id !== this._parent.transformId) {
                this._update(this._array);
                this._id = this._parent.transformId;
            }
            return this._array;
        },
        enumerable: false,
        configurable: true
    });
    return MatrixComponent;
}());
exports.MatrixComponent = MatrixComponent;


/***/ }),

/***/ "./src/transform/matrix4.ts":
/*!**********************************!*\
  !*** ./src/transform/matrix4.ts ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Matrix4 = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var mat4_1 = __webpack_require__(/*! ../math/mat4 */ "./src/math/mat4.ts");
var vec3_1 = __webpack_require__(/*! ../math/vec3 */ "./src/math/vec3.ts");
var vec4_1 = __webpack_require__(/*! ../math/vec4 */ "./src/math/vec4.ts");
var matrix_component_1 = __webpack_require__(/*! ./matrix-component */ "./src/transform/matrix-component.ts");
var quat_1 = __webpack_require__(/*! ../math/quat */ "./src/math/quat.ts");
/**
 * Represents a 4x4 matrix.
 */
var Matrix4 = /** @class */ (function (_super) {
    tslib_1.__extends(Matrix4, _super);
    /**
     * Creates a new transform matrix using the specified matrix array.
     * @param array The matrix array, expected length is 16. If empty, an identity
     * matrix is used by default.
     */
    function Matrix4(array) {
        var _this = _super.call(this) || this;
        _this._transformId = 0;
        if (array) {
            _this.array = new Float32Array(array);
        }
        else {
            _this.array = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        }
        return _this;
    }
    Object.defineProperty(Matrix4.prototype, "transformId", {
        get: function () {
            return this._transformId;
        },
        enumerable: false,
        configurable: true
    });
    Matrix4.prototype.toArray = function (transpose, out) {
        if (transpose) {
            return mat4_1.Mat4.transpose(this.array, out);
        }
        return out ? mat4_1.Mat4.copy(this.array, out) : this.array;
    };
    Object.defineProperty(Matrix4.prototype, "position", {
        /** Returns the position component of the matrix. */
        get: function () {
            var _this = this;
            if (!this._position) {
                this._position = new matrix_component_1.MatrixComponent(this, 3, function (data) {
                    mat4_1.Mat4.getTranslation(_this.array, data);
                });
            }
            return this._position.array;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Matrix4.prototype, "scaling", {
        /** Returns the scaling component of the matrix. */
        get: function () {
            var _this = this;
            if (!this._scaling) {
                this._scaling = new matrix_component_1.MatrixComponent(this, 3, function (data) {
                    mat4_1.Mat4.getScaling(_this.array, data);
                });
            }
            return this._scaling.array;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Matrix4.prototype, "rotation", {
        /** Returns the rotation quaternion of the matrix. */
        get: function () {
            var _this = this;
            if (!this._rotation) {
                var matrix_1 = new Float32Array(16);
                this._rotation = new matrix_component_1.MatrixComponent(this, 4, function (data) {
                    var e_1, _a;
                    try {
                        // To extract a correct rotation, the scaling component must be eliminated.
                        for (var _b = tslib_1.__values([0, 1, 2]), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var col = _c.value;
                            matrix_1[col + 0] = _this.array[col + 0] / _this.scaling[0];
                            matrix_1[col + 4] = _this.array[col + 4] / _this.scaling[1];
                            matrix_1[col + 8] = _this.array[col + 8] / _this.scaling[2];
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    quat_1.Quat.normalize(mat4_1.Mat4.getRotation(matrix_1, data), data);
                });
            }
            return this._rotation.array;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Matrix4.prototype, "up", {
        /** Returns the up vector of the matrix. */
        get: function () {
            var _this = this;
            if (!this._up) {
                this._up = new matrix_component_1.MatrixComponent(this, 3, function (data) {
                    vec3_1.Vec3.normalize(vec3_1.Vec3.set(_this.array[4], _this.array[5], _this.array[6], data), data);
                });
            }
            return this._up.array;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Matrix4.prototype, "down", {
        /** Returns the down vector of the matrix. */
        get: function () {
            var _this = this;
            if (!this._down) {
                this._down = new matrix_component_1.MatrixComponent(this, 3, function (data) {
                    vec3_1.Vec3.negate(_this.up, data);
                });
            }
            return this._down.array;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Matrix4.prototype, "right", {
        /** Returns the left vector of the matrix. */
        get: function () {
            var _this = this;
            if (!this._right) {
                this._right = new matrix_component_1.MatrixComponent(this, 3, function (data) {
                    vec3_1.Vec3.negate(_this.left, data);
                });
            }
            return this._right.array;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Matrix4.prototype, "left", {
        /** Returns the right vector of the matrix. */
        get: function () {
            var _this = this;
            if (!this._left) {
                this._left = new matrix_component_1.MatrixComponent(this, 3, function (data) {
                    vec3_1.Vec3.normalize(vec3_1.Vec3.cross(_this.up, _this.forward, data), data);
                });
            }
            return this._left.array;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Matrix4.prototype, "forward", {
        /** Returns the forward vector of the matrix. */
        get: function () {
            var _this = this;
            if (!this._forward) {
                this._forward = new matrix_component_1.MatrixComponent(this, 3, function (data) {
                    vec3_1.Vec3.normalize(vec3_1.Vec3.set(_this.array[8], _this.array[9], _this.array[10], data), data);
                });
            }
            return this._forward.array;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Matrix4.prototype, "backward", {
        /** Returns the backward vector of the matrix. */
        get: function () {
            var _this = this;
            if (!this._backward) {
                this._backward = new matrix_component_1.MatrixComponent(this, 3, function (data) {
                    vec3_1.Vec3.negate(_this.forward, data);
                });
            }
            return this._backward.array;
        },
        enumerable: false,
        configurable: true
    });
    Matrix4.prototype.copyFrom = function (matrix) {
        if (matrix instanceof Matrix4) {
            mat4_1.Mat4.copy(matrix.array, this.array);
            this._transformId++;
        }
        return this;
    };
    /**
     * Sets the rotation, position and scale components.
     * @param rotation The rotation to set.
     * @param position The position to set.
     * @param scaling The scale to set.
     */
    Matrix4.prototype.setFromRotationPositionScale = function (rotation, position, scaling) {
        vec4_1.Vec4.set(rotation.x, rotation.y, rotation.z, rotation.w, this.rotation);
        vec3_1.Vec3.set(scaling.x, scaling.y, scaling.z, this.scaling);
        vec3_1.Vec3.set(position.x, position.y, position.z, this.position);
        mat4_1.Mat4.fromRotationTranslationScale(this.rotation, this.position, this.scaling, this.array);
        this._transformId++;
    };
    /**
     * Multiplies this matrix with another matrix.
     * @param matrix The matrix to multiply with.
     */
    Matrix4.prototype.multiply = function (matrix) {
        mat4_1.Mat4.multiply(matrix.array, this.array, this.array);
        this._transformId++;
    };
    return Matrix4;
}(pixi_js_1.Matrix));
exports.Matrix4 = Matrix4;


/***/ }),

/***/ "./src/transform/observable-point.ts":
/*!*******************************************!*\
  !*** ./src/transform/observable-point.ts ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservablePoint3D = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var PIXI = tslib_1.__importStar(__webpack_require__(/*! pixi.js */ "pixi.js"));
/**
 * Represents a point in 3D space.
 */
var ObservablePoint3D = /** @class */ (function (_super) {
    tslib_1.__extends(ObservablePoint3D, _super);
    /**
     * Creates a new observable point.
     * @param cb The callback when changed.
     * @param scope The owner of callback.
     * @param x The position on the x axis.
     * @param y The position on the y axis.
     * @param z The position on the z axis.
     */
    function ObservablePoint3D(cb, scope, x, y, z) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        var _this = _super.call(this, cb, scope) || this;
        _this._array = new Float32Array(3);
        _this._array.set([x, y, z]);
        return _this;
    }
    Object.defineProperty(ObservablePoint3D.prototype, "array", {
        /** Array containing the x, y, z values. */
        get: function () {
            return this._array;
        },
        set: function (value) {
            this.setFrom(value);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ObservablePoint3D.prototype, "x", {
        /**
         * Position on the x axis relative to the local coordinates of the parent.
         */
        get: function () {
            return this._array[0];
        },
        set: function (value) {
            if (this._array[0] !== value) {
                this._array[0] = value;
                this.cb.call(this.scope);
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ObservablePoint3D.prototype, "y", {
        /**
         * Position on the y axis relative to the local coordinates of the parent.
         */
        get: function () {
            return this._array[1];
        },
        set: function (value) {
            if (this._array[1] !== value) {
                this._array[1] = value;
                this.cb.call(this.scope);
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ObservablePoint3D.prototype, "z", {
        /**
         * Position on the z axis relative to the local coordinates of the parent.
         */
        get: function () {
            return this._array[2];
        },
        set: function (value) {
            if (this._array[2] !== value) {
                this._array[2] = value;
                this.cb.call(this.scope);
            }
        },
        enumerable: false,
        configurable: true
    });
    ObservablePoint3D.prototype.clone = function (cb, scope) {
        if (cb === void 0) { cb = this.cb; }
        if (scope === void 0) { scope = this.scope; }
        return new ObservablePoint3D(cb, scope, this.x, this.y, this.z);
    };
    ObservablePoint3D.prototype.copyFrom = function (p) {
        if (this._array[0] !== p.x || this._array[1] !== p.y || this._array[2] !== p.z) {
            this._array[0] = p.x;
            this._array[1] = p.y;
            this._array[2] = p.z;
            this.cb.call(this.scope);
        }
        return this;
    };
    ObservablePoint3D.prototype.copyTo = function (p) {
        if (p instanceof ObservablePoint3D) {
            p.set(this.x, this.y, this.z);
        }
        return p;
    };
    ObservablePoint3D.prototype.equals = function (p) {
        return p.x === this.x && p.y === this.y && p.z === this.z;
    };
    /**
     * Sets the point to a new x, y and z position.
     * @param x The position on the x axis.
     * @param y The position on the y axis.
     * @param z The position on the z axis.
     */
    ObservablePoint3D.prototype.set = function (x, y, z) {
        if (y === void 0) { y = x; }
        if (z === void 0) { z = x; }
        if (this._array[0] !== x || this._array[1] !== y || this._array[2] !== z) {
            this._array[0] = x;
            this._array[1] = y;
            this._array[2] = z;
            this.cb.call(this.scope);
        }
        return this;
    };
    /**
     * Sets the point to a new x, y and z position.
     * @param array The array containing x, y and z, expected length is 3.
     */
    ObservablePoint3D.prototype.setFrom = function (array) {
        this.set(array[0], array[1], array[2]);
        return this;
    };
    return ObservablePoint3D;
}(PIXI.ObservablePoint));
exports.ObservablePoint3D = ObservablePoint3D;


/***/ }),

/***/ "./src/transform/observable-quaternion.ts":
/*!************************************************!*\
  !*** ./src/transform/observable-quaternion.ts ***!
  \************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservableQuaternion = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var quat_1 = __webpack_require__(/*! ../math/quat */ "./src/math/quat.ts");
/**
 * Represents a rotation quaternion in 3D space.
 */
var ObservableQuaternion = /** @class */ (function (_super) {
    tslib_1.__extends(ObservableQuaternion, _super);
    /**
     * Creates a new observable quaternion.
     * @param cb The callback when changed.
     * @param scope The owner of callback.
     * @param x The x component.
     * @param y The y component.
     * @param z The z component.
     * @param w The w component.
     */
    function ObservableQuaternion(cb, scope, x, y, z, w) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        if (w === void 0) { w = 1; }
        var _this = _super.call(this, cb, scope) || this;
        _this._array = new Float32Array(4);
        _this._array.set([x, y, z, w]);
        return _this;
    }
    Object.defineProperty(ObservableQuaternion.prototype, "array", {
        /** Array containing the x, y, z, w values. */
        get: function () {
            return this._array;
        },
        set: function (value) {
            this.setFrom(value);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ObservableQuaternion.prototype, "x", {
        /** The x component of the quaternion. */
        get: function () {
            return this._array[0];
        },
        set: function (value) {
            if (this._array[0] !== value) {
                this._array[0] = value;
                this.cb.call(this.scope);
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ObservableQuaternion.prototype, "y", {
        /** The y component of the quaternion. */
        get: function () {
            return this._array[1];
        },
        set: function (value) {
            if (this._array[1] !== value) {
                this._array[1] = value;
                this.cb.call(this.scope);
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ObservableQuaternion.prototype, "z", {
        /** The z component of the quaternion. */
        get: function () {
            return this._array[2];
        },
        set: function (value) {
            if (this._array[2] !== value) {
                this._array[2] = value;
                this.cb.call(this.scope);
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ObservableQuaternion.prototype, "w", {
        /** The w component of the quaternion. */
        get: function () {
            return this._array[3];
        },
        set: function (value) {
            if (this._array[3] !== value) {
                this._array[3] = value;
                this.cb.call(this.scope);
            }
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Sets the euler angles in degrees.
     * @param x The x angle.
     * @param y The y angle.
     * @param z The z angle.
     */
    ObservableQuaternion.prototype.setEulerAngles = function (x, y, z) {
        quat_1.Quat.fromEuler(x, y, z, this._array);
        this.cb.call(this.scope);
    };
    /**
     * Creates a clone of this quaternion.
     * @param cb Callback when changed.
     * @param scope Owner of callback.
     */
    ObservableQuaternion.prototype.clone = function (cb, scope) {
        if (cb === void 0) { cb = this.cb; }
        if (scope === void 0) { scope = this.scope; }
        return new ObservableQuaternion(cb, scope, this.x, this.y, this.z, this.w);
    };
    /**
     * Copies x, y, z, and w from the given quaternion.
     * @param p The quaternion to copy from.
     */
    ObservableQuaternion.prototype.copyFrom = function (p) {
        if (this._array[0] !== p.x || this._array[1] !== p.y || this._array[2] !== p.z || this._array[3] !== p.w) {
            this._array[0] = p.x;
            this._array[1] = p.y;
            this._array[2] = p.z;
            this._array[3] = p.w;
            this.cb.call(this.scope);
        }
        return this;
    };
    /**
     * Copies x, y, z and w into the given quaternion.
     * @param p The quaternion to copy to.
     */
    ObservableQuaternion.prototype.copyTo = function (p) {
        if (p instanceof ObservableQuaternion) {
            p.set(this.x, this.y, this.z, this.w);
        }
        return p;
    };
    /**
     * Returns true if the given quaternion is equal to this quaternion.
     * @param p The quaternion to check.
     */
    ObservableQuaternion.prototype.equals = function (p) {
        return p.x === this.x && p.y === this.y && p.z === this.z && p.w === this.w;
    };
    /**
     * Sets the quaternion to new x, y, z and w components.
     * @param x X component to set.
     * @param y Y component to set.
     * @param z Z component to set.
     * @param w W component to set.
     */
    ObservableQuaternion.prototype.set = function (x, y, z, w) {
        if (y === void 0) { y = x; }
        if (z === void 0) { z = x; }
        if (w === void 0) { w = x; }
        if (this._array[0] !== x || this._array[1] !== y || this._array[2] !== z || this._array[3] !== w) {
            this._array[0] = x;
            this._array[1] = y;
            this._array[2] = z;
            this._array[3] = w;
            this.cb.call(this.scope);
        }
        return this;
    };
    /**
     * Sets the quaternion to a new x, y, z and w components.
     * @param array The array containing x, y, z and w, expected length is 4.
     */
    ObservableQuaternion.prototype.setFrom = function (array) {
        this.set(array[0], array[1], array[2], array[3]);
        return this;
    };
    return ObservableQuaternion;
}(pixi_js_1.ObservablePoint));
exports.ObservableQuaternion = ObservableQuaternion;


/***/ }),

/***/ "./src/transform/transform.ts":
/*!************************************!*\
  !*** ./src/transform/transform.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Transform3D = void 0;
var tslib_1 = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
var pixi_js_1 = __webpack_require__(/*! pixi.js */ "pixi.js");
var matrix4_1 = __webpack_require__(/*! ./matrix4 */ "./src/transform/matrix4.ts");
var observable_point_1 = __webpack_require__(/*! ./observable-point */ "./src/transform/observable-point.ts");
var observable_quaternion_1 = __webpack_require__(/*! ./observable-quaternion */ "./src/transform/observable-quaternion.ts");
var mat4_1 = __webpack_require__(/*! ../math/mat4 */ "./src/math/mat4.ts");
/**
 * Handles position, scaling and rotation in 3D.
 */
var Transform3D = /** @class */ (function (_super) {
    tslib_1.__extends(Transform3D, _super);
    function Transform3D() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /** The position in local space. */
        _this.position = new observable_point_1.ObservablePoint3D(_this.onChange, _this, 0, 0, 0);
        /** The scale in local space. */
        _this.scale = new observable_point_1.ObservablePoint3D(_this.onChange, _this, 1, 1, 1);
        /** The rotation in local space. */
        _this.rotationQuaternion = new observable_quaternion_1.ObservableQuaternion(_this.onChange, _this, 0, 0, 0, 1);
        /** The transformation matrix in world space. */
        _this.worldTransform = new matrix4_1.Matrix4();
        /** The transformation matrix in local space. */
        _this.localTransform = new matrix4_1.Matrix4();
        /** The inverse transformation matrix in world space. */
        _this.inverseWorldTransform = new matrix4_1.Matrix4();
        /** The normal transformation matrix. */
        _this.normalTransform = new matrix4_1.Matrix4();
        return _this;
    }
    /**
     * Updates the local transformation matrix.
     */
    Transform3D.prototype.updateLocalTransform = function () {
        if (this._localID === this._currentLocalID) {
            return;
        }
        this.localTransform.setFromRotationPositionScale(this.rotationQuaternion, this.position, this.scale);
        this._parentID = -1;
        this._currentLocalID = this._localID;
    };
    /**
     * Sets position, rotation and scale from a matrix array.
     * @param matrix The matrix to set.
     */
    Transform3D.prototype.setFromMatrix = function (matrix) {
        this.localTransform.copyFrom(matrix);
        this.position.set(this.localTransform.position[0], this.localTransform.position[1], this.localTransform.position[2]);
        this.scale.set(this.localTransform.scaling[0], this.localTransform.scaling[1], this.localTransform.scaling[2]);
        this.rotationQuaternion.set(this.localTransform.rotation[0], this.localTransform.rotation[1], this.localTransform.rotation[2], this.localTransform.rotation[3]);
    };
    /**
     * Updates the world transformation matrix.
     * @param parentTransform The parent transform.
     */
    Transform3D.prototype.updateTransform = function (parentTransform) {
        this.updateLocalTransform();
        if (parentTransform && this._parentID === parentTransform._worldID) {
            return;
        }
        this.worldTransform.copyFrom(this.localTransform);
        if (parentTransform instanceof Transform3D) {
            this.worldTransform.multiply(parentTransform.worldTransform);
        }
        mat4_1.Mat4.invert(this.worldTransform.array, this.inverseWorldTransform.array);
        mat4_1.Mat4.transpose(this.inverseWorldTransform.array, this.normalTransform.array);
        this._worldID++;
        if (parentTransform) {
            this._parentID = parentTransform._worldID;
        }
    };
    /**
     * Rotates the transform so the forward vector points at specified point.
     * @param point The point to look at.
     * @param up The upward direction.
     */
    Transform3D.prototype.lookAt = function (point, up) {
        if (up === void 0) { up = new Float32Array([0, 1, 0]); }
        var rot = mat4_1.Mat4.getRotation(mat4_1.Mat4.targetTo(point.array, this.worldTransform.position, up));
        this.rotationQuaternion.set(rot[0], rot[1], rot[2], rot[3]);
    };
    return Transform3D;
}(pixi_js_1.Transform));
exports.Transform3D = Transform3D;


/***/ }),

/***/ "pixi.js":
/*!***********************!*\
  !*** external "PIXI" ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = PIXI;

/***/ })

/******/ });