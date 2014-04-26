var db = require('../').db
  , expect = require('chai').expect

var user = {
	username: 'test-user' + Math.round(Math.random() * 100),
	password: 'crazy-password',
	role: 'admin'
}
, user_path = '/home/'+user.username
, test_path = '/my/test/path'

describe('path', function() {

	before(function(cb) {
		db.user.create(user, function(err, created_user) {
			user = created_user

			cb()
		})
	})

	it('should save user default path', function(cb) {
		db.paths.save(
			user_path, 
			{
				username: user.username,
				default: true
			}, 
			function(err, p) {
				expect(err).to.be.null
				expect(p).to.have.property('path', user_path)
				
				user_path = p

				cb()
			}
		)
	})

	it('should be the user\'s default path', function(cb) {
		db.user.get(user._id, function(err, updated_user) {

			expect(updated_user).to.have.property('default_path')
			expect(updated_user.default_path.toString()).to.eql(user_path._id.toString())
			expect(updated_user.paths).to.have.length.of(1)
			user = updated_user

			cb()
		})
	})

	it('should find it', function(cb) {
		db.paths.get(user.default_path, function(err, path) {
			expect(err).to.be.null
			expect(path).to.have.property('path')
			expect(path.path).to.equal(user_path.path)
			cb()
		})
	})

	it('should get path by path', function(cb) {
		db.paths.get(user_path.path, function(err, path) {
			expect(err).to.be.null
			expect(path).to.have.property('path')
			expect(path.path).to.equal(user_path.path)
			cb()	
		})
	})

	it('should be watched', function(cb) {
		db.paths.is_watched(user.default_path, function(err, is_watched) {
			expect(err).to.be.null
			expect(is_watched).to.be.true
		
			cb()
		})
	})

	it('should fail creating it twice', function(cb) {
		db.paths.save(user_path.path, function(err) {
			expect(err).not.to.be.null
			cb()
		})
	})

	it('should save it without a related user', function(cb) {
		db.paths.save(test_path, function(err,p) {
			expect(err).to.be.null
			expect(p).to.have.property('path', test_path)

			test_path = p

			cb()
		})
	})

	it('should not be watched', function(cb) {
		db.paths.is_watched(
			test_path._id,
			{_id: user._id},
			function(err, is_watched) {
				expect(err).to.be.null
				expect(is_watched).to.be.false
			
				cb()
			})
	})

	it('should add path to the user', function(cb) {
		db.paths.save(test_path._id, {_id: user._id}, function(err,p) {
			expect(err).to.be.null

			expect(p).to.have.property('path', test_path.path)

			test_path = p

			cb()
		})
	})

	it('should be watched by user [ObjectId]', function(cb) {
		db.paths.is_watched(
			user.default_path,
			{_id: user._id},
			function(err, is_watched) {
				expect(err).to.be.null
				expect(is_watched).to.be.true
			
				cb()
			})
	})

	it('should be watched [Array]', function(cb) {
		db.paths.is_watched(
			[user.default_path, test_path._id], 
			function(err, is_watched) {
				expect(err).to.be.null
				expect(is_watched).to.be.instanceof(Array);

				var l = is_watched.length
				
				while(l--)
					expect(is_watched[l]).to.be.true
				
				cb()
			})
	})

	it('should get at least 2 paths', function(cb) {
		db.paths.get(function(err, docs) {
			expect(docs).to.have.length.of.at.least(2)
			cb()
		})
	})

	it('should get 2 paths by user', function(cb) {
		db.user.paths(user._id, function(err, docs) {
			expect(err).to.be.null
			expect(docs.paths).to.have.length.of(2)
			cb()

		})
	})

	it('should remove user', function(cb) {
		db.user.delete(user.username, function(err) {
			expect(err).to.be.null
			cb()
		})
	})

	it('should remove path', function(cb) {
		db.paths.remove(test_path._id, function(err) {
			expect(err).to.be.null
			cb()
		})
	})

	it('should not exist', function(cb) {
		db.paths.exists(test_path._id, function(exists) {
			expect(exists).to.be.false
			cb()
		})
	})
})