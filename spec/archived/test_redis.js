
var redis = require('redis');

describe("A suite for redis", function() {
	var r = null;
	
	beforeEach(function(done) {
		r = redis.createClient();
		r.on("error", function (err) {
	        console.log("Error " + err);
	    });
		r.del('test_seq');
		r.del('test_str_key1');
		r.del('test_set');
		r.del('test_zset');
		r.del('test_hash_key1');
		r.del('test_hash_key2');
		
		done();
	});

	afterEach(function(done) {
		r.del('test_seq');
		r.del('test_str_key1');
		r.del('test_set');
		r.del('test_zset');
		r.del('test_hash_key1');
		r.del('test_hash_key2');
		
		r.quit();
		done();
	});
	
	it('test string', function(done){
		r.incr('test_seq');
		r.incr('test_seq', function(err,ret){
			expect(ret).toBe(2);
			done();
		});
	});
	
	it('test string', function(done){
		r.set('test_str_key1', 'hello');
		r.get('test_str_key1', function(err,ret){
			expect(ret).toBe('hello');
			done();
		});
	});
	
	it('test list', function(done){
		done();
	});

	it('test set', function(done){
		r.sadd('test_set', 'one', function(err,ret){
		});
		r.sismember('test_set', 'one', function(err,ret){
			expect(ret).toBe(1);
			done();
		});
	});
	
	it('test sorted set', function(done){
		r.multi()
		.zadd('test_zset', 10, 'ten')
		.zadd('test_zset', 20, 'tweenty')
		.exec(function(err,ret){
			r.zrange('test_zset', 0, -1, function(err,ret){
				expect(ret.length).toBe(2);
				done();
			});
		});
	});
	
	it('test hash', function(done){
		r.hset('test_hash_key1', 'name', 'zhang3');
		r.hset('test_hash_key1', 'age', 20);
		r.hget('test_hash_key1', 'name', function(err,ret){
			expect(ret).toBe('zhang3');
			done();
		});
	});
	
	it('test hash', function(done){
		r.hset('test_hash_key2', 'name', 'li4');
		r.hset('test_hash_key2', 'age', 30);
		r.hgetall('test_hash_key2', function(err,ret){
			expect(ret.name).toBe('li4');
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
	
	
});

describe("A suite for redis", function() {
	var r = null;
	
	beforeEach(function(done) {
		r = redis.createClient();
		// if you'd like to select database 3, instead of 0 (default), call
	    // r.select(3, function() { /* ... */ });
		r.on("error", function (err) {
	        console.log("Error " + err);
	    });
		r.hset('test_hash_key1', 'name', 'zhang3');
		r.hset('test_hash_key1', 'age', 20);
		r.hset('test_hash_key2', 'name', 'li4');
		r.hset('test_hash_key2', 'age', 30);
		
		done();
	});

	afterEach(function(done) {
		r.del('test_hash_key1');
		r.del('test_hash_key2');
		
		r.quit();
		done();
	});
	
	it('test script', function(done){
		r.eval(['return 10', 0], function(err,ret){
			expect(ret).toBe(10);
			done();
		});
	});
	
	it('test script', function(done){ // lua table not supported in node_redis
		r.eval(["return {name='ray',age=40,gender=1}", 0], function(err,ret){
			expect(! err).toBe(true);
			expect(ret.length).toBe(0);
			done();
		});
	});
	
	it('test script', function(done){
		r.eval(['return {KEYS[1],ARGV[1]}',1,'key1','hello'], function(err,ret){
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
			expect(! err).toBe(true);
			expect(ret).toBe(55);
			done();
		});
	});

	it('test script with LUA script', function(done){
		var lua_script = "local keys = redis.call('keys','test_hash_key*')\n" +
		"local data = {}\n" +
		"local res = {}\n" +
		"for i=1, #keys do\n" +
		"local k = keys[i]\n" +
		"data[i] = { k, redis.call('hgetall', k) }\n" +
		"end\n" +
		"return data";
		r.eval([ lua_script, 1, 'key1' ,10 ], function(err,ret){
			expect(! err).toBe(true);
			expect(ret[0][0]).toBe('test_hash_key1');
			expect(ret[0][1][0]).toBe('name');
			expect(ret[1][0]).toBe('test_hash_key2');
			done();
		});
	});
});

