var models = require('../../models')
  , Albums = models.albums
  , File = models.file
  , async = require('async')
  , debug = require('debug')('ezseed:database:albums')

module.exports = {
	delete: function(id, cb) {
		debug('Deleting album')
		this.get(id, function(err, album) {
			if(err)
				cb(err)

			async.each(album.songs, function(song, cb) {
				File.findByIdAndRemove(song._id, cb)
			}, function(err) {
				if(err)
					cb(err)

				Albums.remove({_id: album._id}, cb)
			})

		})
	},
	song: {
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
	},
	get: function(id, cb) {
	  Albums.findById(id).populate('songs').exec(cb)
	},
	/**
	 * Saving album
	 * @param  {Array | Object}   albums  
	 * @param  {[type]}   options  path to add album to a path
	 * @param  {Function} done    [description]
	 * @return {[type]}           [description]
	 */
	save: function (albums, id_path, done) {

		done = typeof id_path == 'function' ? id_path : done

		var next = function(album, cb) {
			debug('creating album')

			File.create(album.songs, function(err, songs) {
				if(err)
					throw new Error(err)

				album.songs = Array.prototype.slice.call(arguments, 1)
				debug('%s songs created', album.songs.length)

				Albums.create(album, function(err, album) {
					if(err)
						throw new Error(err)

					debug('album created')

					if(id_path) {
						debug('Saving album to path')
						require('../paths')
						.files.add(id_path, album, function(err, path) {
							cb(err, album)
						})
					} else
						return cb(null, album)
					
				})
			})
			
		}
	
		if(albums instanceof Array) {
			async.map(albums, next,	done)
		} else {
			next(albums, done)
		}
	}
}