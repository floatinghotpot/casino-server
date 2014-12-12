console.log('loading ' + __filename);

var socketio = require('socket.io'), 
	express = require('express'), 
	http = require('http'),
	redis = require('socket.io-redis');

var Casino = require('./casino'),
	Room = require('./room'),
	Gamer = require('./gamer');

var universe = global || window;

exports = module.exports = CasinoServer;

function CasinoServer() {
	if(!(this instanceof CasinoServer)) {
		var singleton = universe.casino_server;
		return singleton ? singleton : new CasinoServer();
	}
	
	if(universe.casino_server) {
		throw 'casino server is a singleton, should not be created twice';
		return;
	}
	
	this.DROP_KICK_TIME = 30; // 30 sec
	
	this.timer = 0;
	this.io = null;
	this.casino = null;
	
	this.is_started = false;
	
	universe.casino_server = this;
};

CasinoServer.prototype.startServer = function( server_conf ) {
	this.server_conf = server_conf;
	
	console.log('starting server ...');
	
	/* Notice: each socket may link to multiple gamer objects
	 * this will support client as agent or robots
	 * socket.gamers = {}, uid -> gamer object
	 */
	this.sockets = {}; // sid -> socket
	this.sockets_count = 0;
	
	this.dropped = {}; // uid -> drop count down

	var app = express().use(express.static(server_conf.root));
	var httpserver = http.createServer(app);
	var io = socketio.listen( httpserver );

	this.io = io;
	if(this.casino) {
		this.casino.io = io;
	}
	
	if( server_conf.enable_redis ) {
		io.adapter(redis({ 
			host: server_conf.redis_host, 
			port: server_conf.redis_port 
		}));
	}

	httpserver.listen(server_conf.port, function() {
		console.log('listening on *:' + server_conf.port);
	});
	
	var service = this;
	
	this.timer = setInterval(function(){
		service.tick();
	}, 1000);
	
	io.on( 'connection', function(socket){
		service.onConnected( socket );
	});
	
	this.is_started = true;

	return this;
};

CasinoServer.prototype.stopServer = function() {
	var service = this;
	
	console.log('stopping server ...');
	
	var io = this.io;
	if(io) {
		//console.log(io.server);
		//io.server.close();
		io.close();
	}
	
	if(this.timer) {
		clearInterval(this.timer);
		this.timer = 0;
	}
	
	for(var i in this.sockets) {
		var socket = this.sockets[i];
		//socket.destroy();
		socket.close();
	}
	this.sockets = {};
	this.dropped = {};
	
	this.is_started = false;
	
	return this;
};

CasinoServer.prototype.setupCasino = function( casino_conf ) {
	if(! this.casino) {
		this.casino_conf = casino_conf;
		
		var casino = this.casino = Casino();
		for(var i in casino_conf) {
			var conf = casino_conf[ i ];
			casino.addGame(conf).addRoom(conf.id, conf.min);
		}
		
		casino.service = this;
		if(this.io) {
			casino = this.io; 
		}
	}
	
	return this;
};

CasinoServer.prototype.closeCasino = function() {
	if(this.casino) {
		this.casino.closeAll();
		
		this.casino.service = null;
		this.casino = null;
	}
	
	return this;
};

CasinoServer.prototype.tick = function() {
	var service = this;
	var casino = this.casino;
	
	var dropped = this.dropped;
	var gamers = casino.gamers;
	for(var i in dropped) {
		if(dropped[i] -- <= 0) {
			var gamer = gamers[i];
			if(gamer) {
				service.gamerLogout({seq:0, token:{uid:gamer.uid, pin:gamer.pin}});
				delete dropped[i];
			}
		}
	}
};

CasinoServer.prototype.onConnected = function( socket ) {
	var service = this;
	
	if(this.log_traffic) {
		console.log('client connected, id: ' + socket.id);
		socket.log_traffic = 1;
	}

	socket.emit('hello', {
		msg: 'welcome to online casino',
		sid: socket.id,
		version: 20141201,
		client_req: 20141130
	});

	socket.on('disconnect', function(){
		service.onDisconnected( socket );
	});
	
	// vipcard: uid, passwd, name
	socket.on('login', function( args ){
		if(! args) return;
		if(typeof args !== 'object') return;
		
		service.gamerLogin(socket, args);
	});

	socket.on('logout', function( args ){
		if(! args) return;
		if(typeof args !== 'object') return;
		
		service.gamerLogout( args );
	});
	
	service.sockets[ socket.id ] = socket;
	service.sockets_count ++;
};

CasinoServer.prototype.onDisconnected = function( socket ) {
	var service = this;
	
	var gamers = socket.gamers;
	if(gamers) {
		for(var uid in gamers) {
			var gamer = gamers[ uid ];
			gamer.onDrop();
			
			service.dropped[ uid ] = this.DROP_KICK_TIME;
			console.log('gamer (' + uid + ') drop offline.');
			
			gamer.socket = null;
		}
	}
	
	delete service.sockets[ socket.id ];
	service.sockets_count --;
};

// vipcard: uid, passwd, name
CasinoServer.prototype.gamerLogin = function( socket, args ) {
	if((! args) || (typeof args !== 'object')) return;
	
	var service = this;
	var casino = service.casino;
	
	var loginid = args.loginid;
	var passwd = args.passwd;
	
	// TODO: validate vipcard
	var validated = true;
	
	// TODO: map login id to uid
	// as login id may be different from uid
	// it can be email, open-auth id, or account of other site
	var uid = loginid;
	
	if(! validated) {
		socket.emit('rpc_ret', { seq: req.seq, ok:0, ret: 'invalid login' });
		return;
	}
	
	var gamer = casino.gamers[ uid ];
	if(gamer) {
		console.log('player (' + uid + ') re-login.');
		if(uid in this.dropped) delete this.dropped[ uid ];
		
		gamer.setLink( socket );
		gamer.pin = socket.id + (new Date()).getTime();
		
		gamer.onReconnect();
	} else {
		console.log('player (' + uid + ') login.');
		
		// TODO: load profile
		
		gamer = new Gamer(uid);
		
		casino.addGamer( gamer );

		gamer.setLink( socket );
		gamer.pin = socket.id + (new Date()).getTime();
		
		gamer.onLogin();
	}
	
	var token = { uid:gamer.uid, pin:gamer.pin };
	var profile = gamer.getProfile();
	socket.emit('rpc_ret', { seq:args.seq, ok:1, ret:{token:token, profile:profile} });
};

CasinoServer.prototype.gamerLogout = function( args ) {
	if((! args) || (typeof args !== 'object')) return;
	
	var service = this;
	var casino = service.casino;
	
	var token = args.token;
	if(token && (typeof token === 'object')) {
		var uid = token.uid;
		var gamer = casino.gamers[ uid ];
		if(gamer && (token.pin == gamer.pin)){
			var socket = gamer.socket;
			
			gamer.onLogout();
			
			if(socket) socket.emit('rpc_ret', { seq:args.seq, ok:1, ret:1 });
			console.log('gamer (' + uid + ') logout.');
			
			casino.removeGamer( gamer );
			
			return;
		}
	}
	
	socket.emit('rpc_ret', { seq:args.seq, ok:0, ret:'bad request' });
};

