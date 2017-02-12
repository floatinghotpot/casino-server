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
	
	var server = this;
	var conf = this.conf;
	
	var now = Date.now();
	
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
		server.onConnected( socket );
	});
	
	httpserver.listen(conf.server.port, conf.server.host, function() {
		console.log('listening on ' + conf.server.host + ':' + conf.server.port);
	});
	
	server.timer = setInterval(function(){
		server.tick();
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
				var gamer = server.gamers[ uid ];
				if(gamer) {
					gamer.onMessage(message);
				}
			}
			break;
		case 'server:':
			server.onMessage(message);
			break;
		}
	});
	sub.subscribe('server:#'+this.id);

	server.is_running = true;
	
	server.pub.publish('server:log', 'server #' + server.id + ' started');
};

LoginServer.prototype.startup = function( conf ) {
	if(this.is_running) {
		throw 'server is running';
	}
	
	this.conf = conf;
	var server = this;
	
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
		server.startInstance( instance_id );
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
	
	this.pub.publish('server:log', 'server #' + this.id + ' stopped');

	this.sub.unsubscribe();
	this.sub.end();
	this.pub.end();
	
	this.is_running = false;

	return this;
};

LoginServer.prototype.tick = function() {
	var server = this;
	
	var now = Date.now();
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
				server.logoutGamer(gamer);
				delete dropped[i];
			}
		}
	}
};

LoginServer.prototype.onMessage = function( message ) {
	console.log('server onMessage:', message);
};

LoginServer.prototype.onConnected = function( socket ) {
	var server = this;
	
	//if(this.log_traffic) {
		//console.log('client connected, id: ' + socket.id);
        //console.dir( socket );
        console.log('New connection from ' + socket.conn.remoteAddress);
		socket.log_traffic = 1;
	//}

	socket.gamers = {};
	socket.gamers_count = 0;
	
	socket.emit('hello', {
		sid: socket.id,
		msg: this.conf.server.hellomsg,
		version: this.conf.server.version,
		client_req: this.conf.server.client_req,
	});
	
	socket.on('hello', function(req) {
		socket.emit('notify', {
			uid: null,
			e: 'prompt',
			args: {
				fastsignup: true,
				signup: {
					uid: 'text',
					passwd: 'text',
					name: 'text',
					email: 'email',
					phone: 'text',
					uuid: 'text'
				},
				login: {
					uid: 'text',
					passwd: 'text'
				}
			}
		});
	});

	socket.on('rpc', function(req){
		if((typeof req !== 'object') || (typeof req.f !== 'string')) {
			socket.emit('rpc_ret', { seq:req.seq, err:400, ret:'invalid rpc req'});
			return;
		}
		
		var func_name = 'onGamer_' + req.f;
		var method = server[ func_name ];
		if(typeof method === 'function') {
			method.call(server, socket, req);
			
		} else {
			var gamer = socket.gamers[ req.uid ];
			if((! gamer) || (gamer.pin !== req.pin)) {
				socket.emit('rpc_ret', { seq:req.seq, err:403, ret:'invalid uid or pin, need login first'});
				return;
			}
			
			method = gamer[ func_name ];
			if(typeof method === 'function') {
				method.call(gamer, req, function(err, ret){
					socket.emit('rpc_ret', { seq: req.seq, err:err, ret:ret });
				});
				
			} else {
				var roomid = gamer.room;
				if(roomid) {
					delete req.pin;
					server.pub.publish('room:#'+roomid, JSON.stringify(req));
				} else {
					socket.emit('rpc_ret', { seq:req.seq, err:400, ret:'not in room'});
				}
			}
		}
			
	});

	socket.on('disconnect', function(){
		server.onDisconnected( socket );
	});
	
	server.sockets[ socket.id ] = socket;
	server.sockets_count ++;
};

