
var Client = require('../lib/client'),
	Poker = require('../lib/poker'),
	Jinhua = require('../lib/jinhua_poker'),
	Holdem = require('../lib/holdem_poker');

var client = null;

Poker.toHTML = function(cards) {
	var html = '';
	for(var i=0; i<cards.length; i++) {
		var card = cards[i];
		var color = card >> 4;
		var number = card & 0xf;
		var png = color + '_' + number + '.png';
		html += "<img src='img/" + png + "'/>";
	}
	return html;
};

$(document).ready(function(){
	var socket = io();
	
	socket.log_traffic = true;
	
	client = new Client(socket);
	
	var lang = $.cookie('lang');
	if(lang) {
		$("select#lang option").filter(function() {
		    return $(this).val() == lang; 
		}).prop('selected', true);
		
		hotjs.i18n.setLang( lang );
		hotjs.i18n.translate();
	}

	$('select#lang').change(function(){
		$( "select#lang option:selected" ).each(function() {
			$.cookie('lang', $(this).val());
			location.reload();
		});	
	});

	socket.on('hello', function(data){
		$('#messages').empty();
		$('div#cmds').empty();
		showRoom(null);
		
		addMsg(data.msg);
		
		setTimeout(function(){
			var u = localStorage.getItem('x_userid');
			var p = localStorage.getItem('x_passwd');
			if(u && p) {
				login(u, p);
			} else {
				//socket.emit('hello', {});
				client.rpc('fastsignup', 0, parseSignUpReply);
			}
		}, 1000);
	});

	client.on('prompt', updateCmds);
	
	client.on('shout', function(ret){
		addMsg(ret.who.name + _T_('shout:') + ret.msg);
	});
	
	client.on('look', function(ret){
		showRoom(ret);
	});
	
	client.on('refresh', function(ret){
		showRoom(client.room);
	});
	
	client.on('enter', function(ret){
		addMsg(ret.who.name + _T_('enter') + ret.where);
		showRoom(client.room);
	});
	
	client.on('exit', function(ret){
		addMsg(ret.who.name + _T_('exit') + ret.where);
		if(ret.uid === client.uid) {
			showRoom(null);
			list_games();
		} else {
			showRoom(client.room);
		}
	});

	client.on('takeseat', function(ret){
		addMsg(ret.who.name + _T_('take seat') + ret.where);
		showRoom(client.room);
	});

	client.on('unseat', function(ret){
		addMsg(ret.who.name + _T_('unseat from') + ret.where);
		showRoom(client.room);
	});

	client.on('say', function(ret){
		addMsg(ret.who.name + _T_('say:') + ret.msg);
	});
	
	client.on('gamestart', function(ret){
		addMsg(_T('game start'));
		
		if(ret.room) {
			client.room = ret.room;
		}
		
		if(ret.inseats) {
			var seats = client.room.seats;
			var seat = ret.inseats[0];
			var uid = seats[ seat ];
			addMsg( 'first/D button: ' + uid + ' at seat ' + seat );
		}
	});
	
	client.on('deal', function(ret){
		addMsg(_T('dealing cards'));
		
		var room_cards = client.room.cards;
		var deals = ret.deals;
		var item, seat, cards;
		while(deals.length > 0) {
			item = deals.pop();
			seat = item[0];
			cards = item[1];
			if(seat >= 0) {
				room_cards[ seat ] = Poker.sortByNumber( cards );
			} else {
				client.room.shared_cards = Poker.merge(client.room.shared_cards, cards);
			}
		}
		
		showRoom(client.room);
		
		if(ret.delay) {
			addMsg(_T_('delay') + ret.delay + _T_('seconds') + _T_('to bet') );
		}
	});
	
	client.on('moveturn', function(ret){
		var seat = ret.seat;
		$('li.seat').removeClass('active');
		$('li#seat'+seat).addClass('active');
		
		if(ret.uid === client.uid) {
			$('#cmds').removeClass('inactive');
			$('#cmds').addClass('active');
		} else {
			$('#cmds').removeClass('active');
			$('#cmds').addClass('inactive');
		}
		
		addMsg(_T('now:') + seat + ', ' + ret.uid);
	});
	
	client.on('countdown', function(ret){
		addMsg(_T('count down:') + ret.seat + ', ' + ret.sec);
	});
	
	client.on('fold', function(ret){
		addMsg( ret.uid + _T_('at seat') + ret.seat + _T_('fold'));
	});
	
	client.on('call', function(ret){
		var seat = parseInt(ret.seat);
		addMsg( ret.uid + _T_('at seat') + seat + _T_('call') + ret.call);
		
		client.room.pot += ret.call;
		
		var chips = client.room.chips;
		if(chips) {
			chips[ seat ] += ret.call;
		}
		
		var gamers = client.room.gamers;
		if(ret.uid in gamers) {
			gamers[ ret.uid ].coins -= ret.call;
		}
		
		showRoom(client.room);
	});

	client.on('raise', function(ret){
		var seat = parseInt(ret.seat);
		var raise_sum = (ret.call + ret.raise);
		addMsg( ret.uid + _T_('at seat') + seat + _T_('raise') + ret.raise + ' (' + raise_sum + ')');
		
		client.room.pot += raise_sum;
		
		var chips = client.room.chips;
		if(chips) {
			chips[ seat ] += raise_sum;
		}

		var gamers = client.room.gamers;
		if(ret.uid in gamers) {
			gamers[ ret.uid ].coins -= raise_sum;
		}
		
		showRoom(client.room);
	});

	client.on('pk', function(ret){
		addMsg( ret.uid + _T_('at seat') + ret.seat +  _T('pk') + ret.pk_uid + _T_('at seat') + ret.pk_seat + ', ' + _T('result') + ': ' + (ret.win?_T('win'):_T('fail')));
		
		var gamers = client.room.gamers;
		if(ret.uid in gamers) {
			gamers[ ret.uid ].coins -= ret.pk_cost;
		}
		
		showRoom(client.room);
	});
	
	client.on('seecard', function(ret){
		var seat = parseInt(ret.seat);
		addMsg( ret.uid + _T_('at seat') + seat + _T_('seecard') );
		if(ret.cards) {
			client.room.cards[ seat ] = ret.cards;
			showRoom(client.room);
		}
	});
	
	client.on('showcard', function(ret){
		addMsg( ret.uid + _T_('at seat') + ret.seat + _T_('showcard') );
		if(ret.cards) {
			client.room.cards[ parseInt(ret.seat) ] = ret.cards;
			showRoom(client.room);
		}
	});
	
	client.on('gameover', function(ret){
		addMsg( _T('game over!'));
		
		var shared_cards = client.room.shared_cards;
		var gamers = client.room.gamers;
		var cards = client.room.cards;
		var chips = client.room.chips;
		while(ret.length > 0) {
			var gamer = ret.shift();
			var uid = gamer.uid;
			
			var n = (gamer.prize - gamer.chips);
			if(n > 0) n = '+' + n;
			
			var mycards = gamer.cards;
			var pattern = '';
			if(mycards.length === 3) {
				pattern = Jinhua.patternString(mycards);
				addMsg( '#' + gamer.seat + ', ' + uid + ': ' + n + ', ' + _T_(pattern) );
			} else {
				var maxFive = Holdem.sort( Holdem.maxFive(mycards, shared_cards) );
				pattern = Holdem.patternString( maxFive );
				addMsg( '#' + gamer.seat + ', ' + uid + ': ' + n + ', ' + _T_(pattern) + ' (' + Poker.visualize(maxFive) + ')' );
			}
			
			cards[ gamer.seat ] = gamer.cards;
			chips[ gamer.seat ] = gamer.chips;
			
			// if gamer still in room
			if(uid in gamers) {
				delete gamer.cards;
				delete gamer.chips;
				delete gamer.prize;
				
				gamers[ uid ] = gamer;
			}
		}
		
		showRoom(client.room);
	});

	client.on('bye', function(ret){
		addMsg(ret);
	});

	$('#m').focus();
	$('form').submit(function(e) {
		execCmd();
		return false;
	});
});

