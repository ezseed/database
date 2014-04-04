
module.exports = {
	isObjectId: function (value) {
		return typeof value == 'object' || value.match(/^[0-9a-fA-F]{24}$/)
	}
}
