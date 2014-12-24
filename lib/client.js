exports = module.exports = Client;

function Client( socket ) {	
	this.uid = null;
	this.pin = null;
	this.profile = {};
	this.events = {};
	this.room = null;
	
	this.setUplink( socket );
}

Client.prototype.setUplink = function(socket) {
	this.uplink = socket;
	
	if(! socket.gamers) {
		socket.gamers = {};
		socket.gamers_count = 0;
		socket.rpc_seq = 0;
		socket.rpc_callbacks = {};
		
		socket.on('push', function( msg ){ // { uid:x, e:xx, args:xxx }
			if(socket.log_traffic) console.log('push', msg);
			
			if(! msg) return;
			if(typeof msg !== 'object') return;
			
			var event = msg.e;
			if(! event) return;
			
			var args = msg.args;
			var target;
			if(msg.uid) {
				target = socket.gamers[ msg.uid ];
				if(target) target.onPush( event, args );
				
			} else {
				var gamers = socket.gamers;
				for(var uid in gamers) {
					target = gamers[ uid ];
					if(target) target.onPush( event, args );				
				}
			}
		});
		
		socket.on('rpc_ret', function(response){
			if(socket.log_traffic) console.log('rpc_ret', response);
			
			if(response && (typeof response === 'object') && response.seq) {
				var seq = response.seq;
				var callback = socket.rpc_callbacks[ seq ];
				if(callback && (typeof callback === 'object')) {
					var func = callback.func;
					if(typeof func === 'function') func(response.err, response.ret);
					
					delete socket.rpc_callbacks[ seq ];
				}
			}
		});
	}
	
	return this;
};

Client.prototype.on = function(event, func) {
	this.events[ event ] = func;
	return this;
};

Client.prototype.onPush = function(event, args) {
	switch(event) {
	case 'look':
		this.room = args;
		break;
	case 'enter':
		this.room.gamers[ args.who.uid ] = args.who;
		break;
	case 'exit':
		args.who = this.room.gamers[ args.uid ];
		break;
	case 'takeseat':
		this.room.seats[ args.where ] = args.uid;
		args.who = this.room.gamers[ args.uid ];
		break;
	case 'unseat':
		this.room.seats[ args.where ] = null;
		args.who = this.room.gamers[ args.uid ];
		break;
	case 'say':
		args.who = this.room.gamers[ args.uid ];
		break;
	}
	
	var func;
	if(typeof (func = this.events[event]) === 'function') {
		func(args);
	} else if(typeof (func = this.events['else']) === 'function') {
		func(args);
	}
	
	switch(event) {
	case 'disconnect':
		this.uid = null;
		this.pin = null;
		this.profile = {};
		break;
	}
};

Client.prototype.removeUplink = function() {
	var socket = client.uplink;
	if(socket) {
		client.socket = null;
		delete socket.gamers[ this.uid ];
		socket.gamers_count --;
	}
	
	return this;
};

// args: { uid, name, passwd, email, phone, uuid }
Client.prototype.signup = function login( args, func ) {
	if(typeof func !== 'function') {
		throw 'need a callback func(err,ret)';
	}
	
	var socket = this.uplink;
	if(socket.log_traffic) console.log('signup', args);
	
	var callback = {
		seq: ++ socket.rpc_seq,
		func: func,
		t: (new Date()).getTime()
	};
	socket.rpc_callbacks[ callback.seq ] = callback;
	
	args.seq = callback.seq;
	socket.emit('signup', args);
};

Client.prototype.login = function login( uid, passwd, func ) {
	if(typeof func !== 'function') {
		throw 'need a callback func(err,ret)';
	}
	
	var socket = this.uplink;
	if(socket.log_traffic) console.log('login', uid, passwd);
	
	var client = this;
	
	var callback = {
		seq: ++ socket.rpc_seq,
		func: function(err, ret){
			if(! err) {
				client.uid = ret.token.uid;
				client.pin = ret.token.pin;
				client.profile = ret.profile;
				
				socket.gamers[ client.uid ] = client;
			}
			func(err, ret);
		},
		t: (new Date()).getTime()
	};
	socket.rpc_callbacks[ callback.seq ] = callback;
	
	socket.emit('login', {
		seq: callback.seq,
		uid: uid,
		passwd: passwd
	});
};

Client.prototype.logout = function logout( func ) {
	if(typeof func !== 'function') {
		throw 'need a callback func(err,ret)';
	}

	if(! this.uid) {
		func(400, 'need login first');
		return;
	}
	
	var socket = this.uplink;
	if(socket.log_traffic) console.log('logout');
	
	var client = this;
	var callback = {
		seq: ++ socket.rpc_seq,
		func: function(err, ret){
			if(! err) {
				client.uid = null;
				client.pin = null;
				client.profile = {};
			}
			func(err, ret);
		},
		t: (new Date()).getTime()
	};
	socket.rpc_callbacks[ callback.seq ] = callback;
	
	socket.emit('logout', {
		seq: callback.seq,
		uid: client.uid,
		pin: client.pin
	});
};

Client.prototype.rpc = function(method, args, func) {
	if(typeof func !== 'function') {
		throw 'need a callback func(err,ret)';
	}

	if(! this.uid) {
		func(400, 'need login first');
		return;
	}
	
	var socket = this.uplink;
	if(socket.log_traffic) console.log('rpc', method, args);
	
	var client = this;
	var callback = {
			seq: ++ socket.rpc_seq,
			func: func,
			t: (new Date()).getTime()
		};
	socket.rpc_callbacks[ callback.seq ] = callback;
	
	socket.emit('rpc', {
		seq: callback.seq,
		uid: client.uid,
		pin: client.pin,
		f: method,
		args: args
	});
	
	return this;
};

Client.prototype.shout = function(msg, func) {
	if(! func) func = function(err,ret){};
	this.rpc('shout', msg, func);
};

Client.prototype.say = function(msg, func) {
	if(! func) func = function(err,ret){};
	this.rpc('say', msg, func);
};

Client.prototype.entergame = function(roomid, func) {
	if(! func) func = function(err,ret){};
	this.rpc('entergame', roomid, func);
};

Client.prototype.enter = function(roomid, func) {
	if(! func) func = function(err,ret){};
	this.rpc('enter', roomid, func);
};

Client.prototype.exit = function(func) {
	if(! func) func = function(err,ret){};
	this.rpc('exit', 0, func);
};

Client.prototype.look = function(func) {
	if(! func) func = function(err,ret){};
	this.rpc('look', 0, func);
};

Client.prototype.games = function(func) {
	if(! func) func = function(err,ret){};
	this.rpc('games', 0, func);
};

Client.prototype.rooms = function(gameid, func) {
	if(! func) func = function(err,ret){};
	this.rpc('rooms', gameid, func);
};
