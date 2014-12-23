var path = require('path'),
	socketio = require('socket.io'), 
	express = require('express'), 
	http = require('http'),
	redis = require('redis'),
	ioredis = require('socket.io-redis');

var validator = require('./validator'),
	Gamer = require('./gamer');

var universe = global || window;

exports = module.exports = LoginServer;

function LoginServer() {
	if(!(this instanceof LoginServer)) {
		var singleton = universe.casino_login_server;
		return singleton ? singleton : new LoginServer();
	}
	
	if(universe.casino_login_server) {
		throw 'player server is a singleton, should not be created twice';
	}
	
	universe.casino_login_server = this;
	
	this.DROP_KICK_TIME = 30; // 30 sec
	this.io = null;
	this.db = null;
	this.timer = 0;
	
	/* Notice: each socket may link to multiple gamer objects
	 * this will support client as agent or robots
	 * socket.gamers = {}, uid -> gamer object
	 */
	this.sockets = {}; // sid -> socket
	this.sockets_count = 0;
	
	this.gamers = {};		// uid -> gamer
	this.gamers_count = 0;

	this.is_running = false;
}

LoginServer.prototype.startInstance = function( instance_id ) {
	this.id = instance_id;
	
	var service = this;
	var conf = this.conf;
	
	var now = new Date().getTime();
	
	var db = this.db;
	var key = 'server:#' + instance_id;
	db.multi()
		.hmset(key, {
			id: this.id,
			started: now,
			gamers: 0
		})
		.expire(key, 5)
		.zadd('server:all', now, this.id)
		.exec();
	
	db.get('user:seq', function(err,ret){
		if(err) return;
		if(ret && ret>1000) {
			// ok
		} else {
			db.set('user:seq', 1000);
		}
	});
	
	var app = express().use(express.static(path.join(__dirname, '../www')));
	var httpserver = http.createServer(app);
	var io = this.io = socketio.listen( httpserver );
	
	io.adapter(ioredis({ 
		host: conf.redis.host, 
		port: conf.redis.port 
	}));

	io.on( 'connection', function(socket){
		service.onConnected( socket );
	});
	
	httpserver.listen(conf.server.port, conf.server.host, function() {
		console.log('listening on ' + conf.server.host + ':' + conf.server.port);
	});
	
	service.timer = setInterval(function(){
		service.tick();
	}, 1000);
	
	var sub = this.sub;
	sub.on('subscribe', function(channel, count){
		//console.log('subscribed to channel: ' + channel);
	});
	sub.on('message', function(channel, message){
		//console.log(channel, message, typeof message);
		
		var words = channel.split('#');
		switch(words[0]) {
		case 'user:':
			var uid = words[1];
			if(uid) {
				var gamer = service.gamers[ uid ];
				if(gamer) {
					gamer.onMessage(message);
				}
			}
			break;
		case 'server:':
			service.onMessage(message);
			break;
		}
	});
	sub.subscribe('server:#'+this.id);

	service.is_running = true;
	console.log('server #' + this.id + ' started');
};

LoginServer.prototype.startup = function( conf ) {
	if(this.is_running) {
		throw 'server is running';
	}
	
	this.conf = conf;
	var service = this;
	
	var db = this.db = redis.createClient(conf.redis.port, conf.redis.host, {});
	db.on('error', function(err){
		console.log('redis error: ' + err);
	});
	
	this.pub = redis.createClient(conf.redis.port, conf.redis.host, {});
	this.pub.on('error', function(err){
		console.log('redis error: ' + err);
	});

	this.sub = redis.createClient(conf.redis.port, conf.redis.host, {});
	this.sub.on('error', function(err){
		console.log('redis error: ' + err);
	});
	
	db.incr('server:seq', function(err,instance_id){
		if(err) return;
		service.startInstance( instance_id );
	});
	
	return this;
};

LoginServer.prototype.shutdown = function() {
	if(! this.is_running) return;
	
	if(this.timer) {
		clearInterval(this.timer);
		this.timer = 0;
	}
	
	var db = this.db;

	db.multi()
	.del('server:#' + this.id)
	.zrem('server:all', this.id)
	.exec(function(err,ret){
		db.quit();
	});
	
	if(this.io) this.io.close();
	
	var gamers = this.gamers;
	for(var i in gamers) {
		var gamer = gamers[i];
		gamer.onDrop();
	}
	this.gamers = {};
	
	var sockets = this.sockets;
	for(var j in sockets) {
		var socket = sockets[j];
		socket.disconnect();
	}
	this.sockets = {};
	
	this.sub.unsubscribe();
	this.sub.end();
	this.pub.end();
	
	this.is_running = false;
	console.log('server #' + this.id + ' stopped');

	return this;
};

