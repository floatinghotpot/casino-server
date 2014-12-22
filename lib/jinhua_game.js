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
		no_number: []
	};
	if(options && (typeof options === 'object')) {
		for(var i in options) defaults[i] = options[i];
	}
	
	Room.call(this, casino, typeid, roomid, defaults);
	
	this.ready_gamers = 0;
	this.in_game = false;
	this.timer = 0;
	this.game_tick = 0;
}

JinhuaGame.prototype = Object.create(Room.prototype);

JinhuaGame.prototype.constructor = JinhuaGame;

JinhuaGame.prototype.tick = function() {
	Room.prototype.tick.call(this);
	
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

/*
 * cmds {
 *     exit: true,
 *     unseat: true
 *     followchip: true,
 *     addchip: [50,100,150],
 *     addchip: 'range,0,1000000',
 *     giveup: true,
 *     pk: ['zhang3', 'li4', 'wang5'],
 *     checkcard: true,
 *     showcard: true,
 *     allin: true
 *   }
 */
JinhuaGame.prototype.prompt = function(uid, cmds) {
	this.notify(uid, 'prompt', cmds);
};

JinhuaGame.prototype.close = function() {
	// TODO: 

	Room.prototype.close.call(this);
};

JinhuaGame.prototype.onGamer_ready = function(req) {
	//this.response(req, 0, this.details());
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

