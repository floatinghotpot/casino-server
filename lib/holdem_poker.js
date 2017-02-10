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
	0: 'invalid',		// 错误
	1: 'high card',		// 高牌
	2: 'one pair',		// 一对
	3: 'two pair',		// 两对
	4: 'three of a kind', // 三条
	5: 'straight', 		// 顺子
	6: 'flush', 		//  同花
	7: 'fullhouse', 	// 葫芦
	8: 'four of a kind', // 四条
	9: 'straight flush', // 同花顺
	10: 'royal flush' 	// 皇家同花顺
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
	} else if((d0 === 0) && (d2 === 0)) {   //edit by kalbas d1->d2
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
	} else if(d3 === 0) {               //edit by kalbas added d3 condition
		// ABCXX -> XXABC
		cards.push( cards.shift() );
		cards.push( cards.shift() );
		cards.push( cards.shift() );
	} else {
		// ABCDE
	}
	
	return cards;
};

Holdem.rank = function(cards) {
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
	var isStraight;
	
	if ((n0 === 14) && (d0 === 9)){
	    isStraight = ((n0 === 14) && (d0 === 9) && (d1 === 1) && (d2 === 1) && (d3 === 1)); // edited by kalbas A 5 4 3 2 1 straight
	} else {
	    isStraight = ((d0 === 1) && (d1 === 1) && (d2 === 1) && (d3 === 1));
	}
	
	var rank = (n0 << 16) | (n1 << 12) | (n2 << 8) | (n3 << 4) | n4;
	
	//edit by kalbas
	//if we face an A5432 straight we should n0=1 and then calculate the rank
	if ((n0 === 14) && (d0 === 9) && (d1 === 1) && (d2 === 1) && (d3 === 1)) {
	    var exceptionaln0 = 1;
	    rank = (exceptionaln0 << 16) | (n1 << 12) | (n2 << 8) | (n3 << 4) | n4;
	}
	//end edit by kalbas
	
	var pattern = 0;
	
	if(isFlush && isStraight) {
		if(n4 === 10) { // Poker.NUMBER_RANK['A'] // edited by kalbas, n0=14 can be A5432 too, we use n4=11=jack
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
	
	return (pattern << 20) | rank;
};

/*
 * 如有两名以上的牌手在最后一轮下注结束时仍未盖牌，则须进行斗牌。
 * 斗牌时，每名牌手以自己的两张底牌，加上桌面五张公共牌，共七张牌中，取最大的五张牌组合决定胜负.
 * 当中可包括两张或一张底牌，甚至只有公共牌。
 */
Holdem.maxFive = function(private_cards, shared_cards) {
	var cards = Poker.sort( Poker.merge( Poker.clone(private_cards), shared_cards ) );
	var len = cards.length;
	if(len < 5 || len > 7 ) return null;
	
	var maxrank = 0, maxcards = null, i, j, tmp, tmprank;
	
	if(len === 5) {
		return cards;
		
	} else if(len === 6) {
		for(j=0; j<6; j++) {
			tmp = Poker.clone(cards);
			tmp.splice(j, 1);
			tmprank = Holdem.rank( tmp );
			if(tmprank > maxrank) {
				maxrank = tmprank;
				maxcards = tmp;
			}
		}
		
	} else if(len === 7) {
		/*
		for(i=0; i<7; i++) {
			for(j=0; j<6; j++) {
				tmp = Poker.clone(cards);
				tmp.splice(i, 1);
				tmp.splice(j, 1);
				tmprank = Holdem.rank( tmp );
				if(tmprank > maxrank) {
					maxrank = tmprank;
					maxcards = tmp;
				}
			}
		}
		*/
		
		
		// edit start by kalbas 
		// we rank only board cards at first, all 5 of them
		
		tmprank = Holdem.rank( shared_cards );
		if(tmprank > maxrank) {
					maxrank = tmprank;
					maxcards = shared_cards;
		}
		
		// we rank 1st hole card + 4 board cards
		
		for(j=0; j<5; j++) {
		    tmp = Poker.clone( shared_cards );
		    tmp.splice(j,1);
		    tmp.push( private_cards[0] );
		    tmprank = Holdem.rank( tmp );
		    if(tmprank > maxrank) {
					maxrank = tmprank;
					maxcards = tmp;
		    }
		}
		
		// we rank 2nd hole card + 4 board cards
		
		for(j=0; j<5; j++) {
		    tmp = Poker.clone( shared_cards );
		    tmp.splice(j,1);
		    tmp.push( private_cards[1] );
		    tmprank = Holdem.rank( tmp );
		    if(tmprank > maxrank) {
					maxrank = tmprank;
					maxcards = tmp;
		    }
		}
		
		// we rank two hole cards + 3 board cards
		
		var iii = [1,1,1,1,1,1,2,2,2,3];
		var jjj = [2,2,2,3,3,4,3,3,4,4];
		var kkk = [3,4,5,4,5,5,4,5,5,5];
		
		/*
		There are 10 ways to choose 3
		cards out of 5, (5x4x3)/(3x2x1)
		
		123(45) 124(35) 125(34) 134(25)
		135(24) 145(23) 234(15) 235(14)
		245(13) 345(12) therefore:
		
		push : iii[n] + jjj[n] + kkk[n]
		and then add two hole cards
		*/
		
		for(j=0; j<10; j++) {
    		tmp = [];
    		tmp.push( shared_cards[iii[j]-1] );
    		tmp.push( shared_cards[jjj[j]-1] );
    		tmp.push( shared_cards[kkk[j]-1] );
    		tmp.push( private_cards[0] );
    		tmp.push( private_cards[1] );
    		tmprank = Holdem.rank( tmp );
    		if(tmprank > maxrank) {
    		    maxrank = tmprank;
    			maxcards = tmp;
    		}
		}
		cards = maxcards;
        	console.log(Poker.visualize(cards)+' : '+Holdem.patternString(cards));
		// end edit by kalbas
		
	}
	
	return maxcards;
};

Holdem.pattern = function(cards) {
	return Holdem.rank(cards) >> 20;
};

Holdem.patternString = function(cards) {
	return HOLDEM_PATTERNS[ Holdem.rank(cards) >> 20 ];
};

Holdem.compare = function(a, b) {
	return Holdem.rank(a) - Holdem.rank(b);
};

Holdem.view = function(cards) {
	var rank = Holdem.rank(cards);
	var pattern = rank >> 20;
	var str = Poker.visualize(cards).join(',') + ' -> ' + HOLDEM_PATTERNS[ pattern ] + ', rank:' + rank;
	console.log( str );
};

