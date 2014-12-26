var Gamer = require('./gamer');

exports = module.exports = Room;

function Room( casino, typeid, roomid, options ) {
	this.options = {
		max_seats: 4
	};
	if(options && (typeof options === 'object')) {
		for(var i in options) this.options[i] = options[i];
	}
	
	this.casino = casino;
	this.db = casino.db;
	this.pub = casino.pub;
	
	this.id = roomid;
	this.type = typeid;
	this.name = '';
	
	this.gamers = {};
	this.gamers_count = 0;
	
	this.seats_count = this.options.max_seats;
	this.seats_taken = 0;
	this.seats = [];
	for(var j=0; j<this.seats_count; j++) {
		this.seats.push(null);
	}
	
	var room = this;
	this.timer = setInterval(function(){
		room.tick();
	}, 1000);
}

Room.prototype.setName = function(name) {
	this.name = name;
};

Room.prototype.brief = function(){
	return {
		id: this.id,
		type: this.type,
		name: this.name,
		casino: this.casino.id,
		seats_count: this.seats_count,
		seats_taken: this.seats_taken,
		gamers_count: this.gamers_count
	};
};

Room.prototype.details = function(){
	var gamers = this.gamers;
	
	var data = {};
	for(var i in gamers) {
		data[i] = gamers[i].getProfile();
	}
	
	return {
		id: this.id,
		type: this.type,
		name: this.name,
		casino: this.casino.id,
		seats_count: this.seats_count,
		seats_taken: this.seats_taken,
		gamers_count: this.gamers_count,
		gamers: data,
		seats: this.seats
	};
};

Room.prototype.tick = function() {
};

Room.prototype.close = function() {
	this.notifyAll('roomclose', 0);
	
	this.gamers = {};
	this.gamers_count = 0;
	
	var seats = this.seats;
	for(var i=0, len=seats.length; i<len; i++) {
		seats[i] = null;
	}
	this.seats_taken = 0;
};

Room.prototype.onMessage = function(message) {
	//console.log(this.id, message, typeof message);
	try {
		var req = JSON.parse(message);
		if(req && (typeof req === 'object')) {
			var room = this;
			var uid = req.uid;
			if(uid) {
				var method = room[ 'onGamer_' + req.f ];
				if(typeof method === 'function') {
					method.call(room, req);
					
				} else {
					room.pub.publish('user:#'+uid, JSON.stringify({ 
						f:'response', 
						seq:req.seq,
						err:404,
						ret:'method ' + req.f + ' not supported'
					}));
				}
			}
		}
	} catch( err ) {
		console.log(err);
	}
};

Room.prototype.response = function(req, err, ret) {
	var pub = this.pub;
	pub.publish('user:#' + req.uid, JSON.stringify({
		f: 'response',
		seq: req.seq,
		err: err,
		ret: ret
	}));
};

Room.prototype.notify = function(uid, event, args) {
	this.pub.publish('user:#'+uid, JSON.stringify({
		f:'event',
		uid: uid,
		e: event,
		args: args
	}));
};

Room.prototype.notifyAll = function(event, args) {
	var pub = this.pub;
	var gamers = this.gamers;
	for(var i in gamers) {
		var uid = gamers[i].uid;
		pub.publish('user:#'+uid, JSON.stringify({
			f:'event',
			uid: uid,
			e: event,
			args: args
		}));
	}
};

Room.prototype.notifyAllExcept = function(ex_uid, event, args) {
	var pub = this.pub;
	var gamers = this.gamers;
	for(var i in gamers) {
		var uid = gamers[i].uid;
		if(uid === ex_uid) continue;
		pub.publish('user:#'+uid, JSON.stringify({
			f:'event',
			uid: uid,
			e: event,
			args: args
		}));
	}
};

Room.prototype.onGamer_relogin = function(req) {
	var room = this;
	var uid = req.uid;
	var gamer = room.gamers[uid];
	
	room.notifyAll('relogin', {
		uid: req.uid,
		where: room.id
	});
	
	room.notify(uid, 'look', room.details());
	
	room.notify(req.uid, 'prompt', {
		exit:true,
		say: 'text',
		takeseat: ((gamer.seat>=0) ? null : true),
		unseat: ((gamer.seat>=0) ? true : null)
	});
};

