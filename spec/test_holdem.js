
var Poker = require('../lib/poker'),
	Holdem = require('../lib/holdem_poker');

describe("A suite for data model", function() {
	
	it('test holdem poker patterns', function() {
		var royal_flush = Poker([ 'SA', 'SK', 'SQ', 'SJ', 'S10' ]);
		var straight_flush = Poker([ 'SK', 'SQ', 'SJ', 'S10', 'S9' ]);
		var four = Poker([ 'SA', 'HA', 'CA', 'DA', 'S4' ]);
		var fullhouse = Poker([ 'SA', 'HA', 'DA', 'S7', 'H7' ]);
		var flush = Poker([ 'SA', 'S10', 'S8', 'S7', 'S4' ]);
		var straight = Poker([ 'SA', 'HK', 'CQ', 'HJ', 'C10' ]);
		var three = Poker([ 'SA', 'HA', 'CA', 'DK', 'S4' ]);
		var twopair = Poker([ 'SA', 'HA', 'C2', 'D2', 'S3' ]);
		var onepair = Poker([ 'SA', 'HA', 'C2', 'D4', 'S3' ]);
		var highcard = Poker([ 'SA', 'H3', 'C7', 'SK', 'C6' ]);
		
		expect(Holdem.pattern(royal_flush)).toBe(Holdem.ROYAL_FLUSH);
		expect(Holdem.pattern(straight_flush)).toBe(Holdem.STRAIGHT_FLUSH);
		expect(Holdem.pattern(four)).toBe(Holdem.FOUR);
		expect(Holdem.pattern(fullhouse)).toBe(Holdem.FULLHOUSE);
		expect(Holdem.pattern(flush)).toBe(Holdem.FLUSH);
		expect(Holdem.pattern(straight)).toBe(Holdem.STRAIGHT);
		expect(Holdem.pattern(three)).toBe(Holdem.THREE);
		expect(Holdem.pattern(twopair)).toBe(Holdem.TWO_PAIR);
		expect(Holdem.pattern(onepair)).toBe(Holdem.ONE_PAIR);
		expect(Holdem.pattern(highcard)).toBe(Holdem.HIGH_CARD);

		expect(Holdem.compare(royal_flush, straight_flush) > 0).toBe(true);
		expect(Holdem.compare(straight_flush, four) > 0).toBe(true);
		expect(Holdem.compare(four, fullhouse) > 0).toBe(true);
		expect(Holdem.compare(fullhouse, flush) > 0).toBe(true);
		expect(Holdem.compare(flush, straight) > 0).toBe(true);
		expect(Holdem.compare(straight, three) > 0).toBe(true);
		expect(Holdem.compare(three, twopair) > 0).toBe(true);
		expect(Holdem.compare(twopair, onepair) > 0).toBe(true);
		expect(Holdem.compare(onepair, highcard) > 0).toBe(true);
	});

	it('test holdem poker performance', function() {
		var fullset = Poker.newSet({
			no_joker: true
		});
		
		var any_5 = Poker.draw(fullset, 5);
		var any_7 = Poker.draw(fullset, 7);
		
		var now, t;
		
		now = Date.now();
		for(var i=0; i<1000; i++) {
			Holdem.sort(any_5);
		}
		t = (Date.now() - now) / 1000.0;
		expect(t < 1.0).toBe(true);
		
		now = Date.now();
		for(var i=0; i<1000; i++) {
			max_5 = Holdem.maxFive(any_7);
		}
		t = (Date.now() - now) / 1000.0;
		expect(t < 1.0).toBe(true);
	});
});

