var Gamer = require('./gamer'),
	Room = require('./room'),
	Poker = require('./poker'),
	Jinhua = require('./jinhua_poker');

exports = module.exports = JinhuaGame;

function JinhuaGame( casino, typeid, roomid, options ) {
	var defaults = {
		max_seats: 6,
		no_joker: true,
		no_color: [],
		no_number: [],
		ready_countdown: 10,
		play_countdown: 20
	};
	if(options && (typeof options === 'object')) {
		for(var i in options) defaults[i] = options[i];
	}
	
	Room.call(this, casino, typeid, roomid, defaults);
	
	this.timer = 0;
	this.ready_gamers = 0;
	this.in_game = false;
	this.seat_in_turn = -1;
	this.ready_countdown = 0;
	this.play_countdown = 0;
}

JinhuaGame.prototype = Object.create(Room.prototype);

JinhuaGame.prototype.constructor = JinhuaGame;

JinhuaGame.prototype.tick = function() {
	Room.prototype.tick.call(this);
	
	var room = this;
	if(room.in_game) {
		
	} else {
		if(room.ready_countdown > 0) {
			if((-- room.ready_countdown) > 0) {
				room.notifyAll('countdown', {
					seat: -1,
					sec: room.ready_countdown
				});
			} else {
				room.startGame();
			}
		}
	}
};

JinhuaGame.prototype.startGame = function() {
	var room = this;
	
	room.in_game = true;
	
	var in_gamers = room.in_gamers = [];
	var seats = room.seats;
	var gamers = room.gamers;
	var i, j, len, uid, gamer;
	for(i=0, len=seats.length; i<len; i++) {
		uid = seats[i];
		if(uid) {
			gamer = gamers[ uid ];
			if(gamer.is_ready) {
				gamer.is_ready = false;
				gamer.in_game = true;
				gamer.cards = [];
				in_gamers.push( gamer );
			}
		}
	}
	
	var deals = [];
	var fullcards = Poker.newSet(room.options);
	for(j=0, len=in_gamers.length; j<len; j++) {
		gamer = in_gamers[j];
		gamer.cards = Poker.draw(fullcards, 3);
		deals.push( [ gamer.seat, gamer.cards ] );
	}
	
	room.notifyAll('deal', deals);
};

JinhuaGame.prototype.onGamer_ready = function(req) {
	var room = this;
	var uid = req.uid;
	var gamer = room.gamers[ uid ];
	var seat = gamer.seat;
	if(seat < 0) {
		room.response(req, 400, 'you must take a seat to play'); return;
	}
	
	if(gamer.in_game) {
		room.response(req, 400, 'already in game'); return;
	}
	
	if(gamer.is_ready) {
		room.response(req, 400, 'already ready'); return;
	}
	
	gamer.is_ready = true;
	room.ready_gamers ++;
	room.response(req, 0, 'ok');
	
	room.notify(uid, 'prompt', {
		ready: null
	});
	
	room.notifyAll('ready', {
		uid: uid,
		where: seat
	});
	
	if(room.ready_gamers === room.seats_taken) {
		room.startGame();
		
	} else if(room.ready_gamers === 2) {
		room.ready_countdown = room.options.ready_countdown;
		room.notifyAll('countdown', {
			seat: -1,
			sec: room.ready_countdown
		});
	}
};

JinhuaGame.prototype.onGamer_takeseat = function(req) {
	var uid = req.uid;
	var ok = Room.prototype.onGamer_takeseat.call(this, req);
	if(ok) {
		this.notify(uid, 'prompt', {
			ready: true
		});
	}
	return ok;
};

JinhuaGame.prototype.onGamer_unseat = function(req) {
	var uid = req.uid;
	var gamer = this.gamers[ uid ];
	if(gamer.in_game) {
		this.onGamer_giveup(req);
		
	} else if(gamer.is_ready) {
		gamer.is_ready = false;
		this.ready_gamers --;
	}
	
	this.notify(uid, 'prompt', {
		ready: null
	});
	
	return Room.prototype.onGamer_unseat.call(this, req);
};

JinhuaGame.prototype.onGamer_giveup = function(req) {
	//this.response(req, 0, this.details());
};

JinhuaGame.prototype.onGamer_followchip = function(req) {
	//this.response(req, 0, this.details());
};

JinhuaGame.prototype.onGamer_addchip = function(req) {
	//this.response(req, 0, this.details());
};

JinhuaGame.prototype.onGamer_pk = function(req) {
	//this.response(req, 0, this.details());
};

JinhuaGame.prototype.onGamer_checkcard = function(req) {
	//this.response(req, 0, this.details());
};

JinhuaGame.prototype.onGamer_showcard = function(req) {
	//this.response(req, 0, this.details());
};

JinhuaGame.prototype.close = function() {
	// TODO: 

	Room.prototype.close.call(this);
};


