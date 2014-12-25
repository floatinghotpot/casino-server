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
		turn_countdown: 10,
		chip_base: 50
	};
	if(options && (typeof options === 'object')) {
		for(var i in options) defaults[i] = options[i];
	}
	
	Room.call(this, casino, typeid, roomid, defaults);
	
	this.first_turn = 0;
	
	this.ready_gamers = 0;
	this.ready_countdown = -1;
	
	this.is_ingame = false;
	
	this.turn_countdown = -1;
	this.in_gamers = [];
	this.cards = {};
	this.chips = {};
	
	this.all_chips = [];
	this.chip_total = 0;
	this.chip_min = 0;
	
	this.knowncards = {};
}

JinhuaGame.prototype = Object.create(Room.prototype);

JinhuaGame.prototype.constructor = JinhuaGame;

JinhuaGame.prototype.details = function() {
	var data = Room.prototype.details.call(this);
	
	// cards is not visible unless checked or showed
	data.cards = this.knowncards;
	data.chips = this.chips;
	data.all_chips = this.all_chips;
	data.chip_total = this.chip_total;
	data.chip_min = this.chip_min;
	
	return data;
};

JinhuaGame.prototype.tick = function() {
	Room.prototype.tick.call(this);
	
	var room = this;
	if(room.is_ingame) {
		var gamer = room.in_gamers[0];
		if(room.turn_countdown > 0) {
			room.notifyAll('countdown', {
				seat: gamer.seat,
				sec: room.turn_countdown
			});
			room.turn_countdown --;
			
		} else if(room.turn_countdown === 0) {
			// TODO: for test only
			room.gamerMoveTurn(true);
			//room.gamerGiveUp( gamer );
			
		} else {
			// not started, just wait
		}
		
	} else {
		if(room.ready_countdown > 0) {
			room.notifyAll('countdown', {
				seat: -1,
				sec: room.ready_countdown
			});
			room.ready_countdown --;
			
		} else if(room.ready_countdown === 0) {
			room.gameStart();
			
		} else {
			// not ready, just wait
		}
	}
};

JinhuaGame.prototype.gameStart = function() {
	var room = this;
	var seats = room.seats;
	var gamers = room.gamers;
	
	room.is_ingame = true;
	room.ready_countdown = -1;
	
	var in_gamers = room.in_gamers = [];
	var roomcards = room.cards = {};
	var knowncards = room.knowncards = {};
	var roomchips = room.chips = {};
	var i, j, uid, gamer, len=seats.length, first = this.first_turn;
	
	for(i=first; i<len; i++) {
		uid = seats[i];
		if(uid) {
			gamer = gamers[ uid ];
			if(gamer.is_ready) {
				in_gamers.push( gamer );
			}
		}
	}
	for(i=0; i<first; i++) {
		uid = seats[i];
		if(uid) {
			gamer = gamers[ uid ];
			if(gamer.is_ready) {
				in_gamers.push( gamer );
			}
		}
	}
	
	var ingame_seats = [];
	var deals = [];
	var fullcards = Poker.newSet(room.options);
	var unknown_cards = [0,0,0];
	var seat;
	for(j=0, len=in_gamers.length; j<len; j++) {
		gamer = in_gamers[j];
		seat = gamer.seat;
		
		room.ready_gamers --;
		
		gamer.is_ready = false;
		gamer.is_ingame = true;
		gamer.is_cardchecked = false;
		gamer.is_cardshowed = false;
		gamer.profile.coins -= room.chip_min;
		ingame_seats.push( seat );
		
		var gamercards = Poker.draw(fullcards, 3);
		deals.push( [ seat, unknown_cards ] );
		
		roomcards[ seat ] = gamercards;
		roomchips[ seat ] = 0;
		knowncards[ seat ] = unknown_cards;
	}
	
	room.chip_min = room.options.chip_base;
	room.notifyAll('deal', {
		seats: ingame_seats,
		chip: room.chip_min,
		deals: deals,
		delay: 3
	});
	
	setTimeout(function(){
		room.notifyAll('prompt', {
			giveup: true,
			checkcard: true
		});
		
		room.gamerMoveTurn(false);
		
	}, 3000);
};

