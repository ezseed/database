var db = require('../../').db
  , expect = require('chai').expect

var user = {
	username: 'test-user' + Math.round(Math.random() * 100),
	password: 'crazy-password',
	role: 'admin'
}

var user_path = '/home/'+user.username

var file = {
	name: 'Peach',
	path:  user_path + '/tro/peach.pdf',
	type: 'image',
	ext: 'pdf',
	size: 1,
}

var other = {
	name: 'Tropicana',
	prevDir: user_path + '/tro',
	prevDirRelative: '/tro',
	files: [file, file]
}

describe('others', function() {

	before(function(cb) {
		db.user.create(user, function(err, created_user) {
			user = created_user

			db.paths.save(
				user_path, 
				{
					_id: user._id,
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
	})

	it('should save other', function(cb) {
		db.others.save(other, user_path._id, function(err, saved_other) {

			expect(err).to.be.null
			expect(saved_other).to.have.property('_id')
			expect(saved_other.files).to.have.length.of(2)

			other = saved_other
			cb()
		})
	})

	it('should get other', function(cb) {
		db.others.get(other._id, function(err, get_other) {
			expect(err).to.be.null
			expect(get_other).to.have.property('name', 'Tropicana')

			//testing population
			expect(get_other.files[0])
				.to.have.property('name', 'Peach')

			other = get_other
			cb()
		})
	})

	it('path should populate others', function(cb) {
		db.paths.get(user_path._id, function(err, path) {
			expect(err).to.be.null

			var othr = path.others[0]

			expect(othr).not.to.be.undefined
			expect(othr.files[0]).to.have.property('name', 'Peach')
			
			cb()
		})
	})

	it('should not add a file to other', function(cb) {
		db.others.file.add(other._id, file, function(err) {
			expect(err).to.be.null
			
			db.others.get(other._id, function (err, saved_other) {

				expect(err).to.be.null
				expect(saved_other.files).to.have.length.of(2)
				other = saved_other
			})

			cb()
		})
	})

	it('should add a file to other', function(cb) {
		file.name = 'Peach2'
		file.path = user_path.path+'/tro/peach2.pdf'

		db.others.file.add(other._id, file, function(err) {
			expect(err).to.be.null
			
			db.others.get(other._id, function (err, saved_other) {
				
				expect(err).to.be.null
				expect(saved_other.files).to.have.length.of(3)

				other = saved_other
				cb()

			})

		})
	})

	it('should add others to items to remove', function(cb) {
		db.remove.set('others')(other, function(err, to_remove) {
			expect(err).to.be.null
			expect(to_remove).to.have.length.of(other.files.length)

			db.remove.store(user_path._id, to_remove, function(err, docs) {
				expect(err).to.be.null
				cb()
			})
		})
	})

	it('should find other to be removed', function(cb){
		db.remove.get(user_path._id, function(err, to_remove) {
			expect(err).to.be.null
			expect(to_remove instanceof Array).to.be.true
			expect(to_remove).to.have.length.of(3)
			expect(to_remove[0]).to.have.property('type', 'others')
			cb()
		})
	})

	it('should clear items to remove ', function(cb) {
		db.remove.clear(user_path._id, function(err) {
			expect(err).to.be.null
			cb()
		})
	})

	it('should delete a file from other', function(cb) {

		db.others.file.delete(other._id, other.files[0]._id, function(err) {
			expect(err).to.be.null
			
			db.others.get(other._id, function (err, saved_other) {
				expect(err).to.be.null
				expect(saved_other.files).to.have.length.of(2)

				other = saved_other
				cb()

			})

		})
	})

	it('should get a file from Files model through id', function(cb) {
		db.files.get(other.files[0]._id, function(err, file) {
			expect(err).to.be.null
			expect(file).to.have.property('name', 'Peach')
			cb()
		})
	})

	it('should delete other', function() {
		db.others.delete(other._id, function(err) {
			expect(err).to.be.null

			db.others.get(other._id, function(err, other) {
				expect(err).to.be.null
				expect(other).to.be.null
			})

		})
	})

	after(function(cb) {
		db.user.delete(user.username, function(err) {
			expect(err).to.be.null

			db.paths.remove(user_path._id, function(err) {
				expect(err).to.be.null
				cb()
			})

		})
	})
})