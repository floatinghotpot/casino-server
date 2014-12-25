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

/*
 * accepted methods and args:
 * 
 * games, 0
 * rooms, gameid
 * shout, msg
 * entergame, gameid
 * enter, roomid
 * say, msg
 * look, 0
 * takeseat, seat or ''
 * unseat, 0
 * exit, 0
 * 
 * follow, 0
 * addchip, n
 * giveup, 0
 * pk, uid
 * checkcard, 0
 * showcard, 0
 * 
 */

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