Room.prototype.onGamer_drop = function(req) {
	var room = this;
	
	room.notifyAll('drop', {
		uid: req.uid,
		where: room.id
	});
};

Room.prototype.onGamer_enter = function(req) {
	var room = this;
	var uid = req.uid;
	var gamers = this.gamers;
	if(uid in gamers) return;
	
	var db = this.db;
	db.hgetall('user:#'+uid, function(err,ret){
		if(err) { room.response(req, 500, 'db err'); return; }
		if(! ret) { room.reponse(req, 404, 'user ' + uid + ' not found'); return; }
		
		var gamer = new Gamer().setProfile(ret);
		gamer.seat = -1;
		
		room.gamers[ uid ] = gamer;
		room.gamers_count ++;
		
		if(room.gamers_count >= room.seats_count) {
			db.zrem('game:#' + room.type + '#rooms_notfull', room.id);
		}
		
		room.notify(uid, 'look', room.details());
		
		room.notifyAll('enter', {
			who: gamer.getProfile(),
			where: room.id
		});
		
		room.notify(uid, 'prompt', {
			exit: true,
			say: 'text',
			takeseat: true
		});

		req.args = '';
		room.onGamer_takeseat(req);
	});
};

Room.prototype.onGamer_exit = function(req) {
	var room = this;
	var uid = req.uid;
	var gamers = this.gamers;
	if(!(uid in gamers)) return;
	
	var gamer = gamers[ uid ];
	if(gamer.seat >= 0) {
		room.onGamer_unseat(req);
	}
	
	room.notifyAll('exit', {
		uid: uid,
		where: room.id
	});
	
	delete room.gamers[uid];
	room.gamers_count --;

	if(room.gamers_count < room.seats_count) {
		var now = new Date().getTime();
		room.db.zadd('game:#' + room.type + '#rooms_notfull', now, room.id);
	}
	
	gamer.push('prompt', {
		exit: null,
		say: null,
		takeseat: null,
		unseat: null
	});

	this.response(req, 0, 'ok');
};

Room.prototype.onGamer_look = function(req) {
	this.response(req, 0, this.details());
};

Room.prototype.onGamer_say = function(req) {
	var room = this;
	room.notifyAll('say', {
		uid: req.uid,
		msg: req.args
	});
};

Room.prototype.onGamer_takeseat = function(req) {
	var room = this;
	var uid = req.uid;
	var gamers = this.gamers;
	var gamer = gamers[ uid ];
	if(gamer.seat >= 0) {
		this.response(req, 400, 'already seated at ' + gamer.seat);
		return false;
	}
	
	var seat = req.args, seats = room.seats;
	if((typeof seat !== 'string') || (seat.length === 0)) {
		for(var i=0, len=seats.length; i<len; i++) {
			if(seats[i] === null) {
				seat = i;
				break;
			}
		}
	}
	
	var seatid = parseInt(seat);
	if(seatid >=0 && seatid < this.seats_count) {
		var seated = this.seats[seatid];
		if( seated === null) {
			this.seats[seatid] = uid;
			gamer.seat = seatid;
			this.seats_taken ++;
			this.response(req, 0, 'ok');
			
			room.notifyAll('takeseat', {
				uid: uid,
				where: seatid
			});
			
			room.notify(uid, 'prompt', {
				unseat: true,
				takeseat: null
			});
			
			return true;
		} else {
			this.response(req, 403, 'seat ' + seatid + ' already taken by ' + seated);
		}
	} else {
		this.response(req, 400, 'invalid seat');
	}
	
	return false;
};

Room.prototype.onGamer_unseat = function(req) {
	var room = this;
	var uid = req.uid;
	var gamers = this.gamers;
	var gamer = gamers[ uid ];
	if(gamer.seat < 0) {
		this.response(req, 400, 'not in seat');
		return false;
	}
	
	var seatid = gamer.seat;
	this.seats[seatid] = null;
	this.seats_taken --;
	gamer.seat = -1;
	
	room.notifyAll('unseat', {
		uid: uid,
		where: seatid
	});

	room.notify(uid, 'prompt', {
		unseat: null,
		takeseat: true
	});
	
	this.response(req, 0, 'ok');
	
	return true;
};

