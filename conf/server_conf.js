var path = require('path');

exports = module.exports = 
{
	port: 7000,
	root: path.join(__dirname, '../public'),
	enable_redis: false,
	redis_host: 'localhost',
	redis_port: 6379,
	hellomsg: 'welcome to online casino'
};

