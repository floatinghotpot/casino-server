
var Server = require('../lib/server'),
	server_conf = require('../conf/server_conf.js'),
	casino_conf = require('../conf/casino_conf.js');

describe("A suite for data model", function() {
	beforeEach(function() {
		var server = Server();
		
		if(server.is_started) server.stopServer().closeCasino();

		server.setupCasino( casino_conf ).startServer( server_conf );
	});

	afterEach(function() {
		
	});
	
	it('test service', function(){
		
	});
});
