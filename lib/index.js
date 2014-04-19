var _ = require('underscore');

var db = {
	paths: require('./paths.js'),
	albums: require('./files/albums.js'),
	movies: require('./files/movies.js'),
	others: require('./files/others.js'),
	files: require('./files.js'),
	//crap
	// file: {
	// 	byId : function(obj, id) {
	// 		var o = obj.songs || obj.videos || obj.files;

	// 		return _.filter(o, function(o){ return o._id == id; })[0];
	//     }
	// },
	user: require('./user.js'),
	users: require('./users.js'),
	//TODO !
	// plugins: require('../../plugins').database,
	remove: require('./remove'),
}

module.exports = db;
