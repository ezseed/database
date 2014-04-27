var mongoose = require('mongoose')
	, Schema =  mongoose.Schema
	, ObjectId = Schema.ObjectId

//Albums schema
var albums = new Schema(
	{
		artist: String,
		album: String,
		year: String,
		genre: String,
		songs: [{type: ObjectId, ref: 'File'}],
		type: {type: String, default: 'albums'},
		picture: String,
		prevDir: String,
		prevDirRelative: String,
		dateAdded: { type: Date, default: Date.now }
	}
)

module.exports  = mongoose.model('Albums', albums)

