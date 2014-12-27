#!/usr/bin/env node

var path = require('path'),
	redis = require('redis'),
	read = require('read'),
	fs = require('fs'),
	conf = require('../conf/casino.conf.js');

var argv = require('minimist')(process.argv.slice(2));

console.log('event-logger started, press enter to quit\n');

if(argv.r) {
	var words = argv.r.split(':');
	if(words[0]) conf.redis.host = words[0];
	if(words[1]) conf.redis.port = parseInt(words[1]);
}

var out = process.stdout;

if(argv.o) {
	out = fs.createWriteStream(argv.o, { flags:'a' });
}
	
var sub = redis.createClient(conf.redis.port, conf.redis.host, {});
sub.on('error', function(err){
	console.error('redis error (sub): ', err.stack);
	out.write(now() + ', redis error: ' + err);
});

sub.on('subscribe', function(channel, count){
	out.write(now() + ', subscribe channel: ' + channel + '\n');
});

function now() {
	var d = new Date();
	return d.getTime() + ', ' + 
		d.getFullYear() + '/' + d.getMonth() + '/' + d.getDate() + ' ' +
		d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + '.' + d.getMilliseconds();
}

sub.on('message', function(channel, message){
	var str = now() + ', ' + message;
	out.write(str + '\n');
});

sub.subscribe('server:log');
sub.subscribe('user:log');

read({ prompt: '' }, function(err, input){
	if(out !== process.stdout) out.end();
	
	process.exit(0);
	
	console.log( 'event-logger stopped.\n' );
});

