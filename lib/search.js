var debug = require('debug')('ezseed:database:search')
  , _ = require('underscore')

module.exports = function(search_string) {
    var keys = {
      movies: ['name', 'format', 'subtitles', 'audio', 'quality'],
      albums: ['artist', 'album'],
      others: ['name']
    }

    var search = {}, first

    search_string = search_string.replace(' ', ' ?')

    for(var i in keys) {
      search[i] = {}

      first = true

      if(i == 'movies') {
        var re = new RegExp('S([0-9]{1,3})', 'i')
        var ar = search_string.match(re)
       
        if(ar && ar.length) {
          search_string = search_string.replace(re, '')
          search.movies.season = {$regex: ar[1].replace('0', '0?')}
        }
      }

      if(i !== 'albums') {
        for(var key in keys[i]) {

          var s = '';

          //first param is the only one where the search is not facultative
          if(first === true) {
            s = search_string
          } else {
            s = '('+search_string+')?'
          }

          search[i][keys[i][key]] = {$regex: s, $options: 'im'}
          first = false
        }
      } else {
        search[i] = {$text: {$search: search_string}}
      }

    }

    debug('Search', search)

    return search
}
