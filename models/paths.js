var mongoose = require('mongoose')
	, Schema =  mongoose.Schema
	, ObjectId = Schema.ObjectId

//The paths schema
var PathsSchema = new Schema({
	'path': {'type': String, 'unique': true},
	'albums': [{'type': ObjectId, ref: 'Albums'}],
	'movies': [{'type': ObjectId, ref: 'Movies'}],
	'others': [{'type': ObjectId, ref: 'Others'}],
	dateUpdated: { type: Date, default: Date.now }
	}
)

module.exports = mongoose.model('Paths', PathsSchema);
