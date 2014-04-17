var mongoose = require('mongoose')
	, Schema =  mongoose.Schema
	, ObjectId = Schema.ObjectId

//File schema
var file = new Schema({
	name: String,
	path: String,
	prevDir: String,
	prevDirRelative: String,
	type: String,
	ext: String,
	size: Number,
	specific: {type: Object},
	// disc: Number,
	// episode: {type: String, default: null}
})


module.exports = mongoose.model('File', file)
