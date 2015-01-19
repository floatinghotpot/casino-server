var Gamer = require('./gamer'),
	Room = require('./room'),
	Poker = require('./poker'),
	Jinhua = require('./jinhua_poker');

exports = module.exports = JinhuaGame;

function JinhuaGame( casino, typeid, roomid, options ) {
	var defaults = {		// 默认值，可配置
		max_seats: 6,
		no_joker: true,
		no_color: [],
		no_number: [],
		ready_countdown: 10,
		turn_countdown: 10,
		ante: 50,			// 锅底
		bet_min: 50,		// 最少投注
		bet_max: -1,		// 最大投注
		raise_min: 50,		// 最少加注
		raise_multiple: false,		// true: 加注时翻倍计算, false: 加注时增量计算
		pot_cap: -1,		// 封顶, -1 表示不封顶
		
		rake_percent: 0.03,			// 3% 抽水，赢家的提成比例
		rake_pot: 500,				// 底池达到一定金额，比如底池高于500元抽水，低于500元不抽水。
		rake_cap: 200,				// 抽水会设置上限，比如澳门现场局抽水上限200元。
	};
	if(options && (typeof options === 'object')) {
		for(var i in options) defaults[i] = options[i];
	}
	
	Room.call(this, casino, typeid, roomid, defaults);
	
	this.first_turn = 0;		// 开始押注的座位编号
	
	this.ready_gamers = 0;		// 准备进入牌局的玩家计数
	this.ready_countdown = -1;	// 2个以上玩家准备启动的开局倒计时
	
	this.is_ingame = false;		// 牌局进行中
	
	this.turn_countdown = -1;	// 当前玩家的倒计时
	this.in_gamers = [];		// 参与本局的所有玩家
	this.cards = {};			// seat -> cards, 座位对应的可见牌，[0,0,0]表示不可见
	this.chips = {};			// seat -> n, 每个座位投入的筹码数
	
	this.pot_chips = [];		// 彩池里的全部筹码，按投注顺序
	this.pot = 0;				// 彩池总数
	this.max_chip = 0;			// 当前最大下注的多少
	this.last_raise = 0;		// 最近一次加注的多少
	this.no_raise_counter = 0;	// 无加注的次数
	
	this.round_counter = 1;		// 牌局的轮数
}

JinhuaGame.prototype = Object.create(Room.prototype);

JinhuaGame.prototype.constructor = JinhuaGame;

JinhuaGame.prototype.details = function() {
	var data = Room.prototype.details.call(this);
	
	data.cards = this.cards;		// seat -> cards, 座位对应的可见牌，[0,0,0]表示不可见
	data.chips = this.chips;		// seat -> n, 每个座位投入的筹码数
	
	data.pot = this.pot;				// 彩池总数
	data.pot_chips = this.pot_chips;	// 彩池里的全部筹码，按投注顺序
	data.max_chip = this.max_chip;		// 当前最大下注的多少
	data.last_raise = this.last_raise;	// 最近一次加注的多少
	
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
	
	room.ready_countdown = -1;
	room.is_ingame = true;
	room.pot_chips = [];
	room.pot = 0;
	room.round_counter = 1;
	var in_gamers = room.in_gamers = [];
	var roomcards = room.cards = {};
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
	room.ingamers_count = in_gamers.length;
	room.first_turn = in_gamers[0].seat;
	
	// ante
	var in_seats = [], seat;
	var ante = room.options.ante;
	for(j=0, len=in_gamers.length; j<len; j++) {
		gamer = in_gamers[j];
		seat = gamer.seat;
		in_seats.push( seat );
		
		gamer.is_ready = false;
		room.ready_gamers --;
		
		gamer.is_ingame = true;
		
		gamer.profile.coins -= ante;
		gamer.chips = ante;
		roomchips[ seat ] = gamer.chips;

		room.pot += ante;
	}
	room.last_raise = 0;
	
	room.notifyAll('gamestart', {
		room: room.details(),
		seats: in_seats
	});
	
	// deal hole cards
	var fullcards = Poker.newSet(room.options);
	var deals = [];
	for(j=0, len=in_gamers.length; j<len; j++) {
		gamer = in_gamers[j];
		seat = gamer.seat;
		
		gamer.cards = Jinhua.sort( Poker.draw(fullcards, 3) );
		gamer.is_cardseen = false;
		gamer.is_cardshowed = false;
		
		roomcards[ seat ] = [0,0,0];
		deals.push( [ seat, [0,0,0] ] );
	}
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
	var in_gamers = room.in_gamers, i;
	
	var rake = Math.round( room.pot * room.options.rake_percent );
	if(room.options.rake_pot > 0) {
		if(room.pot < room.options.rake_pot) rake = 0;
	}
	if(room.options.rake_cap > 0) {
		if(rake > room.options.rake_cap) rake = room.options.rake_cap;
	}
	var prize = room.pot - rake;
	
	var gamer, item, scorelist = [];
	for(i=0; i<in_gamers.length; i++) {
		gamer = in_gamers[i];
		gamer.prize = 0;

		if(gamer.is_ingame) { // winner
			gamer.prize = prize;
			
			gamer.profile.exp += 2;
			gamer.profile.score ++;
			gamer.profile.coins += prize;
			gamer.saveData();

			gamer.is_ingame = false;
			room.ingamers_count --;

			room.first_turn = gamer.seat;
		}
	}
	
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
		showcard: null,
		seecard: null,
		ready: true
	});

	room.is_ingame = false;
	room.in_gamers = [];
	room.ingamers_count = 0;
	room.turn_countdown = -1;
	room.cards = {};
	room.chips = {};
	room.pot_chips = [];
	room.pot = 0;
	room.max_chip = 0;
	room.last_raise = 0;
};

