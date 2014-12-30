
var Poker = require('../lib/poker'),
	Jinhua = require('../lib/jinhua_poker');

describe("A suite for data model", function() {
	
	it('test card', function() {
		expect(Poker('SA')).toBe(4 << 4 | 14);
		
		expect(Poker.visualize(Poker('SA'))).toBe('A♠');
		expect(Poker.visualize(Poker('HA'))).toBe('A♥');
		expect(Poker.visualize(Poker('CA'))).toBe('A♣');
		expect(Poker.visualize(Poker('D10'))).toBe('10♦');

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
		var three_cards = Poker(['SA', 'D10', 'DA']);
		Poker.sort( three_cards );
		expect(three_cards[0] & 0xf).toBe(14);
		expect(three_cards[1] & 0xf).toBe(14);
		expect(three_cards[2] & 0xf).toBe(10);
		
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
});

