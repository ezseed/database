
describe('ezseed database', function() {

  before(function(cb) {
    var mongoose = require('mongoose')
    mongoose.connect('mongodb://localhost/ezseed-test', function() {
      mongoose.connection.db.dropDatabase()
      mongoose.connection.close()
      
      require('../')({database: 'ezseed-test'}, cb)

    })
  })

//  require('./user.js')
  require('./path.js')
//  require('./files.js')

})
