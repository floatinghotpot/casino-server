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
	
	this.raise_per_round = this.options.rule_limit ? 3 : -1;
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
	this.community_cards = [];
	
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
	data.pot = this.pot;
	data.max_chip = this.max_chip;
	data.last_raise = this.last_raise;

	data.community_cards = this.community_cards;
	data.pot_chips = this.pot_chips;

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

HoldemGame.prototype.dealStartingHand = function() {
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
			roomcards[ gamer.seat ] = gamer.cards = Poker.sort( Poker.draw(fullcards, 2) );
			
			knowncards[ gamer.seat ] = unknown_cards;
			deals.push([ gamer.seat, unknown_cards ]);
		}
	}
	
	room.notifyAll('deal', {
		deals: deals,
		delay: 0
	});
};

HoldemGame.prototype.dealCommunityCards = function(n) {
	var room = this;
	
	var cards = Poker.draw(room.fullcards, n);
	room.community_cards = Poker.sort( Poker.merge(room.community_cards, cards) );

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
	room.big_blind = room.options.limit;
	room.fullcards = Poker.newSet(room.options);
	
	room.community_cards = [];
	room.cards = {};
	room.chips = {};
	
	room.pot_chips = [];
	room.pot = 0;
	room.max_chip = 0;
	room.last_raise = room.big_blind;

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
		gamer.is_allin = false;
		gamer.cards = [];
		gamer.chips = 0;
		
		deal_order.push( gamer );
		in_seats.push( gamer.seat );
	}
	room.ingamers_count = in_gamers.length;
	
	room.notifyAll('gamestart', {
		seats: in_seats,
		ante: 0,
		bet_min: room.big_blind
	});
	
	room.state = SMALL_BLIND;
	
	var is_headsup_1vs1 = (in_gamers.length <= 2);
	room.gamerMoveTurn(is_headsup_1vs1 ? false : true);
};

HoldemGame.prototype.gameOver = function() {
	var room = this;
	var in_gamers = room.in_gamers, i, gamer, item, scorelist = [];
	for(i=0; i<in_gamers.length; i++) {
		gamer = in_gamers[i];
		
		item = gamer.getProfile();
		item.seat = gamer.seat;
		item.cards = gamer.cards;
		item.chips = gamer.chips;
		
		item.prize = gamer.prize;
		
		scorelist.push(item);
	}
	
	room.notifyAll('gameover', scorelist);
	
	room.notifyAll('prompt', {
		fold: null,
		pk: null,
		raise: null,
		call: null,
		seecard: null,
		ready: true
	});

	room.is_ingame = false;
	room.turn_countdown = -1;
	room.in_gamers = [];
	room.ingamers_count = 0;
	
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
	var raise_max = gamer.profile.coins - (room.max_chip - gamer.chips);
	
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
	
};

