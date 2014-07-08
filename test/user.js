var db = require('../').db
  , expect = require('chai').expect

var user = {
  username: 'test-user' + Math.round(Math.random() * 100),
  password: 'crazy-password',
  role: 'admin',
  client: 'transmission'
}, wrong_username = {
  username: '',
  password: 'crazy-password'
}

describe('user', function() {
  it('should fail creation because of a bad username', function(cb) {
    db.user.create(wrong_username, function(err) {
      expect(err).not.to.be.null
      expect(err.name).to.be.undefined

      expect(err).to.equal("username is not valid")

      cb()
    })
  })

  it('should fail deleting non-existant user', function(cb) {
    db.user.delete('none', function(err) {
      expect(err).not.to.be.null
      expect(err.message).to.equal('user none does not exists')
      cb()
    })
  })

  it('should fail login', function(cb) {
    db.user.login({username: user.username, password: 'crazy-password'}, function(err, user) {
      expect(err).not.to.be.null
      cb()
    })
  })

  it('should be created', function(cb) {
    db.user.create(user, function(err, created_user) {
      expect(err).to.be.null
      expect(created_user).to.have.property('hash')
      expect(created_user).to.have.property('role', 'admin')
      expect(created_user).to.have.property('client', 'transmission')
      expect(created_user).to.have.property('username', user.username)

      user = created_user

      cb()
    })
  })

  it('should fail login because of no password', function(cb) {
    db.user.login({username: user.username}, function(err, user) {
      expect(err).not.to.be.null
      expect(err).to.equal('Missing password or username')
      cb()
    })
  })

  it('should exists', function(cb) {
    db.user.exists(user.username, function(exists) {
      expect(exists).to.be.true
      cb()
    })
  })

  it('should count 1 user', function(cb) {
    db.users.count(function(err, num) {
      expect(num).to.be.at.least(1)
      cb()
    })
  })

  it('should login', function(cb) {
    db.user.login({username: user.username, password: 'crazy-password'}, function(err, user) {
      expect(err).to.be.null
      expect(user).to.be.an('object')
      cb()
    })
  })

  it('should get users', function(cb) {
    db.users.get(function(err, users) {
      expect(err).to.be.null
      expect(users).to.have.length.of.at.least(1)
      cb()
    })
  })

  it('should find it by id', function(cb) {

    db.user.get(user._id, function(err, user) {
      expect(err).to.be.null
      expect(user).to.be.equal(user)
      cb()
    })

  })

  it('should find it by username', function(cb) {

    db.user.get(user.username, function(err, user) {
      expect(err).to.be.null
      expect(user).to.be.equal(user)
      cb()
    })

  })

  it('should update user by username', function(cb) {

    db.user.update(user.username,
    {client: 'transmission', role: 'user'}
    , function(err) {
      expect(err).to.be.null

      db.user.get(user.username, function(err, user) {
        expect(err).to.be.null

        expect(user).to.have.property('client', 'transmission')
        expect(user).to.have.property('role', 'user')
        cb()
      })

    })
  })

  it('should update user by id', function(cb) {
    db.user.update(user._id,
      {client: 'rutorrent', role: 'admin'},
      function(err) {
        expect(err).to.be.null
        db.user.get(user.username, function(err, user) {
          expect(err).to.be.null

          expect(user).to.have.property('client', 'rutorrent')
          expect(user).to.have.property('role', 'admin')
          cb()
        })
      })
  })

  it('should delete user', function(cb) {
    db.user.delete(user.username, function(err) {
      expect(err).to.be.null

      cb()
    })
  })

  it('should not exists', function(cb) {
    db.user.exists(user.username, function(exists) {
      expect(exists).to.be.false
      cb()
    })
  })
})
