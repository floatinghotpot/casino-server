exports = module.exports = Client;

function Client( socket ) {	
	this.uid = null;
	this.pin = null;
	this.profile = {};
	this.events = {};
	this.room = null;
	this.cmds = {};
	
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
	
	this.uid = ++ socket.rpc_seq;
	socket.gamers[ this.uid ] = this;
	
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
	case 'prompt':
		for(var i in args) {
			if(args[i] !== null) this.cmds[i] = 1;
		}
		var login = args.login;
		var signup = args.signup;
		if(login) {
			for(i in this.cmds) {
				args[i] = null;
			}
			args.login = login;
			if(signup) args.signup = signup;
		}
		for(i in this.cmds){
			if(this.cmds[i] === null) delete this.cmds[i];
		}
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
		this.pin = null;
		this.profile = {};
		this.room = null;
		this.cmds = {};
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

/*
 * accepted methods and args:
 * 
 * signup, {uid, passwd, name, email, phone, uuid}
 * login, {uid, passwd}
 * logout, 0
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
	var client = this;
	var socket = client.uplink;
	if(socket.log_traffic) console.log('rpc', method, args);
	
	if(typeof func !== 'function') {
		throw 'need a callback func(err,ret)';
	}

	var callback_func = null;
	
	switch(method) {
	case 'login':
		callback_func = function(err, ret){
			if(! err) {
				if(client.uid !== ret.token.uid) {
					delete socket.gamers[ client.uid ];
				}
				
				client.uid = ret.token.uid;
				client.pin = ret.token.pin;
				client.profile = ret.profile;
				
				socket.gamers[ client.uid ] = client;
			}
			func(err, ret);
		};
		break;
	case 'logout':
		callback_func = function(err, ret){
			if(! err) {
				client.uid = null;
				client.pin = null;
				client.profile = {};
			}
			func(err, ret);
		};
		break;
	default:
		if(! client.pin) {
			func(400, 'need login first');
			return;
		}
		callback_func = func;
	}
	
	var callback = {
			seq: ++ socket.rpc_seq,
			func: callback_func,
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

