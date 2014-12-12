
var Timer = require('../lib/fast_timer'),
	Casino = require('../lib/casino'),
	Room = require('../lib/room'),
	Gamer = require('../lib/gamer'),
	JinhuaGame = require('../lib/jinhua_game');

describe("A suite for data model", function() {
	var casino = null;

	beforeEach(function() {
		Timer().hijack();
		casino = new Casino();
	});

	afterEach(function() {
		casino.closeAll();
		casino = null;
		Timer().restore();
	});
	
	it('test casino', function(){
		casino.addGame({
			id: 'jinhua',
			game: JinhuaGame,
			max: 10
		}).addRoom('jinhua', 2);
		
		expect(casino.rooms_count).toBe(2);
	});
});

describe("A suite for data model", function() {
	var casino = null;
	var room = null;
	
	beforeEach(function() {
		Timer().hijack();
		casino = Casino();
		casino.addGame({id:'jinhua', game:JinhuaGame, min:1});
		room = new Room();
		casino.addRoom('jinhua', room);
	});

	afterEach(function() {
		room = null;
		casino.closeAll();
		casino = null;
		Timer().restore();
	});
	
	it('test gamer and room', function() {
		expect(room.seats_count).toBe(4);
		expect(room.gamers_count).toBe(0);

		var gamer = new Gamer();
		casino.addGamer(gamer); 
		gamer.enter(room.id, function(data){
			//console.log('entered room and see:', data);
			
		}, function(err){
			expect(err.code).not.toBe(-1);
			if(err.code == -1) {
				//console.log(casino); 
				console.log(err); 
			}
		});
		
		//console.log(gamer.room);
		expect(!! gamer.room).toBe(true);
		expect(gamer.room.id).toBe(room.id);
		expect(room.gamers_count).toBe(1);
		expect(room.seats_taken).toBe(0);

		gamer.takeseat();
		expect(room.seats_taken).toBe(1);

		gamer.exit();
		expect(room.seats_taken).toBe(0);
		expect(room.gamers_count).toBe(0);
		expect(gamer.room).toBe(null);

		gamer.takeseat();
		expect(gamer.seat).toBe(null);
	});

	it('test jinhua game', function() {
		return;
		
		// mock
		room.event = function(event, args) {
			console.log(event, args);
		};
		
		var gamers = [];
		for (var i=0; i<4; i++) {
			var gamer = new Gamer();
			casino.addGamer(gamer);
			
			gamer.enter(room.id);
			gamer.takeseat();
			
			gamers.push(gamer);
		}
		expect(room.seats_taken).toBe(4);
		
		//Timer.fastTick(10);
		
		//Timer.fastTick(30);
		
	});
});

