exports = module.exports = {
	server: {
		port: 7000,
		host: '0.0.0.0',
		hellomsg: 'welcome to online casino',
		server: 20141201,
		client_req: 20141130
	},
	redis: {
		host: 'localhost',
		port: 6379,
		passwd: null
	},
	new_user : {
		coins: 10000,
		score: 0,
		exp: 0,
		level: 1
	},
	games: {
		'chat': {
			name: 'chat_room',
			desc: 'room for chatting only',
			game: 'room.js',
			options: {
			},
			min: 2,
			max: 200
		},
		'jinhua1': {
			name: 'classic_jinhua',
			desc: 'jinhua game, rule: classic',
			game: 'jinhua_game.js',
			options: {
				max_seats: 6,
				no_joker: true,
				no_number: [],
				ready_countdown: 10,
				turn_countdown: 20,
				ante: 50,			// 锅底
				bet_min: 50,		// 最少投注
				bet_max: -1,		// 最大投注
				raise_min: 50,		// 最少加注
				raise_multiple: false,
				pot_cap: -1,		// 封顶
			},
			min: 2,
			max: 200
		},
		'jinhua2': {
			name: 'pk jinhua',
			desc: 'jinhua game, rule: number>6',
			game: 'jinhua_game.js',
			options: {
				max_seats: 6,
				no_joker: true,
				no_number: [2,3,4,5,6],
				ready_countdown: 10,
				turn_countdown: 20,
				ante: 500,
				bet_min: 500,
				bet_max: -1,
				raise_min: 500,
				raise_multiple: true,	// 以跟注为基础，翻倍加注
				pot_cap: -1,			// 封顶
			},
			min: 2,
			max: 200
		},
		'holdem1': {
			name: 'texas holdem',
			desc: 'texas holdem, rule: limit texas',
			game: 'holdem_game.js',
			options: {
				max_seats: 10,
				no_joker: true,
				no_number: [],
				ready_countdown: 10,
				turn_countdown: 20,
				limit_rule: 0,		// 0: limit, 1: pot limit, 2: no limit
				limit: 100,			// big blind
				limit_cap: 200,		// -1, means no limit
			},
			min: 2,
			max: 200
		},
		'holdem2': {
			name: 'texas holdem',
			desc: 'texas holdem, rule: pot limit',
			game: 'holdem_game.js',
			options: {
				max_seats: 10,
				no_joker: true,
				no_number: [],
				ready_countdown: 10,
				turn_countdown: 20,
				limit_rule: 1,		// 0: limit, 1: pot limit, 2: no limit
				limit: 100,			// big blind
				limit_cap: -1,		// -1, means no limit
			},
			min: 2,
			max: 200
		},
		'holdem3': {
			name: 'texas holdem',
			desc: 'texas holdem, rule: no limit',
			game: 'holdem_game.js',
			options: {
				max_seats: 10,
				no_joker: true,
				no_number: [],
				ready_countdown: 10,
				turn_countdown: 20,
				limit_rule: 2,		// 0: limit, 1: pot limit, 2: no limit
				limit: 100,			// big blind
				limit_cap: -1,		// -1, means no limit
			},
			min: 2,
			max: 200
		}
	}
};
