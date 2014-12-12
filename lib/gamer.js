console.log('loading ' + __filename);

exports = module.exports = Gamer;

var gamer_index = 0;

function Gamer(uid, name) {
	if(!(this instanceof Gamer)) return new Gamer(uid, name);
	
	this.id = 'u' + (++ gamer_index);
	this.uid = uid || this.id;
	this.name = name || this.uid;
	this.avatar = null;
	
	this.room = null;
	this.seat = null;
	
	this.data = {
		coins: 0,
		score: 0,
		exp: 0,
		level: 1
	};
	
	this.events = {};

	// if this gamer object is at server side
	//this.socket = null;
	
	// if this gamer objct is at client side
	//this.uplink = null;
}

/*
 * for game object at server side
 */
Gamer.prototype.setLink = function(socket) {
	var gamer = this;
	var uid = gamer.uid;
	
	if(gamer.socket) gamer.removeLink();
	
	if(! socket.gamers) {
		socket.gamers = {};
		socket.gamers_count = 0;
		
		socket.on('rpc', function(req){
			//console.log( req );
			
			var token = req.token;
			if(! token) return;
			if(typeof token !== 'object') return;
			
			var uid = token.uid;
			if(! uid) return;
			
			var target = socket.gamers[ uid ];
			if(! target) return;
			
			var func_name = req.f;
			if(typeof func_name !== 'string') return;
			
			//if(func_name.indexOf('rpc') != 0) return;
			
			var method = target[ func_name ];
			if(typeof method !== 'function') return;
			
			var args = req.args;
			method.call(target, args, function(ret){
				socket.emit('rpc_ret', { seq: req.seq, ok: 1, ret: ret });
			}, function(err){
				socket.emit('rpc_ret', { seq: req.seq, ok: 0, ret: err });
			});
		});
		
		socket.push = function(uid, event, args) {
			var socket = this;
			socket.emit('push', {
				uid: uid,
				e: event,
				args: args
			});
		};
	}

	socket.gamers[ uid ] = gamer;
	socket.gamers_count ++;
	
	gamer.socket = socket;
	gamer.events = {};
	
	return this;
};

Gamer.prototype.removeLink = function() {
	var gamer = this;
	var socket = gamer.socket;
	if(socket) {
		gamer.socket = null;
		delete socket.gamers[ gamer.uid ];
		socket.gamers_count --;
	}
	
	return this;
};

Gamer.prototype.push = function(event, args) {
	this.soket.emit('push', {
		uid: this.uid,
		e: event,
		args: args
	});
	
	return this;
};

/*
 * for gamer object at client side
 */
Gamer.prototype.on = function(event, func) {
	this.events[ event ] = func;
	
	return this;
};

Gamer.prototype.onPush = function(event, args) {
	var func = this.events[ event ];
	if(! func) return;
	if(typeof func === 'function') func(args);
};

Gamer.prototype.setUplink = function(socket) {
	var gamer = this;
	if(gamer.uplink) gamer.removeUplink();
	
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
			
			if(msg.uid) {
				var target = socket.gamers[ msg.uid ];
				if(! target) return;
				
				target.onPush( event, args );
			} else {
				var gamers = socket.gamers;
				for(var uid in gamers) {
					var target = gamers[ uid ];
					if(! target) return;
					
					target.onPush( event, args );
				}
			}
		});
		
		socket.on('rpc_ret', function(response){
			if(socket.log_traffic) console.log('rpc_ret', response);
			
			if(! response) return;
			if(typeof response !== 'object') return;
			
			var seq = response.seq;
			if(! seq) return;
			
			var callback = socket.rpc_callbacks[ seq ];
			if(! callback) return;
			
			delete socket.rpc_callbacks[ seq ];
			
			if(response.ok) {
				var ok = callback.ok;
				if(typeof ok === 'function') ok( response.ret );
			} else {
				var err = callback.err;
				if(typeof err === 'function') err( response.ret );
			}
		});
		
		socket.rpc = function(gamer, method, args, ok, err){
			var callback = {
					seq: ++ socket.rpc_seq,
					ok: ok,
					err: err,
					t: (new Date()).getTime()
				};
			socket.rpc_callbacks[ callback.seq ] = callback;
			var rpc_args = {
					seq: callback.seq,
					token: gamer.token,
					f: method,
					args: args
				};
			if(socket.log_traffic) console.log('rpc', rpc_args);
			socket.emit('rpc', rpc_args);
		};
	}
	
	socket.gamers[ gamer.uid ] = gamer;
	socket.gamers_count ++;

	gamer.uplink = socket;
	
	return this;
};

