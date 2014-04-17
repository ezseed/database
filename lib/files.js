var models = require('../models')
  , Paths = models.paths
  , Movies = models.movies
  , MoviesInformations = models.scrapper
  , Albums = models.albums
  , Others = models.others
  , async = require('async')
  , _ = require('underscore')

var files = {
	
	save: function() {

	},
	//crap
	byId : function(id, cb) {
		var result = [], errs = []

		Movies.findById(id).lean().exec(function(err, docs) {
		  if(docs !== null) result.push(docs)
		  if(err !== null) errs.push(err)
		  Albums.findById(id).lean().exec(function(err, docs) {
		   if(docs !== null)result.push(docs)
		   if(err !== null) errs.push(err)
			Others.findById(id).lean().exec(function(err, docs) {
			  if(docs !== null)result.push(docs)
			  if(err !== null) errs.push(err)
			  cb(err, result[0])
			})
		  })
		})
	},
	albums : {
			
	},
	movies : {
		delete : function(id, cb) {
			Movies.findByIdAndRemove(id, {select: 'infos'}, function(err, infos) {

				MoviesInformations.findByIdAndRemove(infos.infos, cb)

			})
		},
		addVideo: function(id, video, cb) {

			Movies
			.findByIdAndUpdate(id, 
				
				{ $push: { videos: video }, dateAdded: Date.now() }, 

				cb)
		},
		deleteVideo: function(id, id_video, cb) {
			Movies.findByIdAndUpdate(id, 
				{  
					$pull: { videos: {_id: id_video } }
				},
				function(err, docs) {
					if(err)
					
					console.log(docs.videos)

					if(docs.videos.length == 0)
						files.movies.delete(id, cb)
					else
						cb(err)
				})
		},
		get : function(id, cb) {
		  Movies.findById(id).lean(true).populate('infos').exec(function(err, doc) {
			cb(err, doc)
		  })
		},
		save : function (obj, saveCallback) {
			async.each(obj.movies, 
				function(movie, cb) {

					infos = new MoviesInformations(movie)

					infos.save(function(err, infos) {

						movie = new Movies(_.extend(movie, {infos: infos._id}))

						movie.save(function(err, movie) {
							Paths.findByIdAndUpdate(
							obj.id_path, 
							{ $addToSet : {'movies': movie._id }, 'dateUpdated': Date.now() }, 
							function(err) { 
								return cb(err)
							}
						)
						})
					})
					

				},
				function (err) {
					saveCallback(err, obj.movies)
				}
			)
		}
	},
	others : {
		deleteFile: function(id, id_file, cb) {
			Others.findByIdAndUpdate(id, 
				{  
					$pull: { files: {_id: id_file} }
				},
				function(err, docs) {
					if(err)
						console.log('error', err)
					
					if(docs.files.length == 0)
						files.others.delete(id, cb)
					else
						cb(err)
				})

		},
		delete : function(id, cb) {
			Others.findByIdAndRemove(id, function(err) {
				cb(err)
			})
		},
		save : function(obj, saveCallback) {
			async.each(obj.others, 
				function(other, cb) {

					other = new Others(other)

					other.save(function(err, other) {
						Paths.findByIdAndUpdate(
						obj.id_path, 
						{ $addToSet : {'others': other._id }, 'dateUpdated': Date.now() }, 
						function(err) { 
							return cb(err)
						}
					)
					})

				},
				function (err) {
					saveCallback(err, obj.others)
				}
			)
		}
	}
}

module.exports = files