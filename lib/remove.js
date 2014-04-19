var models = require('../models')
  , Remove = models.remove
  , isObjectId = require('./helpers').isObjectId
  , debug = require('debug')('ezseed:database:remove')

var remove = {
	set: function(type) {
		var self = this
		
		debug('set %s to remove', type)

		return function(item, done) {

			var next = function(item, cb) {
				var arr = item[require('./helpers').filename(type)], 
				to_remove = [], l = arr.length

				while(l--) {
					to_remove.push({
						type: type,
						item: item._id,
						file: arr[l]._id
					})
				}

				return cb(null, to_remove)
			}

			if(isObjectId(item)) {
				debug('id - getting %s', item)
				require('./files/'+type).get(item, function(err, item) {	
					if(err)
						throw new Error(err)

					next(item, done)
				})
			} else {
				next(item, done)
			}
		}

	
	},
	store: function (id_path, to_remove, done) {
		
		Remove.findByIdAndUpdate(
			id_path, {
				path: id_path,
				$addToSet: { 'to_remove': { $each: to_remove } }
			}, 
			{ upsert:true }, 
			function (err, docs) {
				if(err)
					throw new Error(err)

				done(err, docs)
			}
		)
	},
	clear:function(id_path, done) {
		Remove.findByIdAndRemove(id_path, done)
	},
	get: function(id_path, done) {

		Remove.findByIdAndUpdate(id_path, {to_remove: []},{'new': false}, function(err, docs) {
			
			if(err)
				throw new Error(err)

			if(docs)
				done(err, docs.to_remove)
			else
				done(err, [])
		})

	}
}

module.exports = remove;