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
  /**
   * [files description]
   * @param  {[type]}   uid     [description]
   * @param  Object   options {default: _id, limit, sort etc.}
   * @param  {Function} done      [description]
   * @return {[type]}           [description]
   */
  files: function (uid, options, done) {

    this.paths(uid, options, function(err, docs) {

      var last_update = options.last_update ? options.last_update : 0

      options = options ? options : {}
      options.limit = options.limit ? options.limit * 3 : 0

      Paths.populate(docs,
      [
        {
          path: 'paths.movies',
          model: Movies,
          match: {
            dateAdded: {"$gt":last_update}
          },
          options: options
          // sort: limit.sort,
          // skip: limit.start
        },
        {
          path: 'paths.albums',
          model: models.albums,
          match: {
            dateAdded: {"$gt":last_update}
          },
          options: options
          // sort: limit.sort,
          // skip: limit.start
        },
        {
          path: 'paths.others',
          model: models.others,
          match: {
            dateAdded: {"$gt":last_update}
          },
          options: options
          // sort: limit.sort,
          // skip: limit.start
        }
      ],
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
            client: u.client ? u.client: 'aucun'
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
        db.paths.remove(user.paths, function(err, paths) {
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

    var update = { $addToSet: {paths: path._id} }

    if(options.default === true)
      update.default_path = path._id

    this.update(options._id || options.username, update, function(err) {
      if(err)
        return cb(err)

      done(null, path)
    })
  },
  remove_path: function(id_path, user, done) {
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
