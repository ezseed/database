var _ = require('underscore');

var db = {
	paths: require('./paths.js'),
	albums: require('./files/albums.js'),
	movies: require('./files/movies.js'),
	others: require('./files/others.js'),
	files: require('./files.js'),
	user: require('./user.js'),
	users: require('./users.js'),
	//TODO !
	// plugins: require('../../plugins').database,
	remove: require('./remove'),
}

module.exports = db;
