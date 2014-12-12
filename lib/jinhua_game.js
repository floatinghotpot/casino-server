var Poker = require('./poker'),
	Jinhua = require('./jinhua_poker');

exports = module.exports = JinhuaGame;

function JinhuaGame( options ) {
	if(!(this instanceof JinhuaGame)) return new JinhuaGame( options );
	
	this.rule = JinhuaGame.rule;
	this.ready_gamers = 0;
	this.in_game = false;
	this.timer = 0;
	this.game_tick = 0;
	
	this.options = options;
}

JinhuaGame.rule = {
	id: 'jinhua',
	name: '诈金花',
	desc: '又叫三张牌、炸金花',
	max_seats: 6,
	ready_countdown: 20
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
	
	//console.log('JinhuaGame::tick');
};

JinhuaGame.prototype.gameReady = function() {
	var game = this;
	game.ready_counter = JinhuaGame.rule.ready_countdown;
	game.timer = setInterval(function(){
		game.tick();
	}, 1000);
};

JinhuaGame.prototype.gameStart = function() {
	var game = this;
	var room = game.room;
	
	game.cards = Poker.newSet();
	
	for(var i in room.seats) {
		var gamer = room.seats[i];
		if(! gamer) continue;
		
		if(gamer.is_ready) {
			console.log( gamer.uid + ' in game' );
			gamer.in_game = true;
			gamer.is_ready = false;
		}
	}
	
	game.in_game = true;
	game.ready_gamers = 0;
};

JinhuaGame.prototype.gameOver = function() {
	var game = this;
	
	game.in_game = false;
	
	if(game.timer) {
		clearInterval(game.timer);
		game.timer = 0;
	}
};

JinhuaGame.prototype.close = function() {
	if(this.in_game) {
		this.gameOver();
	}
};

var JinhuaGamer = {
	// this == gamer object
	jinhuaReady: gamerReady,
	jinhuaFollow: gamerFollow,
	jinhuaAdd: gamerAdd,
	jinhuaAllIn: gamerAllIn,
	jinhuaGiveUp: gamerGiveUp,
	jinhuaPk: gamerPk,
	jinhuaCheckCard: gamerCheckCard,
	jinhuaShowCard: gamerShowCard,
};

var gameCmds = {
	// this == socket linked with gamer object
	'ready' : function(data) { this.gamer.jinhuaReady(); },
	'follow': function(data) { this.gamer.jinhuaFollow(); },
	'add': function(data) { this.gamer.jinhuaAdd(data); },
	'allin': function(data) { this.gamer.jinhuaAllIn(); },
	'giveup': function(data) { this.gamer.jinhuaGiveUp(); },
	'pk': function(data) { this.gamer.jinhuaPk(data); },
	'checkcard': function(data) { this.gamer.jinhuaCheckCard(); },
	'showcard': function(data) { this.gamer.jinhuaShowCard(); }
};

JinhuaGame.prototype.onJoin = function(gamer) {
	gamer.game = this;
	
	gamer.jinhua_status = {};
	for(var i in JinhuaGamer) gamer[i] = JinhuaGamer[i];
	
	if(this.socket) this.linkGamer(gamer);
};

JinhuaGame.prototype.onLeave = function(gamer) {
	if(gamer.socket) this.unlinkGamer(gamer);
	
	for(var i in JinhuaGamer) if(gamer.hasOwnProperty(i)) delete gamer[i];
	delete gamer.jinhua;
	gamer.game = null;
};

JinhuaGame.prototype.linkGamer = function(gamer) {
	var socket = gamer.socket;
	if(! socket) return;
	
	for(var i in gameCmds) socket.on(i, gameCmds[i]);
	
	var commands = {};
	for(var i in gameCmds) commands[i] = true;
	socket.emit('commands',{
		context: 'game',
		commands: commands
	});
};

JinhuaGame.prototype.unlinkGamer = function(gamer) {
	var socket = gamer.socket;
	if(! socket) return;
	
	var commands = {};
	for(var i in gameCmds) commands[i] = null;
	socket.emit('commands',{
		context: 'game',
		commands: commands
	});
	
	for(var i in gameCmds) socket.removeListener(i, gameCmds[i]);
};

// ------ API defined for Gamer Object -----

function gamerReady(){
	var gamer = this;
	
	if(gamer.in_game) return;
	if(gamer.is_ready) return;
	
	var room = gamer.room;
	var game = gamer.game;
	
	gamer.is_ready = true;
	game.ready_gamers ++;
	room.emit('ready', {who:{uid:gamer.uid, name:gamer.name}});
	
	if(game.in_game) return;
	
	if(game.ready_gamers == 2) {
		game.gameReady();
	}
}

function gamerFollow() {
	var gamer = this;
}

function gamerAdd(n) {
	
}

function gamerAllIn() {
	
}

function gamerGiveUp() {
	
}

function gamerPk() {
	
}

function gamerCheckCard() {
	
}

function gamerShowCard() {
	
}
