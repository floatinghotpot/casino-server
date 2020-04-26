var Gamer = require('./gamer'),
	Room = require('./room'),
	Poker = require('./poker'),
	Holdem = require('./holdem_poker');

exports = module.exports = HoldemGame;

var GAME_OVER = 0,
	SMALL_BLIND = 1,
	BIG_BLIND = 2,
	PREFLOP = 3,
	FLOP = 4,
	TURN = 5,
	RIVER = 6,
	SHOWDOWN = 7;

var LIMIT = 0,
	POT_LIMIT = 1,
	NO_LIMIT = 2;
	
var STATE = {
	0: 'gameover',
	1: 'ready',
	2: 'binds',
	3: 'preflop',
	4: 'flop',
	5: 'turn',
	6: 'river',
	7: 'showdown'
};

function HoldemGame( casino, typeid, roomid, options ) {
	var defaults = {
		max_seats: 10,
		no_joker: true,
		no_color: [],
		no_number: [],
		ready_countdown: 10,
		turn_countdown: 10,
		limit_rule: 0,		// 0: limit, 1: pot limit, 2: no limit
		limit: 100,			// big blind
		limit_cap: 200,		// -1, means no limit
	};
	if(options && (typeof options === 'object')) {
		for(var i in options) defaults[i] = options[i];
	}
	
	Room.call(this, casino, typeid, roomid, defaults);
	
	this.raise_per_round = (this.options.limit_rule === LIMIT) ? 3 : -1;
	this.raise_counter = 0;
	
	this.ready_gamers = 0;
	this.ready_countdown = -1;
	
	this.is_ingame = false;
	this.state = GAME_OVER;
	this.dealer_seat = 0;
	this.big_blind = this.options.limit;
	
	this.in_gamers = [];
	this.turn_countdown = -1;
	
	this.deal_order = [];
	this.cards = {};
	this.shared_cards = [];
	
	this.chips = {};
	
	this.pot_chips = [];
	this.pot = 0;
	this.max_chip = 0;
	this.last_raise = 0;
	this.no_raise_counter = 0;
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
	
	data.dealer_seat = this.dealer_seat;

	data.shared_cards = this.shared_cards;
	data.pot = this.pot;
	data.pot_chips = this.pot_chips;
	data.max_chip = this.max_chip;
	data.last_raise = this.last_raise;
	
	return data;
};