JinhuaGame.prototype.gameOver = function() {
	var room = this;
	
	var in_gamers = room.in_gamers;
	
	if(in_gamers.length === 1) {
		var winner = in_gamers.shift();
		winner.coins += room.chip_total;
		winner.is_ingame = false;
		room.notifyAll('gameover',{
			seat: winner.seat,
			uid: winner.uid,
			prize: room.chip_total,
			cards: room.cards,
			chips: room.chips
		});
	} else {
		for(var i=0,len=in_gamers.length; i<len; i++) {
			in_gamers[i].is_ingame = false;
		}
		room.notifyAll('gameover', {
			seat: -1,
			uid: null,
			prize: 0,
			cards: {},
			chips: {}
		});
	}
	
	room.notifyAll('prompt', {
		giveup: null,
		pk: null,
		addchip: null,
		follow: null,
		showcard: null,
		checkcard: null,
		ready: true
	});

	room.is_ingame = false;
	room.turn_countdown = -1;
	room.in_gamers = [];	// [ gamer, gamer, ... ]
	room.cards = {};	// seat -> cards
	room.chips = {}; 	// seat -> n
	room.all_chips = []; // n, n, n, ...
	room.chip_total = 0;
	room.chip_min = room.options.chip_min;
};

JinhuaGame.prototype.gamerMoveTurn = function(move) {
	var room = this;
	var in_gamers = room.in_gamers;
	
	if(move) {
		var last = in_gamers.shift();
		in_gamers.push( last );
		
		room.notify(last.uid, 'prompt', {
			pk: null,
			addchip: null,
			follow: null,
			showcard: null
		});
	}

	var next = in_gamers[0];
	room.turn_countdown = room.options.turn_countdown;
	
	room.notifyAll('moveturn', {
		seat: next.seat,
		uid: next.uid,
		countdown: room.turn_countdown
	});
	
	var pk_targets = [];
	for(var i=1; i<in_gamers.length; i++) {
		pk_targets.push(in_gamers[i].uid);
	}
	
	room.notify(next.uid, 'prompt', {
		pk: pk_targets,
		addchip: [ room.chip_min * 2, room.chip_min * 3, room.chip_min * 4 ],
		follow: true,
		showcard: (next.is_cardshowed) ? null : true
	});
};

JinhuaGame.prototype.gamerGiveUp = function( gamer ) {
	var room = this;
	
	room.notifyAll('giveup', {
		seat: gamer.seat,
		uid: gamer.uid
	});
	
	room.gamerLose( gamer );
};

JinhuaGame.prototype.gamerLose = function(gamer) {
	var room = this;
	
	var is_myturn = false;
	var in_gamers = room.in_gamers;
	for(var i=0, len=in_gamers.length; i<len; i++) {
		if(in_gamers[i].seat === gamer.seat) {
			in_gamers.splice(i, 1);
			is_myturn = (i === 0);
			break;
		}
	}
	
	gamer.is_ingame = false;

	room.notify(gamer.uid, 'prompt', {
		giveup: null,
		pk: null,
		addchip: null,
		follow: null,
		showcard: null,
		checkcard: null
	});
	
	if(in_gamers.length > 1) {
		if(is_myturn) room.gamerMoveTurn(false);
	} else {
		room.gameOver();
	}
};


JinhuaGame.prototype.onGamer_ready = function(req) {
	var room = this;
	var uid = req.uid;
	var gamer = room.gamers[ uid ];
	
	if(gamer.seat < 0) {
		room.response(req, 400, 'you must take a seat to play'); return;
	}
	
	if(room.is_ingame) {
		room.response(req, 400, 'game already started, wait next round'); return;
	}
	
	if(gamer.is_ingame) {
		room.response(req, 400, 'you already in game'); return;
	}
	
	if(gamer.is_ready) {
		room.response(req, 400, 'you already ready'); return;
	}
	
	gamer.is_ready = true;
	room.ready_gamers ++;
	room.response(req, 0, 'ok');
	
	room.notifyAll('ready', {
		uid: uid,
		where: gamer.seat
	});
	
	room.notify(uid, 'prompt', {
		ready: null
	});
	
	if(room.ready_gamers >= 2) {
		if(room.ready_gamers === room.seats_taken) {
			room.gameStart();
			
		} else if(room.ready_gamers === 2) {
			room.ready_countdown = room.options.ready_countdown;
			room.notifyAll('countdown', {
				seat: -1,
				sec: room.ready_countdown
			});
		}
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
	if(gamer.is_ingame) {
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
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(! gamer.is_ingame) {
		room.response(req, 400, 'no in game'); return;
	}
	
	room.gamerGiveUp( gamer );
	
	room.response(req, 0, 'ok');
};

JinhuaGame.prototype.onGamer_follow = function(req) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(! gamer.is_ingame) {
		room.response(req, 400, 'no in game'); return;
	}
	
	var n = room.chip_min;
	
	if(n > gamer.profile.coins) {
		room.response(req, 400, 'no enough coins to follow: ' + n);
		return;
	}
	
	gamer.profile.coins -= n;
	room.chip_total += n;
	room.all_chips.push(n);
	room.chips[ gamer.seat ] += n;
	
	room.notifyAll('follow', {
		seat: gamer.seat,
		uid: gamer.uid,
		chip: n
	});
	
	room.response(req, 0, 'ok');
};

JinhuaGame.prototype.onGamer_addchip = function(req) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(! gamer.is_ingame) {
		room.response(req, 400, 'no in game'); return;
	}
	
	var n = parseInt( req.args );
	if(isNaN(n) || (n<room.chip_min) || (n > gamer.profile.coins)) {
		room.response(req, 400, 'invalid chip to add: ' + n);
		return;
	}
	
	gamer.profile.coins -= n;
	room.chip_total += n;
	room.all_chips.push(n);
	room.chips[ gamer.seat ] += n;
	
	room.notifyAll('addchip', {
		seat: gamer.seat,
		uid: gamer.uid,
		chip: n
	});
	
	room.response(req, 0, 'ok');
};

