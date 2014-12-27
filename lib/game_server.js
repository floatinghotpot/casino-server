var path = require('path'),
	redis = require('redis');

var universe = global || window;

exports = module.exports = Casino;
	
function Casino(){
	if(!(this instanceof Casino)) {
		var singleton = universe.casino_game_server;
		return singleton ? singleton : new Casino();
	}
	
	if(universe.casino_game_server) {
		throw 'casino server is a singleton, should not be created twice';
	}
	
	universe.casino_game_server = this;
	
	this.id = 0;
	this.timer = 0;
	
	this.gametypes = {};
	this.gametypes_count = 0;
	
	this.rooms = {};
	this.rooms_count = 0;
	
	this.is_running = false;
}

Casino.prototype.startInstance = function( instance_id ) {
	this.id = instance_id;
	
	var casino = this;
	var conf = this.conf;

	var now = Date.now();
	var key = 'casino:#' + this.id;
	var db = this.db;
	db.multi()
		.hmset(key, {
			id: this.id,
			started: now,
			rooms: 0
		})
		.expire(key, 5)
		.zadd('casino:all', now, this.id)
		.exec();
	
	var gameconfs = conf.games;
	for(var gameid in gameconfs) {
		var gameconf = gameconfs[ gameid ];
		this.addGameType(gameid, gameconf).addRoom(gameid, gameconf.min);
	}
	
	this.timer = setInterval(function(){
		casino.tick();
	}, 3000);
	
	var sub = this.sub;
	sub.on('subscribe', function(channel, count){
		//console.log('subscribed to channel: ' + channel);
	});
	sub.on('message', function(channel, message){
		//console.log(channel, message, typeof message);
		
		var words = channel.split('#');
		switch(words[0]) {
		case 'room:':
			var roomid = words[1];
			if(! roomid) return;
			var room = casino.rooms[ roomid ];
			if(! room) return;
			room.onMessage(message);
			break;
		case 'casino:':
			casino.onMessage(message);
			break;
		}
	});
	
	sub.subscribe('casino:#'+this.id);

	this.is_running = true;
	this.pub.publish('server:log', 'casino #' + this.id + ' started');
};

Casino.prototype.startup = function( conf ) {
	if(this.is_running) return;
	
	this.conf = conf;
	var casino = this;
	
	var db = this.db = redis.createClient(conf.redis.port, conf.redis.host, {});
	this.db.on('error', function(err){
		console.log('redis error (db):' + err.stack);
	});

	var pub = casino.pub = redis.createClient(conf.redis.port, conf.redis.host, {});
	pub.on('error', function(err){
		console.log('redis error (pub): ' + err.stack);
	});

	var sub = casino.sub = redis.createClient(conf.redis.port, conf.redis.host, {});
	sub.on('error', function(err){
		console.log('redis error (sub): ' + err.stack);
		
	});
	
	db.incr('casino:seq', function(err,instance_id){
		if(err) return;
		casino.startInstance(instance_id);
	});
	
	return this;
};

Casino.prototype.shutdown = function() {
	if(! this.is_running) return;
	
	if(this.timer) {
		clearInterval(this.timer);
		this.timer = 0;
	}
	
	var db = this.db;
	var m = this.db.multi();
	
	var rooms = this.rooms;
	for(var i in rooms) {
		var room = rooms[i];
		var roomid = room.id;
		m.del('room:#' + roomid )
		 .zrem('game:#'+room.type+'#rooms', roomid)
		 .zrem('room:all', roomid);
		
		rooms[i].close();
	}
	this.rooms = {};
	this.rooms_count = 0;
	
	m.del('casino:#' + this.id)
	.zrem('casino:all', this.id)
	.exec(function(err,ret){
		//console.log(err,ret);
		db.quit();
	});
	
	this.gametypes = {};
	this.gametypes_count = 0;
	
	this.pub.publish('server:log', 'casino #' + this.id + ' stopped');
	
	this.sub.unsubscribe();
	this.sub.end();
	this.pub.end();
	
	this.sub = null;
	this.pub = null;
	this.db = null;
	
	this.is_running = false;
	
	return this;
};

