
var Gamer = require('../lib/gamer'),
	Room = require('../lib/room'),
	Casino = require('../lib/casino'),
	Poker = require('../lib/poker'),
	Jinhua = require('../lib/jinhua_poker'),
	JinhuaGame = require('../lib/jinhua_game');

var gamer = null;

$(document).ready(function(){
	var socket = io('http://localhost:7000');
	
	console.log(socket);
	
	socket.on('hello', function(data){
		addMsg(data.msg);
		
		setTimeout(function(){
			var u = localStorage.getItem('x_userid');
			var p = localStorage.getItem('x_passwd');
			if(u && p) {
				login(u, p);
			} else {
				addMsg('please login, syntax: login username password');
			}
		}, 1000);
	});

	gamer = (new Gamer()).setUplink(socket);
	
	gamer.on('enter', function(ret){
		addMsg(ret.who.name + ' came into ' + ret.where.name);
	});
	
	gamer.on('exit', function(ret){
		addMsg(ret.who.name + ' left ' + ret.where.name);
	});

	gamer.on('shout', function(ret){
		addMsg(ret.who.name + ' shout: ' + ret.msg);
	});
	
	gamer.on('say', function(ret){
		addMsg(ret.who.name + ' say: ' + ret.msg);
	});
	
	gamer.on('roomchange', function(ret){
		showRoom(ret);
	});

	$('#m').focus();
	$('form').submit(function(e) {
		execCmd();
		return false;
	});
});

function login(u, p) {
	gamer.login(u, p, function(ret){
		console.log(ret);
		localStorage.setItem('x_userid', u);
		localStorage.setItem('x_passwd', p);
		addMsg('hi ' + ret.profile.name + ', login success');
		
		list_games();
		
	}, function(err){
		localStorage.removeItem('x_userid');
		localStorage.removeItem('x_passwd');
		echo(err);
	});
}

function list_games(){
	gamer.games(0, function(ret){
		var list = $('#list');
		list.empty();
		for(var i=0; i<ret.length; i++) {
			var game = ret[i];
			var str = game.id + ': ' + game.name + ' (' + game.desc + '), ' + game.rooms + ' rooms';
			list.append($('<li>').text(str));
		}
	}, function(err){});
}

function list_rooms( gameid ) {
	gamer.rooms(gameid, function(ret){
		var list = $('#list');
		list.empty();
		for(var i=0; i<ret.length; i++) {
			var room = ret[i];
			var str = room.id + ': ' + room.name + ' (' + room.seats_taken + '/' + room.seats + ')';
			list.append($('<li>').text(str));
		}
	}, function(err){});
}

function list_gamers(){
	gamer.gamers(0, function(ret){
		var list = $('#list');
		list.empty();
		for(var i=0; i<ret.length; i++) {
			var g = ret[i];
			var str = g.uid + ' (' + g.name + ') [' + d.coins + ', ' + d.score + ', ' + d.exp + ', ' + d.level + ']';
			list.append($('<li>').text(str));
		}
	}, function(err){});
}

function addMsg(str) {
	$('#messages').append($('<li>').text(str));
}

function echo(data) {
	addMsg( JSON.stringify(data) );
}

function showRoom(ret) {
	$('#seats').empty();
	for(var i in ret.seats) {
		var g = ret.seats[i];
		var str = "#" + i + ': ';
		if(g) {
			var d = g.data;
			str += g.uid + ' (' + g.name + ') [' + d.coins + ', ' + d.score + ', ' + d.exp + ', ' + d.level + ']';
		} else {
			str += '(empty)';
		}
		$('#seats').append($('<li>').text(str));
	}
}

function execCmd() {
	var cmd = $('#m').val() + '';
	if(cmd.length == 0) return false;
	$('#m').val('');
	$('#m').focus();
	
	var words = cmd.split(' ');
	switch(words[0]) {
	case 'clear':
		$('#list').empty();
		$('#seats').empty();
		$('#messages').empty();
		break;
	case 'login':
		login(words[1], words[2]);
		break;
	case 'logout':
		gamer.logout(echo, echo);
		break;
	case 'games':
		list_games();
		break;
	case 'rooms':
		list_rooms( words[1] );
		break;
	case 'gamers':
		list_gamers();
		break;
	case 'enter':
		gamer.enter(words[1], function(ret){
			showRoom(ret);
			$('#roomname').text(ret.name);
		}, function(err){
			echo(err);
		});
		break;
	case 'look':
		gamer.look(0, function(ret){
			showRoom(ret);
			$('#roomname').text(ret.name);
		}, function(ret){
			echo(ret);
		});
		break;
	case 'exit':
		gamer.exit(0, function(ret){
			$('#seats').empty();
			$('#roomname').text('Not in room');
		}, function(err){
			echo(err);
		});
		break;
	case 'takeseat':
		gamer.takeseat(words[1], function(ret){
		}, function(err){
			echo(err);
		});
		break;
	case 'unseat':
		gamer.unseat();
		break;
	case 'shout':
		words.shift();
		var args = words.join(' ');
		gamer.shout(args);
		break;
	case 'say':
		words.shift();
		var args = words.join(' ');
		gamer.say(args);
		break;
	default:
		gamer.say( cmd );
	}
}
