
var Poker = require('../lib/poker'),
	Jinhua = require('../lib/jinhua_poker');

describe("A suite for data model", function() {
	
	it('test jinhua poker', function() {
		var baozi = Poker([ 'SA', 'CA', 'DA' ]);
		var tonghuashun = Poker([ 'SA', 'SK', 'SQ' ]);
		var tonghua = Poker([ 'SA', 'S10', 'S8' ]);
		var shunzi = Poker([ 'SA', 'HK', 'CQ' ]);
		var duizi = Poker([ 'SA', 'HA', 'C2' ]);
		var danzhang = Poker([ 'SA', 'H3', 'C7' ]);
		
		var duizi_1 = Poker([ 'SA', 'CA', 'DK' ]);
		var duizi_2 = Poker([ 'CA', 'DA', 'HK' ]);

		expect(Jinhua.pattern(baozi)).toBe(Jinhua.THREE);
		expect(Jinhua.pattern(tonghuashun)).toBe(Jinhua.STRAIGHT_FLUSH);
		expect(Jinhua.pattern(tonghua)).toBe(Jinhua.FLUSH);
		expect(Jinhua.pattern(shunzi)).toBe(Jinhua.STRAIGHT);
		expect(Jinhua.pattern(duizi)).toBe(Jinhua.PAIR);
		expect(Jinhua.pattern(danzhang)).toBe(Jinhua.HIGH_CARD);

		expect(Jinhua.compare(baozi, tonghuashun) > 0).toBe(true);
		expect(Jinhua.compare(tonghuashun, tonghua) > 0).toBe(true);
		expect(Jinhua.compare(tonghua, shunzi) > 0).toBe(true);
		expect(Jinhua.compare(shunzi, duizi) > 0).toBe(true);
		expect(Jinhua.compare(duizi, danzhang) > 0).toBe(true);

		expect(Jinhua.rank(duizi_1) == Jinhua.rank(duizi_2)).toBe(true);
	});
});

