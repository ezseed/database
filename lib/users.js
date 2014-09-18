var models = require('../models')
  , Users = models.users

module.exports = {
  get : function(done) {
    Users.find().sort({username: 'asc'}).lean().populate('paths').exec(done)
  },
  count : function(done) {
    Users.count(done)
  }
}