JinhuaGame.prototype.moveTurnToNext = function() {
	var room = this;
	var in_gamers = room.in_gamers;
	
	var last = in_gamers[0], next;
	
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
};

JinhuaGame.prototype.gamerMoveTurn = function(move) {
	var room = this;
	var in_gamers = room.in_gamers;
	
	if(move) room.moveTurnToNext();
	
	var gamer = in_gamers[0];
	room.turn_countdown = room.options.turn_countdown;
	
	room.notifyAll('moveturn', {
		seat: gamer.seat,
		uid: gamer.uid,
		round: this.round_counter,
		countdown: room.turn_countdown
	});
	
	var cmds = {}, i, n;
	
	if((room.round_counter >= 2) && (gamer.profile.coins >= room.last_raise *2)) {
		var pk_targets = null;
		pk_targets = [];
		for(i=1; i<in_gamers.length; i++) {
			var other = in_gamers[i];
			if(other.is_ingame) {
				pk_targets.push(other.uid);
			}
		}
		cmds.pk = pk_targets;
	}
	
	var bet_min = room.options.bet_min;
	var bet_max = room.options.bet_max;
	var raise_min = (room.options.raise_multiple) ? room.last_raise : room.options.raise_min;
	
	var call_chip = room.last_raise;
	if(call_chip > 0) {
		if(gamer.profile.coins > call_chip) cmds.call = true;
		
	} else {
		// first raise, must be larger than bet_min
		if((bet_min > 0) && (raise_min < bet_min)) raise_min = bet_min;
	}
	
	var raise_options = [];
	for(i=1; i<=3; i++) {
		n = call_chip + raise_min * i;
		if((bet_max > 0) && (n > bet_max)) continue;
		if(gamer.profile.coins >= n) raise_options.push( n );
	}
	cmds.raise = raise_options;
	
	cmds.showcard = (gamer.is_cardshowed) ? null : true;
	
	room.notify(gamer.uid, 'prompt', cmds);
};

JinhuaGame.prototype.gamerGiveUp = function( gamer ) {
	var room = this;
	
	room.notifyAll('fold', {
		seat: gamer.seat,
		uid: gamer.uid
	});
	
	room.gamerOut( gamer );
};

JinhuaGame.prototype.gamerOut = function(loser) {
	var room = this;
	var in_gamers = room.in_gamers;
	
	room.ingamers_count --;
	
	loser.is_ingame = false;
	loser.profile.exp ++;
	//loser.profile.score --;
	loser.saveData();
	
	room.notify(loser.uid, 'prompt', {
		fold: null,
		check: null,
		call: null,
		raise: null,
		seecard: null,
		pk: null,
	});
	
	if(room.ingamers_count > 1) {
		var is_myturn = (loser.seat === in_gamers[0].seat);
		if(is_myturn) room.gamerMoveTurn(true);
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
	var room = this;
	var uid = req.uid;
	var gamer = room.gamers[ uid ];
	
	if(gamer.profile.coins < room.options.ante) {
		reply(400, 'no enough coins, need at least: ' + room.options.ante);
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
	
	var n = room.last_raise;
	if(gamer.is_cardseen) n = n * 2;
	if(n > gamer.profile.coins) {
		reply(400, 'no enough coins to call: ' + n); return;
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

JinhuaGame.prototype.onGamer_raise = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}

	var call_chip = room.last_raise;
	var raise_min = (room.options.raise_multiple) ? call_chip : room.options.raise_min;
	var n = parseInt( req.args );
	if(isNaN(n) || (n < call_chip + raise_min)) {
		reply(400, 'invalid chip to add: ' + n); return;
	}
	
	var bet_min = room.options.bet_min;
	var bet_max = room.options.bet_max;
	if(((bet_min > 0) && (n < bet_min)) || ((bet_max > 0) && (n > bet_max))) {
		reply(400, 'bet range is: [ ' + bet_min + ', ' + bet_max + ' ]'); return;
	}
	
	if(gamer.is_cardseen) n = n *2;
	
	gamer.profile.coins -= n;
	gamer.chips += n;
	
	room.chips[ gamer.seat ] = gamer.chips;
	room.pot_chips.push(n);
	room.pot += n;
	room.last_raise = n;
	
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
	if(! gamer.is_ingame) {
		room.response(req, 400, 'no in game'); return;
	}

	var pk_uid = req.args;
	var pk_gamer = gamers[ pk_uid ];
	if(pk_gamer && pk_gamer.is_ingame) {
		
		var n = room.last_raise *2;
		if(gamer.profile.coins < n) {
			room.response(req, 400, 'no enough coins for pk'); return;
		}

		gamer.profile.coins -= n;
		room.pot += n;
		
		var pk_win = (Jinhua.compare(gamer.cards, pk_gamer.cards) > 0);
		
		room.notifyAll('pk', {
			seat: gamer.seat,
			uid: gamer.uid,
			pk_seat: pk_gamer.seat,
			pk_uid: pk_uid,
			win: pk_win,
			pk_cost: n
		});
		
		reply(0, {});
		
		room.gamerOut( pk_win ? pk_gamer : gamer );
		
	} else {
		reply(400, 'pk target no in game');
	}
};

JinhuaGame.prototype.onGamer_seecard = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
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
};

JinhuaGame.prototype.onGamer_showcard = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	gamer.is_cardshowed = true;
	
	room.cards[ gamer.seat ] = gamer.cards;
	
	room.notifyAll('showcard', {
		seat: gamer.seat,
		uid: gamer.uid,
		cards: gamer.cards
	});

	reply(0, {
		cmds: {
			seecard: null,
			showcard: null
		}
	});
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
				cards: gamer.cards
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
			is_myturn = (room.in_gamers[0].seat === gamer.seat);
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


