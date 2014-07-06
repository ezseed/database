var mongoose = require('mongoose')
  , Schema =  mongoose.Schema
  , ObjectId = Schema.ObjectId
  , file = require('./file')

//Others
var others = new Schema(
  {
    name: String,
    dateAdded: { type: Date, default: Date.now },
    prevDir: String,
    prevDirRelative: String,
    type: {type: String, default: 'others'},
    files: [{type: ObjectId, ref: 'File'}]
  }
)

module.exports = mongoose.model('Others', others);
