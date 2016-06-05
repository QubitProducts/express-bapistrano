'use strict'

let co = require('creed').coroutine
let Router = require('express').Router
let createCache = require('./createCache')
let parseRelease = require('./parseRelease')

module.exports = function expressBap (options) {
  let cache = createCache(options)
  let branch = isFunction(options.branch) ? options.branch : () =>  options.branch
  let allowMeta = isFunction(options.allowMeta) ? options.allowMeta : () =>  options.allowMeta

  setInterval(cache.refresh, 60 * 1000)

  let router = new Router()

  let auth = (req, res, next) => { next() }

  router.get('/current', auth, function current (req, res) {
    let b = branch(req)
    return res.send({
      app: options.app,
      branch: b,
      current: parseRelease(cache.current(b))
    })
  })

  router.get('/branches', auth, co(function * branches (req, res)  {
    return res.send({
      branches: yield cache.branches()
    })
  }))

  router.all('*', co(function * getFile (req, res, next) {
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
  }))

  return router
}

function isFunction (obj) {
  return typeof obj === 'function'
}
