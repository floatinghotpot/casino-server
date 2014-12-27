# casino-server #

An online poker game server powered by node.js and socket.io
  
Game rules supported:
- [x] Jinhua (诈金花/三张牌)
- [ ] Texas Holdem (德州扑克)
- [ ] Fight Landlord (斗地主)
- [ ] Blackjack (21点)

Features: 
- [x] Cross-platform: powered by node.js, easy to deploy on varios platforms.
- [x] Scalable: using Redis as message bus and data storage.
- [x] Open architecture: with Redis as the message bus, easy to interact and extend.
- [x] Cluster: using node.js cluster, sticky session, and socket.io-redis.
- [x] Load balancing: using NginX as load balancer.
- [x] WebSocket protocol: come with javascript client API and web-based demo. API in other languages to be implemented.

# Architecture #

![Architecture](https://github.com/floatinghotpot/casino-server/raw/master/docs/architecture.png)

## Required ##

* Redis

Redis is an open source, BSD licensed, advanced key-value cache and store. It is often referred to as a data structure server since keys can contain strings, hashes, lists, sets, sorted sets, bitmaps and hyperloglogs.

[Download](http://redis.io/download)

* node.js / npm

Node.js® is a platform built on Chrome's JavaScript runtime for easily building fast, scalable network applications. Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient, perfect for data-intensive real-time applications that run across distributed devices.

[Download](http://nodejs.org/download)

# Installation #

* Installing globally and run as service: 
```bash
[sudo] npm install forever -g
[sudo] npm install casino-server -g

# run redis-server first
redis-server &

# run as service
forever start casino-server
```

* Installing as a node app, and run in current folder:

```bash
git clone https://github.com/floatinghotpot/casino-server.git casino
cd casino
npm install
node bin/casino-server [options]
```

Now you can visit http://localhost:7000, it's a web-based game client for testing and demo purpose.

```bash
# open a browser to access the test web page
open http://localhost:7000/
```

# Available Options: #

-p Port to use (defaults to 7000)

-a Address to use (defaults to 0.0.0.0)

-r Address of Redis server (defaults to 127.0.0.1:6379)

# Tools #

With Redis as the message bus, it's very easy for tools to work with the open architecture.

## Event Logger ##

Start the event logger to monitor the events:

```bash
bin/logger.js
```

Or, log the events into log file:

```bash
bin/logger.js -o ./tmp/casino.log
```


