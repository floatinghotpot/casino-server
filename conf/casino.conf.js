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
			desc: 'jinhua game with classic rules',
			game: 'jinhua_game.js',
			options: {
				max_seats: 6,
				no_joker: true,
				no_color: [],
				no_number: [],
				ready_countdown: 10,
				turn_countdown: 10,
				chip_base: 100,
				chip_min: 100,
				chip_max: -1,
				addchip_min: 100,
				addchip_multiple: false,
				rake: 0.05
			},
			min: 2,
			max: 200
		},
		'jinhua2': {
			name: 'pk jinhua',
			desc: 'jinhua game with number>6',
			game: 'jinhua_game.js',
			options: {
				max_seats: 6,
				no_joker: true,
				no_color: [],
				no_number: [2,3,4,5,6],
				ready_countdown: 10,
				turn_countdown: 10,
				chip_base: 500,
				chip_min: 500,
				chip_max: -1,
				addchip_min: 500,
				addchip_multiple: false,
				rake: 0.05
			},
			min: 2,
			max: 200
		},
		'jinhua3': {
			name: 'joker jinhua',
			desc: 'jinhua game with number>6 and magic joker',
			game: 'jinhua_game.js',
			options: {
				max_seats: 6,
				no_joker: false,
				no_color: [],
				no_number: [2,3,4,5,6],
				ready_countdown: 10,
				turn_countdown: 10,
				chip_base: 100,
				chip_min: 100,
				chip_max: -1,
				addchip_min: 100,
				addchip_multiple: true,
				rake: 0.05
			},
			min: 2,
			max: 200
		}
	}
};
