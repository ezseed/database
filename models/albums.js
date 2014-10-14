var mongoose = require('mongoose')
  , Schema =  mongoose.Schema
  , ObjectId = Schema.ObjectId

//Albums schema
var albums = new Schema(
  {
    artist: {type: String, index: 'text', default: 'VA'},
    album: {type: String, index: 'text', default: 'No name'},
    year: String,
    genre: {type: String, index: 'text'},
    songs: [{type: ObjectId, ref: 'File'}],
    type: {type: String, default: 'albums'},
    picture: String,
    prevDir: String,
    prevDirRelative: String,
    dateAdded: { type: Date, default: Date.now }
  }
)

module.exports  = mongoose.model('Albums', albums)
