var mongoose = require('mongoose')
	, Schema =  mongoose.Schema
	, ObjectId = Schema.ObjectId
	
//store things that should be removed... Redis would me more appropriate... 
var RemoveSchema = new Schema({
	path: {'type':ObjectId, 'required':true, 'unique': true, index: true},
	to_remove: [{
		type: {'type': String},
		item: {'type': ObjectId},
		file: {'type': ObjectId}
	}]
}, { autoIndex: false })

module.exports = mongoose.model('Remove', RemoveSchema)

