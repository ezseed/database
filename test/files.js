var db = require('../').db
  , expect = require('chai').expect

describe('files', function() {

	require('./files/albums.js')
	require('./files/movies.js')
	require('./files/others.js')

})