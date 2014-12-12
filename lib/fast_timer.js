var universe = global || window;

exports = module.exports = Timer;

function Timer() {
	if(!(this instanceof Timer)) {
		var singleton = universe.fast_timer;
		return singleton ? singleton : new Timer();
	}
	
	if(universe.fast_timer) {
		throw 'timer is a singleton, should not be created twice';
		return;
	}
	
	this.id = Math.floor( Math.random() * 10000 );
	this.timers = {};
	this.timer_seq = 0;
	
	universe.fast_timer = this;
}

Timer.prototype.hijack = function(){
	return;
	if(this.setInterval) return;
	
	var old_set = this.setInterval = universe.setInterval;
	var old_clear = this.clearInterval = universe.clearInterval;
	
	universe.setInterval = function(func, delay, params) {
		
		var timer = ++ this.timer_seq;
		var now = (new Date()).getTime();
		this.timers[ timer ] = {
			f: func,
			delay: delay,
			args: arguments,
			t: now + delay
		};
		return timer;
	};
	
	universe.clearInterval = function(timer) {
		if(timer in this.timers) {
			delete this.timers[ timer ];
		}
	};
};

Timer.prototype.restore = function(){
	return;
	if(! this.setInterval) return;
	
	universe.setInterval = this.setInterval;
	universe.clearInterval = this.clearInterval;
	this.timers = {};
};

Timer.fastTick = function(n) {
	for(var i=0; i<n; i++) {
		for(var timer in timers) {
			var o = timers[ timer ];
			o.tick();
		}
	}
};
