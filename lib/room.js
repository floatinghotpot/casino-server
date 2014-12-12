exports = module.exports = Room;

var room_index = 0;

function Room(max_seats) {
	if(!(this instanceof Room)) return new Room(max_seats);
	
	if(! max_seats) max_seats = 4;
	
	this.id = 'room' + (++ room_index);
	this.name = this.id;
	
	this.gamers = {};
	this.gamers_count = 0;
	
	this.seats = {}; // "N" -> gamer or null
	for(var i=0; i<max_seats; i++) {
		this.seats[ i + '' ] = null;
	}
	this.seats_count = max_seats;
	this.seats_taken = 0;
	
	this.game = null; // game object
}

Room.prototype.setGame = function( game ) {
	if(this.game != null) {
		var old_game = this.game;
		old_game.close();
		old_game.room = null;
	}
	
	this.game = game;
	game.room = this;
};

Room.prototype.removeGame = function() {
	if(! this.game) return;
	this.game.close();
	this.game = null;
};

Room.prototype.close = function() {
	var gamers = this.gamers;
	for(var i in gamers) gamers[i].exit(this);
	
	if(this.game) this.removeGame();
};

Room.prototype.brief = function(){
	return {
		id: this.id,
		name: this.name,
		seats_count: this.seats_count,
		seats_taken: this.seats_taken,
		gamers_count: this.gamers_count
	};
};

Room.prototype.details = function(){
	var roomgamers = this.gamers, roomseats = this.seats;
	var gamerlist = {}, seatlist = {};
	for(var k in roomgamers) {
		gamerlist[k] = roomgamers[k].name;
	}
	for(var k in roomseats) {
		var seated = roomseats[k];
		if(seated) {
			seatlist[k] = seated.brief();
		} else {
			seatlist[k] = null;
		}
	}
	return {
		id: this.id,
		name: this.name,
		gamers: gamerlist,
		seats: seatlist
	};
};

Room.prototype.findEmptySeat = function(){
	for(var i in this.seats) {
		if(! this.seats[i]) {
			return i;
		}
	}
	return null;
};

Room.prototype.event = function(event, args) {
	var casino = this.casino;
	if(! casino) return;
	var io = casino.io;
	if(! io) return;
	io.to(this.id).emit('push', {e:event, args:args});
};