JinhuaGame.prototype.onGamer_pk = function(req) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(! gamer.is_ingame) {
		room.response(req, 400, 'no in game'); return;
	}
	
	var pk_uid = req.args;
	var pk_gamer = gamers[ pk_uid ];
	if((! pk_gamer) && (! pk_gamer.is_ingame)) {
		room.response(req, 400, 'pk target no in game'); return;
	}
	
	var roomcards = room.cards;
	var mycards = roomcards[ gamer.seat ];
	var pkcards = roomcards[ pk_gamer.seat ]; 
	
	var pk_win = (Jinhua.compare(mycards, pkcards) > 0);
	
	room.notifyAll('pk', {
		seat: gamer.seat,
		uid: gamer.uid,
		pk_seat: pk_gamer.seat,
		pk_uid: pk_uid,
		win: pk_win
	});
	
	room.gamerLose( pk_win ? gamer : target );
	
	room.response(req, 0, 'ok');
};

JinhuaGame.prototype.onGamer_checkcard = function(req) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(! gamer.is_ingame) {
		room.response(req, 400, 'no in game'); return;
	}
	
	gamer.is_cardchecked = true;
	room.response(req, 0, 'ok');
	
	var mycards = room.cards[ gamer.seat ];
	
	room.notify(uid, 'prompt', {
		checkcard: null
	});
	
	room.notify(uid, 'checkcard', {
		seat: gamer.seat,
		uid: uid,
		cards: mycards
	});
	
	room.notifyAllExcept(uid, 'checkcard', {
		seat: gamer.seat,
		uid: uid
	});
};

JinhuaGame.prototype.onGamer_showcard = function(req) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(! gamer.is_ingame) {
		room.response(req, 400, 'no in game'); return;
	}
	
	gamer.is_cardshowed = true;
	var mycards = room.cards[ gamer.seat ];
	room.knowncards = mycards;
	
	room.notify(uid, 'prompt', {
		showcard: null
	});
	
	room.notifyAll('showcard', {
		seat: gamer.seat,
		uid: gamer.uid,
		cards: mycards
	});

	room.response(req, 0, 'ok');
};

JinhuaGame.prototype.onGamer_relogin = function(req) {
	Room.prototype.onGamer_relogin.call(this, req);

	var room = this, uid = req.uid;
	
	var gamer = room.gamers[ uid ];
	if(gamer.seat >= 0) {
		if(gamer.is_cardchecked) {
			room.notify(uid, 'checkcard', {
				seat: gamer.seat,
				uid: uid,
				cards: room.cards[ gamer.seat ]
			});
		}
		
		var is_myturn = false;
		var cmds = {
			ready: true,
			giveup: null,
			checkcard: null
		};
		if(gamer.is_ready || gamer.is_ingame) cmds.ready = null;
		if(gamer.is_ingame) {
			cmds.giveup = true;
			if((!gamer.is_cardchecked) && (!gamer.is_cardshowed)) cmds.checkcard = true;
			var next = room.in_gamers[0];
			is_myturn = (next.seat === gamer.seat);
		}
		room.notify(uid, 'prompt', cmds);
		
		if(is_myturn) {
			room.gamerMoveTurn(false);
		}
	}
};

JinhuaGame.prototype.close = function() {
	var room = this;
	if(room.is_ingame) {
		room.gameOver();
	}

	Room.prototype.close.call(this);
};


