#!/usr/bin/env node

var Server = require('../lib/login_server'),
	Casino = require('../lib/casino'),
	conf = require('../conf/casino.conf.js');

var server = Server().startup( conf );
var casino = Casino().startup( conf );



