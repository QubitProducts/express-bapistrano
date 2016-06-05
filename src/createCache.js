'use strict'

let co = require('creed').coroutine
let path = require('path')
let seq = require('./seq')
let createS3 = require('./createS3')
let getBranches = require('./getBranches')

module.exports = function createCache (options) {
  let cache = {}
  let s3 = options.s3 || createS3(options)
  let log = options.log || (() => {})
  let defaultBranch = options.defaultBranch || 'master'

  let updateCurrent = co(function * updateCurrent (branch) {
    let branchCache = getBranchCache(branch)
    let nextCurrent = yield readFile(path.join(branch, 'current'))

    if (!nextCurrent) {
      log('branch is not uploaded', branch)
      return false
    }

    nextCurrent = nextCurrent.Body.toString()
    if (branchCache.current !== nextCurrent) {
      log('clearing', branch, 'since current has been updated from', branchCache.current, 'to', nextCurrent)
      branchCache.current = nextCurrent
      branchCache.files = {}
    }
  })

  let cacheFile = co(function * cacheFile (branch, filePath) {
    let branchCache = getBranchCache(branch)
    let current = branchCache.current
    if (!current) {
      return false
    }
    let file = yield readFile(path.join(branch, 'releases', current, filePath))
    if (current === branchCache.current) {
      branchCache.files[filePath] = file
    } else {
      log('not caching', branch, filePath, 'since current has been updated from', current, 'to', branchCache.current)
    }
    return file
  })

  let getBranchCache = function getBranchCache (branch) {
    cache[branch] = cache[branch] || {
      current: null,
      files: {}
    }
    return cache[branch]
  }

  let readFile = co(function * readFile (filePath) {
    try {
      log('reading s3', filePath)
      return yield s3.readFile(filePath)
    } catch (err) {
      if (err.code === 'NoSuchKey') {
        log('reading s3 not found', filePath)
        return false
      }
      log('reading s3 error', filePath, err.stack)
      throw err
    }
  })

  let get = co(function * (branch, filePath) {
    // ignore the query params for now
    filePath = filePath.split('?')[0]
    let branchCache = getBranchCache(branch)
    if (!branchCache.current) {
      log('updating current for', branch)
      yield updateCurrent(branch)
    }
    if (!branchCache.current) {
      log('switching to default branch', branch)
      branch = defaultBranch
      yield updateCurrent(branch)
    }
    let file = branchCache.files[filePath]
    if (!file) {
      log('miss', branch, filePath)
      file = yield cacheFile(branch, filePath)
    } else {
      log('hit', branch, filePath)
    }
    if (file) {
      file.branch = branch
    }
    return file
  })

  let refresh = co(function * () {
    return seq(Object.keys(cache), (branch) => {
      log('refreshing', branch)
      return updateCurrent(branch)
    })
  })

  let current = function (branch) {
    return getBranchCache(branch).current
  }

  return {
    _cache: cache,
    get: get,
    current: current,
    refresh: refresh,
    branches: getBranches(s3)
  }
}
