# casino-server #

An online poker game server powered by node.js and socket.io
  
Game rules supported:
- [x] Jinhua (诈金花/三张牌)
- [ ] Texas Holdem (德州扑克)
- [ ] Fight Landlord (斗地主)
- [ ] Blackjack (21点)

Features: 
- [x] Using redis as message bus and data storage.
- [x] Cluster: using node.js cluster, sticky session, and socket.io-redis.
- [x] Load balancing: using NginX as load balancer.
- [x] Come with a web interface to test basic features.

# Architecture #

![Architecture](https://github.com/floatinghotpot/casino-server/raw/master/docs/architecture.png)

# Installing globally: #

Run as 
```bash
[sudo] npm install casino-server -g
```

## Usage: ##

```bash
casino-server [path] [options]

# install redis-server first
[sudo] apt-get install redis-server

# or run as service
[sudo] npm install forever -g
forever start casino-server

# open a browser to access the test web page
open http://localhost:7000/
```

```[path]``` defaults to ```./public``` if the folder exists, and ```./``` otherwise.

# Installing as a node app #

```bash
mkdir myapp
cd myapp/
npm install casino-server
```

## Usage: ##

```bash
node bin/casino-server
```

Now you can visit http://localhost:7000 to view your online casino server

# Available Options: #

-p Port to use (defaults to 7000)

-a Address to use (defaults to 0.0.0.0)

