
var Server = require('../../lib/login_server'),
	Casino = require('../../lib/game_server'),
	conf = require('../../conf/casino.conf');

describe("A suite for e2e test", function() {
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
		//if(server) server.shutdown();
		//if(casino) casino.shutdown();
		
	});
	
	it('test service', function(){
		//console.log('test');
	});
});
