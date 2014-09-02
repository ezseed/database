var mongoose = require('mongoose')
  , Schema =  mongoose.Schema

var moviesInformations = new Schema({
  title: String,
  synopsis: String,
  trailer: String,
  picture: String,
  backdrop: String,
  season: String,
  seasonInfos: {type: Object},
  code: String //used to store api 
});

//should take a look at the configuration to get a scrapper model instead ?
module.exports = mongoose.model('MoviesInformations', moviesInformations);
