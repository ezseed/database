var mongoose = require('mongoose')
  , debug = require('debug')('ezseed:database')


var default_options = {
	database: 'ezseed'
}

module.exports = function(options, done) {

	if(typeof options == 'function') {
		done = options
		options = default_options
	} else if(options.database === undefined) {
		options = default_options
	}

	mongoose.connect('mongodb://localhost/' + options.database, options)

	var mongo = mongoose.connection

	mongo.on('error', function() {
		throw new Error('Connection to mongodb failed')
	})

	mongo.once('open', function() {
		debug('DB opened successfuly !')
		done()
	})
}

module.exports.db = require('./lib')
module.exports.models = require('./models')