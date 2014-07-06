var mongoose = require('mongoose')
  , Schema =  mongoose.Schema
  , ObjectId = Schema.ObjectId

var movies = new Schema({
  quality: String,
  subtitles: String,
  language: String,
  audio: String,
  season: String,
  format: String,
  movieType: String,
  name: String,
  year: Number,
  type: {type: String, default: 'movies'},
  //special schema for movies informations, we might want to change these
  infos: {type: ObjectId, ref:'MoviesInformations'},
  videos: [{type: ObjectId, ref: 'File'}],
  prevDir: String,
  prevDirRelative: String,
  dateAdded: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Movies', movies)