Gamer.prototype.removeUplink = function() {
	var gamer = this;
	var socket = gamer.uplink;
	if(socket) {
		gamer.socket = null;
		delete socket.gamers[ gamer.uid ];
		socket.gamers_count --;
	}
	
	return this;
};

/*
 * local methods
 */
Gamer.prototype.brief = function() {
	return {
		uid: this.uid,
		name: this.name,
		avatar: this.avatar,
		data: this.data,
	};
};

Gamer.prototype.setProfile = function( p ) {
	this.uid = p.uid;
	this.name = p.name;
	this.avatar = p.avatar;
	this.data = p.data;
};

Gamer.prototype.getProfile = function() {
	return {
		uid: this.uid,
		name: this.name,
		avatar: this.avatar,
		data: this.data,
	};
};

Gamer.prototype.onLogin = function(){
};

Gamer.prototype.onLogout = function() {
	if(this.seat) this.unseat();
	if(this.room) this.exit();
};

Gamer.prototype.onDrop = function() {
};

Gamer.prototype.onReconnect = function() {
	if(this.socket) {
		if(this.room) this.socket.join(this.room.id);
	}
};

/*
 * rpc -- remote process call
 */

Gamer.prototype.games = function games(args, ok, err) {
	if(this.uplink) {
		this.uplink.rpc(this, arguments.callee.name, args, ok, err);
		return;
	}
	
	var casino = this.casino;
	if(! casino) {
		if(typeof err === 'function') err({code:-1, msg:'not in casino'});
		return;
	}
	
	var areas = casino.areas;
	var list = [];
	for(var i in areas) {
		var area = areas[i];
		list.push({
			id: i,
			name: area.name,
			desc: area.desc,
			rooms: area.rooms_count
		});
	}
	
	if(typeof ok === 'function') ok(list);
};

Gamer.prototype.rooms = function rooms(areaid, ok, err) {
	if(this.uplink) {
		this.uplink.rpc(this, arguments.callee.name, areaid, ok, err);
		return;
	}
	
	var casino = this.casino;
	var rooms = null;
	
	if(areaid && (areaid in casino.areas)) {
		var area = casino.areas[ areaid ];
		rooms = area.rooms;
	} else {
		rooms = casino.rooms;
	}
	
	var list = [];
	for(var i in rooms) {
		var room = rooms[i];
		list.push({
			id: room.id,
			name: room.name,
			gamers: room.gamers_count,
			seats: room.seats_count,
			seats_taken: room.seats_taken
		});
	}
	
	if(typeof ok === 'function') ok(list);
};

Gamer.prototype.gamers = function gamers(roomid, ok, err) {
	if(this.uplink) {
		this.uplink.rpc(this, arguments.callee.name, roomid, ok, err);
		return;
	}
	
	var casino = this.casino;
	var gamers = null;
	
	if(roomid && (roomid in casino.rooms)) {
		var room = casino.rooms[ roomid ];
		gamers = room.gamers;
	} else {
		gamers = casino.gamers;
	}
	
	var list = [];
	for(var uid in gamers) {
		list.push( gamers[uid].brief() );
	}

	if(typeof ok === 'function') ok(list);
};

Gamer.prototype.enter = function enter(roomid, ok, err) {
	if(this.uplink) {
		this.uplink.rpc(this, arguments.callee.name, roomid, ok, err);
		return;
	}

	var room = this.casino.rooms[ roomid ];
	if(! room) {
		if(typeof err === 'function') err({ code:-1, msg: 'room ' + roomid + ' not found' });
		return;
	}
	
	this.room = room;
	
	room.gamers[ this.uid ] = this;
	room.gamers_count ++;

	if(this.socket) {
		this.socket.join(room.id);
		room.event('enter', { who: this.brief(), where:room.brief() } );
	}
	
	if(typeof ok === 'function') ok( room.details() );
};

Gamer.prototype.exit = function exit(noargs, ok, err) {
	if(this.uplink) {
		this.uplink.rpc(this, arguments.callee.name, noargs, ok, err);
		return;
	}
	
	if(! this.room) {
		if(typeof err === 'function') err({ code:-1, msg: 'not in room' });
		return;
	}
	
	var room = this.room;
	
	if(this.seat) this.unseat();
	
	if(this.socket) {
		room.event('exit', { who: this.brief(), where:room.brief() } );
		this.socket.leave(room.id);
	}
	
	delete room.gamers[ this.uid ];
	room.gamers_count --;
	
	this.room = null;
	
	if(typeof ok === 'function') ok( true );
};

Gamer.prototype.look = function look(noargs, ok, err) {
	if(this.uplink) {
		this.uplink.rpc(this, arguments.callee.name, noargs, ok, err);
		return;
	}

	var room = this.room;
	if(room) {
		if(typeof ok === 'function') ok( room.details() );
	} else {
		if(typeof err === 'function') err({code:-1, msg:'not in room'});
	}
};


