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
				no_joker:true,
				no_number:[]
			},
			min: 2,
			max: 200
		},
		'jinhua1': {
			name: 'classic_jinhua',
			desc: 'jinhua game with classic rules',
			game: 'jinhua_game.js',
			options: {
				no_joker:true,
				no_number:[]
			},
			min: 2,
			max: 200
		},
		'jinhua2': {
			name: 'pk jinhua',
			desc: 'jinhua game with number>6',
			game: 'jinhua_game.js',
			options: {
				no_joker:true,
				no_number:[2,3,4,5,6]
			},
			min: 2,
			max: 200
		},
		'jinhua3': {
			name: 'joker jinhua',
			desc: 'jinhua game with number>6 and magic joker',
			game: 'jinhua_game.js',
			options: {
				no_joker:false,
				no_number:[2,3,4,5,6]
			},
			min: 2,
			max: 200
		}
	}
};