LoginServer.prototype.tick = function() {
	var service = this;
	
	var now = new Date().getTime();
	if(this.db && this.id) {
		var key = 'server:#' + this.id;
		this.db.multi()
			.hset(key, 'gamers', this.gamers_count)
			.expire(key, 5)
			.zremrangebyscore('server:all', 0, now-5000)
			.zadd('server:all', now, this.id)
			.exec();
	}
	
	var dropped = this.dropped;
	var gamers = this.gamers;
	for(var i in dropped) {
		if(dropped[i] -- <= 0) {
			var gamer = gamers[i];
			if(gamer) {
				service.logoutGamer(gamer);
				delete dropped[i];
			}
		}
	}
};

LoginServer.prototype.onMessage = function( message ) {
	console.log('server onMessage:', message);
};

LoginServer.prototype.onConnected = function( socket ) {
	var service = this;
	
	if(this.log_traffic) {
		console.log('client connected, id: ' + socket.id);
		socket.log_traffic = 1;
	}

	socket.emit('hello', {
		sid: socket.id,
		msg: this.conf.server.hellomsg,
		version: this.conf.server.version,
		client_req: this.conf.server.client_req,
	});

	socket.on('disconnect', function(){
		service.onDisconnected( socket );
	});
	
	// args: uid, name, passwd, phone, email, uuid, etc.
	socket.on('signup', function( args ){
		if(args && (typeof args === 'object') && args.seq) {
			service.gamerSignUp(socket, args);
		}
	});
	
	// args: uid, passwd, etc.
	socket.on('login', function( args ){
		if(args && (typeof args === 'object') && args.seq) {
			service.gamerLogin(socket, args);
		}
	});

	socket.on('logout', function( args ){
		if(args && (typeof args === 'object') && args.seq) {
			service.gamerLogout( socket, args );
		}
	});
	
	service.sockets[ socket.id ] = socket;
	service.sockets_count ++;
};

LoginServer.prototype.onDisconnected = function( socket ) {
	var service = this;
	
	var gamers = socket.gamers;
	if(gamers) {
		var now = new Date().getTime();
		for(var uid in gamers) {
			console.log('gamer (' + uid + ') drop offline.');
			
			var gamer = gamers[ uid ];
			gamer.onDrop();
			gamer.socket = null;
			
			var db = this.db;
			if(db) {
				db.zadd('user:dropped', now, uid);
			}
		}
		socket.gamers = {};
	}
	
	delete service.sockets[ socket.id ];
	service.sockets_count --;
};

//args: seq, uid, passwd, name, phone, email, uuid
LoginServer.prototype.gamerSignUp = function(socket, args) {
	if((! args) || (typeof args !== 'object')) return;

	var service = this;
	var uid = args.uid;
	if(uid && (typeof uid === 'string') && (uid.length>0)) {
		this.gamerSignUpStep2(socket, args);
		
	} else {
		var db = this.db;
		db.incr('user:seq', function(err,ret){
			if(err) { socket.emit('rpc_ret', { seq: args.seq, err:500, ret: 'db err' }); return; }
			args.uid = 'u' + ret;
			if(! args.name) args.name = args.uid;
			if(! args.passwd) args.passwd = (1000 + Math.floor( Math.random() * 8999 )) + '';
			
			service.gamerSignUpStep2(socket, args);
		});
	}
};

