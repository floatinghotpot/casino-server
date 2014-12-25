
# Methods #

* Request:

socket.emit('api_name_xxx', args_in_json);

* response

Success:

socket.emit('rpc_ret', { 
	seq : args.seq,		// send back the callback id
	err:0, 
	ret: json	// depends on api
});

Error:

socket.emit('rpc_ret', {
	seq : args.seq,		// send back the callback id
	err: n,		// error code
	ret: 'xxx'	// error message
});	

The error codes are following HTTP error code, except success, we use 0 instead of 20x.
For example:
* 400, bad request, invalid arguements, invalid action, etc.
* 403, denied, invalid password, etc.
* 404, not found.
* 500, server side error.

### signup ###

* Request:

socket.emit('signup', {
	seq: callback.seq,
	uid: 'xxx',
	passwd: 'xxx',
	name: 'xxx',
	uuid: 'xxx',
	phone: 'xxx',
	email: 'xxx',
});

* Response:

Success:

socket.emit('rpc_ret', { 
	seq : args.seq,
	err:0, 
	ret: { 
		uid: 'xxx', 
		passwd: 'xxx' 
	} 
});

Error:

socket.emit('rpc_ret', {
	seq : args.seq,
	err: n,		// error code
	ret: 'xxx'	// error message
});	

### login ###

* Request:

socket.emit('login', {
	seq: callback.seq,
	uid: 'xxx',
	passwd: 'xxx'
});

* Response:

Success:

socket.emit('rpc_ret', {
	seq : args.seq,
	err : 0,
	ret : {
		token : {
			uid : gamer.uid,
			pin : gamer.pin,
			sid : socket.id
		},
		profile : {
			uid: 'xxx',
			name: 'xxx',
			avatar: 'xxx',
			coins: n,
			score: n,
			exp: n,
			level: n
		}
	}
});

The uid and pin will be used for all later API call.

### logout ###

* Request:

socket.emit('logout', {
	seq: callback.seq,
	uid: 'xxx',
	pin: 'xxx'
});

* Response:

Success:

socket.emit('rpc_ret', { 
	seq: args.seq, 
	err: 0, 
	ret: 'ok' 
});

### rpc ###

RPC, remote process call, it calls remote method defined for gamer/room/game object.

Only called after login.

socket.emit('rpc', {
	seq: callback.seq,
	uid: 'xxx',
	pin: 'xxx',
	f: 'xxx',	// method
	args: json	// depends on method
});

* Response:

Success:

socket.emit('rpc_ret', { 
	seq: args.seq, 
	err: 0, 
	ret: json	// depends on method
});

# Events #