LoginServer.prototype.onDisconnected = function( socket ) {
	var server = this;
	
	var gamers = socket.gamers;
	if(gamers) {
		var now = Date.now();
		for(var uid in gamers) {
			server.pub.publish('user:log', 'user (' + uid + ') drop offline');
			
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
	
	delete server.sockets[ socket.id ];
	server.sockets_count --;
};

LoginServer.prototype.signupUser = function(socket, req) {
	var server = this;
	var args = req.args;
	var uid = args.uid;
	
	var db = this.db;
	var uid_key = 'user:#' + uid;
	
	db.hgetall(uid_key, function(err,ret){
		if(err) { socket.emit('rpc_ret', { seq: req.seq, err:500, ret: 'db err' }); return; }
		if(ret) {
			socket.emit('rpc_ret', { seq: req.seq, err:409, ret: 'user id ' + uid + ' exists' });
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
				last_login: 0,
				coins: 0,
				score: 0,
				exp: 0,
				level: 0
			};
		var new_user = server.conf.new_user;
		for(var i in new_user) {
			user_record[ i ] = new_user[ i ];
		}
		db.multi()
			.incr('user:count')
			.hmset(uid_key, user_record)
			.exec(function(err,ret){
				if(err) { socket.emit('rpc_ret', { seq: req.seq, err:500, ret: 'db err' }); return; }
				socket.emit('rpc_ret', {
					seq : req.seq,
					err : 0,
					ret : {
						uid : uid,
						passwd : args.passwd
					}
				});
			});
	});
};

LoginServer.prototype.onGamer_fastsignup = function(socket, req) {
	var server = this;
	var db = this.db;
	var args = req.args = {};
	db.incr('user:seq', function(err,ret){
		if(err) { socket.emit('rpc_ret', { seq: req.seq, err:500, ret: 'db err' }); return; }
		args.uid = 'u' + ret;
		if(! args.name) args.name = args.uid;
		if(! args.passwd) args.passwd = (100000 + Math.floor( Math.random() * 899999 )) + '';
		
		server.signupUser(socket, req);
	});
};

//args: seq, uid, passwd, name, phone, email, uuid
LoginServer.prototype.onGamer_signup = function(socket, req) {
	var server = this;
	var args = req.args;
	if((! args) || (typeof args !== 'object')) {
		socket.emit('rpc_ret', { seq:req.seq, err:400, ret: 'bad request' }); 
		return;
	}
	
	var uid = args.uid;
	if((! uid) || (typeof uid !== 'string') || (uid.length < 3)) {
		socket.emit('rpc_ret', { seq:req.seq, err:400, ret: 'invaid uid, must be >=3 letters' }); 
		return;
	}

	server.signupUser(socket, req);
};

// args: { seq, uid, passwd }
LoginServer.prototype.onGamer_login = function( socket, req ) {
	var args = req.args;
	if((! args) || (typeof args !== 'object')) return;
	
	var uid = args.uid;
	var server = this;
	var db = this.db;
	
	var uid_key = 'user:#' + uid;
	db.hgetall(uid_key, function(err,userinfo){
		if(err) { 
			socket.emit('rpc_ret', { seq: req.seq, err:500, ret:'db err' });  
			return; 
		}
		//console.log(args, uid_key, err, userinfo);
		if(! userinfo) {
			socket.emit('rpc_ret', { seq: req.seq, err:404, ret:'user not exists' }); 
			return; 
		}
		if(userinfo.passwd !== args.passwd) {
			socket.emit('rpc_ret', { seq: req.seq, err:403, ret:'invalid user id or password' });
			return;
		}
		
		var gamer = server.gamers[ uid ];
		if(! gamer) {
			gamer = new Gamer();
			server.gamers[ uid ] = gamer;
			server.gamers_count ++;
			server.sub.subscribe('user:#'+uid);
		}
		gamer.setProfile( userinfo );
		
		var now = Date.now();
		var pin = 1 + Math.floor( Math.random() * 999998 );
		
		var is_relogin = false, same_sock = false;
		if(gamer.socket) {
			is_relogin = true;
			if(gamer.socket.id == socket.id) {
				same_sock = true;
			} else {
				gamer.notify('bye', 'replaced by another login');
				gamer.removeLink();
				gamer.setLink( server, socket, pin );
			}
		} else {
			gamer.setLink( server, socket, pin );
		}
		
		db.multi()
			.hset(uid_key, 'last_login', now)
			.zadd('user:online', now, uid)
			.exec();

		socket.emit('rpc_ret', {
			seq : req.seq,
			err : 0,
			ret : {
				token : {
					uid : gamer.uid,
					pin : gamer.pin
				},
				profile : gamer.getProfile(),
				cmds : {
					fastsignup: null,
					signup: null,
					login: null,
                    games: true,
					logout: true,
				},
                room: gamer.room
			}
		});

        if(! gamer.room) {
			gamer.onGamer_games(0, function(err,ret){
				if(! err) {
					var args = [];
					for(var i in ret) {
						args.push(ret[i].id);
					}
					gamer.notify('prompt', {
						entergame: args
					});
				}
			});
		}

		if(same_sock) {
			
		} else if( is_relogin ) {
			gamer.onRelogin( req );
			
		} else {
			var dropped_key = 'user:dropped';
			db.zscore(dropped_key, uid, function(err,ret){
				if(err) { socket.emit('rpc_ret', { seq: req.seq, err:500, ret:'db err' });  return; }
				if(ret) {
					db.zrem(dropped_key, uid);
					gamer.onRelogin( req );
				} else {
					gamer.onLogin( req );
				}
			});
		}
	});
};

// args: { seq, uid, pin }
LoginServer.prototype.onGamer_logout = function( socket, req ) {
	var uid = req.uid;
	var gamer = socket.gamers[ uid ];
	if(gamer && (req.pin == gamer.pin)){
		if(gamer.room) {
			gamer.onGamer_leave(0, function(err, ret){
				
			});
		}
		
		var cmds = {
			entergame : null,
			logout : null,
			fastsignup: true,
			signup : {
				uid : 'text',
				passwd : 'text',
				name : 'text',
				email : 'email',
				phone : 'text',
				uuid : 'text'
			},
			login : {
				uid : 'text',
				passwd : 'text'
			}
		};
		socket.emit('rpc_ret', {
			seq : req.seq,
			err : 0,
			ret : {
				cmds: cmds
			}
		});
		
		this.logoutGamer( gamer );
		
	} else {
		socket.emit('rpc_ret', { seq:req.seq, err:403, ret:'denied' });
	}
};

LoginServer.prototype.logoutGamer = function( gamer ) {
	gamer.onLogout();

	gamer.notify('bye', 'logout' );
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
	
	this.pub.publish('user:log', 'user (' + uid + ') logout');
};