LoginServer.prototype.gamerSignUpStep2 = function(socket, args) {
	var uid = args.uid;
	var db = this.db;
	var uid_key = 'user:#' + uid;
	
	db.hgetall(uid_key, function(err,ret){
		if(err) { socket.emit('rpc_ret', { seq: args.seq, err:500, ret: 'db err' }); return; }
		if(ret) {
			socket.emit('rpc_ret', { seq: args.seq, err:409, ret: 'login id ' + loginid + ' exists' });
			return;
		}
		
		if(! args.uuid) args.uuid = '';
		if(! args.phone) args.phone = '';
		if(! args.email) args.email = '';
		var user_record = {
				uid: args.uid,
				name: args.name,
				passwd: args.passwd,
				uuid: args.uuid,
				phone: args.phone,
				email: args.email,
				phone_validated: 0,
				email_validated: 0,
				avatar: '',
				coins: 0,
				score: 0,
				exp: 0,
				level: 0,
				last_login: 0
			};
		db.multi()
			.incr('user:count')
			.hmset(uid_key, user_record)
			.exec(function(err,ret){
				if(err) { socket.emit('rpc_ret', { seq: args.seq, err:500, ret: 'db err' }); return; }
				socket.emit('rpc_ret', { seq: args.seq, err:0, ret:{ uid:uid, passwd: args.passwd } });
			});
	});
};

// args: { seq, uid, passwd }
LoginServer.prototype.gamerLogin = function( socket, args ) {
	if((! args) || (typeof args !== 'object')) return;
	
	var uid = args.uid;
	var server = this;
	var db = this.db;
	
	var uid_key = 'user:#' + uid;
	db.hgetall(uid_key, function(err,userinfo){
		if(err) { 
			socket.emit('rpc_ret', { seq: args.seq, err:500, ret:'db err' });  
			return; 
		}
		//console.log(args, uid_key, err, userinfo);
		if(! userinfo) {
			socket.emit('rpc_ret', { seq: args.seq, err:404, ret:'user not exists' }); 
			return; 
		}
		if(userinfo.passwd !== args.passwd) {
			socket.emit('rpc_ret', { seq: args.seq, err:403, ret:'invalid user id or password' });
			return;
		}
		
		var now = new Date().getTime();
		var gamer = server.gamers[ uid ];
		if(! gamer) {
			gamer = new Gamer();
			server.gamers[ uid ] = gamer;
			server.gamers_count ++;
			server.sub.subscribe('user:#'+uid);
		}
		gamer.setProfile( userinfo );
		
		var is_relogin = false, same_sock = false;
		if(gamer.socket) {
			is_relogin = true;
			if(gamer.socket.id == socket.id) {
				same_sock = true;
			} else {
				gamer.push('disconnect', 'replaced by another login');
				gamer.removeLink();
				gamer.setLink( server, socket, socket.id + now );
			}
		} else {
			gamer.setLink( server, socket, socket.id + now );
		}
		
		db.multi()
			.hset(uid_key, 'last_login', now)
			.zadd('user:online', now, uid)
			.exec();

		socket.emit('rpc_ret', {
			seq : args.seq,
			err : 0,
			ret : {
				token : {
					uid : gamer.uid,
					pin : gamer.pin,
					sid : socket.id
				},
				profile : gamer.getProfile()
			}
		});
		
		if(same_sock) {
			
		} else if( is_relogin ) {
			gamer.onRelogin();
			
		} else {
			var dropped_key = 'user:dropped';
			db.zscore(dropped_key, uid, function(err,ret){
				if(err) { socket.emit('rpc_ret', { seq: args.seq, err:500, ret:'db err' });  return; }
				if(ret) {
					db.zrem(dropped_key, uid);
					gamer.onRelogin();
				} else {
					gamer.onLogin();
				}
			});
		}
	});
};

// args: { seq, uid, pin }
LoginServer.prototype.gamerLogout = function( socket, args ) {
	if(args && (typeof args === 'object')) {
		var uid = args.uid;
		var gamer = socket.gamers[ uid ];
		if(gamer && (args.pin == gamer.pin)){
			this.logoutGamer( gamer );
			socket.emit('rpc_ret', { seq:args.seq, err:0, ret:'ok' });
		} else {
			socket.emit('rpc_ret', { seq:args.seq, err:403, ret:'denied' });
		}
	} else {
		socket.emit('rpc_ret', { seq:args.seq, err:400, ret:'bad request' });
	}
};

LoginServer.prototype.logoutGamer = function( gamer ) {
	gamer.onLogout();

	gamer.push('disconnect', 'logout' );
	gamer.removeLink();
	
	var uid = gamer.uid;
	var uid_key = 'user:#' + uid;
	this.db.multi()
		.hset(uid_key, 'online', 0)
		.zrem('user:online', uid)
		.exec();
	
	this.sub.unsubscribe('user:#' + uid);
	delete this.gamers[ uid ];
	this.gamers_count --;
	
	console.log('gamer (' + uid + ') logout.');
};
