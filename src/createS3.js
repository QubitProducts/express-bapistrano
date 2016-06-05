'use strict'

let S3FS = require('s3fs')
let path = require('path')

// patch readdir to strip trailing slashes,
// otherwise it causes a lot of confusion
var originalReaddir = S3FS.prototype.readdir
var map = (fn) => x => x.map(fn)
var stripTrailingSlash = x => x.replace(/\/$/, '')
S3FS.prototype.readdir = function () {
  return originalReaddir.apply(this, arguments).then(map(stripTrailingSlash))
}

module.exports = function createS3 (config) {
  return new S3FS(config.bucket, {
    region: config.region,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey
  }).clone(path.join(config.root, config.app))
}
