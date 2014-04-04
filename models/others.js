var mongoose = require('mongoose')
	, Schema =  mongoose.Schema
	, ObjectId = Schema.ObjectId
	, files = require('./files')

//Others
var others = new Schema(
	{
		name: String,
		dateAdded: { type: Date, default: Date.now },
		prevDir: String,
		prevDirRelative: String,
		files: [files]
	}
)

module.exports = mongoose.model('Others', others);
