var Poker = require('./poker');

var POKER_CARDS = Poker.CARDS;

var HIGH_CARD		= 1, // 高牌, AQ953
	ONE_PAIR		= 2, // 一对, KK854
	TWO_PAIR		= 3, // 两对, KKJJ9
	THREE			= 4, // 三条, KKK98
	STRAIGHT		= 5, // 顺子, 98765
	FLUSH			= 6, // 同花, 
	FULLHOUSE		= 7, // 葫芦, KKK99
	FOUR			= 8, // 四条, KKKK9
	STRAIGHT_FLUSH	= 9, // 同花顺, 98765
	ROYAL_FLUSH		= 10; // 皇家同花顺, AKQJ10

var HOLDEM_PATTERNS = {
	0: 'Invalid',		// 错误
	1: 'High Card',		// 高牌
	2: 'One Pair',		// 一对
	3: 'Two Pair',		// 两对
	4: 'Three of a Kind', // 三条
	5: 'Straight', 		// 顺子
	6: 'Flush', 		//  同花
	7: 'Fullhouse', 	// 葫芦
	8: 'Four of a Kind', // 四条
	9: 'Straight Flush', // 同花顺
	10: 'Royal Flush' 	// 皇家同花顺
};

var Holdem = {
	HIGH_CARD: 		1,
	ONE_PAIR: 		2,
	TWO_PAIR: 		3,
	THREE: 			4,
	STRAIGHT: 		5,
	FLUSH: 			6,
	FULLHOUSE: 		7,
	FOUR: 			8,
	STRAIGHT_FLUSH: 9,
	ROYAL_FLUSH: 	10,
	
	PATTERNS: HOLDEM_PATTERNS,
};

exports = module.exports = Holdem;

Holdem.sort = function(cards) {
	if(cards.length != 5) return cards;
	Poker.sortByNumber(cards);

	var n0 = cards[0] & 0xf,
		n1 = cards[1] & 0xf,
		n2 = cards[2] & 0xf,
		n3 = cards[3] & 0xf,
		n4 = cards[4] & 0xf;
	
	var d0 = n0 - n1,
		d1 = n1 - n2,
		d2 = n2 - n3,
		d3 = n3 - n4;

	if((d1 === 0) && (d2 === 0)) {
		if(d0 === 0) { 
			// XXXXM
		} else if(d3 === 0) { 
			// MXXXX -> XXXXM
			cards.push( cards.shift() );
		} else { 
			// MXXXN
			var c0 = cards.shift();
			cards.splice(3, 0, c0);
		}
	} else if((d0 === 0) && (d1 === 0)) { 
		// XXXMN, or XXXMM
	} else if((d2 === 0) && (d3 === 0)) { 
		// MNXXX -> XXXMN
		cards.push( cards.shift() );
		cards.push( cards.shift() );
	} else if((d0 === 0) && (d1 === 0)) { 
		// XXYYM
	} else if((d0 === 0) && (d3 === 0)) {
		// XXMYY -> XXYYM
		var c2 = cards[2];
		cards.splice(2, 1);
		cards.push( c2 );
	} else if((d1 === 0) && (d3 === 0)) {
		// MXXYY -> XXYYM
		cards.push( cards.shift() );
	} else if(d0 === 0) {
		// XXABC
	} else if(d1 === 0) {
		// AXXBC -> XXABC
		var c_0 = cards.shift();
		cards.splice(2, 0, c_0);
	} else if(d2 === 0) {
		// ABXXC -> XXABC
		var c_2 = cards[2], c_3 = cards[3];
		cards.splice(2, 2);
		cards.unshift(c_3);
		cards.unshift(c_2);
	} else {
		// ABCDE
	}
	
	return cards;
};

Holdem.pattern = Holdem.rank = function(cards) {
	if(cards.length != 5) return 0;
	Holdem.sort(cards);
	
	var c0 = cards[0] >> 4,
		c1 = cards[1] >> 4,
		c2 = cards[2] >> 4,
		c3 = cards[3] >> 4,
		c4 = cards[4] >> 4;
		
	var n0 = cards[0] & 0xf,
		n1 = cards[1] & 0xf,
		n2 = cards[2] & 0xf,
		n3 = cards[3] & 0xf,
		n4 = cards[4] & 0xf;

	var d0 = n0 - n1,
		d1 = n1 - n2,
		d2 = n2 - n3,
		d3 = n3 - n4;
	
	var isFlush = ((c0 === c1) && (c1 === c2) && (c2 === c3) && (c3 === c4));
	var isStraight = ((d0 === 1) && (d1 === 1) && (d2 === 1) && (d3 === 1));
	var pattern = 0;
	
	if(isFlush && isStraight) {
		if(n0 === 14) { // Poker.NUMBER_RANK['A']
			pattern = ROYAL_FLUSH;
		} else {
			pattern = STRAIGHT_FLUSH;
		}
	} else if((d0 === 0) && (d1 === 0) && (d2 === 0)) {
		pattern = FOUR;
		
	} else if((d0 === 0) && (d1 === 0) && (d3 === 0)) {
		pattern = FULLHOUSE;
		
	} else if(isFlush) {
		pattern = FLUSH;
		
	} else if(isStraight) {
		pattern = STRAIGHT;
		
	} else if((d0 === 0) && (d1 === 0)) {
		pattern = THREE;
		
	} else if((d0 === 0) && (d2 === 0)) {
		pattern = TWO_PAIR;
		
	} else if((d0 === 0)) {
		pattern = ONE_PAIR;
		
	} else {
		pattern = HIGH_CARD;
	}
	
	return pattern;
};

Holdem.maxFive = function(cards) {
	if(cards.length != 7) return null;
	Poker.sort(cards);
	
	var maxrank = 0;
	var maxcards = null;
	for(var i=0; i<7; i++) {
		for(var j=0; j<6; j++) {
			var tmp = Poker.clone(cards);
			tmp.splice(i, 1);
			tmp.splice(j, 1);
			var tmprank = Holdem.rank( tmp );
			if(tmprank > maxrank) {
				maxrank = tmprank;
				maxcards = tmp;
			}
		}
	}
	return maxcards;
};

Holdem.compare = function(a, b) {
	return Holdem.rank(a) - Holdem.rank(b);
};

Holdem.view = function(cards) {
	var pattern = Holdem.pattern(cards);
	var str = Poker.visualize(cards).join(',') + ' -> ' + HOLDEM_PATTERNS[ pattern ] + ', pattern:' + pattern;
	console.log( str );
};

