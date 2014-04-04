
describe('ezseed database', function() {
	
	before(function(cb) {
		//mongodb connection
		require('../')({database: 'ezseed2-test'}, cb)
	})

	require('./user.js')

	require('./path.js')
})