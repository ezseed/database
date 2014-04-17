var models = require('../models')
  , Users = models.users

var users = {
  get : function(cb) {
    Users.find().lean().populate('paths').exec(function(err, docs) {
      cb(err, docs);
    });
  },
  count : function(cb) {
    Users.count(cb);
  }
}

module.exports = users;