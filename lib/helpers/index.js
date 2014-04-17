var _ = require('underscore')

module.exports = {
	isObjectId: function (value) {
		return typeof value == 'object' || value.match(/^[0-9a-fA-F]{24}$/)
	},
	addToSet: function(set, value) {
		if(!_.findWhere(set, value))
			set.push(value)
		return set
	}
}
