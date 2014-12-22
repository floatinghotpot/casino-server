var Poker = require('./poker');

var POKER_CARDS = Poker.CARDS;

var DANZHANG	= 1, // 单张
	DUIZI		= 2, // 对子
	SHUNZI		= 3, // 顺子
	TONGHUA		= 4, // 同花
	TONGHUASHUN	= 5, // 同花顺
	BAOZI		= 6; // 豹子

var JINHUA_PATTERNS = {
	0: '错误',
	1: '单张',
	2: '对子',
	3: '顺子',
	4: '同花',
	5: '同花顺',
	6: '豹子'
};

var Jinhua = {
	DANZHANG: 	1,
	DUIZI: 		2,
	SHUNZI: 	3,
	TONGHUA: 	4,
	TONGHUASHUN: 5,
	BAOZI: 		6,
	
	PATTERNS: JINHUA_PATTERNS,
};

exports = module.exports = Jinhua;

Jinhua.sort = function(cards) {
	if(cards.length != 3) return cards;
	Poker.sortByNumber(cards);
	
	var n2 = cards[1] & 0xf, n3 = cards[2] & 0xf;
	if(n2 == n3) { // avoid pair at end
		var tmp = cards[0];
		cards[0] = cards[2];
		cards[2] = tmp;
	}
	return cards;
};

Jinhua.rank = function(cards) {
	if(cards.length != 3) return 0;
	Jinhua.sort(cards);
	
	var c1 = cards[0] >> 4, c2 = cards[1] >> 4, c3 = cards[2] >> 4;
	var n1 = cards[0] & 0xf, n2 = cards[1] & 0xf, n3 = cards[2] & 0xf;
	
	var rank = (n1 << 8) | (n2 << 4) | n3;
	
	if((n1 == n2) && (n2 == n3)) {
		return (BAOZI << 12) | rank;
		
	} else if((c1 == c2) && (c2 == c3)) {
		if((n1 == n2+1) && (n2 == n3+1)) {
			return (TONGHUASHUN << 12) | rank;
			
		} else {
			return (TONGHUA << 12) | rank;
		}
		
	} else if((n1 == n2+1) && (n2 == n3+1)) {
		return (SHUNZI << 12) | rank;
		
	} else if((n1 == n2) || (n2 == n3)) {
		return (DUIZI << 12) | rank;
		
	} else {
		return (DANZHANG << 12) | rank;
	}
};

Jinhua.pattern = function(cards) {
	return Jinhua.rank(cards) >> 12;
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

