
describe("A suite for nodejs", function() {
	it('test require()', function(){
		//console.log( __filename );

		var conf = require('../conf/casino.conf.js');
		
		//console.log( conf );
		expect(conf.server.port).toBe(7000);
		
		//console.log( require.cache );
	});
});

