var mongoose = require('mongoose')
	, Schema =  mongoose.Schema
	, ObjectId = Schema.ObjectId
	, files = require('./files')

var movies = new Schema({
	quality: String,
	subtitles: String,
	language: String,
	audio: String,
	season: String,
	format: String,
	movieType: String,
	name: String,
	//special schema for movies informations, we might want to change these
	infos: {'type': ObjectId, ref:'MoviesInformations'},
	videos: [files],
	prevDir: String,
	prevDirRelative: String,
	code: String,
	dateAdded: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Movies', movies)
