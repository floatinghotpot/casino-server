
var Poker = require('../lib/poker'),
	Jinhua = require('../lib/jinhua_poker');

describe("A suite for data model", function() {
	
	it('test card', function() {
		expect(Poker('SA')).toBe(4 << 4 | 14);

		expect(Poker.visualize(Poker('SA'))).toBe('♠A');
		expect(Poker.visualize(Poker('HA'))).toBe('♥A');
		expect(Poker.visualize(Poker('CA'))).toBe('♣A');
		expect(Poker.visualize(Poker('D10'))).toBe('♦10');

		expect(Poker([ 'SA', 'C10' ]).join('')).toBe([ Poker('SA'), Poker('C10') ].join(''));
	});

	it('test card set', function() {
		expect(Poker.newSet().length).toBe(52);
		expect(Poker.newSet({
			no_joker : false
		}).length).toBe(54);
		expect(Poker.newSet({
			no_color : [ Poker.CLUB, Poker.DIAMOND ]
		}).length).toBe(26);
		expect(Poker.newSet({
			no_number : [ 2, 3, 4, 5, 6 ]
		}).length).toBe(32);
	});

	it('test card set compare/draw/merge/sort', function() {
		var cards = Poker.newSet();
		var cloned_cards = Poker.clone(cards);
		expect(Poker.compare(cards, cloned_cards)).toBe(0);

		var some_cards = Poker.draw(cards, 3);
		expect(some_cards.length).toBe(3);
		expect(cards.length).toBe(52 - 3);
		expect(Poker.merge(cards, some_cards).length).toBe(52);

		Poker.sort(Poker.randomize(cards));
		Poker.sort(cloned_cards);
		expect(Poker.compare(cards, cloned_cards)).toBe(0);
	});

	it('test jinhua poker', function() {
		var baozi = Poker([ 'SA', 'CA', 'DA' ]);
		var tonghuashun = Poker([ 'SA', 'SK', 'SQ' ]);
		var tonghua = Poker([ 'SA', 'S10', 'S8' ]);
		var shunzi = Poker([ 'SA', 'HK', 'CQ' ]);
		var duizi = Poker([ 'SA', 'HA', 'C2' ]);
		var danzhang = Poker([ 'SA', 'H3', 'C7' ]);
		
		var duizi_1 = Poker([ 'SA', 'CA', 'DK' ]);
		var duizi_2 = Poker([ 'CA', 'DA', 'HK' ]);

		expect(Jinhua.pattern(baozi)).toBe(Jinhua.BAOZI);
		expect(Jinhua.pattern(tonghuashun)).toBe(Jinhua.TONGHUASHUN);
		expect(Jinhua.pattern(tonghua)).toBe(Jinhua.TONGHUA);
		expect(Jinhua.pattern(shunzi)).toBe(Jinhua.SHUNZI);
		expect(Jinhua.pattern(duizi)).toBe(Jinhua.DUIZI);
		expect(Jinhua.pattern(danzhang)).toBe(Jinhua.DANZHANG);

		expect(Jinhua.compare(baozi, tonghuashun) > 0).toBe(true);
		expect(Jinhua.compare(tonghuashun, tonghua) > 0).toBe(true);
		expect(Jinhua.compare(tonghua, shunzi) > 0).toBe(true);
		expect(Jinhua.compare(shunzi, duizi) > 0).toBe(true);
		expect(Jinhua.compare(duizi, danzhang) > 0).toBe(true);

		expect(Jinhua.rank(duizi_1) == Jinhua.rank(duizi_2)).toBe(true);
	});
});

