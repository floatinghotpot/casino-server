
describe("A suite for javascript", function() {
	it("contains spec with an expectation", function() {
		expect(true).toBe(true);
	});

	it('test bit operation', function() {
		expect(1 << 1).toBe(2);
		expect(1 << 4).toBe(16);
		expect(1 << 4 | 1).toBe(17);
		expect(17 >> 4).toBe(1);
		expect(17 & 0x0f).toBe(1);
		expect(1 << 32).toBe(1);
	});
	
	it('test time', function() {
		expect(new Date().getTime()).toBe(Date.now());
	});
	
	it('test array operation', function() {
		expect([ 1 ].join('')).toBe([ 1 ].join(''));
	});
	
	it('test string operation', function() {
		expect('hello the world'.indexOf('hello')).toBe(0);
	});
	
	it('test object', function() {
		expect(! {}).toBe(false);
		
		expect( typeof {} ).toBe('object');
		expect( Object.prototype.toString.call( {} ) ).toBe('[object Object]');
		
		var b = {
			a: 10,
			b: (function(o){ 
					expect(typeof o.a).toBe('undefined');
					expect(typeof o.c).toBe('undefined');
					return 20; 
				})(this),
			c: 30
		};
		expect(b.b).toBe(20);
		expect( typeof null ).toBe('object');
		
		var a = b = [];
		b.push(1);
		b.push(2);
		expect(a.length).toBe(2);
	});
	
	it('test function', function(){
		function foo(a, b, c) {
			return 100;
		}
		foo(11, 22, 33);
		foo.apply(null, [11,22,33]);
		setTimeout(foo, 10, 11,22,33);
		
		function bar(a, b, c) {
			var func = foo;
			var args = Array.prototype.slice.call(arguments);
			args.shift();
			return func.apply(this, args);
		}
		var ret = bar(0, 11,22,33);
		expect(ret).toBe(100);
	});
	
	it('test function and class', function(){
		function A(){
			this.methods = {
				A: this.methodA	
			};
		};
		A.prototype.methodA = function methodB(arg1, arg2){
			expect(arguments.callee.name).toBe('methodB');
			expect(arg1).toBe('param1');
			expect(arg2).toBe('param2');
		};
		
		var a = new A();
		expect(a instanceof A).toBe(true);
		
		var func = a.methods.A;
		expect(typeof func === 'function').toBe(true);
		func.call(a, 'param1', 'param2');
		
		var func2 = a['methodA'];
		expect(typeof func2 === 'function').toBe(true);
		func2.call(a, 'param1', 'param2');
		
	});
});

