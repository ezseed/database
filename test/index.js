
describe('ezseed database', function() {
	
	before(function(cb) {
		//mongodb connection
		require('../')({database: 'ezseed-test'}, cb)
	})

	require('./user.js')
	require('./path.js')
	require('./files.js')

})