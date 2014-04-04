var models = require('../models')
  , Paths = models.paths
  , Users = models.users
  , async = require('async')
  , bcrypt = require('bcrypt-nodejs')
  , isObjectId = require('./helpers').isObjectId

//to be changed
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
  //strict = only default path / user
  //TODO user (name/id) options cb
  paths: function(uid, cb, strict) {
    Users.findById(uid).populate('paths').lean(true).exec(function (err, docs) {
      if (err)
        cb(err, {})
      else {

        if(docs) {

          var paths = [], p = docs.paths

          for(var i in p)
            if(p[i].path !== undefined && p[i].path !== 'paths')
                          //that should be changed
              if(strict === true && p[i].path.indexOf(docs.username) !== -1)
                paths.push(p[i].path)
              else if(strict !== true)
                paths.push(p[i].path)
          
          cb(err, {paths : paths, docs : docs})

        } else
          cb(err, {paths: [], docs : null})
        
      }
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
          self.remove_path(doc.default_path, doc._id, function() {
            db.paths.remove(doc.default_path, function(err) {
              if(err)
                console.warn(err.message) //add logger

              Users.findByIdAndRemove(doc._id, done)
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
          throw new Error(err)

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
    byUsername: function(username, done) {
      Users.findOne({username: username}, done)
    },
    byId: function(uid, done) {
      Users.findById(uid, done)
    },

    //todo remove this update update is there for that
    setClient: function(username, client, done) {
      Users.findOneAndUpdate({username: username}, {client: client}, done)
    },
    setSpaceLeft: function(id, left, done) {
      Users.findByIdAndUpdate(id, {spaceLeft: left}, done)
    },

    //Reset user database is a mess
    reset: function(uid, done) {

      var cleanPath = function(err, results) {
        if(err)
          throw new Error(err)

        db.paths.byUser(uid, function(err, map) {
          async.each(
            map.docs.paths, 
            function(path,callback){
              //Deleting each file id, previously saved inside the path object
              Paths.findByIdAndUpdate(path._id, {others: [], movies: [], albums: []}, function(err) {
                callback(err)
              })
            }, 
            function(err){
              done(err)
            }
          )

        })
      }

      db.files.byUser(uid, 0, {}, function(err, docs) {
        
        async.each(docs.paths, function(path, next) {

          async.parallel({
              albums: function(callback){
                async.each(path.albums, 
                  function(album, cb) {
                    db.files.albums.delete(album._id, cb)
                  }, 
                  function(err){
                    callback(err)
                  }
                )
              },
              movies: function(callback){
                async.each(path.movies, 
                  function(movie, cb) {
                    db.files.movies.delete(movie._id, cb)
                  }, 
                  function(err){
                    callback(err)
                  }
                )
              },
              others: function(callback) {
                async.each(path.others, 
                  function(other, cb) {
                    db.files.others.delete(other._id, cb)
                  }, 
                  function(err){
                    callback(err)
                  }
                )
              }
          },
          
          cleanPath)

        })

      })
  }
}

module.exports = user