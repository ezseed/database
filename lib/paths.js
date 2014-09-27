var models = require('../models')
  , Paths = models.paths
  , addToSet = require('./helpers').addToSet
  , isObjectId = require('./helpers').isObjectId
  , debug = require('debug')('ezseed:database:paths')
  , async = require('async')
  , isArray = require('util').isArray

var paths = {
  /**
   * exists
   * @param  {String}   path
   * @callback  {Function} done
   * @return {Bool} exists
   */
   exists: function(path, done) {
      Paths.count({path: path}, function(err, count) {
        if(count)
          done(true)
        else
          done(false)
      })
  },

  get: function(id, done) {
    var self = this

    if(typeof id == 'function')
      Paths.find().lean().exec(id)
    else {
      var search = {}

      if(isObjectId(id))
        search = {_id: id}
      else
        search = {path: id}

      Paths.findOne(search).populate('movies albums others').exec(function (err, docs) {
        if(err)
          done(err)

        self.populate(docs, done)
      })
    }
  },
  populate: function(docs, done) {

    debug('Populating')

    async.seq(
      require('./files/movies').populate,
      require('./files/albums').populate,
      require('./files/others').populate
    )(docs, function(err, docs) {
      debug('Finished populating')
      if(err)
        done(err)
      else
        done(null, docs)
    })

  },
  update: function(id, update, done) {
    if(!isObjectId(id))
      return done(new Error('path must be an ObjectId'))

    Paths.findOneAndUpdate({_id: id}, update, done)
  },
  /**
   * Save path to database
   * @param {[type]}   path     [description]
   * @param {String}   options   optional
   * @callback {Function} done       [description]
   */
  save: function(path, options, done) {
    if(!path) 
      throw new Error('No path to be saved')

    var user = require('./user')

    if(typeof options == 'function') {
      done = options
      options = {}
    }

    var which = options._id || options.username

    //if it's an Id assume it's created already
    if(isObjectId(path) && which) {
      Paths.findById(path, function(err,p){

        if(err)
          return done(err)

        user.update_path(p, options, done)
      })
    }
    else {
      Paths.findOne({path : path}, function(err, p) {
        if(err)
          throw err

        if(p && which) {
          user.update_path(p, options, done)
        } else if(!p) {

          p = new Paths({
            'path' : path
          })

          p.save(function(err) {
            if(err) return done(err)
          })

          p.on('save', function(p) {
            if(which)
              user.update_path(p, options, done)
            else
              done(null, p)
          })
        } else {
          done(new Error("Path exists and hasn't bee updated"), p)
        }
      })
    }
  },
  /**
   * is the path watched ?
   * @param  {ObjectId|Array of ObjectIds}   path this function would really be too long with Strings
   * @param {Object} options _id or username to check, 'not' to skip a user (by id or username)
   * @callback  {Function} done (err, (bool) is_watched)
   */
  is_watched: function(path, options, done) {

    var is_watched = [], which, id_path

    if(typeof options == 'function')
      done = options
    else
      which = options._id || options.username

    if(typeof path == 'string' || path instanceof Array === false)
      path = [path]

    var z = path.length

    while(z--) {

      debug('checking if %s is watched', path[z])
      if(!isObjectId(path[z]))
        return done(new Error('Path '+path[z]+' is not an mongodb id'), false)

      is_watched[path[z].toString()] = false

    }

    var next = function(users) {
      z = path.length

      while(z--) {

        var x = users.length

        while(x--) {

          //if we want to delete this user, we might want to know if others are watching
          if(options.not && (options.not.toString() === users[x]._id.toString() || options.not === users[x].username)) {
            debug('skipping user %s', users[x]._id)
            break;
          }

          var y = users[x].paths.length

          while(y--) {
            //Path could be populated but if not
            id_path = users[x].paths[y]._id === undefined ? users[x].paths[y] : users[x].paths[y]._id

            if(path[z].toString() === id_path.toString()) {

              debug('%s is watched', path[z])
              is_watched[path[z].toString()] = true

              break;
            }
          }

          if(is_watched[path[z].toString()])
            break;
        }
      }

      done(null, is_watched)
    }

    if(which) {
      require('./user').get(which, function(err, user) {
        next([user])
      })
    } else {
      require('./users').get(function(err, users) {
        next(users)
      })
    }
  },

  remove: function(path, options, done) {

    var deleted_paths = []

    if(typeof options == 'function') {
      done = options
      options = {}
    }

    if(!path)
      return done(new Error('no path'))

    var end = function(err) {
     debug('Paths deleted: ', deleted_paths)
     return done(err, deleted_paths)
    }

    var next = function(path, err, docs, cb) {
        if(err) {
          return cb(err)
        }

        if(!docs) {
          return cb(new Error('No path founded for path ' + path))
        }

        deleted_paths.push(docs.path)
        docs.remove(cb)
    }

    //Should find if path is watched before deleting it
    this.is_watched(path, options, function(err, is_watched) {

      if(!isArray(path) && is_watched[path] === true)
        return done(new Error('path is watched, it has not been removed'))

      if(isArray(path)) {
        async.each(path, function(item, cb) {

          if(!isObjectId(item))
            throw new Error('expected ObjectId got '+ typeof item)

          if(is_watched[path] === true) {
            cb(null)
          } else {
            Paths.findById(item, function(err, docs) {
              return next(item, err, docs, cb)
            })
          }

        }, function(err) {
          //this should not happend
          if(err)
            throw new Error(err)

          return end(null)
        })

      } else if(isObjectId(path)) {
        Paths.findById(path, function(err, docs) {

          return next(path, err, docs, end)
        })
      } else {
        Paths.findOne({path : path}, function(err, docs) {

          return next(path, err, docs, end)
        })
      }
    })
  },
  reset: function(id, done) {
    var self = this

    self.get(id, function(err, data) {
      if(err) return done(err)

      debug('Resetting path', data._id)
      async.each(['movies', 'albums', 'others'], function(type, cb) {
        debug('Removing '+type)
        var remove = require('./files/'+type).delete
        async.each(data[type], function(item, next) {
          return remove(item._id, next)
        }, cb) 
      }, done)

    })
  },
  files: {
    /**
     * Adds a file _id to path
     * @param {ObjectId}   id      path id
     * @param {Object}   file - albums, movies, others
     * @param {callback} done
     */
    add: function(id, file, done) {

      if(!isObjectId(id))
        done(new Error('expected ObjectId got '+ typeof id))
      else if(!file.type && file._id)
        done(new Error('file._id and file.type expected'))

      var type = file.type

      Paths.findById(id, function(err, p) {
        if(err)
          done(err, p)

        for(var i in p) {

          if(i == type) {
            p[type] = addToSet(p[type], file._id)
          }
        }

        p.save(done)
      })
    },
    //this should not be needed
    remove: function() {
      throw new Error('not implemented')
    }
  }
}

module.exports = paths
