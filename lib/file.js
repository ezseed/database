var models = require('../models')

var files = {
  get : function(id, cb) {
    models.file.findById(id, cb)
  }
}

module.exports = files
