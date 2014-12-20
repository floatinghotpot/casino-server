
# redis database structure #

## server instance ##

server id: number

"server:seq" (counter)

// set when startup, update expire in heartbeat, remove when shutdown
"server:instance:xxx" (hash map) -> {	
	id: xxx,
	gamers: n,
}

"server:all" (sorted set) -> [ id, id, ... ], scored by heartbeat time

// update when user login/logout, update expire in heartbeat, remove when shutdown
"server:s_xxx:gamers" (set) -> [ uid, uid, ... ]	

## master ##

enumrate keys "server:s_xxx", if id == self.id, then it's the master

master will maintain following data:

"server:all", clean the id older than 5 sec

## user table ##

uid format: u + number, for example: u1001, u1002, u1003

```javascript
"user:seq", (counter), for default uid

"user:count", (number), update when signup/delete account

"user:u_xxx" : {
	uid: 'uxxx', // unique, by default 'unnn'
	name: 'xxx',
	passwd: 'xxx',
	uuid: 'xxx-xxx',
	phone: 'nnn',
	email: 'xxx@xxx.xxx',
	phone_v: 0,		// 1 if phone validated with SMS
	email_v: 0,		// 1 if email validated with link in email
	avatar: '',
	coins: 0,
	score: 0,
	exp: 0,
	level: 0,
	online: 0,
	created: 0,		// now
	last_login: 0, 	// now = new Date().getTime()
	drop_time: 0
}

"user:online" (set) -> [ uid, uid, ... ]	// update when login/logout

"user:dropped" (set) -> [ uid, uid, ... ]	// update when drop/re-login
```

	