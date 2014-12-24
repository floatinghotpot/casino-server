
var Client = require('../lib/client'),
	Poker = require('../lib/poker'),
	Jinhua = require('../lib/jinhua_poker');

var client = null;

$(document).ready(function(){
	var socket = io();
	
	//console.log(socket);
	socket.log_traffic = true;
	
	socket.on('hello', function(data){
		$('div#cmds').empty();
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
	function onBtnClicked(e) {
		client.rpc($(this).attr('id'), $(this).attr('arg'), echoOnErr);
	}
	function onInputBtnClicked(e){
		var method = $(this).attr('id');
		client.rpc($(this).attr('id'), $('input#'+method).val(), echoOnErr);
		$('input#'+method).val('');
	}
	function onInputBoxEnter(e) {
		if(e.which == 13) onInputBtnClicked.call(this, e);
	}
	client.on('prompt', function(cmds){
		var btn;
		var div;
		for(var k in cmds) {
			var v = cmds[ k ];
			if(v === null) {
				$('div#'+k).remove();
				$('button#'+k).remove();
				
			} else if(v === true) {
				btn = $('<button>').text(k).attr('id', k).attr('arg', 0).addClass('cmd');
				$('#cmds').append(btn);
				btn.on('click', onBtnClicked);
				
			} else if(typeof v === 'string') {
				div = $('<div>').attr('id',k).addClass('cmd');
				$('#cmds').append(div);
				var words = v.split(',');
				var input = $('<input>').attr('id', k).addClass('cmd');
				switch(words[0]) {
				case 'text':
					input.attr('type', 'text').attr('size',60);
					break;
				case 'range':
					input.attr('type', 'range');
					if(words[1]) input.attr('min', parseInt(words[1]));
					if(words[2]) input.attr('max', parseInt(words[2]));
					break;
				case 'number':
					input.attr('type', 'number').attr('size',5);
					if(words[1]) input.attr('min', parseInt(words[1]));
					if(words[2]) input.attr('max', parseInt(words[2]));
					break;
				}
				div.append(input);
				btn = $('<button>').text(k).attr('id', k).addClass('cmd');
				div.append(btn);
				btn.on('click', onInputBtnClicked);
				input.keydown(onInputBoxEnter);
				
			} else if( Object.prototype.toString.call( v ) === '[object Array]' ) {
				div = $('<div>').attr('id',k).addClass('cmd');
				$('#cmds').append(div);
				for(var i=0; i<v.length; i++) {
					var arg = v[i];
					btn = $('<button>').text(k+' '+arg).attr('id', k).attr('arg', arg).addClass('cmd');
					div.append(btn);
					btn.on('click', onBtnClicked);
				}
				
			} else {
				
			}
		}
	});
	
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
		if(ret.uid === client.uid) {
			showRoom(null);
		} else {
			showRoom(client.room);
		}
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
	
	client.on('deal', function(ret){
		var room_cards = client.room.cards = {};
		while(ret.length > 0) {
			var item = ret.pop();
			var seat = item[0];
			var cards = item[1];
			room_cards[ seat ] = Poker.sortByNumber( cards );
		}
		
		showRoom(client.room);
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
		//console.log(err, ret);
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
				var str = 'room id: ' + room.id + 
					', name: "' + room.name +
					'", seats: ' + room.seats_taken + '/' + room.seats_count + 
					', gamers:' + room.gamers_count;
				list.append($('<li>').text(str));
			}
		}
	});
}

function addMsg(str) {
	$('#messages').append($('<li>').text(str).addClass('msg'));
	var msgs = $('li.msg');
	var n = msgs.length - 20;
	if(n > 0) {
		for(var i=0; i<n; i++) {
			msgs[i].remove();
		}
	}
}

function echo(ret) {
	addMsg( JSON.stringify(ret) );
}

function echo2(err, ret) {
	addMsg( JSON.stringify(ret) );
}

function echoOnErr(err, ret) {
	if(err) addMsg(ret);
}

function showRoom(room) {
	$('#seats').empty();
	
	if(! room) {
		$('#roomname').text('not in room');
		return;
	}
	
	$('#roomname').text(room.id + ' (' + room.name + ')');
	
	var gamers = room.gamers;
	var seats = room.seats;
	var cards = room.cards;
	console.log('cards:', cards);
	$('#seats').append($('<li>').text('gamers:' + Object.keys(gamers).join(', ')));
	for(var i=0, len=seats.length; i<len; i++) {
		var uid = seats[i];
		var g = uid ? gamers[ uid ] : null;
		var str = "#" + i + ': ';
		if(g) {
			str += g.uid + ' (' + g.name + ') [' + g.coins + ', ' + g.score + ', ' + g.exp + ', ' + g.level + ']';
			if(cards) {
				str += '[ ' + Poker.visualize( cards[i] ) + ' ]';
			}
		} else {
			str += '(empty)';
		}
		$('#seats').append($('<li>').text(str).attr('id', 'seat'+i));
	}
}

function execCmd() {
	var cmd = $('#m').val() + '';
	if(cmd.length === 0) return false;
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
		client.signup({
			uid: words[1],
			passwd: words[2]
		}, function(err,ret){
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
		client.entergame(words[1], echoOnErr);
		break;
	case 'enter':
		client.enter(words[1], echoOnErr);
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
				showRoom(null);
			}
		});
		break;
	case 'takeseat':
		client.rpc('takeseat', words[1], echoOnErr);
		break;
	case 'unseat':
		client.rpc('unseat', 0, echoOnErr);
		break;
	case 'shout':
		words.shift();
		client.shout(words.join(' '));
		break;
	case 'say':
		words.shift();
		client.say( words.join(' '), echoOnErr );
		break;
	default:
		//client.say( cmd, echoOnErr );
	}
}