Casino.prototype.addGameType = function( typeid, conf ) {

	if(typeid in this.gametypes) {
		console.log('game id ' + typeid + ' conflict with existing game');
		return this;
	}
	
	if(typeof conf !== 'object') {
		console.log( 'game conf missing' );
		return this;
	}
	if(! conf.name) conf.name = typeid;
	if(! conf.desc) conf.desc = '';
	
	var Game = require( './' + conf.game );
	if((! Game) || (typeof Game !== 'function')) {
		console.log( 'invalid game class' );
		return this;
	}
	if(! conf.options) conf.options = {};
	if(! conf.max) conf.max = 1000;

	var gametype = {
		id: typeid,
		name: conf.name,
		desc: conf.desc,
		game: Game,
		options: conf.options,
		max: conf.max,
		rooms: {},
		rooms_count: 0
	};
	this.gametypes[ typeid ] = gametype;
	this.gametypes_count ++;
	
	var now = Date.now();
	this.db.multi()
		.zadd('game:all', now, typeid)
		.hmset('game:#'+typeid, {
			id: typeid,
			name: conf.name,
			desc: conf.desc
		}).exec(function(err,ret){
			//console.log(err, ret);
		});
	
	return this;
};

Casino.prototype.addRoom = function(typeid, n) {
	var gametype = this.gametypes[ typeid ];
	if(! gametype) {
		console.log('game id ' + typeid + ' not exist');
		return;
	}
	
	var Game = gametype.game;
	var options = gametype.options;
	
	var casino = this;
	var db = this.db, sub = this.sub;
	var now = Date.now();
	
	var func = function(err,roomid){
		if(err) return;
		var room = new Game( casino, typeid, roomid, options );
		room.setName(gametype.name);
		
		gametype.rooms[ roomid ] = room;
		gametype.rooms_count ++;
		
		casino.rooms[ roomid ] = room;
		casino.rooms_count ++;
		
		var room_key = 'room:#' + roomid;
		db.multi()
			.zadd('game:#' + typeid + '#rooms', now, roomid)
			.zadd('room:all', now, roomid)
			.hmset(room_key, room.brief())
			.expire(room_key, 5)
			.exec(function(err,ret){
				//console.log(err, ret);
			});
		
		sub.subscribe(room_key);
	};
	
	for(var i=0; i<n; i++) {
		db.incr('room:seq', func);
	}
	
	return this;
};

Casino.prototype.tick = function(){
	var rooms = this.rooms, gametypes = this.gametypes;
	var db = this.db;
	var now = Date.now(), timeout = now - 5000;
	
	// update the expire time
	var m = db.multi();
	for(var roomid in rooms) {
		var room = rooms[ roomid ];
		
		var room_key = 'room:#' + roomid;
		
		m.expire(room_key, 5)
		 .zadd('room:all', now, roomid)
		 .zadd('game:#' + room.type + '#rooms', now, roomid)
		 .hset(room_key, 'gamers_count', room.gamers_count)
		 .hset(room_key, 'seats_taken', room.seats_taken);
		
		if(room.gamers_count < room.seats_count) {
			m.zadd('game:#' + room.type + '#rooms_notfull', now, roomid);
		}
	}
	for(var typeid in gametypes) {
		m.zremrangebyscore('game:#'+typeid+'#rooms', 0, timeout)
		.zremrangebyscore('game:#'+typeid+'#rooms_notfull', 0, timeout);
	}
	m.expire('casino:#' + this.id, 5)
	 .zadd('casino:all', now, this.id)
	 .zremrangebyscore('casino:all', 0, timeout)
	 .zremrangebyscore('room:all', 0, timeout)
	 .exec(function(err,ret){
		//console.log(err, ret);
	});
};

Casino.prototype.onMessage = function( message ) {
	console.log('casino onMessage:', message);
};



