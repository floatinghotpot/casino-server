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
		ante: 50,			// 锅底
		chip_min: 50,		// 最少投注
		chip_max: -1,		// 最大投注
		raise_min: 50,		// 最少加注
		poll_top: -1,		// 封顶
		raise_multiple: false,
		rake: 0.05
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
	
	this.pool_chips = [];
	this.pool = 0;
	this.call_chip = 0;
	this.round_counter = 1;
	
	this.knowncards = {};
}

JinhuaGame.prototype = Object.create(Room.prototype);

JinhuaGame.prototype.constructor = JinhuaGame;

JinhuaGame.prototype.details = function() {
	var data = Room.prototype.details.call(this);
	
	// cards is not visible unless checked or showed
	data.cards = this.knowncards;
	data.chips = this.chips;
	data.pool_chips = this.pool_chips;
	data.pool = this.pool;
	data.call_chip = this.call_chip;
	
	return data;
};

JinhuaGame.prototype.tick = function() {
	Room.prototype.tick.call(this);
	
	var room = this;
	if(room.is_ingame && (room.in_gamers.length > 0)) {
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
	
	room.pool_chips = []; // n, n, n, ...
	room.pool = 0;
	room.call_chip = room.options.chip_min;
	room.round_counter = 1;

	var in_gamers = room.in_gamers = [];
	var roomcards = room.cards = {};
	var knowncards = room.knowncards = {};
	var roomchips = room.chips = {};
	var i, j, uid, gamer, len=seats.length, first = room.first_turn;
	
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
	
	room.ingame_gamers = in_gamers.length;
	room.first_turn = in_gamers[0].seat;
	
	var ingame_seats = [];
	var deals = [];
	var fullcards = Poker.newSet(room.options);
	var unknown_cards = [0,0,0];
	var seat;
	var ante = room.options.ante;
	for(j=0, len=in_gamers.length; j<len; j++) {
		gamer = in_gamers[j];
		seat = gamer.seat;
		
		room.ready_gamers --;
		
		gamer.is_ready = false;
		gamer.is_ingame = true;
		gamer.is_cardseen = false;
		gamer.is_cardshowed = false;
		gamer.profile.coins -= ante;
		room.pool += ante;
		
		ingame_seats.push( seat );
		
		roomcards[ seat ] = Jinhua.sort( Poker.draw(fullcards, 3) );
		roomchips[ seat ] = ante;
		
		knowncards[ seat ] = unknown_cards;
		deals.push( [ seat, unknown_cards ] );
	}
	
	room.notifyAll('gamestart', {
		seats: ingame_seats,
		ante: room.chips_min
	});
	
	room.notifyAll('deal', {
		deals: deals,
		delay: 3
	});
	
	setTimeout(function(){
		room.notifyAll('prompt', {
			fold: true,
			seecard: true
		});
		
		room.gamerMoveTurn(false);
		
	}, 3000);
};

JinhuaGame.prototype.gameOver = function() {
	var room = this;
	
	var in_gamers = room.in_gamers;
	
	if(in_gamers.length === 1) {
		var winner = in_gamers.shift();
		winner.is_ingame = false;
		winner.profile.exp += 2;
		winner.profile.score ++;
		var prize = Math.round( room.pool * (1 - room.options.rake));
		winner.profile.coins += prize;
		
		room.notifyAll('gameover',{
			seat: winner.seat,
			uid: winner.uid,
			prize: prize,
			cards: room.cards,
			chips: room.chips
		});
		
		room.first_turn = winner.seat;
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
		fold: null,
		pk: null,
		raise: null,
		call: null,
		showcard: null,
		seecard: null,
		ready: true
	});

	room.is_ingame = false;
	room.turn_countdown = -1;
	room.in_gamers = [];	// [ gamer, gamer, ... ]
	room.cards = {};	// seat -> cards
	room.chips = {}; 	// seat -> n
	room.pool_chips = []; // n, n, n, ...
	room.pool = 0;
	room.call_chip = room.options.call_chip;
};

