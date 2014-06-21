var models = require('../models')
  , Paths = models.paths
  , Users = models.users
  , bcrypt = require('bcrypt-nodejs')
  , isObjectId = require('./helpers').isObjectId

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
  files: function (uid, last_update, limit, cb) {

    this.paths(uid, function(err, docs) {

      Paths.populate(docs,
      [
        {
          path: 'paths.movies',
          model: Movies,
          match: {
            dateAdded: {"$gt":last_update}
          },
          // sort: limit.sort,
          // skip: limit.start
        },
        {
          path: 'paths.albums',
          model: Albums,
          match: {
            dateAdded: {"$gt":last_update}
          },
          // sort: limit.sort,
          // skip: limit.start
        },
        {
          path: 'paths.others',
          model: Others,
          match: {
            dateAdded: {"$gt":last_update}
          },
          // sort: limit.sort,
          // skip: limit.start
        }
      ],
      function(err, docs) {

        Movies.populate(
          docs,
          { path: 'paths.movies.infos', model: models.MoviesInformations },
          cb
        )

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

    this.get(user.username, function(err, dbuser) {

      if(!dbuser) {
        return done('User not found')
      }

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
    var self = this
    Users.findOne({username: username}, function(err, doc) {
      //Hmm should be improved, only delete paths that aren't linked to another user !
      //commented atm need a fix !
      // var nbPaths = doc.paths.length
      // if(nbPaths) {
      //   while(nbPaths--) {
      //     //Could be async but it isn't important
      //     Paths.findByIdAndRemove(doc.paths[nbPaths], function(err) {

      //     })
      //   }
      // }
      if(doc) {
        if(doc.default_path) {
          self.remove_path(doc.default_path, doc._id, function(err) {
              if(err)
                return cb(err)

            db.paths.remove(doc.default_path, function(err) {
              if(err)
                return cb(err)

              Users.findByIdAndRemove(doc._id, done)
            })
          })
        } else
          Users.findByIdAndRemove(doc._id, done)
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

  // If the path isn't user-related, it should not be buggy
  // but we could count the Users that are watching the path to be removed
  // if == 0, we can safely delete the path.
  //
  // We're only deleting user default path
  // There'll be a method in paths to find unwatched paths
  //
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
