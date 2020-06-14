const express = require('express');
const path = require('path');
const parseArgs = require('minimist');
const args = parseArgs(process.argv.slice(2));
const { name = 'default', port = '3001'} = args;
const config  = require('./config');
const app = express();
const request = require('request');
const redis = require('socket.io-redis');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const server = require('http').Server(app).listen(+port);
const io = require('socket.io')(server);

io.adapter(redis({
    host: config.redisHost,
    port: config.redisPort,
    requestsTimeout: 5000
}));

const server_url= config.serverUrl;
const apiKey= config.apiKey;

var clusters=[
    'socket1-staging-tr.lembits.in',
];



app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/test', (req, res) => {
  res.json({
    headers: req.headers,
    address: req.connection.remoteAddress
  });
});

app.get('/api/name', (req, res) => {
  res.json({ name });
});

app.get('/api/info', (req, res) => {
  fs.readFile(`${__dirname}/version.txt`, 'utf8', (err, version) => {
    res.json({
      version: version || 0,
      dirname: __dirname,
      cwd: process.cwd()
    });
  });
});

app.post('/debug', function (req, res) {
    if(req.body.api_key!==undefined && req.body.api_key==apiKey){
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({total_connections:i,total_users:Object.keys(users).length,users:users}));
    }
});

app.post('/users', function (req, res) {
    if(req.body.api_key!==undefined && req.body.api_key==apiKey){
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(Object.keys(users)));
    }
});

app.post('/send', function (req, res) {
    var isValidKey=false;
    if(req.body.api_key!==undefined && req.body.api_key==apiKey){
        try{
            if(req.body.user_ids!==undefined && req.body.user_ids.length){
                console.log(users);
                req.body.user_ids.forEach(function(user_id){
                    if(users[user_id]!==undefined){
                        users[user_id].forEach(function(socket_id){
                            io.to(socket_id).emit(req.body.event, req.body.data);
                        });
                    }
                });
            }else{
                io.emit(req.body.event, req.body.data);
            }
        }catch(err){}
        res.send('sent');
    }else{
        res.send('you are not authorized');
    }
});

function sendCluster(data){
    clusters.forEach(function(cluster){
        try{
            request.post({
                url:     cluster+'/send',
                json:    {api_key:apiKey,event:'user_message',user_ids:[],data:JSON.stringify(data)}
                }, function(error, response, body){
            });
        }catch(err){console.log('send error');console.log(err);}
    });
}

var users={};
var temp_users=[];
var i=0;
io.of('/').adapter.clients((err, clients) => {
    if(err) {
        console.log(err);
    }
    console.log(clients); // an array containing all connected socket ids
  });
io.on('connection', function (socket) {
    console.log(socket.id);
    //my code

    //mycode
    var userId=socket.handshake.query.user_id;
    console.log(userId);
    if(users[userId]!==undefined){
        users[userId].push(socket.id);
        console.log(users);
    }else{
        users[userId]=[];
        users[userId].push(socket.id);
    }
    if(users[userId].length==1) {
        var index = temp_users.indexOf(userId);
        if (index >= 0) {
            temp_users.splice(index, 1);
        }else{
            try{
                request(server_url+'/socket-login?type=1&id='+userId);
                sendCluster({type:'user_login',data:{user_id:userId}});
            }catch(err){console.log('login error : '+userId);console.log(err);}
        }
    }
    i++;
    socket.on('disconnect', function (reason){
        var user_id=socket.handshake.query.user_id;
        var socketIds=[];
        users[user_id].forEach(function(socket_id){
            if(socket_id!=socket.id){
                socketIds.push(socket_id);
            }
        });
        users[user_id]=socketIds;
        if(socketIds.length==0){
            delete users[user_id]; 
            temp_users.push(user_id);
            setTimeout(function(){
                var index = temp_users.indexOf(user_id);
                if (index >= 0) {
                    temp_users.splice(index, 1);
                    try{
                        request(server_url+'/socket-login?type=0&id='+userId);
                        sendCluster({type:'user_logout',data:{user_id:userId}});
                    }catch(err){console.log('logout error : '+userId);console.log(err);}
                }
            }, 10000);
        }
        i--;
    });
    socket.on('heartbeat', (payload) => {
        payload.nodeName = name;
        socket.emit('heartbeat', payload);
      });
});