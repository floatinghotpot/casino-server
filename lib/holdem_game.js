var Gamer = require('./gamer'),
	Room = require('./room'),
	Poker = require('./poker'),
	Holdem = require('./holdem_poker');

exports = module.exports = HoldemGame;

var GAME_OVER = 0,
	SMALL_BLIND = 1,
	BIG_BLIND = 2,
	DEAL2 = 3,
	PREFLOP = 4,
	DEAL_FLOP = 5,
	FLOP = 6,
	DEAL_TURN = 7,
	TURN = 8,
	DEAL_RIVER = 9,
	RIVER = 10,
	SHOWDOWN = 11;

var LIMIT = 0,
	POT_LIMIT = 1,
	NO_LIMIT = 2;
	
var STATE = {
	0: 'gameover',
	1: 'ready',
	2: 'binds',
	3: 'deal2',
	4: 'preflop',
	5: 'deal_flop',
	6: 'flop',
	7: 'deal_turn',
	8: 'turn',
	9: 'deal_river',
	10: 'river',
	11: 'showdown'
};

function HoldemGame( casino, typeid, roomid, options ) {
	var defaults = {
		max_seats: 10,
		no_joker: true,
		no_color: [],
		no_number: [],
		ready_countdown: 10,
		turn_countdown: 10,
		limit_rule: 0,		// limit
		limit_bottom: 100,
		limit_top: 200,		// -1, means no limit
	};
	if(options && (typeof options === 'object')) {
		for(var i in options) defaults[i] = options[i];
	}
	
	Room.call(this, casino, typeid, roomid, defaults);
	
	this.raise_per_round = this.options.rule_limit ? 3 : -1;
	this.raise_counter = 0;
	
	this.ready_gamers = 0;
	this.ready_countdown = -1;
	
	this.is_ingame = false;
	this.state = GAME_OVER;
	this.dealer_seat = 0;
	this.big_blind = 100;
	
	this.in_gamers = [];
	this.turn_countdown = -1;
	
	this.deal_order = [];
	this.cards = {};
	this.public_cards = [];
	
	this.chips = {};
	
	this.preflop_chips = [];
	this.flop_chips = [];
	this.turn_chips = [];
	this.river_chips = [];
	
	this.pool = 0;
	this.call_chip = 0;
	this.last_raise = 0;
	
}

HoldemGame.LIMIT = LIMIT;
HoldemGame.POT_LIMIT = POT_LIMIT;
HoldemGame.NO_LIMIT = NO_LIMIT;

HoldemGame.prototype = Object.create(Room.prototype);

HoldemGame.prototype.constructor = HoldemGame;

HoldemGame.prototype.details = function() {
	var data = Room.prototype.details.call(this);

	data.cards = this.cards;
	data.chips = this.chips;
	data.pool = this.pool;
	data.call_chip = this.call_chip;
	data.last_raise = this.last_raise;

	data.public_cards = this.public_cards;
	
	data.preflop_chips = this.preflop_chips;
	data.flop_chips = this.flop_chips;
	data.turn_chips = this.turn_chips;
	data.river_chips = this.river_chips;

	return data;
};

