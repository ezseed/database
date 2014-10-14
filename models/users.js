var mongoose = require('mongoose')
  , Schema =  mongoose.Schema
  , ObjectId = Schema.ObjectId

/* Basic user schema */
var UsersSchema = new Schema({
  username: { 'type': String, 'match': /^[a-zA-Z0-9-_]{3,15}$/, 'required': true, 'unique':true },
  hash: { type: String },
  role: { type: String, 'default': 'user' },
  client: { type: String, 'default': 'aucun'},
  default_path: {type: ObjectId, ref: 'Paths'},
  //size in bytes = 1Gb
  spaceLeft: {type: Number, 'default': 1000000000},
  paths: [{type: ObjectId, ref:'Paths'}],
  port: { type: Number, default: 0 }
})

/* Setting a virtual schema for the session */
UsersSchema.virtual('session').get(function() {
  return {
    'id': this._id,
    'username': this.username,
    'role': this.role,
    'paths': this.paths,
    'default_path': this.default_path,
    'spaceLeft': this.spaceLeft,
    'client':this.client,
    'port': this.port
  }
})

module.exports = mongoose.model('Users', UsersSchema)
