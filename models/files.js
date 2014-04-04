var mongoose = require('mongoose')
	, Schema =  mongoose.Schema
	, ObjectId = Schema.ObjectId

//File schema
var files = new Schema(
	{
		name: String,
		path: String,
		prevDir: String,
		prevDirRelative: String,
		type: String,
		ext: String,
		size: Number,
		disc: Number,
		episode: {type: String, default: null}
	}
)

module.exports = mongoose.model('Files', files)
