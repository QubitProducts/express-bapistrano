'use strict'

let path = require('path')
let moment = require('moment')
let co = require('creed').coroutine

let releaseNamePrefix = 'YYYY-MM-DDTHHmmss'

module.exports = function getBranches (s3) {
  let cache = null

  return co(function * () {
    if (cache) {
      return cache
    }

    let branches = yield s3.readdir('/')
    branches = branches.sort()

    let branchList = []

    for (let branch of branches) {
      // let releases = yield s3.readdir(path.join(root, app, branch, 'releases'))
      // let numberOfReleases = releases.length
      // releases = releases.sort().reverse().slice(0, options.limit)
      let currentFile = yield s3.readFile(path.join(branch, 'current'))

      // something's wrong with this branch
      if (!currentFile) continue

      let current = currentFile.Body.toString()
      let released = moment(new Date(currentFile.LastModified)).utc().fromNow()
      let uploaded = moment.utc(current.substring(0, releaseNamePrefix.length), releaseNamePrefix).fromNow()

      branchList.push({
        name: branch,
        current,
        released,
        uploaded
      })
    }

    cache = branchList
    setTimeout(() => (cache = null), 60 * 1000)
    return branchList
  })
}
