
describe("A suite for nodejs", function() {
	it('test require()', function(){

		var conf = require('../conf/casino.conf.js');
		expect(conf.server.port).toBe(7000);
		
	});
});

