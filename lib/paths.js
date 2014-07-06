var   models = require('../models')
  , Paths = models.paths
  , addToSet = require('./helpers').addToSet
  , isObjectId = require('./helpers').isObjectId
    , debug = require('debug')('ezseed:database:paths')
    , async = require('async')

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
  /**
   * Save path to database
   * @param {[type]}   path     [description]
   * @param {String}   options   optional
   * @callback {Function} done       [description]
   */
  save: function(path, options, done) {
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

      is_watched[z] = false

    }

    var next = function(users) {
      z = path.length

      while(z--) {

        var x = users.length

        while(x--) {
          var y = users[x].paths.length

          while(y--) {
            //Path could be populated but if not
            id_path = users[x].paths[y]._id === undefined ? users[x].paths[y] : users[x].paths[y]._id

            if(path[z].toString() === id_path.toString()) {

              is_watched[z] = true

              break;
            }
          }

          if(is_watched[z])
            break;
        }
      }


      if(is_watched.length === 1)
        done(null, is_watched[0])
      else
        done(null, is_watched)

    }

    if(which)
      require('./user').get(which, function(err, user) {
        next([user])
      })
    else
      require('./users').get(function(err, users) {
        next(users)
      })

  },

  remove: function(path, done) {
    if(!path)
      return done(new Error('no path'))

    //Should find if path is watched before deleting it
    this.is_watched(path, function(err, is_watched) {
          if(is_watched)
            return done(new Error('path is watched, it has not been removed'))

          if(isObjectId(path))
        Paths.findByIdAndRemove(path, done)
      else
        Paths.findOneAndRemove({path : path}, done)
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
    remove: function() {

    }
  },

  // //should be removed
  // //strict = only user path
  // byUser : function (uid, cb, strict) {
  // 	Users.findById(uid).populate('paths').lean(true).exec(function (err, docs) {
  // 		if (err)
  // 			cb(err, {})
  // 		else {

  // 			if(docs) {

  // 				var paths = [], p = docs.paths

  // 				for(var i in p)
  // 					if(p[i].path !== undefined && p[i].path !== 'paths')
  // 											  //that should be changed
  // 						if(strict === true && p[i].path.indexOf(docs.username) !== -1)
  // 							paths.push(p[i].path)
  // 						else if(strict !== true)
  // 							paths.push(p[i].path)

  // 				cb(err, {paths : paths, docs : docs})

  // 			} else
  // 				cb(err, {paths: [], docs : null})

  // 		}
  // 	})
  // },
  // //not used anymore => it's awfull btw :o
  // resetByFile : function(fid, done) {

  // 	Paths.find().exec(function(err, docs) {

  // 		var i = -1, update = false

  // 		_.each(docs, function(path, cursor) {

  // 			i = path.albums.indexOf(fid)

  // 			if(i !== -1) {
  // 				docs[cursor].albums.splice(i, 1)
  // 				update = true
  // 			}

  // 			i = path.movies.indexOf(fid)

  // 			if(i !== -1) {
  // 				docs[cursor].movies.splice(i, 1)
  // 				update = true
  // 			}

  // 			i = path.others.indexOf(fid)
  // 			if(i !== -1) {
  // 				docs[cursor].others.splice(i, 1)
  // 				update = true
  // 			}

  // 			if(update) {
  // 				//WTF
  // 				Paths.findByIdAndUpdate(docs[cursor]._id, {movies : docs[cursor].movies, albums : docs[cursor].albums, others : docs[cursor].others }, function(err, num) {
  // 				  console.log(err, num)
  // 				})
  // 				update = false
  // 			}

  // 		})

  // 		return done()
  // 	})
  // }
}

module.exports = paths
