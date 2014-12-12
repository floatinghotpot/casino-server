var jinhua = require('../lib/jinhua_game');

exports = module.exports = 
{
	'1': {
		id: 'game1',
		name: 'classic_jinhua',
		game: jinhua,
		options: {
			no_joker:true,
			no_number:[]
		},
		min: 10,
		max: 200
	},
	'2': {
		id: 'game2',
		name: 'pk jinhua',
		game: jinhua,
		options: {
			no_joker:true,
			no_number:[2,3,4,5,6]
		},
		min: 10,
		max: 200
	},
	'3': {
		id: 'game3',
		name: 'joker jinhua',
		game: jinhua,
		options: {
			no_joker:false,
			no_number:[2,3,4,5,6]
		},
		min: 10,
		max: 200
	}
};
