'use strict'

module.exports = (list, fn) => list.reduce((m, x) => m.then(() => fn(x)), Promise.resolve())
