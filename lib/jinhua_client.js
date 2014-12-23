var Client = require('./client');

function JinhuaClient( socket ) {
	Room.call(this, socket);
	
	// TODO: init work
}

JinhuaClient.prototype = Object.create(Client.prototype);

JinhuaClient.prototype.constructor = JinhuaClient;

JinhuaClient.prototype.ready = function(func) {
	if(! func) func = function(err,ret){};
	this.rpc('ready', 0, func);
};

JinhuaClient.prototype.giveup = function(func) {
	if(! func) func = function(err,ret){};
	this.rpc('giveup', 0, func);
};

JinhuaClient.prototype.followchip = function(func) {
	if(! func) func = function(err,ret){};
	this.rpc('followchip', 0, func);
};

JinhuaClient.prototype.addchip = function(n, func) {
	if(! func) func = function(err,ret){};
	this.rpc('ready', n, func);
};

JinhuaClient.prototype.pk = function(uid, func) {
	if(! func) func = function(err,ret){};
	this.rpc('pk', uid, func);
};

JinhuaClient.prototype.checkcard = function(func) {
	if(! func) func = function(err,ret){};
	this.rpc('checkcard', 0, func);
};

JinhuaClient.prototype.showcard = function(func) {
	if(! func) func = function(err,ret){};
	this.rpc('showcard', 0, func);
};

