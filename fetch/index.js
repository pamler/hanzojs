if(typeof Window !== 'undefined') {
  var fetch = require('./browser-fetch.js')
} else {
  var fetch = require('./node-fetch')
}

import isPlainObject from 'is-plain-object';

function _getHeader(headers) {
  return {
    headers: {
      'Content-Type': 'application/json',
       ...headers,
    }
  }
}

function _transformParam(params) {
  return {
    body: JSON.stringify({ data: params })
  }
}

/**
 * 将一个对象转换成queryString
 */
function paramToString(obj, prefix = "") {
    obj = obj || {};
    let querys = [];
    let keys = Object.keys(obj);
    for (let key of keys) {
        let v = obj[key];
        let nkey = prefix == "" ? key : prefix + '[' + key + ']';
        if (isPlainObject(v) || Array.isArray(v)) {
            querys.push(this.param(v, nkey));
        } else {
            querys.push(`${nkey}=${obj[key]}`);
        }
    }
    return querys.join('&');
}


function Get(url, headers, params) {
  return fetch(url + '?' + paramToString(params), Object.assign({ method: 'GET' }, _getHeader(headers)))
    .then((response) => response.json())
    .catch((error) => {
      return Promise.reject(error)
    })
    .then((response) => {
      if (response.code == '200') {
        return response
      } else {
        return Promise.reject(response)
      }
    })
}

function Post(url, headers, params) {
  return fetch(url, Object.assign({ method: 'POST' }, _getHeader(headers), _transformParam(params)))
    .then((response) => response.json())
    .catch((error) => {
      return Promise.reject(error)
    })
    .then((response) => {
      if (response !== null) {
        if (response.code == '200') {
          return response
        } else {
          return Promise.reject(response)
        }
      } else {
        return Promise.reject(response)
      }
    })
}

module.exports = {
  Get, Post
}
