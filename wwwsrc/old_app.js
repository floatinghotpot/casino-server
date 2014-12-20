var sid = '';
var uid = '';
var session_key = '';
var name = '';

socket.on('notify', function(event){
	switch(event.msgid) {
	case 'inroom': break;
	}
	$('#messages').append($('<li>').text(event.msg));
});

socket.on('hello', function(data){
	console.log('hello: ' + JSON.stringify(data));
	var old_sid = sid;
	$('#messages').append($('<li>').text(data.msg));
	sid = data.sid;
	
	if(old_sid && uid && name) {
		socket.emit('login', {
			old_sid: old_sid,
			sid: sid,
			uid: uid,
			name: name,
			session_key: session_key
		});
	} else {
		$('#messages').append($('<li>').text('please login, syntax: login uid name'));
	}
});

socket.on('login', function(data){
	$('#messages').append($('<li>').text(data.msg));
	if(data.done) {
	} else {
	}
});

socket.on('players', function(data){
	$('#list').empty();
	var list = $('#list');
	for(var i in data) {
		var item = data[i];
		var d = item.data;
		var str = item.uid + ' [' + item.name + '] (' + d.coins + ', ' +  d.score + ', ' + d.exp + ', ' + d.level + ')';
		list.append($('<li>').text(str).attr('id', i));
	}
});

socket.on('rules', function(data){
	$('#list').empty();
	var list = $('#list');
	for(var i in data) {
		var item = data[i];
		var str = item.id + ' [' + item.name + '] (' + item.desc + ')';
		list.append($('<li>').text(str).attr('id', i));
	}
});

socket.on('rooms', function(data){
	$('#list').empty();
	var list = $('#list');
	for(var i in data) {
		var item = data[i];
		var str = item.id + ' [' + item.name + '] (' + item.seats_taken + '/' + item.gamers_count + ')';
		list.append($('<li>').text(str).attr('id', i));
	}
});

var roominfo = null;

function updateRoomView(){
	$('#seats').empty();
	$('#current_room').text('In ' + roominfo.name);
	var seats = roominfo.seats;
	for(var i in seats) {
		var gamerid = null, gamerinfo = null;
		var gamer = seats[i];
		if(gamer) {
			var d = gamer.data;
			gamerinfo = gamer.uid + ' [' + gamer.name + '] (' + d.coins + ', ' +  d.score + ', ' + d.exp + ', ' + d.level + ')';
		}
		$('#seats').append($('<li>').text(i + ': ' + gamerinfo).attr('index', i).attr('gamer', gamerid));
	}
}

socket.on('viewroom', function(data){
	console.log( JSON.stringify(data) );
	roominfo = data;
	updateRoomView();
});

socket.on('enter', function(data){
	console.log( JSON.stringify(data) );
	if(uid != data.who.uid) {
		roominfo.gamers[ data.who.uid ] = data.who.name;
	}
	var name = (uid != data.who.uid) ? data.who.name : 'You';
	$('#messages').append($('<li>').text(name + ' came into ' + data.where.name));
});

socket.on('leave', function(data){
	console.log( JSON.stringify(data) );
	if(uid != data.who.uid) {
		delete roominfo.gamers[ data.who.uid ];
	}
	var name = (uid != data.who.uid) ? data.who.name : 'You';
	$('#messages').append($('<li>').text(name + ' left ' + data.where.name));
});

socket.on('seat', function(data){
	console.log( JSON.stringify(data) );
	var name = (uid != data.who.uid) ? data.who.name : 'You';
	$('#messages').append($('<li>').text(name + ' seated at ' + data.where));
	
	roominfo.seats[ data.where ] = data.who;
	updateRoomView();
});

socket.on('unseat', function(data){
	console.log( JSON.stringify(data) );
	var name = (uid != data.who.uid) ? data.who.name : 'You';
	$('#messages').append($('<li>').text(name + ' unseated from ' + data.where));

	roominfo.seats[ data.where ] = null;
	updateRoomView();
});

socket.on('say', function(data){
	var name = (uid != data.who.uid) ? data.who.name : 'You';
	$('#messages').append($('<li>').text(name + ': ' + data.msg));
});

socket.on('shout', function(data){
	var name = (uid != data.who.uid) ? data.who.name : 'You';
	$('#messages').append($('<li>').text(name + ' shout: ' + data.msg));
});

function execCmd(cmd) {
	var words = cmd.split(' ');
	switch(words[0]) {
	case 'clear':
		$('#list').empty();
		$('#seats').empty();
		$('#messages').empty();
		break;
	case 'login':
		uid = words[1];
		name = words[2];
		socket.emit('login', {
			uid: words[1],
			name: words[2],
			sid: sid,
			session_key: session_key
		});
		break;
	case 'leave':
		$('#seats').empty();
		$('#current_room').text('Not in room');
	case 'logout':
	case 'rules':
	case 'gamers':
	case 'viewroom':
	case 'unseat':
		socket.emit(words[0], '');
		break;
	// in room
	case 'rooms':
	case 'enter':
	case 'seat':
		socket.emit(words[0], words[1]);
		break;
	// jinhua game
	case 'ready':
	case 'follow':
	case 'allin':
	case 'giveup':
		socket.emit('jinhua', {action:words[0]})
		break;
	case 'add':
		socket.emit('jinhua', {action:words[0], param:parseInt(words[1])});
	case 'pk':
		socket.emit('jinhua', {action:words[0], param:words[1]});
		break;
	// chat	
	case 'shout':
	case 'say':
		words.shift();
		socket.emit(words[0], words.join(' '));
		break;
	default:
		socket.emit('say', cmd);
	}
}

$('form').submit(function() {
	var cmd = $('#m').val() + '';
	if(cmd.length == 0) return false;
	$('#m').val('');
	
	execCmd(cmd);
	
	return false;
});
