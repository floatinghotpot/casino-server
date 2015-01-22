
var Server = require('../lib/login_server'),
	Casino = require('../lib/game_server'),
	conf = require('../conf/casino.conf');

describe("A suite for data model", function() {
	var server = null, casino = null;
	
	beforeEach(function() {
		server = Server(), casino = Casino();

		// stop if running
		server.shutdown();
		casino.shutdown();
		
		casino.startup( conf );
		server.startup( conf );
	});

	afterEach(function() {
		server.shutdown();
		casino.shutdown();
		
	});
	
	it('test service', function(){
		//console.log('test');
	});
});
