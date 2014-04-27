var models = require('../models')
  , File = models.file
  , async = require('async')
  , helpers = require('./helpers')
  

module.exports = function(type) {
    var debug = require('debug')('ezseed:database:'+type)
	var file_type = helpers.filename(type)

	return {
		delete: function(id, done) {
			debug('Deleting %s', type)
			this.get(id, function(err, item) {
				if(err)
					done(err)


				if(item[file_type].length === 0)
					models[type].remove({_id: item._id}, done)
				else
					async.each(item[file_type], function(file, cb) {
						File.findByIdAndRemove(file._id, cb)
					}, function(err) {
						if(err)
							done(err)

						models[type].remove({_id: item._id}, done)
					})

			})
		},
		get: function(id, done) {
		  models[type].findById(id).populate(file_type).exec(done)
		},
		/**
		 * Saving item
		 * @param  {Array | Object}   items  
		 * @param  {[type]}   options  path to add item to a path
		 * @return {callback}           err, item
		 */
		save: function (items, id_path, done) {

			done = typeof id_path == 'function' ? id_path : done

			var next = function(item, cb) {
				debug('creating %s', type)

				File.create(item[file_type], function(err, items) {
					if(err)
						return cb(err)

					item[file_type] = Array.prototype.slice.call(arguments, 1)
					debug('%s %s created', item[file_type].length, file_type)

					models[type].create(item, function(err, item) {
						if(err)
							return cb(err)

						debug('item created')

						if(id_path) {
							debug('Saving item to path')
							require('./paths')
							.files.add(id_path, item, function(err, path) {
								cb(err, item)
							})
						} else
							return cb(null, item)
						
					})
				})
				
			}
		
			if(items instanceof Array) {
				async.map(items, next,	done)
			} else {
				next(items, done)
			}
		},
		populate: function(docs, done) {
			debug('populating %s', type)
			models[type].populate(docs, {path: type+'.'+file_type, model: 'File'}, done)
		}
	}
}