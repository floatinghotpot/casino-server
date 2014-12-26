
var Client = require('../lib/client'),
	Poker = require('../lib/poker'),
	Jinhua = require('../lib/jinhua_poker');

var client = null;

$(document).ready(function(){
	var socket = io();
	
	//console.log(socket);
	socket.log_traffic = true;
	
	client = new Client(socket);
	
	socket.on('hello', function(data){
		$('div#cmds').empty();
		addMsg(data.msg);
		
		setTimeout(function(){
			var u = localStorage.getItem('x_userid');
			var p = localStorage.getItem('x_passwd');
			if(u && p) {
				login(u, p);
			} else {
				socket.emit('hello', {});
			}
		}, 1000);
	});

	/*
	 * cmds {
	 *     exit: true,
	 *     takeseat: true,
	 *     unseat: true,
	 *     followchip: true,
	 *     addchip: [50,100,150],
	 *     addchip: 'range,0,1000000',
	 *     giveup: true,
	 *     pk: ['zhang3', 'li4', 'wang5'],
	 *     checkcard: true,
	 *     showcard: true,
	 *   }
	 */
	function onBtnClicked(e) {
		var method = $(this).attr('id');
		client.rpc(method, $(this).attr('arg'), echoOnErr);
	}
	function onInputBtnClicked(e){
		var method = $(this).attr('id');
		client.rpc(method, $('input#'+method).val(), echoOnErr);
		$('input#'+method).val('');
	}
	function onInputBoxEnter(e) {
		if(e.which == 13) onInputBtnClicked.call(this, e);
	}
	function onDialogBtnClicked(e) {
		var method = $(this).attr('id');
		var dlg = $('div#'+method);
		var x = ($(window).width() - dlg.width()) / 2;
		var y = ($(window).height() - dlg.height()) / 2;
		dlg.show();
		dlg.css({ 
			position:'absolute',
			left: x + 'px', 
			top: y + 'px'
		});
		
		$(this).hide();
	}
	function onDialogXClicked(e) {
		var method = $(this).attr('X');
		$('div#'+method).hide();
		$('button#'+method).show();
	}
	function onDialogOKClicked(e) {
		var method = $(this).attr('OK');
		var args = {};
		$('input.' + method).each(function(i, v){
			var input = $(this);
			args[ input.attr('id') ] = input.val();
		});
		client.rpc(method, args, echoOnErr);
	}
	client.on('prompt', function(cmds){
		console.log('prompt', cmds);
		
		var v, div, btn, words, label, input;
		for(var k in cmds) {
			v = cmds[ k ];
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
				input = $('<input>').attr('id', k).addClass('cmd');
				words = v.split(',');
				switch(words[0]) {
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
				//case 'text':
				default:
					input.attr('type', 'text').attr('size',40);
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
				
			} else if( typeof v === 'object' ) {
				btn = $('<button>').text(k).attr('id', k).addClass('cmd');
				$('#cmds').append(btn);
				
				var dlg = $('<div>').attr('id',k).addClass('dialog');
				$('body').append(dlg);
				dlg.hide();
				
				var dlgheader = $('<div>').addClass('dlgheader');
				dlg.append(dlgheader);
				dlgheader.append($('<span>').text(k));
				var X = $('<button>').text('X').attr('X', k).addClass('cmd');
				dlgheader.append(X);
				for(var j in v) {
					words = v[j].split(',');
					label = $('<label>').attr('for', j).text(j+':').addClass('cmd');
					input = $('<input>').attr('id', j).addClass(k).addClass('cmd');
					switch(words[0]) {
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
					//case 'text':
					default:
						input.attr('type', 'text').attr('size',40);
						break;
					}
					dlg.append(label).append(input).append('<br/>');
				}
				var dlgfooter = $('<div>').addClass('dlgfooter');
				dlg.append(dlgfooter);
				var OK = $('<button>').text('OK').attr('OK', k).addClass('cmd');
				dlgfooter.append(OK);
				
				btn.on('click', onDialogBtnClicked);
				OK.on('click', onDialogOKClicked);
				X.on('click', onDialogXClicked);

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
		addMsg('dealing cards ...');
		
		var deals = ret.deals;
		var room_cards = client.room.cards = {};
		var room_chips = client.room.chips = {};
		var item, seat, cards;
		while(deals.length > 0) {
			item = deals.pop();
			seat = item[0];
			cards = item[1];
			room_cards[ seat ] = Poker.sortByNumber( cards );
		}
		
		showRoom(client.room);
		addMsg('delay ' + ret.delay + ' sec ...');
		
		var first = ret.seats[0];
		addMsg('first turn: ' + first + ', ' + client.room.seats[ first ]);
	});
	
	client.on('moveturn', function(ret){
		var seat = ret.seat;
		$('li.seat').removeClass('active');
		$('li#seat'+seat).addClass('active');
		
		addMsg('now: ' + seat + ', ' + ret.uid);
	});
	
	client.on('countdown', function(ret){
		addMsg('count down: ' + ret.seat + ', ' + ret.sec);
	});
	
	client.on('giveup', function(ret){
		addMsg( ret.uid + ' at ' + ret.seat + ' give up');
	});
	
	client.on('follow', function(ret){
		addMsg( ret.uid + ' at ' + ret.seat + ' follow ' + ret.chip);
	});

	client.on('addchip', function(ret){
		addMsg( ret.uid + ' at ' + ret.seat + ' addchip ' + ret.chip);
	});

	client.on('pk', function(ret){
		addMsg( ret.uid + ' at ' + ret.seat + ' pk ' + ret.pk_uid + ' at ' + ret.pk_uid + ', result: ' + (ret.win?'win':'lost'));
	});
	
	client.on('checkcard', function(ret){
		addMsg( ret.uid + ' at ' + ret.seat + ' checkcard' );
		if(ret.cards) {
			client.room.cards[ parseInt(ret.seat) ] = ret.cards;
			showRoom(client.room);
		}
	});
	
	client.on('showcard', function(ret){
		addMsg( ret.uid + ' at ' + ret.seat + ' showcard' );
		if(ret.cards) {
			client.room.cards[ parseInt(ret.seat) ] = ret.cards;
			showRoom(client.room);
		}
	});
	
	client.on('gameover', function(ret){
		addMsg( 'game over! ' + ret.uid + ' at ' + ret.seat + ' win ' + ret.prize);
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
	client.rpc('login', {
		uid: u,
		passwd: p
	}, function(err,ret){
		//console.log(err, ret);
		if(err) {
			echo(ret);
			socket.emit('hello', {});
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
	client.rpc('games', 0, function(err, ret){
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
	client.rpc('rooms', gameid, function(err, ret){
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
			if(cards && cards[i]) {
				str += '[ ' + Poker.visualize( cards[i] ) + ' ]';
			}
		} else {
			str += '(empty)';
		}
		$('#seats').append($('<li>').text(str).attr('id', 'seat'+i).addClass('seat'));
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
		client.rpc('signup', {
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
		client.rpc('logout', 0, echo2);
		break;
	case 'games':
		list_games();
		break;
	case 'rooms':
		list_rooms( words[1] );
		break;
	case 'entergame':
		client.rpc('entergame', words[1], echoOnErr);
		break;
	case 'enter':
		client.rpc('enter', words[1], echoOnErr);
		break;
	case 'look':
		client.rpc('look', 0, function(err, ret){
			if(err) echo(ret);
			else {
				showRoom(ret);
			}
		});
		break;
	case 'exit':
		client.rpc('exit', 0, function(err, ret){
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
		client.rpc('shout', 0, words.join(' '));
		break;
	case 'say':
		words.shift();
		client.rpc('sat', words.join(' '), echoOnErr );
		break;
	default:
		//client.say( cmd, echoOnErr );
	}
}
