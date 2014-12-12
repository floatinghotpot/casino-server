
var socketio = require('socket.io'),
	Timer = require('../lib/fast_timer'),
	Casino = require('../lib/casino'),
	Room = require('../lib/room'),
	Gamer = require('../lib/gamer'),
	JinhuaGame = require('../lib/jinhua_game');

describe("A suite for rpc", function() {
	var gamer = null;
	
	beforeEach(function() {
		//gamer = new Gamer();
		
	});

	afterEach(function() {
	});
	
	
	it('test io connect', function(){
		//var io = socketio.connect('http://localhost:7000/');
		//expect(!! io).toBe(true);
	});
	
	it('test singleton timer', function(){
		var timer1 = Timer();
		var timer2 = Timer();
		expect(timer1.id === timer2.id).toBe(true);
	});
	
	it('test casino', function(){
	});
});