Gamer.prototype.takeseat = function takeseat( seatid, ok, err) {
	if(this.uplink) {
		this.uplink.rpc(this, arguments.callee.name, seatid, ok, err);
		return;
	}
	
	var room = this.room;
	var msg = null;
	if(room) {
		if(! this.seat) {
			if( seatid ) {
				if(seatid in room.seats) {
					var seated = room.seats[ seatid ];
					if(seated) {
						msg = 'seat ' + seatid + ' already taken by ' + seated.uid;
					}
				} else {
					msg = 'seat ' + seatid + ' not exist in this room';
				}
			} else {
				seatid = room.findEmptySeat();
				if(! seatid) {
					msg = 'all seats are taken';
				}
			}
		} else {
			msg = 'already in seat ' + this.seat;
		}
	} else {
		msg = 'not in room';
	}
	
	if(msg) {
		if(typeof err === 'function') err({code:-1, msg:msg});
		return;
	}
	
	this.seat = seatid;
	
	room.seats[ seatid ] = this;
	room.seats_taken ++;

	if(this.socket) {
		room.event('roomchange', room.details());
	}
	
	if(room.game) room.game.onJoin( this );
	
	if(typeof ok === 'function') ok(1);
};

Gamer.prototype.unseat = function unseat(noargs, ok, err) {
	if(this.uplink) {
		this.uplink.rpc(this, arguments.callee.name, null, ok, err);
		return;
	}
	
	var errcode = 0, errmsg = '';
	if(this.room) {
		if(this.seat) {
			var seat = this.seat;
			var room = this.room;
			if(seat in room.seats) {
				if(room.game) room.game.onLeave( this );

				room.seats[ seat ] = null;
				room.seats_taken --;
				this.seat = null;
				
				if(this.socket) {
					room.event('roomchange', room.details());
				}
				
				if(typeof ok === 'function') ok(1);
				return;
			} else {
			}
		} else {
		}
	} else {
	}
	
	if(typeof err === 'function') err({ code:-1, msg: 'unseat failed' });
};

Gamer.prototype.say = function say( msg, ok, err ) {
	if(this.uplink) {
		this.uplink.rpc(this, arguments.callee.name, msg, ok, err);
		return;
	}
	
	var room = this.room;
	if(! room) {
		if(typeof err === 'function') err({code:-1, msg:'not in room'});
		return;
	}
	
	if(this.socket) {
		room.event('say', {
			who : {
				uid : this.uid,
				name : this.name
			},
			msg : msg
		});
		if(typeof ok === 'function') ok(1);
	}
};

Gamer.prototype.shout = function shout( msg, ok, err ) {
	if(this.uplink) {
		this.uplink.rpc(this, arguments.callee.name, msg, ok, err);
		return;
	}
	
	if(this.socket) {
		var casino = this.casino;
		if(casino) {
			var io = casino.io;
			if(io) {
				io.emit('push', {
					e:'shout',
					args: {
						who : {
							uid : this.uid,
							name : this.name
						},
						msg : msg
					}
				});
				if(typeof ok === 'function') ok(1);
				return;
			}
		}
	}
	
	if(typeof err === 'function') err({code:-1, msg:'failed to shout'});
};

Gamer.prototype.login = function login( loginid, passwd, ok, err ) {
	if(this.uplink) {
		var socket = this.uplink;
		
		var gamer = this;
		var callback = {
			seq: ++ socket.rpc_seq,
			ok: function(ret){
				gamer.token = ret.token;
				gamer.setProfile( ret.profile );
				if(typeof ok === 'function') ok(ret);
			},
			err: err,
			t: (new Date()).getTime()
		};
		socket.rpc_callbacks[ callback.seq ] = callback;
		socket.emit('login', {
			seq: callback.seq,
			loginid: loginid,
			passwd: passwd
		});
		return;
	}
		
	if(typeof err === 'function') err({code:-1, msg:'no uplink'});
};

Gamer.prototype.logout = function logout(ok, err) {
	if(this.uplink) {
		var socket = this.uplink;
		
		var gamer = this;
		var callback = {
			seq: ++ socket.rpc_seq,
			ok: function(ret){
				console.log(ret);
				//gamer.token = {};
				//if(typeof ok === 'function') ok(ret);
			},
			err: err,
			t: (new Date()).getTime()
		};
		socket.rpc_callbacks[ callback.seq ] = callback;
		socket.emit('logout', {
			seq: callback.seq,
			token: token
		});
		return;
	}
		
	if(typeof err === 'function') err({code:-1, msg:'no uplink'});
};