JinhuaGame.prototype.gamerMoveTurn = function(move) {
	var room = this;
	var in_gamers = room.in_gamers;
	
	var last, next, i, add;
	
	if(move) {
		last = in_gamers[0];
		room.notify(last.uid, 'prompt', {
			pk: null,
			raise: null,
			call: null,
			showcard: null
		});
		
		do {
			in_gamers.push( in_gamers.shift() );
			
			next = in_gamers[0];
			if(next.seat === room.first_turn) room.round_counter ++;
			
			// we find the next one in game
			if(next.is_ingame) break;
			
			// to avoid dead loop
			if(next.seat === last.seat) break;
			
		} while(true);
	}

	next = in_gamers[0];
	room.turn_countdown = room.options.turn_countdown;
	
	room.notifyAll('moveturn', {
		seat: next.seat,
		uid: next.uid,
		round: this.round_counter,
		countdown: room.turn_countdown
	});
	
	var pk_targets = null;
	
	if(room.round_counter >= 2) {
		pk_targets = [];
		for(i=1; i<in_gamers.length; i++) {
			var other = in_gamers[i];
			if(other.is_ingame) {
				pk_targets.push(other.uid);
			}
		}
	}
	
	var chip_max = room.options.chip_max;
	var add_options = [];
	if(room.options.raise_multiple) {
		for(i=1; i<=3; i++) {
			add = room.call_chip + room.call_chip * i;
			if(chip_max > 0) {
				if(add > chip_max) continue;
			}
			add_options.push( add );
		}
	} else {
		for(i=1; i<=3; i++) {
			add = room.call_chip + room.options.raise_min * i;
			if(chip_max > 0) {
				if(add > chip_max) continue;
			}
			add_options.push( add );
		}
	}
	
	room.notify(next.uid, 'prompt', {
		pk: pk_targets,
		raise: add_options,
		call: true,
		showcard: (next.is_cardshowed) ? null : true
	});
};

JinhuaGame.prototype.gamerGiveUp = function( gamer ) {
	var room = this;
	
	room.notifyAll('fold', {
		seat: gamer.seat,
		uid: gamer.uid
	});
	
	room.gamerLose( gamer );
};

JinhuaGame.prototype.gamerLose = function(loser) {
	var room = this;
	var in_gamers = room.in_gamers;
	var is_myturn = (loser.seat === in_gamers[0].seat);
	
	loser.is_ingame = false;
	loser.profile.exp ++;
	//loser.profile.score --;
	
	room.ingame_gamers --;
	
	room.notify(loser.uid, 'prompt', {
		fold: null,
		check: null,
		call: null,
		raise: null,
		seecard: null,
		pk: null,
	});
	
	if(room.ingame_gamers > 1) {
		if(is_myturn) room.gamerMoveTurn(false);
	} else {
		room.gameOver();
	}
};


JinhuaGame.prototype.onGamer_ready = function(req, reply) {
	var room = this;
	var uid = req.uid;
	var gamer = room.gamers[ uid ];
	
	if(gamer.seat < 0) {
		reply(400, 'you must take a seat to play'); return;
	}
	
	if(room.is_ingame) {
		reply(400, 'game already started, wait next round'); return;
	}
	
	if(gamer.is_ingame) {
		reply(400, 'you already in game'); return;
	}
	
	if(gamer.is_ready) {
		reply(400, 'you already ready'); return;
	}
	
	gamer.is_ready = true;
	room.ready_gamers ++;
	
	room.notifyAll('ready', {
		uid: uid,
		where: gamer.seat
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
	
	reply(0, {
		cmds: {
			ready: null
		}
	});
};

JinhuaGame.prototype.onGamer_takeseat = function(req, reply) {
	Room.prototype.onGamer_takeseat.call(this, req, function(err,ret){
		if(! err) {
			if(! ret.cmds) ret.cmds = {};
			ret.cmds.ready = true;
		}
		reply(err, ret);
	});
};

JinhuaGame.prototype.onGamer_unseat = function(req, reply) {
	var room = this;
	var uid = req.uid;
	var gamer = room.gamers[ uid ];

	var cmds = {};
	
	if(gamer.is_ingame) {
		room.onGamer_fold(req, function(e,r){
			if((!e) && r.cmds) {
				for(var i in r.cmds) cmds[i] = r.cmds[i];
			}
		});
	}

	if(gamer.is_ready) {
		gamer.is_ready = false;
		room.ready_gamers --;
	}
	
	cmds.ready = null;
	
	Room.prototype.onGamer_unseat.call(this, req, function(e,r){
		if((!e) && r.cmds) {
			for(var i in r.cmds) cmds[i] = r.cmds[i];
		}
	});
	
	reply(0, {
		cmds: cmds
	});
};

JinhuaGame.prototype.onGamer_fold = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(gamer.is_ingame) {
		room.gamerGiveUp( gamer );
		reply(0, {});
	} else {
		reply(400, 'no in game');
	}
};

JinhuaGame.prototype.onGamer_call = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	var n = room.call_chip;
	if(gamer.is_cardseen) n = n * 2;
	if(n > gamer.profile.coins) {
		reply(400, 'no enough coins to call: ' + n); return;
	}
	
	gamer.profile.coins -= n;
	room.pool += n;
	room.pool_chips.push(n);
	room.chips[ gamer.seat ] += n;
	
	room.notifyAll('call', {
		seat: gamer.seat,
		uid: gamer.uid,
		call: n
	});
	
	reply(0, {});
	
	room.gamerMoveTurn(true);
};

