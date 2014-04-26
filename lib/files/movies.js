var models = require('../../models')
  , Movies = models.movies
  , MoviesInformations = models.scrapper
  , async = require('async')
  , debug = require('debug')('ezseed:database:movies')
  , File = models.file

module.exports = {
	delete: function(id, done) {
		debug('Deleting movie')
		this.get(id, function(err, movie) {
			if(err)
				done(err)

			async.each(movie.videos, function(video, cb) {
				File.findByIdAndRemove(video._id, cb)
			}, function(err) {
				if(err)
					done(err)
				
				MoviesInformations.findByIdAndRemove(movie.infos, function (err) {
					if(err)
						done(err)

					Movies.remove({_id: movie._id}, done)
				})
			})

		})
	},
	videos: {
		add: function(id, video, done) {

			var next = function(video, cb) {
				Movies
				.update({_id: id},
					{
						$addToSet: { videos: video }, dateAdded: Date.now()
					}
				)
				.exec(cb)
			}

			File.findOne({path: video.path}, function(err, doc) {
				if(err)
					done(err)

				if(!doc)
					File.create(video, function(err, video) {
						next(video, done)
					})
				else {
					debug('Find one video')
					next(doc, done)
				}
			})
		},
		delete: function(id, id_video, done) {

			Movies.update({_id: id}, 
				{  
					$pull: { videos: id_video }
				},
				function(err, updated) {
					debug('Deleting %s video', updated)

					if(err)
						done(err)

					File.findByIdAndRemove(id_video, done)
				})
		}
	},
	infos: {
		update: function(id, infos, done) {
			Movies.findById(id, function(err, movie) {
				if(err)
					return done(err)

				MoviesInformations.update({_id: movie.infos}, infos, done)  
			})
		}
	},
	get: function(id, done) {
	  Movies.findById(id).populate('videos infos').exec(done)
	},
	save: function (movies, id_path, done) {

		done = typeof id_path == 'function' ? id_path : done

		var next = function(movie, cb) {
			debug('creating movie')

			File.create(movie.videos, function(err, videos) {
				if(err)
					return cb(err)

				movie.videos = Array.prototype.slice.call(arguments, 1)
				debug('%s videos created', movie.videos.length)

				MoviesInformations.create(movie, function(err, infos){
					if(err)
						return cb(err)

					movies.infos = infos

					Movies.create(movie, function(err, movie) {
						if(err)
							return cb(err)

						debug('movie created')

						if(id_path) {
							debug('Saving movie to path')
							require('../paths')
							.files.add(id_path, movie, function(err, path) {
								cb(err, movie)
							})
						} else
							return cb(null, movie)
						
					})	
				})
				
			})
			
		}
	
		if(movies instanceof Array) {
			async.map(movies, next,	done)
		} else {
			next(movies, done)
		}
	},
	populate: function(docs, callback) {
		debug('populating')
		Movies.populate(docs,[
				{ 
					path: 'movies.infos',
					model: 'MoviesInformations',
					select: '-__v'
				}, 
				{
					path: 'movies.videos',
					model: 'File'
				}
			], callback)
	}
}