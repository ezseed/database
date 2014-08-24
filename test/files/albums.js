var db = require('../../').db
  , expect = require('chai').expect

var user = {
  username: 'test-user' + Math.round(Math.random() * 100),
  password: 'crazy-password',
  role: 'admin'
}

var user_path = '/home/'+user.username

var song = {
  name: 'Buffalo soldier',
  path:  user_path + '/bob/bob.mp3',
  type: 'audio',
  ext: 'mp3',
  size: 1,
  specific: {
    disc: 1, num: 0
  }
}

var album = {
  artist: 'Bob marley',
  album: 'Best Of',
  year: 2000,
  genre: 'Reggae',
  prevDir: user_path + '/bob',
  prevDirRelative: '/bob',
  songs: [song, song]
}

describe('albums', function() {

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

  it('should save album', function(cb) {
    db.albums.save(album, user_path._id, function(err, saved_album) {

      expect(err).to.be.null
      expect(saved_album).to.have.property('_id')
      expect(saved_album.songs).to.have.length.of(2)

      album = saved_album
      cb()
    })
  })

  it('should get album', function(cb) {
    db.albums.get(album._id, function(err, get_album) {
      expect(err).to.be.null
      expect(get_album).to.have.property('artist', 'Bob marley')

      //testing population
      expect(get_album.songs[0].specific)
        .to.have.property('disc', 1)
      expect(get_album.songs[0].specific)
        .to.have.property('num', 0)

      album = get_album
      cb()
    })
  })

  it('path should populate albums', function(cb) {
    db.paths.get(user_path._id, function(err, path) {
      expect(err).to.be.null

      var alb = path.albums[0]

      expect(alb).not.to.be.undefined
      expect(alb.songs[0].specific).to.have.property('disc', 1)

      cb()
    })
  })

  it('should not add a song to album', function(cb) {
    db.albums.songs.add(album._id, song, function(err) {
      expect(err).to.be.null

      db.albums.get(album._id, function (err, saved_album) {

        expect(err).to.be.null
        expect(saved_album.songs).to.have.length.of(2)
        album = saved_album
      })

      cb()
    })
  })

  it('should add a song to album', function(cb) {
    song.name = 'Bob2'
    song.specific.num = 1
    song.path = user_path.path+'/bob/bob2.mp3'

    db.albums.songs.add(album._id, song, function(err) {
      expect(err).to.be.null

      db.albums.get(album._id, function (err, saved_album) {

        expect(err).to.be.null
        expect(saved_album.songs).to.have.length.of(3)

        album = saved_album
        cb()

      })

    })
  })

  it('should add albums to items to remove', function(cb) {
    db.remove.set('albums')(album, function(err, to_remove) {
      expect(err).to.be.null
      expect(to_remove).to.have.length.of(album.songs.length)

      db.remove.store(user_path._id, to_remove, function(err, docs) {
        expect(err).to.be.null
        cb()
      })
    })
  })

  it('should find album to be removed', function(cb){
    db.remove.get(user_path._id, function(err, to_remove) {
      expect(err).to.be.null
      expect(to_remove instanceof Array).to.be.true
      expect(to_remove).to.have.length.of(3)
      expect(to_remove[0]).to.have.property('type', 'albums')
      cb()
    })
  })

  it('should clear items to remove ', function(cb) {
    db.remove.clear(user_path._id, function(err) {
      expect(err).to.be.null
      cb()
    })
  })

  it('should delete a song from album', function(cb) {

    db.albums.songs.delete(album._id, album.songs[0]._id, function(err) {
      expect(err).to.be.null

      db.albums.get(album._id, function (err, saved_album) {
        expect(err).to.be.null
        expect(saved_album.songs).to.have.length.of(2)
        cb()

      })

    })
  })

  it('should delete album', function(cb) {
    db.albums.delete(album._id, function(err) {
      expect(err).to.be.null

      db.albums.get(album._id, function(err, alb) {
        expect(err).to.be.null
        expect(alb).to.be.null

        db.files.get(album.songs[0]._id, function(err, song) {
          expect(err).to.be.null
          expect(song).to.be.null
          cb()
        })
      })

    })
  })

  it('should delete album with no videos left', function(cb) {
    var alb = {
      artist: 'Bob marley',
      album: 'Best Of',
      year: 2000,
      genre: 'Reggae',
      prevDir: user_path + '/bob',
      prevDirRelative: '/bob',
      songs: [song]
    }

    db.albums.save(alb, user_path._id, function(err, saved_album) {

      expect(err).to.be.null
      expect(saved_album).to.have.property('_id')
      expect(saved_album.songs).to.have.length.of(1)

      db.albums.songs.delete(saved_album._id, saved_album.songs[0], function(err) {

        expect(err).to.be.null

        db.albums.get(album._id, function(err, album) {
          expect(err).to.be.null
          expect(album).to.be.null
          cb()
        })

      })
    })
  })


  after(function(cb) {
    db.user.delete(user.username, function(err) {
      //@TODO check err
      db.paths.remove(user_path._id, function(err) {
        //@TODO check err
        cb()
      })

    })
  })
})
