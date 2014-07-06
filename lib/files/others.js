var models = require('../../models')
  , Others = models.others
  , File = models.file
  , debug = require('debug')('ezseed:database:others')

var others = require('../files')('others')

others.files = {
  add: function(id, file, done) {

    var next = function(file, cb) {
      Others
      .update({_id: id},
        {$addToSet: { files: file }, dateAdded: Date.now()})
      .exec(cb)
    }

    File.findOne({path: file.path}, function(err, doc) {
      if(err)
        done(err)

      if(!doc)
        File.create(file, function(err, file) {
          next(file, done)
        })
      else {
        debug('Find one file')
        next(doc, done)
      }
    })
  },
  delete: function(id, id_file, done) {

    Others.update({_id: id},
      {
        $pull: { files: id_file }
      },
      function(err, updated) {
        debug('Deleting %s file', updated)

        if(err)
          done(err)

        File.findByIdAndRemove(id_file, done)
      })
  }
}

module.exports = others;
