var Poker = require('./poker');

var POKER_CARDS = Poker.CARDS;

var HIGH_CARD		= 1, // 单张
	PAIR			= 2, // 对子
	STRAIGHT		= 3, // 顺子
	FLUSH			= 4, // 同花
	STRAIGHT_FLUSH	= 5, // 同花顺
	THREE			= 6; // 豹子

var JINHUA_PATTERNS = {
	0: 'invalid',
	1: 'danzhang',
	2: 'duizi',
	3: 'shunzi',
	4: 'tonghua',
	5: 'tonghuashun',
	6: 'baozi'
};

var Jinhua = {
	HIGH_CARD: 	1,
	PAIR: 		2,
	STRAIGHT: 	3,
	FLUSH: 	4,
	STRAIGHT_FLUSH: 5,
	THREE: 		6,
	
	PATTERNS: JINHUA_PATTERNS,
};

exports = module.exports = Jinhua;

Jinhua.sort = function(cards) {
	if(cards.length != 3) return cards;
	Poker.sortByNumber(cards);
	
	var n1 = cards[1] & 0xf, n2 = cards[2] & 0xf;
	if(n1 === n2) { // avoid pair at end
		cards.push( cards.shift() );
	}
	return cards;
};

Jinhua.rank = function(cards) {
	if(cards.length != 3) return 0;
	Jinhua.sort(cards);
	
	var c0 = cards[0] >> 4, c1 = cards[1] >> 4, c2 = cards[2] >> 4;
	var n0 = cards[0] & 0xf, n1 = cards[1] & 0xf, n2 = cards[2] & 0xf;
	var d0 = n0 - n1, d1 = n1 - n2;
	
	var rank = (n0 << 8) | (n1 << 4) | n2;
	var pattern = 0;
	
	if((d0 === 0) && (d1 === 0)) {
		pattern = THREE;
		
	} else if((c0 === c1) && (c1 === c2)) {
		if((d0 === 1) && (d1 === 1)) {
			pattern = STRAIGHT_FLUSH;
			
		} else {
			pattern = FLUSH;
		}
		
	} else if((d0 === 1) && (d1 === 1)) {
		pattern = STRAIGHT;
		
	} else if((d0 === 0) || (d1 === 0)) {
		pattern = PAIR;
		
	} else {
		pattern = HIGH_CARD;
	}

	return (pattern << 12) | rank;
};

Jinhua.pattern = function(cards) {
	return Jinhua.rank(cards) >> 12;
};

Jinhua.patternString = function(cards) {
	return JINHUA_PATTERNS[ Jinhua.rank(cards) >> 12 ];
};

Jinhua.compare = function(a, b) {
	return Jinhua.rank(a) - Jinhua.rank(b);
};

Jinhua.view = function(cards) {
	var rank = Jinhua.rank(cards);
	var pattern = rank >> 12;
	var str = Poker.visualize(cards).join(',') + ' -> ' + JINHUA_PATTERNS[ pattern ] + ', rank:' + rank;
	console.log( str );
};

