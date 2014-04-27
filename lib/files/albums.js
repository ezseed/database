var models = require('../../models')
  , Albums = models.albums
  , File = models.file
  , debug = require('debug')('ezseed:database:albums')

var albums = require('../files')('albums')

albums.songs = {
	add: function(id, song, done) {

		var next = function(song, cb) {
			Albums
			.update({_id: id},
				{$addToSet: { songs: song }, dateAdded: Date.now()})
			.exec(cb)
		}

		File.findOne({path: song.path}, function(err, doc) {
			if(err)
				done(err)

			if(!doc)
				File.create(song, function(err, song) {
					next(song, done)
				})
			else {
				debug('Find one song')
				next(doc, done)
			}
		})
	},
	delete: function(id, id_song, done) {

		Albums.update({_id: id}, 
			{  
				$pull: { songs: id_song }
			},
			function(err, updated) {
				debug('Deleting %s song', updated)

				if(err)
					done(err)

				File.findByIdAndRemove(id_song, done)
			})
	}
}

module.exports = albums