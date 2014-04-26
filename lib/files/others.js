var models = require('../../models')
  , Others = models.others
  , File = models.file
  , async = require('async')
  , debug = require('debug')('ezseed:database:others')

module.exports = {
	delete: function(id, done) {
		debug('Deleting other')
		this.get(id, function(err, other) {
			if(err)
				done(err)

			async.each(other.files, function(file, cb) {
				File.findByIdAndRemove(file._id, cb)
			}, function(err) {
				if(err)
					done(err)

				Others.remove({_id: other._id}, done)
			})

		})
	},
	file: {
		add: function(id, file, done) {

			var next = function(file, cb) {
				Others
				.update({_id: id},
					{$addToSet: { files: file }, dateAdded: Date.now()})
				.exec(cb)
			}

			File.findOne({path: file.path}, function(err, doc) {
				if(err)
					done(err)

				if(!doc)
					File.create(file, function(err, file) {
						next(file, done)
					})
				else {
					debug('Find one file')
					next(doc, done)
				}
			})
		},
		delete: function(id, id_file, done) {

			Others.update({_id: id}, 
				{  
					$pull: { files: id_file }
				},
				function(err, updated) {
					debug('Deleting %s file', updated)

					if(err)
						done(err)

					File.findByIdAndRemove(id_file, done)
				})
		}
	},
	get: function(id, done) {
	  Others.findById(id).populate('files').exec(done)
	},
	/**
	 * Saving other
	 * @param  {Array | Object}   others  
	 * @param  {[type]}   options  path to add other to a path
	 * @param  {Function} done    [description]
	 * @return {[type]}           [description]
	 */
	save: function (others, id_path, done) {

		done = typeof id_path == 'function' ? id_path : done

		var next = function(others, cb) {
			debug('creating others')

			File.create(others.files, function(err, files) {
				if(err)
					return cb(err)

				others.files = Array.prototype.slice.call(arguments, 1)
				debug('%s files created', others.files.length)

				Others.create(others, function(err, others) {
					if(err)
						return cb(err)

					debug('others created')

					if(id_path) {
						debug('Saving others to path')
						require('../paths')
						.files.add(id_path, others, function(err, path) {
							cb(err, others)
						})
					} else
						return cb(null, others)
					
				})
			})
			
		}
	
		if(others instanceof Array) {
			async.map(others, next,	done)
		} else {
			next(others, done)
		}
	},
	populate: function(docs, done) {
		debug('populating')
		Others.populate(docs, {path: 'others.files', model: 'File'}, done)		
	}
}