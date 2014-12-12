
var Server = require('../lib/server'),
	server_conf = require('../conf/server_conf.js'),
	casino_conf = require('../conf/casino_conf.js');

var service = Server().setupCasino( casino_conf ).startServer( server_conf );


