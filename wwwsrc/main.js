
var Client = require('../lib/client'),
	Poker = require('../lib/poker'),
	Jinhua = require('../lib/jinhua_poker');

var client = null;

$(document).ready(function(){
	var socket = io('http://localhost:7000');
	
	console.log(socket);
	socket.log_traffic = true;
	
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

	client = new Client(socket);
	
	client.on('shout', function(ret){
		addMsg(ret.who.name + ' shout: ' + ret.msg);
	});
	
	client.on('look', function(ret){
		showRoom(ret);
	});
	
	client.on('enter', function(ret){
		addMsg(ret.who.name + ' came into room ' + ret.where);
		showRoom(client.room);
	});
	
	client.on('exit', function(ret){
		addMsg(ret.who.name + ' left room ' + ret.where);
		showRoom(client.room);
	});

	client.on('takeseat', function(ret){
		addMsg(ret.who.name + ' take seat ' + ret.where);
		showRoom(client.room);
	});

	client.on('unseat', function(ret){
		addMsg(ret.who.name + ' stand up from ' + ret.where);
		showRoom(client.room);
	});

	client.on('say', function(ret){
		addMsg(ret.who.name + ' say: ' + ret.msg);
	});
	
	client.on('disconnect', function(ret){
		addMsg(ret);
	});

	$('#m').focus();
	$('form').submit(function(e) {
		execCmd();
		return false;
	});
});

function login(u, p) {
	client.login(u, p, function(err,ret){
		console.log(err, ret);
		if(err) {
			echo(ret);
		} else {
			localStorage.setItem('x_userid', u);
			localStorage.setItem('x_passwd', p);
			addMsg('hi ' + ret.profile.name + ', login success, sid:' + ret.token.sid);
			
			list_games();
		}
		
	}, function(err){
		localStorage.removeItem('x_userid');
		localStorage.removeItem('x_passwd');
		echo(err);
	});
}

function list_games(){
	client.games(function(err, ret){
		if(err) echo(ret);
		else {
			var list = $('#list');
			list.empty();
			for(var i=0; i<ret.length; i++) {
				var game = ret[i];
				var str = game.id + ': ' + game.name + ' (' + game.desc + '), ' + game.rooms + ' rooms';
				list.append($('<li>').text(str));
			}
		}
	});
}

function list_rooms( gameid ) {
	client.rooms(gameid, function(err, ret){
		if(err) echo(ret);
		else {
			var list = $('#list');
			list.empty();
			for(var i=0; i<ret.length; i++) {
				var room = ret[i];
				var str = 'room id: ' + room.id 
				+ ', name: "' + room.name 
				+ '", seats: ' + room.seats_taken + '/' + room.seats_count 
				+ ', gamers:' + room.gamers_count;
				list.append($('<li>').text(str));
			}
		}
	});
}

function addMsg(str) {
	$('#messages').append($('<li>').text(str));
}

function echo(ret) {
	addMsg( JSON.stringify(ret) );
}

function echo2(err, ret) {
	addMsg( JSON.stringify(ret) );
}

function echeOnErr(err, ret) {
	if(err) addMsg(ret);
}

function showRoom(room) {
	$('#seats').empty();
	$('#roomname').text(room.id + ' (' + room.name + ')');
	
	var gamers = room.gamers;
	var seats = room.seats;
	$('#seats').append($('<li>').text('gamers:' + Object.keys(gamers).join(', ')));
	for(var i=0, len=seats.length; i<len; i++) {
		var uid = seats[i];
		var g = uid ? gamers[ uid ] : null;
		var str = "#" + i + ': ';
		if(g) {
			str += g.uid + ' (' + g.name + ') [' + g.coins + ', ' + g.score + ', ' + g.exp + ', ' + g.level + ']';
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
	case 'signup':
		client.signup({}, function(err,ret){
			if(err) {
				echo(ret);
			} else {
				echo(ret);
				localStorage.setItem('x_userid', uid);
				localStorage.setItem('x_passwd', passwd);
			}
		});
		break;
	case 'login':
		login(words[1], words[2]);
		break;
	case 'logout':
		client.logout(echo2);
		break;
	case 'games':
		list_games();
		break;
	case 'rooms':
		list_rooms( words[1] );
		break;
	case 'entergame':
		client.entergame(words[1], echeOnErr);
		break;
	case 'enter':
		client.enter(words[1], echeOnErr);
		break;
	case 'look':
		client.look(function(err, ret){
			if(err) echo(ret);
			else {
				showRoom(ret);
			}
		});
		break;
	case 'exit':
		client.exit(function(err, ret){
			if(err) echo(ret);
			else {
				echo(ret);
				$('#seats').empty();
				$('#roomname').text('Not in room');
			}
		});
		break;
	case 'takeseat':
		client.rpc('takeseat', words[1], echeOnErr);
		break;
	case 'unseat':
		client.rpc('unseat', 0, echeOnErr);
		break;
	case 'shout':
		words.shift();
		var args = words.join(' ');
		client.shout(args);
		break;
	case 'say':
		words.shift();
		var args = words.join(' ');
		client.say( args, echeOnErr );
		break;
	default:
		client.say( cmd, echeOnErr );
	}
}
