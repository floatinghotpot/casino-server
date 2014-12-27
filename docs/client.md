
# Protocols #

There are 3 types of protocols between client and server.

* client to server one-way message, no reply directly, we call it "Message".
* server to client one-way message, "PUSH" mode, we call it "Event".
* client to server call and reply with callback Id (sequence number), we call it "RPC" (remote process call).

# Message #

### hello ###

* Request:

```javascript
socket.emit('hello', {});
```

* Response:

Reponse will be sent by event instead of callback.

# Events #

### prompt ###

Prompt that commands can be accepted in current state.

```javascript
socket.emit('push', {
	uid: 'xxx',		// 'xxx' is the user to be pushed to, null means everyone
	e: 'prompt',
	args: {
		fastsignup: true,
		signup: {
			uid: 'text',
			passwd: 'text',
			name: 'text',
			email: 'email',
			phone: 'text',
			uuid: 'text'
		},
		login: {
			uid: 'text',
			passwd: 'text'
		}
	}
});
```

Types for commands:

* true, RPC can be called with no arguments, typically a button on UI.
* array, [item1, item2, item3], RPC called with 1 argument, picked from the array. Typically a list, or a set of buttons on UI.
* string, "text", "number,1,20", "range,1,20", "email", RPC called with input in the type. Typically an input box on UI.
* object, { key1: 'type', ... }, RPC called with input in a json object. Typically a dialog with a set of input box on UI.
* null, RPC should not be called, should be disabled or removed from UI.

Other event may happen when a gamer does some action, for example, say something, shout, or enter a room, etc.

For example, when a user in the same room say something, all users will be notified.

```javascript
socket.emit('push', {
	uid: uid,
	e: 'say',
	args: {
		uid: speaker.uid,
		msg: 'xxx'
	}
});
```

# RPC / Method #

RPC is remote process call. It includes a sequence number as callback Id, the server side must sent back the sequence number when reply.

It calls remote method defined for gamer/room/game object.

```javascript
socket.emit('rpc', {
	seq: callback.seq,
	uid: 'xxx',
	pin: 'xxx',
	f: 'xxx',	// method
	args: json	// depends on method
});
```

* Response:

Success:

```javascript
socket.emit('rpc_ret', { 
	seq: args.seq, 
	err: 0, 
	ret: json	// depends on method
});
```

Error:

```javascript
socket.emit('rpc_ret', {
	seq : args.seq,		// send back the callback id
	err: n,		// error code
	ret: 'xxx'	// error message
});	
```

The error codes are following HTTP error code, except success, we use 0 instead of 20x.
For example:
* 400, bad request, invalid argument, invalid action, etc.
* 403, denied, invalid password, etc.
* 404, not found.
* 500, server side error, for example, database error, etc.

### signup ###

* Request:

```javascript
socket.emit('rpc', {
	seq: callback.seq,
	uid: 0,
	pin: 0,
	f: 'signup', // method
	args: {
		uid: 'xxx',
		passwd: 'xxx',
		name: 'xxx',
		uuid: 'xxx',
		phone: 'xxx',
		email: 'xxx',
	}
});
```

* Response:

Success:

```javascript
socket.emit('rpc_ret', { 
	seq : args.seq,
	err:0, 
	ret: { 
		uid: 'xxx', 
		passwd: 'xxx' 
	} 
});
```

### fastsignup ###

For lazy user, account can be created without input, server side can automatically generate a user id and password.

* Request:

```javascript
socket.emit('rpc', {
	seq: callback.seq,
	uid: 0,
	pin: 0,
	f: 'fastsignup', // method
	args: 0
});
```

* Response:

Success:

```javascript
socket.emit('rpc_ret', { 
	seq : args.seq,
	err:0, 
	ret: { 
		uid: 'xxx', 
		passwd: 'xxx' 
	} 
});
```

### login ###

* Request:

```javascript
socket.emit('rpc', {
	seq: callback.seq,
	uid: 0,
	pin: 0,
	f: 'login', // method
	args: {
		uid: 'xxx',
		passwd: 'xxx'
	}
});
```

* Response:

Success:

```javascript
socket.emit('rpc_ret', {
	seq : args.seq,
	err : 0,
	ret : {
		token : {
			uid : gamer.uid,
			pin : gamer.pin
		},
		profile : {
			uid: 'xxx',
			name: 'xxx',
			avatar: 'xxx',
			coins: n,
			score: n,
			exp: n,
			level: n
		},
		cmds : { // commands after login, client should display logout, but remove signup and login.
			fastsignup: null,
			signup: null,
			login: null,
			logout: true
		}
	}
});
```

The uid and pin will be used for all later API call.

### logout ###

* Request:

```javascript
socket.emit('rpc', {
	seq: callback.seq,
	uid: 'xxx',
	pin: 'xxx'
	f: 'logout', // method
	args: 0
});
```

* Response:

Success:

```javascript
socket.emit('rpc_ret', { 
	seq: req.seq, 
	err: 0, 
	ret: {
		cmds: { // available commands
			entergame : null,
			logout : null,
			fastsignup: true,
			signup : {
				uid : 'text',
				passwd : 'text',
				name : 'text',
				email : 'email',
				phone : 'text',
				uuid : 'text'
			},
			login : {
				uid : 'text',
				passwd : 'text'
			}
		}
	}
});
```

### RPC Of Hall ###

The following methods can be called after login.

* shout, msg
* games
* entergame, gameid
* rooms, gameid
* enter, roomid

For example:

```javascript
socket.emit('rpc', {
	seq: callback.seq,
	uid: 'xxx',
	pin: 'xxx'
	f: 'shout', // method
	args: 'xxx'	// message text
});
```

### RPC Of Room ###

The following method can be called after enter room.

* say, msg
* takeseat
* unseat (after takeseat)
* look
* exit

### RPC Of Jinhua Game ###

* ready
* follow
* addchip, n
* giveup
* pk, uid
* checkcard
* showcard

### Other RPC ###

More RPC methods can be defined in each game.

