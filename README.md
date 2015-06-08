# casino-server #

[![npm version](https://badge.fury.io/js/casino-server.svg)](http://badge.fury.io/js/casino-server)

[![Build Status](https://travis-ci.org/floatinghotpot/casino-server.svg)](https://travis-ci.org/floatinghotpot/casino-server)

[![NPM](https://nodei.co/npm-dl/casino-server.png?height=3)](https://nodei.co/npm/casino-server/)

An online poker game server powered by redis, node.js and socket.io

![A](https://github.com/floatinghotpot/casino-server/raw/master/wwwsrc/img/4_14.png) ![A](https://github.com/floatinghotpot/casino-server/raw/master/wwwsrc/img/3_14.png)
![A](https://github.com/floatinghotpot/casino-server/raw/master/wwwsrc/img/2_14.png)
  
Game rules supported:
- [x] Chat Room (聊天室)
- [x] Jinhua (诈金花/三张牌)
- [x] Texas Holdem (德州扑克)
- [ ] Fight Landlord (斗地主)
- [ ] Blackjack (21点)

Features: 
- [x] Cross-platform: powered by node.js, easy to deploy on various platforms.
- [x] Scalable: using Redis as message bus and data storage.
- [x] Open architecture: with Redis as the message bus, easy to interact and extend.
- [x] Cluster: using PM2, sticky session, and socket.io-redis.
- [x] WebSocket protocol: come with javascript client API and web-based demo. 
- [x] Event logger for server events and user actions.

TODO List:
- [ ] Load balancing: using NginX as load balancer.
- [ ] Client API in other language (priority: C/C++, C#, Java, Objective-C, etc.)
- [ ] Payment gateway callback URL.
- [ ] Admin Portal.

# Architecture #

![Architecture](https://github.com/floatinghotpot/casino-server/raw/master/docs/architecture.png)

## Required ##

* Redis

Redis is an open source, BSD licensed, advanced key-value cache and store. It is often referred to as a data structure server since keys can contain strings, hashes, lists, sets, sorted sets, bitmaps and hyperloglogs.

[Download](http://redis.io/download)

* node.js / npm

Node.js is a platform built on Chrome's JavaScript runtime for easily building fast, scalable network applications. Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient, perfect for data-intensive real-time applications that run across distributed devices.

[Download](http://nodejs.org/download)

* PM2 (production & cluster)

PM2 is a production process manager for Node.js applications with a built-in load balancer. It allows you to keep applications alive forever, to reload them without downtime and to facilitate common system admin tasks.

[Read More](https://github.com/Unitech/pm2)

# Installation #

* Installing globally and run as service with PM2: 

```bash
[sudo] npm install pm2 -g
[sudo] npm install casino-server -g

# run redis-server first
redis-server &

# run as service and cluster mode
pm2 start `which casino-server` -i 0
```

* Installing as a node app, and run in current folder:

```bash
git clone https://github.com/floatinghotpot/casino-server.git casino
cd casino
npm install
# sudo npm install -g gulp
# gulp build
node bin/casino-server [options]
```

Now you can visit http://localhost:7000, it's a web-based game client for testing and demo purpose.

```bash
# open a browser to access the test web page
open http://localhost:7000/
```

# Available Options: #

-p Port to use (defaults to 7000)

-h Host address to use (defaults to 0.0.0.0)

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

# Credits #

This poker game server is created by Raymond Xie, published under MIT license.

It can be used for FREE, but be aware that:

* It is provided as it is. (Not a mature commercial product, may be incomplete, or even lots of bugs)
* We will mainly focus on our own needs. 
* You can propose wish for new features, but don't rely on us to implement them. Instead of waiting for new features, welcome join us to implement them.
* You need take your own risk, including that you need find answers from reading code instead of easily asking only. :P

If you are interested in this project, you can contribute in any of following aspects:

* Simply "Star" it.
* Use it or test it, report bugs or even send pull request of patches.
* Add better HTML5 demo client.
* Add new poker game rules.
* Add client APIs in other languages (like C/C++, C#, Java, etc.)
* Help us write documentation, if your English is good.

