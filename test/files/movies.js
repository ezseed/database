var db = require('../../').db
  , expect = require('chai').expect

var user = {
	username: 'test-user' + Math.round(Math.random() * 100),
	password: 'crazy-password',
	role: 'admin'
}
, user_path = '/home/'+user.username

var video = {
	name: 'Game of Thrones', //really wasn't inspired
	path:  user_path + '/got/GoT.mkv',
	ext: 'mkv',
	type: 'video',
	size: 1,
	specific: {	episode: '01'}
}

var movie = {
	name: 'Game of Thrones',
	year: 2000,
	prevDir: user_path + '/GoT',
	prevDirRelative: '/GoT',
	videos: [video, video],
	season: 4,
	title: 'GoT special episode',
	synopsis: 'Some synopsis',
	picture: 'http://i.pcworld.fr/1269417-game-of-thrones.jpg',
	code: 1399
}

describe('movies', function() {

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

	it('should save movie', function(cb) {
		db.movies.save(movie, user_path._id, function(err, saved_movie) {

			expect(err).to.be.null
			expect(saved_movie).to.have.property('_id')
			expect(saved_movie.videos).to.have.length.of(2)

			movie = saved_movie
			cb()
		})
	})

	it('should get movie', function(cb) {
		db.movies.get(movie._id, function(err, get_movie) {
			expect(err).to.be.null
			expect(get_movie).to.have.property('name', 'Game of Thrones')

			//testing population
			expect(get_movie.videos[0].specific)
				.to.have.property('episode', '01')
			expect(get_movie.infos)
				.to.have.property('title', 'GoT special episode')

			movie = get_movie
			cb()
		})
	})

	it('path should populate movies and movies.infos', function(cb) {
		db.paths.get(user_path._id, function(err, path) {
			expect(err).to.be.null

			var mov = path.movies[0]

			expect(mov).not.to.be.undefined
			expect(mov.infos).to.have.property('synopsis', 'Some synopsis')
			expect(mov.videos[0].specific).to.have.property('episode', '01')
			
			cb()
		})
	})

	it('should not add a video to movie', function(cb) {
		db.movies.video.add(movie._id, video, function(err) {
			expect(err).to.be.null
			
			db.movies.get(movie._id, function (err, saved_movie) {

				expect(err).to.be.null
				expect(saved_movie.videos).to.have.length.of(2)
				movie = saved_movie
			})

			cb()
		})
	})

	it('should add a video to movie', function(cb) {
		video.name = 'This one rocks'
		video.specific.episode = 2
		video.path = user_path.path+'/GoT/GoT2.mkv'

		db.movies.video.add(movie._id, video, function(err) {
			expect(err).to.be.null
			
			db.movies.get(movie._id, function (err, saved_movie) {
				
				expect(err).to.be.null
				expect(saved_movie.videos).to.have.length.of(3)

				movie = saved_movie
				cb()

			})

		})
	})

	it('should add movies to items to remove', function(cb) {
		db.remove.set('movies')(movie, function(err, to_remove) {
			expect(err).to.be.null
			expect(to_remove).to.have.length.of(movie.videos.length)

			db.remove.store(user_path._id, to_remove, function(err, docs) {
				expect(err).to.be.null
				cb()
			})
		})
	})

	it('should find movie to be removed', function(cb){
		db.remove.get(user_path._id, function(err, to_remove) {
			expect(err).to.be.null
			expect(to_remove instanceof Array).to.be.true
			expect(to_remove).to.have.length.of(3)
			expect(to_remove[0]).to.have.property('type', 'movies')
			cb()
		})
	})

	it('should clear items to remove ', function(cb) {
		db.remove.clear(user_path._id, function(err) {
			expect(err).to.be.null
			cb()
		})
	})

	it('should delete a video from movie', function(cb) {

		db.movies.video.delete(movie._id, movie.videos[0]._id, function(err) {
			expect(err).to.be.null
			
			db.movies.get(movie._id, function (err, saved_movie) {
				expect(err).to.be.null
				expect(saved_movie.videos).to.have.length.of(2)
				cb()

			})

		})
	})

	it('should change the movie informations', function(cb) {
		db.movies.infos.update(movie._id, {title: 'New title'}, function(err, updated) {
			expect(err).to.be.null
			expect(updated).to.equal(1)
			db.movies.get(movie._id, function(err, saved_movie) {
				expect(err).to.be.null
				expect(saved_movie.infos.title).to.equal('New title')
				cb()
			})
		})
	})

	it('should delete movie', function() {
		db.movies.delete(movie._id, function(err) {
			expect(err).to.be.null

			db.movies.get(movie._id, function(err, movie) {
				expect(err).to.be.null
				expect(movie).to.be.null
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