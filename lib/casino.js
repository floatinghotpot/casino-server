var Room = require('./room');

exports = module.exports = Casino;
	
function Casino(){
	if(!(this instanceof Casino)) return new Casino();
	
	this.id = Math.floor(Math.random() * 100);
	
	this.gamers = {};
	this.gamers_count = 0;
	
	this.areas = {};
	this.areas_count = 0;
	
	this.rooms = {};
	this.rooms_count = 0;
};

Casino.prototype.addGame = function( conf ) {
	if(typeof conf !== 'object') {
		console.log( 'game conf missing' );
		return;
	}
	if(! conf.id) conf.id = 'game' + (++ this.areas_count);
	if(! conf.name) conf.name = conf.id;
	if(! conf.desc) conf.desc = '';
	
	var Game = conf.game;
	if((! Game) || (typeof Game !== 'function') || (typeof Game.rule !== 'object')) {
		console.log( 'game class not configured' );
		return;
	}
	if(! conf.options) conf.options = {};
	if(! conf.max) conf.max = 1000;

	if(conf.id in this.areas) {
		console.log('game id conflict with existing game');
		return;
	}
	
	var area = {
		id: conf.id,
		name: conf.name,
		desc: conf.desc,
		game: conf.game,
		options: conf.options,
		max: conf.max,
		rooms: {},
		rooms_count: 0
	};
	this.areas[ conf.id ] = area;
	this.areas_count ++;
	
	return this;
};

Casino.prototype.addRoom = function(areaid, n) {
	var area = this.areas[ areaid ];
	if(! area) {
		console.log('area id ' + areaid + ' not exist');
		return;
	}
	
	var Game = area.game;
	var options = area.options;
	var max_seats = Game.rule.max_seats;
	
	if(typeof n === 'number') {
		for(var i=0; i<n; i++) {
			var room = new Room(max_seats);
			room.casino = this;
			room.setGame( new Game( options ) );
			
			this.rooms[ room.id ] = room;
			this.rooms_count ++;
			
			area.rooms[ room.id ] = room;
			area.rooms_count ++;
		}
		
	} else if(n instanceof Room) {
		var room = n;
		room.casino = this;
		room.setGame( new Game( options ) );
		
		this.rooms[ room.id ] = room;
		this.rooms_count ++;
		
		area.rooms[ room.id ] = room;
		area.rooms_count ++;
	}
	
	return this;
};

Casino.prototype.addGamer = function(gamer) {
	var uid = gamer.uid;
	
	if(uid && (!(uid in this.gamers))) {
		this.gamers[uid] = gamer;
		this.gamers_count ++;

		gamer.casino = this;
	}
};

Casino.prototype.removeGamer = function(gamer) {
	var uid = gamer.uid;
	if(! (uid in this.gamers)) return;
	
	delete gamer.casino;
	delete this.gamers[ uid ];
	this.gamers_count --;
};

Casino.prototype.closeAll = function(){
	var gamers = this.gamers;
	for(var i in gamers) {
		var gamer = gamers[i];
		
		gamer.onLogout();
		
		delete gamer.casino;
		delete this.gamers[ gamer.uid ];
		this.gamers_count --;
	}
	
	var areas = this.areas;
	for(var i in areas) {
		var area = areas[i];
		var rooms = area.rooms;
		for(var j in rooms) {
			rooms[j].close();
		}
	}
	this.areas = {};
	this.areas_count = 0;
	this.rooms = {};
	this.rooms_count = 0;
};
