exports = module.exports = Gamer;

function Gamer() {
	if(!(this instanceof Gamer)) return new Gamer();
	
	this.uid = null;
	this.profile = {};
	this.room = null;
	this.seat = -1;
}

Gamer.prototype.setLink = function(server, socket, pin) {
	var gamer = this;
	var uid = gamer.uid;
	
	if(gamer.socket) {
		gamer.removeLink();
	}
	
	gamer.server = server;
	gamer.socket = socket;
	gamer.pin = pin;
	
	socket.gamers[ uid ] = gamer;
	socket.gamers_count ++;
	
	return this;
};

Gamer.prototype.removeLink = function() {
	var gamer = this;
	
	var socket = gamer.socket;
	if(socket) {
		delete socket.gamers[ gamer.uid ];
		socket.gamers_count --;
	}
	
	gamer.socket = null;
	gamer.server = null;
	gamer.pin = null;
	
	return this;
};

Gamer.prototype.push = function(event, args) {
	var socket = this.socket;
	if(socket) {
		socket.emit('push', {
			uid: this.uid,
			e: event,
			args: args
		});
	}
	
	return this;
};

Gamer.prototype.setProfile = function( p ) {
	this.uid = p.uid;
	this.profile = {
		uid: p.uid,
		name: p.name,
		avatar: p.avatar,
		coins: p.coins,
		score: p.score,
		exp: p.score,
		level: p.level
	};
	
	return this;
};

Gamer.prototype.getProfile = function() {
	return this.profile;
};

Gamer.prototype.getName = function() {
	return {
		uid: this.uid,
		name: this.profile.name
	};
};

Gamer.prototype.onLogin = function(){
	console.log('gamer (' + this.uid + ') login');
	var gamer = this;
	
	gamer.server.pub.publish('user:#'+gamer.uid, JSON.stringify({
		f:'login',
		uid: gamer.uid,
		e: 'login',
		args: gamer.pin
	}));

};

Gamer.prototype.onDrop = function() {
	var gamer = this;
	if(gamer.room) {
		var room_key = 'room:#' + gamer.room;
		gamer.server.pub.publish(room_key, JSON.stringify({
			uid: gamer.uid,
			f: 'drop',
			seq: 0,
			args: null
		}));
	}
};

Gamer.prototype.onRelogin = function() {
	console.log('gamer (' + this.uid + ') re-login');
	var gamer = this;
	
	gamer.server.pub.publish('user:#'+gamer.uid, JSON.stringify({
		f:'login',
		uid: gamer.uid,
		e: 'relogin',
		args: gamer.pin
	}));
	
	if(gamer.room) {
		var room_key = 'room:#' + gamer.room;
		gamer.socket.join(room_key);
		gamer.server.pub.publish(room_key,JSON.stringify({
			uid: gamer.uid,
			f: 'relogin',
			seq: 0,
			args: null
		}));
	}
};

Gamer.prototype.onLogout = function() {
	var gamer = this;
	if(gamer.room) {
		var room_key = 'room:#' + gamer.room;
		gamer.server.pub.publish(room_key,JSON.stringify({
			uid: gamer.uid,
			f: 'logout',
			seq: 0,
			args: null
		}));
		gamer.socket.leave(room_key);
	}
};

Gamer.prototype.onGamer_games = function(noargs, func) {
	var db = this.server.db;
	if(! db) { func(500, 'db err'); return; }
	
	var now = new Date().getTime();
	if(! db.cache) db.cache = {};
	var cache = db.cache;
	
	var list = cache['game:all'];
	var timestamp = cache['t_game:all'];
	if(list && timestamp && (now < timestamp +1000)) {
		func(0, list);
		
	} else {
		db.zrange('game:all', 0, -1, function(err,ret){
			if(err) { func(500, 'db err'); return; }
			if(! ret) { func(404, 'not found'); return; }
			
			var m = db.multi();
			for(var i=0, len=ret.length; i<len; i++){
				m.hgetall('game:#'+ret[i])
				.zcount('game:#'+ret[i]+'#rooms', now-5000, now);
			}
			m.exec(function(err,ret){
				//console.log(err, ret);
				if(err) { func(500, 'db err'); return; }
				var list = [];
				for(var i=0, len=ret.length; i<len; i+=2) {
					var game = ret[i];
					game.rooms = ret[i+1];
					list.push( game );
				}
				cache['game:all'] = list;
				cache['t_game:all'] = now;
				func(0, list);
			});
		});
	}
};

