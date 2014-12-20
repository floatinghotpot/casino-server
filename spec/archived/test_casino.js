
var Casino = require('../lib/game_server'),
	Gamer = require('../lib/gamer'),
	GameJinhua = require('../lib/jinhua_game');

var conf = require('../conf/casino.conf.js');

describe("A suite for data model", function() {
	var casino = Casino();

	beforeEach(function() {
		casino.shutdown();
		casino.startup( conf );
	});

	afterEach(function() {
	});
	
	it('test casino', function(){
	});
});
