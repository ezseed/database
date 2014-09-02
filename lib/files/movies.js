var models = require('../../models')
  , Movies = models.movies
  , MoviesInformations = models.scrapper
  , paths = require('../paths')
  , async = require('async')
  , debug = require('debug')('ezseed:database:movies')
  , File = models.file

var item = {
  delete: function(id, done) {
    debug('Deleting movie')

    item.get(id, function(err, movie) {

      if(err)
        done(err)

      var next = function(err) {
        if(err)
          done(err)

        paths.get(function(err, docs) {

          var ids = []

          for(var i in docs) {
            ids.push(docs[i]._id)
          }

          debug('Removing movie from paths', ids)

          models.paths.update({_id: {$in: ids}},
            {
              $pull: { movies: id }
            }, function() {
              if(err)
                done(err)
              
              MoviesInformations.findByIdAndRemove(movie.infos, function (err) {
                if(err)
                  done(err)

                Movies.remove({_id: movie._id}, done)
              })

            })
        })
      }

      if(movie.videos.length === 0)
        next(null)
      else
        async.each(movie.videos, function(video, cb) {
          File.findByIdAndRemove(video._id, cb)
        }, next)
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

    var create = function(movie, cb) {

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
    }

    var next = function(movie, cb) {
      debug('creating movie')

      File.create(movie.videos, function(err, videos) {
        if(err)
          return cb(err)

        movie.videos = Array.prototype.slice.call(arguments, 1)
        debug('%s videos created', movie.videos.length)

        if(movie.infos) {
          return create(movie, cb)
        } else {
          MoviesInformations.create(movie, function(err, infos){
            if(err)
              return cb(err)

            movie.infos = infos._id

            return create(movie, cb)
          })
        }

      })

    }

    if(movies instanceof Array) {
      async.map(movies, next,	done)
    } else {
      next(movies, done)
    }
  },
  scrapper: {
    exists: function(code, season, done) {
      if(typeof season == 'function') {
        cb = season
        season = null
      }

      var query = {
        code: code
      }

      if(season !== null) {
        query.season = season
      }

      MoviesInformations.findOne(query, done) 
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

module.exports = item
