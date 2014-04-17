var db = require('../').db
  , expect = require('chai').expect

var user = {
	username: 'test-user' + Math.round(Math.random() * 100),
	password: 'crazy-password',
	role: 'admin'
}
, user_path = '/home/'+user.username

var song = {
	name: 'Buffalo soldier',
	path:  user_path + '/bob/bob.mp3',
	type: 'audio',
	ext: 'mp3',
	size: 1,
	specific: {
		disc: 1, num: 0
	}
}

var album = {
	artist: 'Bob marley',
	album: 'Best Of',
	year: 2000,
	genre: 'Reggae',
	prevDir: user_path + '/bob',
	prevDirRelative: '/bob',
	songs: [song]
}

describe('files', function() {

	require('./files/albums.js')
	require('./files/movies.js')
})