HoldemGame.prototype.tick = function() {
	Room.prototype.tick.call(this);

	var room = this;
	if(room.is_ingame) {
		var gamer = room.in_gamers[0];
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

HoldemGame.prototype.gameStart = function() {
	var room = this;
	var seats = room.seats;
	var gamers = room.gamers;
	
	room.is_ingame = true;
	room.ready_countdown = -1;
	room.big_blind = room.options.limit;
	
	room.shared_cards = [];
	room.cards = {};
	room.chips = {};
	
	room.pot_chips = [];
	room.pot = 0;
	room.max_chip = 0;
	room.last_raise = room.big_blind;
	room.raise_counter = 0;
	room.no_raise_counter = 0;

	var i, j, uid, gamer, first = room.dealer_seat;
	var in_gamers = room.in_gamers = [];
	for(i=first; i<seats.length; i++) {
		uid = seats[i];
		if(uid) {
			gamer = gamers[ uid ];
			if(gamer.is_ready) {
				in_gamers.push( gamer );
				room.chips[gamer.seat] = 0;
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
		gamer.is_allin = false;
		gamer.cards = [];
		gamer.chips = 0;
		gamer.prize = 0;
		
		deal_order.push( gamer );
		in_seats.push( gamer.seat );
	}
	room.ingamers_count = in_gamers.length;
	
	if(in_gamers.length > 2) in_gamers.push( in_gamers.shift() );
	// else: 1 vs 1 -- heads up

	// small blind
	var small = in_gamers.shift();
	in_gamers.push( small );
	
	gamer = small;
	var n = Math.round( room.big_blind * 0.5 );
	gamer.profile.coins -= n;
	gamer.chips += n;
	room.chips[ gamer.seat ] = gamer.chips;
	room.pot_chips.push(n);
	room.pot += n;
	room.max_chip = n;
	
	// big blind
	var big = in_gamers.shift();
	in_gamers.push( big );
	
	gamer = big;
	n = room.big_blind;
	gamer.profile.coins -= n;
	gamer.chips += n;
	room.chips[ gamer.seat ] = gamer.chips;
	room.pot_chips.push(n);
	room.pot += n;
	room.max_chip = n;
	
	room.notifyAll('gamestart', {
		room: room.details(),
		seats: in_seats
	});

	// deal hole cards
	var fullcards = room.fullcards = Poker.newSet(room.options);
	var roomcards = room.cards = {};
	var deals = [];
	for(i=0; i<deal_order.length; i++) {
		gamer = deal_order[i];
		if(gamer.is_ingame) {
			gamer.cards = Poker.sortByNumber( Poker.draw(fullcards, 2) );
			roomcards[ gamer.seat ] = [0,0];
			deals.push([ gamer.seat, [0,0] ]);
		}
	}
	room.notifyAll('deal', {
		deals: deals,
		delay: 3
	});
	
	for(i=0; i<deal_order.length; i++) {
		gamer = deal_order[i];
		if(gamer.is_ingame) {
			room.notify(gamer.uid, 'seecard', {
				seat: gamer.seat,
				uid: gamer.uid,
				cards: gamer.cards
			});
		}
	}
	
	setTimeout(function(){
		room.state = PREFLOP;
		room.gamerMoveTurn(false);
		
	}, 3000);
	
};

HoldemGame.prototype.dealSharedCards = function(n) {
	var room = this;
	
	var cards = Poker.draw(room.fullcards, n);
	room.shared_cards = Poker.merge(room.shared_cards, cards);

	var deals = [];
	deals.push([-1, cards]);
	
	room.notifyAll('deal', {
		deals: deals,
		delay: 1
	});
};

HoldemGame.prototype.gameOver = function() {
	var room = this;
	var in_gamers = room.in_gamers, i, gamer, item, scorelist = [];
	for(i=0; i<in_gamers.length; i++) {
		gamer = in_gamers[i];
		gamer.is_ingame = false;
		
		if(gamer.prize > 0) {
			gamer.profile.exp += 2;
			gamer.profile.score ++;
			gamer.profile.coins += gamer.prize;
			gamer.saveData();
		}
		
		item = gamer.getProfile();
		item.seat = gamer.seat;
		item.cards = gamer.cards;
		item.chips = gamer.chips;
		item.prize = gamer.prize;
		
		scorelist.push(item);
	}
	
	room.notifyAll('gameover', {scores: scorelist, showdown: room.ingamers_count > 0});
	
	room.notifyAll('prompt', {
		fold: null,
		check: null,
		call: null,
		raise: null,
		all_in: null,
		ready: true
	});

	room.is_ingame = false;
	room.turn_countdown = -1;
	room.in_gamers = [];
	room.ingamers_count = 0;
	
	// for next round, move deal seat to next
	for (i=0; i<room.deal_order.length; i++) {
		if (room.deal_order[i].seat === room.dealer_seat) {
			if (i < room.deal_order.length - 1) {
				room.dealer_seat = room.deal_order[i + 1].seat;
			} else {
				room.dealer_seat = room.deal_order[0].seat;
			}
			break;
		}
	}


	room.deal_order = [];
	room.cards = {};
	room.chips = {};
	room.pot_chips = [];
	room.pot = 0;
	room.max_chip = 0;
	room.last_raise = 0;
	
};

HoldemGame.prototype.cmdsForGamer = function(gamer) {
	var room = this;
	var limit_rule = room.options.limit_rule;
	
	var cmds = {};
	switch(room.state) {
	case PREFLOP:
	case FLOP:
	case TURN:
	case RIVER:
		cmds.fold = true;
		var call_chip = (room.max_chip - gamer.chips);
		var raise_max = gamer.profile.coins - call_chip;
		if(call_chip > 0) {
			if(raise_max >= 0) cmds.call = true;
		} else {
			cmds.check = true;
		}
		
		if(raise_max >= room.last_raise) {
			if(limit_rule === POT_LIMIT) {
				raise_max = Math.min(raise_max, room.pot + call_chip);
				cmds.raise = 'range,' + room.last_raise + ',' + raise_max;
				
			} else if(limit_rule === NO_LIMIT) {
				cmds.raise = 'range,' + room.last_raise + ',' + raise_max;
				
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
		
		if(limit_rule === NO_LIMIT) {
			if(gamer.profile.coins > 0) cmds.all_in = true;
		}
		
		break;
	}
	
	return cmds;
};

HoldemGame.prototype.moveTurnToNext = function() {
	var room = this;
	var in_gamers = room.in_gamers;
	
	var last = in_gamers[0], next;
	room.notify(last.uid, 'prompt', {
		fold: null,
		check: null,
		call: null,
		raise: null,
		all_in: null
	});	
	do {
		in_gamers.push( in_gamers.shift() );
		next = in_gamers[0];
		if(next.seat === room.first_turn) room.round_counter ++;
		
		// to avoid dead loop
		if(next.seat === last.seat){
			room.no_raise_counter = room.ingamers_count;
			break;
		}
		
		// we find the next one in game
		if(next.is_ingame) {
			if(next.is_allin) {
				room.no_raise_counter ++;
			} else {
				break;
			}
		}
		
	} while(true);
	
};

HoldemGame.prototype.gamerMoveTurn = function(move) {
	var room = this;
	var in_gamers = room.in_gamers, deal_order = room.deal_order;
	
	if(move) room.moveTurnToNext();
	
	var deal_card = false;
	if(room.no_raise_counter >= room.ingamers_count) {  // >= for all in case
		room.state ++;
		
		switch(room.state) {
		case FLOP:
			room.dealSharedCards(3);
			deal_card = true;
			break;
		case TURN:
			room.dealSharedCards(1);
			deal_card = true;
			break;
		case RIVER:
			room.dealSharedCards(1);
			deal_card = true;
			break;
		}
		
		room.no_raise_counter = 0;
		room.raise_counter = 0;
		
		// after dealing, we start bet next round from the first
		for(var i=0; i<deal_order.length; i++) {
			in_gamers[i] = deal_order[i];
		}
		
		room.moveTurnToNext();
	}
	
	var gamer = in_gamers[0];
	room.turn_countdown = room.options.turn_countdown;
	
	room.notifyAll('moveturn', {
		seat: gamer.seat,
		uid: gamer.uid,
		countdown: room.turn_countdown
	});
		
	if(deal_card) {
		setTimeout(function(){
			room.notify(gamer.uid, 'prompt', room.cmdsForGamer(gamer) );
		}, 1000);
		
	} else {
		if(room.state < SHOWDOWN) {
			room.notify(gamer.uid, 'prompt', room.cmdsForGamer(gamer) );
		} else {
			room.gamerShowDown();
		}
	}
	
};

HoldemGame.prototype.gamerGiveUp = function( gamer ) {
	var room = this;
	var in_gamers = room.in_gamers;
	
	room.notifyAll('fold', {
		seat: gamer.seat,
		uid: gamer.uid
	});
	
	gamer.is_ingame = false;
	room.ingamers_count --;
	
	gamer.profile.exp ++;
	//gamer.profile.score --;
	gamer.saveData();
	
	room.notify(gamer.uid, 'prompt', {
		fold: null,
		check: null,
		call: null,
		raise: null,
		all_in: null
	});
	
	if(room.ingamers_count === 1) {
		room.simpleWin();
		
	} else {
		var is_myturn = (gamer.seat === in_gamers[0].seat);
		if(is_myturn) room.gamerMoveTurn(true);
	}
};

HoldemGame.prototype.simpleWin = function() {
	var room = this, in_gamers = this.in_gamers;
	var prize = room.pot;
	
// TODO: 
/*
	var rake = Math.round( room.pot * room.options.rake_percent );
	if(room.options.rake_pot > 0) {
		if(room.pot < room.options.rake_pot) rake = 0;
	}
	if(room.options.rake_cap > 0) {
		if(rake > room.options.rake_cap) rake = room.options.rake_cap;
	}
	var prize = room.pot - rake;
*/
	for(var i=0; i<in_gamers.length; i++) {
		var gamer = in_gamers[i];
		gamer.prize = 0;
		
		if(gamer.is_ingame) {
			gamer.prize = prize;
			
			gamer.is_ingame = false;
			room.ingamers_count --;

			break;
		}
	}

	room.gameOver();
};

HoldemGame.prototype.gamerShowDown = function() {
	var room = this;
	var in_gamers = room.in_gamers, finals = [], gamers_bychips = [];
	var i, gamer, maxFive, someone_allin = false;
	for(i=0; i<in_gamers.length; i++) {
		gamer = in_gamers[i];
		
		if(! gamer.is_ingame) continue;
		if(gamer.is_allin) someone_allin = true;
		gamers_bychips.push( gamer );
		
		maxFive = Holdem.maxFive(gamer.cards, room.shared_cards);
		if(maxFive) {
			gamer.maxFiveRank = Holdem.rank( maxFive );
			finals.push( gamer );
		}
	}
	
	finals.sort( function(a,b){ return b.maxFiveRank - a.maxFiveRank; } );
	
	if(someone_allin) {
		gamers_bychips.sort( function(a,b) { return a.chips - b.chips; } );
		num_players = gamers_bychips.length;
		var not_in_game_prize = room.pot;
		for (i=0; i < num_players; i++) {
			gamers_bychips[i].chips_tmp = gamers_bychips[i].chips;
			not_in_game_prize -= gamers_bychips[i].chips;
		}
		while (gamers_bychips[num_players - 1].chips_tmp > 0) {
			var price_step = 0;
			var current_prize = 0;
			var start_index = -1;
			for (i=0; i < num_players; i++) {
				if (gamers_bychips[i].chips_tmp === 0) {
					continue;
				}
				if (gamers_bychips[i].chips_tmp > 0 && price_step === 0) {
					price_step = gamers_bychips[i].chips_tmp;
					start_index = i;
				}
				gamers_bychips[i].chips_tmp -= price_step;
				current_prize += price_step;
			}
			
			// we must add the chips of players that are not left in the game, but
			// only for the first pot evaluation.
			current_prize += not_in_game_prize;
			not_in_game_prize = 0;
			// we must only consider those players with the highest rank
			// for winning the (side) pot
			var pot_winners = gamers_bychips.slice(start_index);
			pot_winners.sort( function(a,b){ return b.maxFiveRank - a.maxFiveRank; } );
			for (i=0; i<pot_winners.length-1; i++) {
				if (pot_winners[i+1].maxFiveRank < pot_winners[i].maxFiveRank) {
					pot_winners.splice(i+1);
					break;
				}	
			}
			room.evaluate_pot(pot_winners, current_prize);

		}

		
	} else {
		// only keep the largest one or all with the same rank
		for(i=0; i<finals.length-1; i++) {
			if(finals[i].maxFiveRank > finals[i+1].maxFiveRank) {
				// if rank at i+1 is strictly lower than rank of i, all gamers
				// behind i are deleted.
				var losers = finals.splice(i+1, Number.MAX_VALUE);
				while(losers.length > 0) {
					var loser = losers.shift();
					loser.profile.exp ++;
					loser.saveData();
				}
				break;
			}
		}
		room.evaluate_pot(finals, room.pot);
	}
	
	room.gameOver();
};

HoldemGame.prototype.evaluate_pot = function(finals, prize) {
	/* 
	 * Compute how much each gamer in finals shall receive
	 * of the prize. Prize value is adapted in finals. Prize
	 * is added up as to support several pots with the same
	 * gamer objects. 
	 */
		var n = finals.length;

		if(n > 1) {  // pot is splitted due to tie 
			var average = Math.floor( prize / n );
			for(i=0; i<finals.length; i++) {
				finals[i].prize += average;
			}
			
			// distribution of single coins if prize cannot be 
			// divided evenly by number of entitled players
			var odd = prize % n;
			if(odd > 0) {
				// find the nearest winner after dealer seat
				finals.sort( function(a,b){ return a.seat - b.seat; } );
				var first_seat = finals[0].seat, dealer_seat = room.dealer_seat;
				do {
					gamer = finals.pop();
					if(gamer.seat > dealer_seat) {
						finals.unshift( gamer );
					} else {
						finals.push( gamer );
						break;
					}
				} while (gamer.seat !== first_seat);
				
				finals[0].prize += odd;
			}
		} else {
			finals[0].prize += prize;
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
	var room = this;
	var uid = req.uid;
	var gamer = room.gamers[ uid ];
	
	if(gamer.profile.coins < room.options.limit) {
		reply(400, 'no enough coins, need at least: ' + room.options.limit);
		return;
	}
	
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
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	room.gamerGiveUp( gamer );
	
	reply(0, {});
};

HoldemGame.prototype.onGamer_check = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	var call_chip = room.max_chip - gamer.chips;
	if(call_chip > 0) {
		reply(400, 'you should call'); return;
	}
	
	room.no_raise_counter ++;
	
	room.notifyAll('check', {
		seat: gamer.seat,
		uid: gamer.uid,
		call: 0,
		raise: 0
	});
	
	reply(0, {});
	
	room.gamerMoveTurn(true);
};

HoldemGame.prototype.onGamer_call = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	var call_chip = room.max_chip - gamer.chips;
	var n = call_chip;
	if(n > gamer.profile.coins) {
		reply(400, 'no enough coins for call: ' + n); return;
	}
	
	room.no_raise_counter ++;
	
	gamer.profile.coins -= n;
	gamer.chips += n;
	
	room.chips[ gamer.seat ] = gamer.chips;
	room.pot_chips.push(n);
	room.pot += n;
	
	room.notifyAll('call', {
		seat: gamer.seat,
		uid: gamer.uid,
		call: n,
		raise: 0
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
	
	var call_chip = room.max_chip - gamer.chips;
	var n = call_chip + raise;
	if(n > gamer.profile.coins) {
		reply(400, 'no enough coins, need: ' + n); return;
	}
	
	if(room.raise_per_round > 0) {
		if(room.raise_counter >= room.raise_per_round) {
			reply(400, 'no more raise this round'); return;
		}
		
		room.raise_counter ++;
	}
	
	room.no_raise_counter = 1;
	
	room.notifyAll('raise', {
		seat: gamer.seat,
		uid: gamer.uid,
		call: call_chip,
		raise: raise
	});
	
	gamer.profile.coins -= n;
	gamer.chips += n;
	room.chips[ gamer.seat ] = gamer.chips;
	
	room.pot_chips.push(n);
	room.pot += n;
	
	room.max_chip = Math.max(room.max_chip, gamer.chips);
	room.last_raise = raise;
	
	reply(0, {});
	
	room.gamerMoveTurn(true);
};

HoldemGame.prototype.onGamer_all_in = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	var n = gamer.profile.coins;
	gamer.is_allin = true;
	
	gamer.profile.coins -= n;
	gamer.chips += n;
	room.chips[ gamer.seat ] = gamer.chips;
	
	room.pot_chips.push(n);
	room.pot += n;
	room.max_chip = Math.max(room.max_chip, gamer.chips);
	
	room.notifyAll('all_in', {
		seat: gamer.seat,
		uid: gamer.uid,
		call: 0,
		raise: n
	});
	
	reply(0, {});
	
	room.gamerMoveTurn(true);
};

HoldemGame.prototype.onGamer_relogin = function(req, reply) {
	Room.prototype.onGamer_relogin.call(this, req, reply);

	var room = this, uid = req.uid;
	
	var gamer = room.gamers[ uid ];
	if(gamer.seat >= 0) {
		room.notify(uid, 'seecard', {
			seat: gamer.seat,
			uid: uid,
			cards: gamer.cards
		});
		
		var is_myturn = false;
		var cmds = {
			ready: true,
			fold: null
		};
		if(gamer.is_ready || gamer.is_ingame) cmds.ready = null;
		if(gamer.is_ingame) {
			cmds.fold = true;
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