HoldemGame.prototype.tick = function() {
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

HoldemGame.prototype.dealCards = function() {
	var room = this;
	var fullcards = room.fullcards;
	var gamers = room.deal_order;
	var roomcards = room.cards = {};
	var knowncards = room.knowncards = {};
	
	var deals = [];
	var i, gamer;
	var unknown_cards = [0,0];
	for(i=0; i<gamers.length; i++) {
		gamer = gamers[i];
		if(gamer.is_ingame) {
			roomcards[ gamer.seat ] = Poker.sort( Poker.draw(fullcards, 2) );
			
			knowncards[ gamer.seat ] = unknown_cards;
			deals.push([ gamer.seat, unknown_cards ]);
		}
	}
	
	room.notifyAll('deal', {
		deals: deals,
		delay: 0
	});
};

HoldemGame.prototype.dealPublic = function(n) {
	var room = this;
	
	var cards = Poker.draw(room.fullcards, n);
	
	room.public_cards = Poker.sort( Poker.merge(room.public_cards, cards) );

	room.notifyAll('dealpublic', {
		cards: cards,
		delay: 0
	});
};

HoldemGame.prototype.gameStart = function() {
	var room = this;
	var seats = room.seats;
	var gamers = room.gamers;
	
	room.is_ingame = true;
	room.ready_countdown = -1;
	room.big_blind = room.options.limit_bottom;
	room.fullcards = Poker.newSet(room.options);
	
	room.call_chip = 0;
	room.last_raise = room.big_blind;
	
	room.cards = {};
	room.public_cards = [];
	
	room.preflop_chips = [];
	room.flop_chips = [];
	room.turn_chips = [];
	room.river_chips = [];
	room.pool = 0;
	
	room.chips = {};

	var in_gamers = room.in_gamers = [];
	var i, j, uid, gamer, first = room.dealer_seat;
	
	for(i=first; i<seats.length; i++) {
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
	
	var deal_order = room.deal_order = [];
	var in_seats = [];
	for(j=0; j<in_gamers.length; j++) {
		gamer = in_gamers[j];
		
		room.ready_gamers --;
		gamer.is_ready = false;
		gamer.is_ingame = true;
		gamer.is_cardseen = false;
		
		deal_order.push( gamer );
		in_seats.push( gamer.seat );
	}
	
	room.notifyAll('gamestart', {
		seats: in_seats,
		ante: 0,
		big_blind: room.big_blind
	});
	
	room.state = SMALL_BLIND;
	
	var is_headsup_1vs1 = (in_gamers.length <= 2);
	room.gamerMoveTurn(is_headsup_1vs1 ? false : true);
};

HoldemGame.prototype.gameOver = function() {
	var room = this;
	
	var in_gamers = room.in_gamers;
	
	if(in_gamers.length === 1) {
		var winner = in_gamers.shift();
		winner.coins += room.pool;
		winner.is_ingame = false;
		room.notifyAll('gameover',{
			seat: winner.seat,
			uid: winner.uid,
			prize: room.pool,
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
		fold: null,
		pk: null,
		raise: null,
		call: null,
		seecard: null,
		all_in: null,
		ready: true
	});

	room.is_ingame = false;
	room.turn_countdown = -1;
	room.in_gamers = [];	// [ gamer, gamer, ... ]
	room.cards = {};	// seat -> cards
	room.chips = {}; 	// seat -> n
	room.preflop_chips = []; // n, n, n, ...
	room.turn_chips = []; // n, n, n, ...
	room.river_chips = []; // n, n, n, ...
	room.pool = 0;
	room.call_chip = room.options.ante;
};

HoldemGame.prototype.cmdsForGamer = function(gamer) {
	var room = this;
	var limit_rule = room.options.limit_rule;
	var raise_top = gamer.profile.coins - room.call_chip;
	
	var cmds = {};
	switch(room.state) {
	case SMALL_BLIND:
		gamer.is_smallblind = true;
		cmds.smallblind = true;
		break;
	case BIG_BLIND:
		gamer.is_bigblind = true;
		cmds.bigblind = true;
		break;
	case PREFLOP:
	case FLOP:
	case TURN:
	case RIVER:
		cmds.fold = true;
		if(raise_top >= 0) {
			cmds.call = true;
		}
		if(raise_top >= room.last_raise) {
			if(limit_rule === POT_LIMIT) {
				raise_top = Math.min(raise_top, room.pool + room.call_chip);
				cmds.raise = 'range,' + room.last_raise + ',' + raise_top;
				
			} else if(limit_rule === NO_LIMIT) {
				cmds.raise = 'range,' + room.last_raise + ',' + raise_top;
				
			} else if(limit_rule === LIMIT) {
				var allow_raise = ((room.raise_per_round > 0) && (room.raise_counter < room.raise_per_round));
				switch(room.state) {
				case PREFLOP:
				case FLOP:
					if(allow_raise) {
						cmds.raise = [ room.big_blind ]; // small bet
					}
					break;
				case TURN:
				case RIVER:
					if(allow_raise) {
						cmds.raise = [ room.big_blind * 2 ]; // big bet
					}
					break;
				}
			}
		}
		cmds.all_in = true;
		break;
	}
	
};

HoldemGame.prototype.gamerMoveTurn = function(move) {
	var room = this;
	var in_gamers = room.in_gamers;
	
	if(move) {
		var last = in_gamers.shift();
		in_gamers.push( last );
		
		room.notify(last.uid, 'prompt', {
			fold: null,
			check: null,
			call: null,
			raise: null,
			all_in: null
		});
	}

	var next = in_gamers[0];
	room.turn_countdown = room.options.turn_countdown;
	
	room.notifyAll('moveturn', {
		seat: next.seat,
		uid: next.uid,
		countdown: room.turn_countdown
	});
	
	var cmds = room.cmdsForGamer(next);
	room.notify(next.uid, 'prompt', cmds);
};

HoldemGame.prototype.gamerGiveUp = function( gamer ) {
	var room = this;
	
	room.notifyAll('fold', {
		seat: gamer.seat,
		uid: gamer.uid
	});
	
	room.gamerLose( gamer );
};

HoldemGame.prototype.gamerLose = function(loser) {
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
	});
	
	if(room.state < SHOWDOWN) {
		if(room.ingame_gamers > 1) {
			if(is_myturn) room.gamerMoveTurn(false);
		} else {
			room.gameOver();
		}
	}
};

HoldemGame.prototype.gamerShowDown = function() {
	var in_gamers = this.in_gamers, cards = this.cards;
	var i, j, gi, gj;
	for(i=0; i<in_gmaers.length; i++) {
		gi = in_gamers[i];
		if(! gi.is_ingame) continue;
		
		var maxFive = Holdem.maxFive(cards[ gi.seat ], room.public_cards);
		if(maxFive) {
			gi.maxFiveRank = Holdem.rank( maxFive );
		}
	}
	
	for(i=0; i<in_gamers.length-1; i++) {
		gi = in_gamers[i];
		if(! gi.is_ingame) continue;
		
		for(j=i+1; j<in_gamers.length; j++) {
			gj = in_gamers[j];
			if(! gj.is_ingame) continue;
			
			var pk = gi.maxFiveRank - gj.maxFiveRank;
			if(pk > 0) {
				gj.is_ingame = false;
			} else if(pk < 0) {
				
			} else {
				
			}
		}
	}
};

HoldemGame.prototype.onGamer_ready = function(req, reply) {
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
		reply(400, 'already in game'); return;
	}
	
	if(gamer.is_ready) {
		reply(400, 'already ready'); return;
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

HoldemGame.prototype.onGamer_takeseat = function(req, reply) {
	Room.prototype.onGamer_takeseat.call(this, req, function(err,ret){
		if(! err) {
			if(! ret.cmds) ret.cmds = {};
			ret.cmds.ready = true;
		}
		reply(err, ret);
	});
};

HoldemGame.prototype.onGamer_unseat = function(req, reply) {
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

HoldemGame.prototype.onGamer_fold = function(req, reply) {
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

HoldemGame.prototype.onGamer_smallblind = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	if(! gamer.is_smallblind) {
		reply(400, 'not small blind'); return;
	}
	
	var n = Math.round(room.big_blind * 0.5);
	if(n > gamer.profile.coins) {
		reply(400, 'no enough coins for small blind: ' + n); return;
	}
	
	gamer.profile.coins -= n;
	room.preflop_chips.push(n);
	room.pool += n;
	room.chips[ gamer.seat ] += n;
	
	room.notifyAll('raise', {
		seat: gamer.seat,
		uid: gamer.uid,
		chip: n
	});
	
	reply(0, {});
	
	room.state = BIG_BLIND;
	room.gamerMoveTurn(true);
};

HoldemGame.prototype.onGamer_bigblind = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	if(! gamer.is_bigblind) {
		reply(400, 'not big blind'); return;
	}
	
	var n = room.big_blind;
	if(n > gamer.profile.coins) {
		reply(400, 'no enough coins for big blind: ' + n); return;
	}
	
	gamer.profile.coins -= n;
	room.preflop_chips.push(n);
	room.pool += n;
	room.chips[ gamer.seat ] += n;
	room.call_chip = n;
	
	room.notifyAll('raise', {
		seat: gamer.seat,
		uid: gamer.uid,
		chip: n
	});
	
	reply(0, {});
	
	room.dealCards();
	
	room.state = PREFLOP;
	room.gamerMoveTurn(true);
};

HoldemGame.prototype.onGamer_check = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	
	if(gamer.is_ingame) {
		var n = room.call_chip;
		if(n <= gamer.profile.coins) {
			gamer.profile.coins -= n;
			room.preflop_chips.push(n);
			room.pool += n;
			room.chips[ gamer.seat ] += n;
			
			room.notifyAll('call', {
				seat: gamer.seat,
				uid: gamer.uid,
				chip: n
			});
			
			reply(0, {});
			
			room.gamerMoveTurn(true);
			
		} else {
			reply(400, 'no enough coins to call: ' + n);
		}
		
	} else {
		reply(400, 'no in game'); return;
	}
	
};


HoldemGame.prototype.onGamer_call = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	var n = room.call_chip;
	if(n > gamer.profile.coins) {
		reply(400, 'no enough coins for call: ' + n); return;
	}
	
	gamer.profile.coins -= n;
	room.pool += n;
	room.chips[ gamer.seat ] += n;
	switch(room.state) {
	case PREFLOP:
		room.preflop_chips.push(n);
		break;
	case FLOP:
		room.flop_chips.push(n);
		break;
	case TURN:
		room.turn_chips.push(n);
		break;
	case RIVER:
		room.river_chips.push(n);
		break;
	}
	
	room.notifyAll('call', {
		seat: gamer.seat,
		uid: gamer.uid,
		call: n
	});
	
	reply(0, {});
	
	room.gamerMoveTurn(true);
};

