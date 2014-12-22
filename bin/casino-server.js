#!/usr/bin/env node

var Server = require('../lib/login_server'),
	Casino = require('../lib/game_server'),
	conf = require('../conf/casino.conf.js');

var argv = require('minimist')(process.argv.slice(2));

if(argv.p) conf.server.port = argv.p;
if(argv.a) conf.server.host = argv.a;
	
var server = Server().startup( conf );
var casino = Casino().startup( conf );



