'use strict'

let co = require('creed').coroutine
let createCache = require('./createCache')
let parseRelease = require('./parseRelease')

module.exports = function expressBap (options) {
  let cache = createCache(options)
  let branch = isFunction(options.branch) ? options.branch : () =>  options.branch

  setInterval(cache.refresh, 60 * 1000)

  const handler = co(function * getFile (req, res, next) {
    let b = branch(req)

    let file = yield cache.get(b, req.url)

    if (!file) {
      return res.sendStatus(404)
    }

    if (file.branch !== b) {
      res.cookie('branch', file.branch)
    }

    res
      .set('Content-Type', file.ContentType)
      .set('Content-Encoding', file.ContentEncoding)
      .set('Etag', file.ETag)
      .send(file.Body)
  })

  handler.getCurrent = function getCurrent (req) {
    let b = branch(req)
    return {
      branch: b,
      current: parseRelease(cache.current(b))
    }
  }

  handler.getFile = co(function * getFile (req, path) {
    return yield cache.get(branch(req), path)
  })

  handler.getBranches = co(function * getBranches () {
    return yield cache.branches()
  })

  return handler
}

function isFunction (obj) {
  return typeof obj === 'function'
}
