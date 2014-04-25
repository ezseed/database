var _ = require('underscore')

module.exports = {
	isObjectId: function (value) {
		return typeof value == 'object' && value.toString().match(/^[0-9a-fA-F]{24}$/) || typeof value == 'string' && value.match(/^[0-9a-fA-F]{24}$/)
	},
	addToSet: function(set, value) {
		if(!_.findWhere(set, value))
			set.push(value)
		return set
	},
	//used to get filenames according to types
	filename: function(type) {

		if(type == 'movies')
			return 'videos'
		else if(type == 'albums')
			return 'songs'
		else if(type == 'others')
			return 'files'
		else
			throw new Error('type not recognized')
	}
}