HoldemGame.prototype.onGamer_raise = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	var raise = parseInt( req.args );
	if(isNaN(raise) || (raise < room.last_raise)) {
		reply(400, 'invalid raise: ' + raise); return;
	}
	
	var n = room.call_chip + raise;
	if(n > gamer.profile.coins) {
		reply(400, 'no enough coins, need: ' + n); return;
	}
	
	if(room.raise_per_round > 0) {
		if(room.raise_counter >= room.raise_per_round) {
			reply(400, 'no more raise this round'); return;
		}
		
		room.raise_counter ++;
	}
	
	room.notifyAll('raise', {
		seat: gamer.seat,
		uid: gamer.uid,
		call: room.call_chip,
		raise: raise
	});
	
	room.call_chip = n;
	room.last_raise = raise;
	
	gamer.profile.coins -= n;
	room.pool += n;
	room.chips[ gamer.seat ] += n;
	switch(room.state) {
	case PREFLOP:
		room.preflop_chips.push(n);
		break;
	case FLOP:
		room.flop_chips.push(n);
		break;
	case TURN:
		room.turn_chips.push(n);
		break;
	case RIVER:
		room.river_chips.push(n);
		break;
	}
	
	reply(0, {});
	
	room.gamerMoveTurn(true);
};

HoldemGame.prototype.onGamer_seecard = function(req, reply) {
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

HoldemGame.prototype.onGamer_relogin = function(req, reply) {
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
			if(! gamer.is_cardseen) cmds.seecard = true;
			var next = room.in_gamers[0];
			is_myturn = (next.seat === gamer.seat);
		}
		room.notify(uid, 'prompt', cmds);
		
		if(is_myturn) {
			room.gamerMoveTurn(false);
		}
	}
};

HoldemGame.prototype.close = function() {
	var room = this;
	if(room.is_ingame) {
		room.gameOver();
	}

	Room.prototype.close.call(this);
};


