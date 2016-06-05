'use strict'

let moment = require('moment')
let releaseNamePrefix = 'YYYY-MM-DDTHHmmss'

module.exports = function parseRelease (release) {
  if (!release) return release

  let uploaded = moment.utc(release.substring(0, releaseNamePrefix.length), releaseNamePrefix)
  return {
    release: release,
    commit: release.substring(releaseNamePrefix.length + 1, release.length),
    uploadedAt: uploaded.toISOString(),
    uploaded: uploaded.fromNow()
  }
}
