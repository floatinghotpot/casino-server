var Gamer = require('./gamer'),
	Poker = require('./poker'),
	Jinhua = require('./jinhua_poker');

exports = module.exports = JinhuaGame;

function JinhuaGame( casino, typeid, roomid, options ) {
	if(!(this instanceof JinhuaGame)) return new JinhuaGame( casino, typeid, roomid, options );
	
	this.casino = casino;
	this.db = casino.db;
	this.pub = casino.pub;
	
	this.id = roomid;
	this.type = typeid;
	this.name = '';
	
	this.options = {
		no_joker: true,
		no_color: [],
		no_number: [],
		max_seats: 6
	};
	
	if(options && (typeof options === 'object')) {
		for(var i in options) this.options[i] = options[i];
	}
	
	this.seats_count = this.options.max_seats;
	this.seats = [];
	for(var i=0; i<this.seats_count; i++) {
		this.seats.push(null);
	}
	
	this.seats_taken = 0;
	
	this.gamers = {};
	this.gamers_count = 0;
	
	this.ready_gamers = 0;
	this.in_game = false;
	this.timer = 0;
	this.game_tick = 0;
}

JinhuaGame.prototype.setName = function(name) {
	this.name = name;
};

JinhuaGame.prototype.brief = function(){
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

JinhuaGame.prototype.details = function(){
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

JinhuaGame.prototype.tick = function() {
	this.game_tick ++;
	console.log('tick: ' + this.game_tick);
	
	var game = this;
	if(! game.in_game) {
		if(game.ready_gamers < 2) return;
		else {
			var room = game.room;
			if((game.ready_gamers == room.seats_taken) || (game.ready_counter <= 0)) game.gameStart();
			else {
				game.room.emit('countdown', {
					who: null,
					counter: game.ready_counter
				});
				game.ready_counter --;
				return;
			}
		}
	}
};

JinhuaGame.prototype.close = function() {
	this.event('roomclose', 0);
	
	this.gamers = {};
	this.gamers_count = 0;
	
	var seats = this.seats;
	for(var i=0, len=seats.length; i<len; i++) {
		seats[i] = null;
	}
	this.seats_taken = 0;
};

JinhuaGame.prototype.onMessage = function(message) {
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

JinhuaGame.prototype.event = function(event, args) {
	//console.log('event', event, args);
	
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

JinhuaGame.prototype.response = function(req, err, ret) {
	var pub = this.pub;
	
	pub.publish('user:#' + req.uid, JSON.stringify({
		f: 'response',
		seq: req.seq,
		err: err,
		ret: ret
	}));
};

JinhuaGame.prototype.onGamer_enter = function(req) {
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
		
		room.event('enter', {
			who: gamer.getProfile(),
			where: room.id
		});
	});
};

JinhuaGame.prototype.onGamer_exit = function(req) {
	var room = this;
	var uid = req.uid;
	var gamers = this.gamers;
	if(!(uid in gamers)) return;
	
	var gamer = gamers[ uid ];
	if(gamer.seat >= 0) {
		room.seats[ gamer.seat ] = null;
		gamer.seat = -1;
	}
	
	room.event('exit', {
		who: gamer.getProfile(),
		where: room.id
	});
	
	delete room.gamers[uid];
	room.gamers_count --;
};

JinhuaGame.prototype.onGamer_look = function(req) {
	this.response(req, 0, this.details());
};

JinhuaGame.prototype.onGamer_takeseat = function(req) {
	var room = this;
	var uid = req.uid;
	var gamers = this.gamers;
	var gamer = gamers[ uid ];
	if(gamer.seat >= 0) {
		this.response(req, 400, 'already seated at ' + gamer.seat);
		return;
	}
	
	var seatid = parseInt(req.args);
	if(seatid >=0 && seatid < this.seats_count) {
		var seated = this.seats[seatid];
		if( seated == null) {
			this.seats[seatid] = uid;
			gamer.seat = seatid;
			this.response(req, 0, 'ok');
			
			room.event('takeseat', {
				who: gamer.getProfile(),
				where: seatid
			});
			room.event('look', room.details());
		} else {
			this.response(req, 403, 'seat ' + seatid + ' already taken by ' + seated);
		}
	} else {
		this.response(req, 400, 'invalid seat');
	}
};

JinhuaGame.prototype.onGamer_unseat = function(req) {
	var room = this;
	var uid = req.uid;
	var gamers = this.gamers;
	var gamer = gamers[ uid ];
	if(gamer.seat < 0) {
		this.response(req, 400, 'not in seat');
		return;
	}
	
	var seatid = gamer.seat;
	this.seats[seatid] = null;
	gamer.seat = -1;
	this.response(req, 0, 'ok');
	
	room.event('unseat', {
		who: gamer.getProfile(),
		where: seatid
	});
	room.event('look', room.details());
};