Gamer.prototype.onGamer_rooms = function(gametype, func) {
	var db = this.server.db;
	if(! db) { func(500,'db err'); return; }
	
	var now = new Date().getTime();
	if(! db.cache) db.cache = {};
	var cache = db.cache;
	
	var rooms_key = 'game:#'+gametype+'#rooms';
	var list = cache[rooms_key];
	var timestamp = cache['t_'+rooms_key];
	if(list && timestamp && (now < timestamp +1000)) {
		func(null, list);
	} else {
		db.zrange(rooms_key, 0, -1, function(err,ret){
			if(err) return;
			if(! ret) return;
			var m = db.multi();
			for(var i=0, len=ret.length; i<len; i++){
				m.hgetall('room:#' + ret[i]);
			}
			m.exec(function(err,list){
				if(err) return;
				cache[rooms_key] = list;
				cache['t_'+rooms_key] = now;
				func(0, list);
			});
		});
	}
};

Gamer.prototype.onGamer_entergame = function(typeid, func) {
	var gamer = this;
	
	if(gamer.room) {
		func(400, 'already in room');
		return;
	}
	
	var db = this.server.db;
	var rooms_key = 'game:#' + typeid + '#rooms_notfull';
	db.zrange(rooms_key, 0, -1, function(err,ret){
		if(err) { func(500, 'db err'); return; }
		if(ret && ret.length>0) {
			var roomid = ret[0];
			var room_key = 'room:#' + roomid;
			gamer.room = roomid;
			gamer.socket.join(room_key);
			gamer.server.pub.publish(room_key, JSON.stringify({
				f: 'enter',
				uid: gamer.uid, 
				seq: 0,
				args: roomid
			}));
			
			func(0, 'ok');
			
			gamer.push('prompt', {
				entergame: null
			});
			
		} else {
			func(404, 'all full'); 
			return;
		}
		
	});
};

Gamer.prototype.onGamer_enter = function(roomid, func) {
	var gamer = this;
	
	if(gamer.room) {
		func(400, 'already in room');
		return;
	}
	
	var db = this.server.db;
	var room_key = 'room:#' + roomid;
	db.hgetall(room_key, function(err,roominfo){
		if (err) {
			func(500, 'db err');
			return;
		}
		if(roominfo) {
			gamer.room = roomid;
			gamer.socket.join(room_key);
			gamer.server.pub.publish(room_key, JSON.stringify({
				f: 'enter',
				uid: gamer.uid, 
				seq: 0,
				args: roomid
			}));
			
			func(0, 'ok');
			
		} else {
			func(404, 'room ' + roomid + ' not found');
		}
		
	});
};

Gamer.prototype.onGamer_exit = function(noargs, func) {
	var gamer = this;
	
	var roomid = gamer.room;
	if(! roomid) {
		func(400, 'not in room');
		return;
	}
	
	var room_key = 'room:#' + roomid;
	gamer.server.pub.publish(room_key, JSON.stringify({
		f:'exit',
		uid: gamer.uid,
		seq: 0,
		args: null
	}));
	gamer.room = null;
	gamer.socket.leave(room_key);
	
	gamer.push('prompt', {
		exit: null,
		say: null,
		takeseat: null,
		unseat: null
	});

	func(0, 'ok');

	gamer.onGamer_games(0, function(err,ret){
		if(! err) {
			var args = [];
			for(var i in ret) {
				args.push(ret[i].id);
			}
			gamer.push('prompt', {
				entergame: args
			});
		}
	});
};

Gamer.prototype.onGamer_shout = function shout( msg, func ) {
	var gamer = this;
	
	gamer.server.io.emit('push', {
		uid: null,
		e: 'shout',
		args: {
			who: {
				uid: gamer.uid,
				name: gamer.profile.name
			},
			msg: msg
		}
	});
};

Gamer.prototype.onMessage = function(message) {
	var socket = this.socket;
	if(! socket) return;
	try {
		var req = JSON.parse(message);
		if(req && (typeof req === 'object')) {
			switch(req.f) {
			case 'response':
				delete req.f;
				socket.emit('rpc_ret', req);
				break;
			case 'event':
				delete req.f;
				socket.emit('push', req);
				break;
			case 'login':
				if((req.uid == this.uid) && (req.args != this.pin)) {
					req.f = 'event';
					req.e = 'disconnect';
					req.args = 'replaced by another login';
					socket.emit('push', req);
				}
				break;
			}
		}
	} catch( err ) {
		console.log(err);
	}
};