HoldemGame.prototype.gamerMoveTurn = function(move) {
	var room = this;
	var in_gamers = room.in_gamers;
	
	if(move) {
		last = in_gamers[0];
		room.notify(last.uid, 'prompt', {
			fold: null,
			call: null,
			raise: null,
			all_in: null
		});
		
		do {
			in_gamers.push( in_gamers.shift() );
			
			next = in_gamers[0];
			if(next.seat === room.first_turn) room.round_counter ++;
			
			// to avoid dead loop
			if(next.seat === last.seat) break;
			
			// we find the next one in game
			if(next.is_ingame) {
				if(! next.is_allin) break;
			}
			
		} while(true);
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
	var in_gamers = room.in_gamers;
	
	room.notifyAll('fold', {
		seat: gamer.seat,
		uid: gamer.uid
	});
	
	gamer.is_ingame = false;
	room.ingamers_count --;
	
	gamer.profile.exp ++;
	//gamer.profile.score --;
	
	room.notify(gamer.uid, 'prompt', {
		fold: null,
		check: null,
		call: null,
		raise: null,
		seecard: null,
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
			
			gamer.profile.exp += 2;
			gamer.profile.score ++;
			gamer.profile.coins += prize;
			
			gamer.is_ingame = false;
			room.ingamers_count --;

			break;
		}
	}

	room.gameOver();
};

HoldemGame.prototype.gamerShowDown = function() {
	room.state = SHOWDOWN;
	
	var room = this;
	var in_gamers = room.in_gamers, finals = [], gamers_bychips = [];
	var i, gamer, maxFive, someone_allin = false;
	for(i=0; i<in_gmaers.length; i++) {
		gamer = in_gamers[i];
		gamers_bychips.push( gamer );
		
		if(! gamer.is_ingame) continue;
		if(gamer.is_allin) someone_allin = true;
		
		maxFive = Holdem.maxFive(gamer.cards, room.community_cards);
		if(maxFive) {
			gamer.maxFiveRank = Holdem.rank( maxFive );
			finals.push( gamer );
		}
	}
	
	final_gamers.sort( function(a,b){ return b.maxFiveRank - a.maxFiveRank; } );
	
	if(someone_allin) {
		// if someone allin, the pot distribution will be complex
		/*
		 * 当有一或多个牌手全押时，德州扑克的彩池分配较为复杂，超过牌手押注金额的部份将会形成一或多个边池。
		 * 牌手参与投注该彩池才有机会于该彩池胜出分配奖金。 
		 * 
		 * 当一局结束而且有“全押”的牌手赢牌时，该牌手有参与投注的主池边池奖金均归该牌手。
		 * 而其他边池由参与该边池投注里，持有最大牌面的牌手赢得。
		 * 在几个牌手全押形成多个边池时，依全押的顺序分配给各边池中最佳牌面的牌手。
		 * 无人跟注的边池（仅有一位牌手下注，剩下其他牌手都盖牌）将会直接赢得该边池。
		 * 
		 * 彩池分配范例：
		 * 
		 * 例如ABCDEF六名牌手参与牌局，F于中途盖牌退出，最终A全押投入$50，B全押投入$250，C全押投入$350，
		 * DE各投入$800，F投入$500，此时总彩池大小为$2750，形成了一个主池为50*6=$300，
		 * 边池各为（250-50）*5=$1000，（350-250）*4=$400，（500-350）*3=$450，（800-500）*2=$600，
		 * 若最终组成牌面大小为F>A>B>D>E>C，但F已盖牌不能分配任何彩池，则此局主池即为A于此局赢得的筹码（$300），
		 * B可赢得第一个边池（$1000），D参与至最后一个边池，且牌面胜过参与第二、第三及第四边池的所有牌手，
		 * 因此可赢得剩下所有的边池（400+450+600=$1450）。
		 */
		gamers_bychips.sort( function(a,b) { return a.chips - b.chips; } );
		
	} else {
		// only keep the largest one, may be one, two, or more same big
		/* 
		 * 当没有牌手全押(all-in)时，彩池由未盖牌的牌手中牌型最大的者独得。
		 * 如多于一名牌手拥有最大的手牌，彩池会由他们平等均分。
		 * 不能平分的零头数筹码由发牌者后依顺时针方向，尚未盖牌的第一个牌手获得(即位置相对最不利者)。
		 * 
		 * 举例来说：
		 * 
		 * 有ABCDE依顺时钟方向入座，A为本局发牌者，最小面额筹码为$10，所有牌手皆未盖牌至斗牌，
		 * 最终由CDE胜出平分本局彩池$1000时，则DE各分到$330，而多出的$10将分配给最靠近A的赢家C，C于本局可分到$340。
		 */
		for(i=0; i<finals.length-1; i++) {
			if(finals[i].maxFiveRank > finals[i+1].maxFinalRank) {
				finals.splice(i+1, Number.MAX_VALUE);
				break;
			}
		}
	}
	
	room.gameOver();
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
		reply(400, 'no enough for small blind: ' + n); return;
	}
	
	room.max_chip = n;
	room.call_chip = n;
	
	gamer.profile.coins -= n;
	gamer.chips += n;
	
	room.chips[ gamer.seat ] = gamer.chips;
	
	room.preflop_chips.push(n);
	room.pot += n;
	
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
		reply(400, 'no enough for big blind: ' + n); return;
	}
	
	room.max_chip = n;
	room.call_chip = n;
	
	gamer.profile.coins -= n;
	gamer.chips += n;
	
	room.chips[ gamer.seat ] = gamer.chips;
	
	room.preflop_chips.push(n);
	room.pot += n;
	
	room.notifyAll('raise', {
		seat: gamer.seat,
		uid: gamer.uid,
		chip: n
	});
	
	reply(0, {});
	
	room.dealStartingHand();
	
	room.state = PREFLOP;
	room.gamerMoveTurn(true);
};

HoldemGame.prototype.onGamer_call = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	var n = room.max_chip - gamer.chips;
	if(n > gamer.profile.coins) {
		reply(400, 'no enough coins for call: ' + n); return;
	}
	
	gamer.profile.coins -= n;
	gamer.chips += n;
	
	room.chips[ gamer.seat ] = gamer.chips;
	room.pot_chips.push(n);
	room.pot += n;
	
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
	
	var n = (room.max_chip - gamer.chips) + raise;
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
	gmaer.is_allin = true;
	
	gamer.profile.coins -= n;
	gamer.chips += n;
	room.chips[ gamer.seat ] = gamer.chips;
	
	room.pot_chips.push(n);
	room.pot += n;
	room.max_chip = Math.max(room.max_chip, gamer.chips);
	
	room.notifyAll('all_in', {
		seat: gamer.seat,
		uid: gamer.uid,
		call: n
	});
	
	reply(0, {});
	
	room.gamerMoveTurn(true);
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

HoldemGame.prototype.onGamer_seecard = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(gamer.is_ingame) {
		gamer.is_cardseen = true;
		
		room.notify(uid, 'seecard', {
			seat: gamer.seat,
			uid: uid,
			cards: gamer.cards
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