JinhuaGame.prototype.onGamer_raise = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
		
	var add = parseInt( req.args );
	var chip_max = room.options.chip_max;
	if(isNaN(add) || (add < room.call_chip) || ((chip_max > 0) && (add > chip_max))) {
		reply(400, 'invalid chip to add: ' + n); return;
	}
	
	var n = (gamer.is_cardseen) ? (add * 2) : add;
	if(n > gamer.profile.coins) {
		reply(400, 'no enough coins to add: ' + n); return;
	}
	
	room.call_chip = add;
	
	gamer.profile.coins -= n;
	room.pool += n;
	room.pool_chips.push(n);
	room.chips[ gamer.seat ] += n;
	
	room.notifyAll('raise', {
		seat: gamer.seat,
		uid: gamer.uid,
		call: 0,
		raise: n
	});
	
	reply(0, {});
	
	room.gamerMoveTurn(true);
};

JinhuaGame.prototype.onGamer_pk = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(gamer.is_ingame) {
		room.response(req, 400, 'no in game'); return;
	}

	var pk_uid = req.args;
	var pk_gamer = gamers[ pk_uid ];
	if(pk_gamer && pk_gamer.is_ingame) {
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
		
		reply(0, {});
		
		room.gamerLose( pk_win ? pk_gamer : gamer );
		
	} else {
		reply(400, 'pk target no in game');
	}
};

JinhuaGame.prototype.onGamer_seecard = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(gamer.is_ingame) {
		gamer.is_cardseen = true;
		
		var mycards = room.cards[ gamer.seat ];
		room.notify(uid, 'seecard', {
			seat: gamer.seat,
			uid: uid,
			cards: mycards
		});
		
		room.notifyAllExcept(uid, 'seecard', {
			seat: gamer.seat,
			uid: uid
		});
		
		reply(0, {
			cmds: {
				seecard: null
			}
		});

	} else {
		reply(400, 'no in game');
	}
	
};

JinhuaGame.prototype.onGamer_showcard = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(gamer.is_ingame) {
		gamer.is_cardshowed = true;
		
		var mycards = room.cards[ gamer.seat ];
		room.knowncards[ gamer.seat ] = mycards;
		room.notifyAll('showcard', {
			seat: gamer.seat,
			uid: gamer.uid,
			cards: mycards
		});

		reply(0, {
			cmds: {
				showcard: null
			}
		});
		
	} else {
		reply(400, 'no in game');
	}
};

JinhuaGame.prototype.onGamer_relogin = function(req, reply) {
	Room.prototype.onGamer_relogin.call(this, req, reply);

	var room = this, uid = req.uid;
	
	var gamer = room.gamers[ uid ];
	if(gamer.seat >= 0) {
		if(gamer.is_cardseen) {
			room.notify(uid, 'seecard', {
				seat: gamer.seat,
				uid: uid,
				cards: room.cards[ gamer.seat ]
			});
		}
		
		var is_myturn = false;
		var cmds = {
			ready: true,
			fold: null,
			seecard: null
		};
		if(gamer.is_ready || gamer.is_ingame) cmds.ready = null;
		if(gamer.is_ingame) {
			cmds.fold = true;
			if((!gamer.is_cardseen) && (!gamer.is_cardshowed)) cmds.seecard = true;
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


