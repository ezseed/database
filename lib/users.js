var models = require('../models')
  , Users = models.users

var users = {
  get : function(done) {
    Users.find().lean().populate('paths').exec(function(err, docs) {
      done(err, docs);
    });
  },
  count : function(done) {
    Users.count(done);
  }
}

module.exports = users;