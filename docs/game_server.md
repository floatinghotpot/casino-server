## casino instance ##

casino id: number

"casino:seq" (counter)

// set when startup, update expire in heartbeat, remove when shutdown
"casino:#xxx" (hash map) -> {
	id: xxx,
	started: now,
	rooms: n
}

// update when room open/close, update expire in heartbeat, remove when shutdown
"casino:c_xxx:t_xxx:rooms" (set) -> {
}

## master maintained ##

enumrate keys "casino:s_xxx", if id == self.id, then it's the master

master will maintain following data

"casino:all" (set) -> [ id, id, ... ]

"game:all" (set) -> [ typeid, typeid, ... ]

"game:rooms:#xxx" (sorted set) -> [ roomid, roomid, ... ]

## game type table ##

```javascript
"game:#xxx" (hashmap) : {
	id: 'xxx',	// unique, game type id, configured in casino.conf.js
	name: 'xxx',
	desc: 'xxx'
}
```

## room table ##

room id format: r + number, for example: r1001, r1002, r1003

```javascript
'room:seq' (serial), counter for room
'room:#xxx' (hash map) -> {
	id: 'rxxx',
	type: 'xxx',
	name: '',
	created: now,
	seats: n,		// seats, defined in game, with game.getMaxSeats()
	seats_taken: 0,
	gamers: 0,
	seat_0: 'xxx',	// gamer uid
	seat_1: 'xxx'
}
```