/*
 * cmds {
 *     exit: true,
 *     takeseat: true,
 *     unseat: true,
 *     call: true,
 *     raise: [50,100,150],
 *     raise: 'range,0,1000000',
 *     fold: true,
 *     pk: ['zhang3', 'li4', 'wang5'],
 *     seecard: true,
 *     showcard: true,
 *   }
 */
function parseSignUpReply(err,ret){
	parseReply(err,ret);
	if(! err) {
		addMsg(_T('account created:') + ret.uid + '/' + ret.passwd);
		login(ret.uid, ret.passwd);
	}
}

function onBtnClicked(e) {
	var method = $(this).attr('id');
	switch(method) {
	case 'fastsignup':
		client.rpc(method, $(this).attr('arg'), parseSignUpReply);
		break;
	default:
		client.rpc(method, $(this).attr('arg'), parseReply);
	}
}
function onInputBtnClicked(e){
	var method = $(this).attr('id');
	client.rpc(method, $('input#'+method).val(), parseReply);
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
	switch(method) {
	case 'signup':
		client.rpc(method, args, parseSignUpReply);
		break;
	default:
		client.rpc(method, args, parseReply);
	}
}

function updateCmds( cmds ){
	var v, div, btn, words, label, input;
	for(var k in cmds) {
		v = cmds[ k ];
		if(v === null) {
			$('div#'+k).remove();
			$('button#'+k).remove();
			
		} else if(v === true) {
			btn = $('<button>').text(_T(k)).attr('id', k).attr('arg', 0).addClass('cmd');
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
				if(words[1]) {
					var min = parseInt(words[1]);
					input.attr('min', min).val(min);
				}
				if(words[2]) input.attr('max', parseInt(words[2]));
				break;
			case 'number':
				input.attr('type', 'number').attr('size',5);
				if(words[1]) input.attr('min', parseInt(words[1]));
				if(words[2]) input.attr('max', parseInt(words[2]));
				break;
			case 'password':
				input.attr('type', 'password').attr('size',40);
				break;
			//case 'text':
			default:
				input.attr('type', 'text').attr('size',40);
				break;
			}
			div.append(input);
			btn = $('<button>').text(_T(k)).attr('id', k).addClass('cmd');
			div.append(btn);
			btn.on('click', onInputBtnClicked);
			input.keydown(onInputBoxEnter);
			
		} else if( Object.prototype.toString.call( v ) === '[object Array]' ) {
			div = $('<div>').attr('id',k).addClass('cmd');
			$('#cmds').append(div);
			for(var i=0; i<v.length; i++) {
				var arg = v[i];
				var t_arg = (typeof arg === 'string') ? _T(arg) : arg;
				btn = $('<button>').text(_T(k)+' '+ t_arg).attr('id', k).attr('arg', arg).addClass('cmd');
				div.append(btn);
				btn.on('click', onBtnClicked);
			}
			
		} else if( typeof v === 'object' ) {
			btn = $('<button>').text(_T(k)).attr('id', k).addClass('cmd');
			$('#cmds').append(btn);
			
			var dlg = $('<div>').attr('id',k).addClass('dialog');
			$('body').append(dlg);
			dlg.hide();
			
			var dlgheader = $('<div>').addClass('dlgheader');
			dlg.append(dlgheader);
			dlgheader.append($('<span>').text(_T(k)));
			var X = $('<button>').text('X').attr('X', k).addClass('cmd');
			dlgheader.append(X);
			for(var j in v) {
				label = $('<label>').attr('for', j).text(_T(j)+':').addClass('cmd');
				input = $('<input>').attr('id', j).addClass(k).addClass('cmd');
				
				words = v[j].split(',');
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
				case 'password':
					input.attr('type', 'password').attr('size',40);
					break;
				//case 'text':
				default:
					input.attr('type', 'text').attr('size',40);
					break;
				}
				
				switch(j) { // auto fill if we remember uid & passwd
				case 'uid':
					var u = localStorage.getItem('x_userid');
					if(u) input.val(u);
					break;
				case 'passwd':
					var p = localStorage.getItem('x_passwd');
					if(p) input.val(p);
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
}

function login(u, p) {
	client.rpc('login', {
		uid: u,
		passwd: p
	}, function(err,ret){
		if(err) {
            localStorage.removeItem('x_userid');
		  localStorage.removeItem('x_passwd');
			echo(ret);
			socket.emit('hello', {});
		} else {
			$('#messages').empty();
			$('div#cmds').empty();
			showRoom(null);

			localStorage.setItem('x_userid', u);
			localStorage.setItem('x_passwd', p);
			addMsg(ret.token.uid + ' (' + ret.profile.name + ') ' + _T('login success'));
			
			if(ret.cmds) {
				updateCmds(ret.cmds);
				
				if('entergame' in ret.cmds) {
					list_games();
				}
			}
		}
		
	});
}

function list_games(){
	client.rpc('games', 0, function(err, ret){
		if(err) echo(ret);
		else {
			$('#roomname').text(_T('available games'));
			var list = $('#seats');
			list.empty();
			for(var i=0; i<ret.length; i++) {
				var game = ret[i];
				var str = (i+1) + ', ' + _T_( game.id ) + ': ' + game.name + ' (' + game.desc + '), ' + game.rooms + ' rooms';
				list.append($('<li>').text(str));
			}
		}
	});
}

function list_rooms( gameid ) {
	client.rpc('rooms', gameid, function(err, ret){
		if(err) echo(ret);
		else {
			var list = $('#seats');
			list.empty();
			for(var i=0; i<ret.length; i++) {
				var room = ret[i];
				var str = 'room id: ' + room.id + 
					', name: "' + room.name +
					'", seats: ' + room.seats_taken + '/' + room.seats_count + 
					', gamers: ' + room.gamers_count;
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

function echoReply(err, ret) {
	addMsg( JSON.stringify(ret) );
}

function parseReply(err, ret) {
	if(err) addMsg(ret);
	else if(ret.cmds) updateCmds(ret.cmds);
}

function showRoom(room) {
	$('#roomname').empty();
	$('#roomdesc').empty();
	$('#sharedcards').empty();
	$('#pot').empty();
	$('#countdown').empty();
	$('#seats').empty();
	$('#mycards').empty();
	if(! room) return;
	
	$('#roomname').text( _T('room number') + ': ' + room.id + ' (' + room.name + ')');
	
	var gamers = room.gamers;
	var seats = room.seats;
	var cards = room.cards;
	var chips = room.chips;
	$('#roomdesc').text(_T('gamers in room') + ': ' + Object.keys(gamers).join(', '));
	for(var i=0, len=seats.length; i<len; i++) {
		var uid = seats[i];
		var g = uid ? gamers[ uid ] : null;
		var str = "#" + i + ': ';
		if(g) {
			str += g.uid + ' (' + g.name + ') [' + g.coins + ', ' + g.score + ', ' + g.exp + ', ' + g.level + ']';
			if(cards && cards[i]) {
				str += _T_('private cards') + '[ ' + Poker.visualize( cards[i] ) + ' ]';
				
				if(g.uid === client.uid) {
					$('#mycards').html( client.uid + ', ' + _T('my cards') + ': <br/>' + Poker.toHTML(cards[i]) );
				}
			}
			if(chips && chips[i]) {
				str += _T_('bet') + '[ ' + chips[i] + ' ]';
			}
			
		} else {
			str += '(' + _T('empty') + ')';
		}
		$('#seats').append($('<li>').text(str).attr('id', 'seat'+i).addClass('seat'));
	}
	
	if(room.shared_cards) {
		$('#sharedcards').html( _T('shared cards') + ': <br/>' + Poker.toHTML(room.shared_cards) );
	}
	
	if(room.pot) {
		$('#pot').text( _T('pot') + ': ' + room.pot );
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
		$('#seats').empty();
		$('#messages').empty();
		break;
	case 'fastsignup':
		client.rpc('fastsignup', 0, parseSignUpReply);
		break;
	case 'signup':
		client.rpc('signup', {
			uid: words[1],
			passwd: words[2]
		}, parseSignUpReply);
		break;
	case 'login':
		login(words[1], words[2]);
		break;
	case 'logout':
		client.rpc('logout', 0, parseReply);
		break;
	case 'games':
		list_games();
		break;
	case 'rooms':
		list_rooms( words[1] );
		break;
	case 'entergame':
		client.rpc('entergame', words[1], parseReply);
		break;
	case 'enter':
		client.rpc('enter', words[1], parseReply);
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
				list_games();
			}
		});
		break;
	case 'takeseat':
		client.rpc('takeseat', words[1], parseReply);
		break;
	case 'unseat':
		client.rpc('unseat', 0, parseReply);
		break;
	case 'shout':
		words.shift();
		client.rpc('shout', words.join(' '), parseReply );
		break;
	case 'say':
		words.shift();
		client.rpc('say', words.join(' '), parseReply );
		break;
	default:
		//client.say( cmd, parseReply );
	}
}
