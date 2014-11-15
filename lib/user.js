var models = require('../models')
  , Paths = models.paths
  , Users = models.users
  , File = models.file
  , Movies = models.movies
  , Albums = models.albums
  , Others = models.others
  , _ = require('underscore')
  , bcrypt = require('bcrypt-nodejs')
  , isObjectId = require('./helpers').isObjectId
  , async = require('async')

var debug = require('debug')('ezseed:database:user')

var db = {
  files: require('./files'),
  paths: require('./paths')
}

var user = {
  exists: function(username, done) {
    Users.count({username: username}, function(err, count) {
      if(count)
        done(true)
      else
        done(false)
    })
  },
  /**
   * Get paths by user
   * @param  {ObjectId|String}   value
   * @param  {Object}   options
   * @param  {Function} done
   */
  paths: function(value, options, done) {

    done = typeof options == 'function' ? options : done
    options = typeof options == 'function' ? {} : options

    var populate_options = {
      path: 'paths'
    }

    if(options.default && isObjectId(options.default))
      populate_options.match = { _id: options.default }

    if(options.paths) {
      debug('only choosen paths')
      if(typeof options.paths == 'string') {
        options.paths = [options.paths]
      }

      populate_options.match = { _id : { $in: options.paths } }
    }


    if(isObjectId(value)) {
      Users
        .findById(value, '-hash')
        .populate(populate_options)
        .lean(true).exec(done)
    } else {
      Users
        .findOne({username:value}, '-hash')
        .populate(populate_options)
        .lean(true).exec(done)
    }
  },
  reset: function(uid, options, done) {
    if(typeof options == 'function') {
      done = options
      options = {}
    }

    this.paths(uid, options, function(err, docs) {

      if(err) return done(err)
  
      async.each(docs.paths, function(item, cb) {
        return db.paths.reset(item._id, cb)
      }, function(err) {
        //returns paths that have been reset
        done(err, docs)
      })
    })
  },
  /**
   * [files description]
   * @param  {[type]}   uid     [description]
   * @param  Object   options {default: _id, limit, sort etc.}
   * @param  {Function} done      [description]
   * @return {[type]}           [description]
   */
  files: function (uid, params, done) {

    this.paths(uid, params, function(err, docs) {

      if(err) {
        return done(err)
      } else if(!docs) {
        //@todo test...
        return done(new Error('No docs'))
      }

      var last_update = params.last_update ? params.last_update : 0

      var match = typeof params.match == 'object' ? params.match : {}
      match.dateAdded = {"$gt":last_update}

      var options = {}

      options.limit = params.limit ? params.limit : 0
      options.skip = params.skip ? params.skip : 0
      options.sort = params.sort ? params.sort : {dateAdded: 1}

      if(match.movieType == null)
        delete match.movieType

      //get a search string
      if(match.search) {
        //require helper that will pre-work the string (S01E02 => season/episode)
        var search = require('./search')(match.search)
        delete match.search //we don't want this anymore

        for(var i in search) {
          for(var j in match) {
            if(j !== 'movieType') {
              search[i][j] = match[j]
            } else if(i == 'movies') {
              search[i][j] = match[j]
            }
          }
        }
      }


      debug('Files query', match, options)

      var population = {
        movies: {
          path: 'paths.movies',
          model: Movies,
          match: search ? search.movies : match, 
          options: options
        },
        albums: {
          path: 'paths.albums',
          model: models.albums,
          match: search ? search.albums : match, 
          options: options
        },
        others: {
          path: 'paths.others',
          model: models.others,
          match: search ? search.others : match, 
          options: options
        }
      } 

      var populate_array = []

      if(options.type) {
        populate_array.push(population[options.type])
      } else {
        populate_array = [population.movies, population.albums, population.others]
      }

      Paths.populate(docs,
      populate_array,
      function(err, docs) {
        async.parallel([
          function(next) {
            Movies.populate(
              docs,
              [
                {
                  path: 'paths.movies.videos',
                  model: File
                },
                { 
                  path: 'paths.movies.infos', 
                  model: models.scrapper
                }
              ],
              next
            )
          
          },
          function(next) {
            Albums.populate(docs, {path: 'paths.albums.songs', model: File}, next)
          },
          function(next) {
            Others.populate(docs, {path: 'paths.others.files', model: File}, next)
          }
        ], function(err, results) {

          docs.paths = _.extend(docs.paths, {
            movies: results[0],
            albums: results[1],
            others: results[2]
          })

          done(null, docs)
        })


      })
    })
  },
  /**
   * add user to dabase
   * @param     {Object}    u     username, password, client, role
   * @callback  {Function}  done  fn(err, user)
   */
  create: function(u, done) {
    var password = u.password, username = u.username

    //Generates the hash
    bcrypt.hash(password, null, null, function(err, hash) {

      //We save only the hash
      // var user = new Users ({
      //   username: username,
      //   role: 'admin',
      //   client: client,
      //   hash: hash
      // })

      //We are doing this test because a random user could do `ezseed useradd` to update it
      Users.findOne({username: username}, function (err, doc){
        if(doc) {
          doc.role = u.role ? u.role: 'user'
          doc.hash = hash
          doc.client = u.client ? u.client: 'aucun'
        } else {
          doc = new Users ({
            username: username,
            role: u.role ? u.role: 'user',
            hash: hash,
            client: u.client ? u.client: 'none',
            port: u.port ? u.port : 0,
          })
        }

        doc.save(function(err) {
          if(err) {
            //Checking for the username validation - see models/index.js
            //Le nom d'utilisateur ne peut contenir que des caractères alphanumériques et des tirets
            if(err.name == 'ValidationError')
              done("username is not valid", null)
            else
              done(err, null)
          } else
            done(null, doc)
        })

      })
    })
  },
  login: function(user, done) {

    if(!user.password || !user.username) {
      return done('Missing password or username')
    }

    debug(user.username + ' is logging in')

    this.get(user.username, function(err, dbuser) {

      if(!dbuser) {
        return done('User not found')
      }

      debug(dbuser.username + ' has been found')

      bcrypt.compare(user.password, dbuser.hash, function(err, result) {

        if(result === true) {
          return done(null, dbuser.session)
        } else {
          return done('Password does not match')
        }
      })
    })
  },
  delete: function(username, done) {
    Users.findOne({username: username}, function(err, user) {
      if(user) {
        //this deletes paths if they are not watched by any other user
        db.paths.remove(user.paths, {not: user._id}, function(err, paths) {
          if(err)
            return done(err)

          Users.findByIdAndRemove(user._id, function(err) {
            done(err, paths)
          })
        })
      } else {
        done(new Error('user ' + username + ' does not exists'))
      }
    })
  },
  /**
   * update user
   * @param  {mixed}     value     ObjectId or username
   * @param  {Object}    update    Update {key:value}
   * @callback  {Function}  cb
   */
  update: function(value, update, done) {

    var hash_password = function(update, cb) {
      if(update.password !== undefined) {

        bcrypt.hash(update.password, null, null, function(err, hash) {
            update.hash = hash
            delete update.password
            cb(update)
        })

      } else {
        cb(update)
      }
    }

    hash_password(update, function(update) {
      if(isObjectId(value)) {
        Users.findByIdAndUpdate(value, update, null, done)
      } else {
        Users.findOneAndUpdate({username:value}, update, null, done)
      }
    })
  },
  update_path: function(path, options, done) {

    if(!options)
      throw new Error('No username or id')

    if(!path._id || !isObjectId(path._id)) {
      return done(new Error('Path must have an ObjectId'))
    }

    var update = { $addToSet: {paths: path._id} }

    if(options.default === true)
      update.default_path = path._id

    this.update(options._id || options.username, update, function(err) {
      if(err)
        return done(err)

      done(null, path)
    })
  },
  remove_path: function(id_path, user, done) {
    if(!isObjectId(id_path)) {
      return done(new Error('Path must be an ObjectId'))
    }

    this.update(user, {$pull : {paths : id_path}}, done)
  },
  get: function(value, done) {
    if(isObjectId(value))
      Users.findById(value, done)
    else
      Users.findOne({username: value}, done)
  },

  //to be remove
  // byUsername: function(username, done) {
  //   Users.findOne({username: username}, done)
  // },
  // byId: function(uid, done) {
  //   Users.findById(uid, done)
  // },

  // //todo remove this update update is there for that
  // setClient: function(username, client, done) {
  //   Users.findOneAndUpdate({username: username}, {client: client}, done)
  // },
  // setSpaceLeft: function(id, left, done) {
  //   Users.findByIdAndUpdate(id, {spaceLeft: left}, done)
  // }

  //   //Reset user database is a mess
  //   reset: function(uid, done) {

  //     var cleanPath = function(err, results) {
  //       if(err)
  //         return cb(err)

  //       db.paths.byUser(uid, function(err, map) {
  //         async.each(
  //           map.docs.paths,
  //           function(path,callback){
  //             //Deleting each file id, previously saved inside the path object
  //             Paths.findByIdAndUpdate(path._id, {others: [], movies: [], albums: []}, function(err) {
  //               callback(err)
  //             })
  //           },
  //           function(err){
  //             done(err)
  //           }
  //         )

  //       })
  //     }

  //     db.files.byUser(uid, 0, {}, function(err, docs) {

  //       async.each(docs.paths, function(path, next) {

  //         async.parallel({
  //             albums: function(callback){
  //               async.each(path.albums,
  //                 function(album, cb) {
  //                   db.files.albums.delete(album._id, cb)
  //                 },
  //                 function(err){
  //                   callback(err)
  //                 }
  //               )
  //             },
  //             movies: function(callback){
  //               async.each(path.movies,
  //                 function(movie, cb) {
  //                   db.files.movies.delete(movie._id, cb)
  //                 },
  //                 function(err){
  //                   callback(err)
  //                 }
  //               )
  //             },
  //             others: function(callback) {
  //               async.each(path.others,
  //                 function(other, cb) {
  //                   db.files.others.delete(other._id, cb)
  //                 },
  //                 function(err){
  //                   callback(err)
  //                 }
  //               )
  //             }
  //         },

  //         cleanPath)

  //       })

  //     })
  // }
}

module.exports = user
