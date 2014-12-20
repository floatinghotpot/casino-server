exports = module.exports = {
	server: {
		port: 7000,
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
		'game1': {
			name: 'classic_jinhua',
			desc: '',
			game: 'jinhua_game.js',
			options: {
				no_joker:true,
				no_number:[]
			},
			min: 2,
			max: 200
		},
		'game2': {
			name: 'pk jinhua',
			desc: '',
			game: 'jinhua_game.js',
			options: {
				no_joker:true,
				no_number:[2,3,4,5,6]
			},
			min: 2,
			max: 200
		},
		'game3': {
			name: 'joker jinhua',
			desc: '',
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
