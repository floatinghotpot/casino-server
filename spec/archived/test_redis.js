
var redis = require('redis');

describe("A suite for redis", function() {
	var r = null;
	
	beforeEach(function(done) {
		r = redis.createClient();
		// if you'd like to select database 3, instead of 0 (default), call
	    // r.select(3, function() { /* ... */ });
		r.on("error", function (err) {
	        console.log("Error " + err);
	    });
		done();
	});

	afterEach(function(done) {
		r.quit();
		done();
	});
	
	it('test string', function(done){
		r.incr('test_seq', function(err,ret){
			console.log('test_seq: ', err, ret);
			done();
		});
	});
	
	it('test string', function(done){
		r.set('str_key1', 'hello');
		r.get('str_key1', function(err,ret){
			expect(ret).toBe('hello');
			done();
		});
	});
	
	it('test list', function(done){
		done();
	});

	it('test set', function(done){
		r.sadd('myset', 'one', function(err,ret){
		});
		r.sismember('myset', 'one', function(err,ret){
			expect(ret).toBe(1);
			done();
		});
	});
	
	it('test set', function(done){
		r.smembers('myset', function(err,ret){
			expect(ret.indexOf('one') >= 0).toBe(true);
			done();
		});
	});

	it('test hash', function(done){
		r.hset('hash_key1', 'name', 'zhang3');
		r.hset('hash_key1', 'age', 20);
		r.hkeys('hash_key1', function(err,keys){
			console.log('test hkeys:', err, keys);
		});
		r.hget('hash_key1', 'name', function(err,ret){
			expect(ret).toBe('zhang3');
			done();
		});
		r.hset('hash_key2', 'name', 'li4');
		r.hset('hash_key2', 'age', 30);
	});
	
	it('test hash', function(done){
		r.hgetall('hash_key2', function(err,ret){
			console.log('test hgetall:', err, ret);
			//console.log(typeof ret.age);
			done();
		});
	});

	it('test sorted set', function(done){
		r.multi()
		.zadd('test_zset', 10, 'ten')
		.zadd('test_zset', 20, 'tweenty')
		.exec(function(err,ret){
			done();
		});
	});
	
	it('test sorted set', function(done){
		r.zrange('test_zset', 0, -1, function(err,ret){
			console.log('test sorted set: ', err, ret);
			done();
		});
	});
	
	it('test pub/sub', function(done){
		done();
	});
	
	it('test subquery', function(done){
		r.keys("*", function (err, keys) {
		    keys.forEach(function (key, pos) {
		        r.type(key, function (err, keytype) {
		            //console.log(key + " is " + keytype);
		            if (pos === (keys.length - 1)) {
		                done();
		            }
		        });
		    });
		});
	});
	
	it('test script', function(done){
		r.eval(['return 10', 0], function(err,ret){
			expect(ret).toBe(10);
			done();
		});
	});
	
	it('test script', function(done){ // lua table not supported in node_redis
		r.eval(["return {name='ray',age=40,gender=1}", 0], function(err,ret){
			console.log('test eval:', err, ret);
			done();
		});
	});
	
	it('test script', function(done){
		r.eval(['return {KEYS[1],ARGV[1]}',1,'key1','hello'], function(err,ret){
			console.log('test eval:', err, ret);
			expect(ret[0]).toBe('key1');
			expect(ret[1]).toBe('hello');
			done();
		});
	});

	it('test script with LUA script', function(done){
		var lua_script = 'local i = tonumber(ARGV[1])\n' +
			'local res = 0\n' +
			'while (i>0) do\n' +
				'res = res + i\n' +
				'i = i-1\n' +
			'end\n' +
			'return res\n';
		r.eval([ lua_script, 1, 'key1' ,10 ], function(err,ret){
			console.log('test eval:', err, ret);
			expect(ret).toBe(55);
			done();
		});
	});

	it('test script with LUA script', function(done){
		var lua_script = "local keys = redis.call('keys','hash_key*')\n" +
		"local data = {}\n" +
		"local res = {}\n" +
		"for i=1, #keys do\n" +
		"local k = keys[i]\n" +
		"data[i] = { k, redis.call('hgetall', k) }\n" +
		"end\n" +
		"return data";
		r.eval([ lua_script, 1, 'key1' ,10 ], function(err,ret){
			console.log('test eval:', err, ret);
			//expect(ret).toBe(55);
			done();
		});
	});
	
	it('test present value', function(){
		var monthly_roi = 0.04 / 12;
		function present_value_of_monthly_pay(per, n) {
			if(n == 1) return per;
			else return (per + present_value_of_monthly_pay(per, n-1)) * (1 + monthly_roi);
		}
		function monthly_to_onetime(per, n) {
			return present_value_of_monthly_pay(per, n) / Math.pow(1 + monthly_roi, n);
		}
		console.log( 'monthly pay to current value:', monthly_to_onetime(300, 24) );
	});
});

