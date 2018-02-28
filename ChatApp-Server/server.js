var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var moment = require('moment');
const MongoClient = require('mongodb').MongoClient;

const MONGO_URL = 'mongodb://test:test@ds247698.mlab.com:47698/chatapp';
io.on('connection', (socket)=>{

  //Skripta za dodavanje novog usera, prvo prebrojim da li vec postoji taj username u bazi, ako ne dodajem usera
  socket.on("user", (user)=>{
    MongoClient.connect(MONGO_URL, (err, db)=>{
      if(err){
        console.log(err);
      }else{
        var dbo = db.db(db.s.options.dbName);
        var obj = {username: user};
        dbo.collection("users").find({ "username" : user }).count((e, count)=>{
          if(count != 0){
            socket.emit('usernameExists');
            db.close();
          }else{
            dbo.collection("users").insert(obj, (err, result)=>{
              if(err){
                console.log("Data not inserted.", err);
                db.close();
              }else{
                console.log("User " + user + " just connected.");
                socket.username = user;
                socket.emit('userInserted', socket.username);
                db.close();
              }
            });
          }
        });
      }
    });
  });
  //Kreiranje sobe, provjeravam ima li vec soba u bazi, ako ne dodajem ju.
  socket.on("createRoom", (roomname)=>{
    MongoClient.connect(MONGO_URL, (err, db)=>{
      if(err){
        console.log(err);
      }else{
        var dbo = db.db(db.s.options.dbName);
        var obj = {roomName: roomname,
                   createdBy: socket.username,
                   date_time: moment().format('x').toString()
                  };

        dbo.collection("rooms").find({ "roomname" : roomname }).count((e, count)=>{
          if(count != 0){
            socket.emit('roomnameExists', roomname);
            db.close();
          }else{
            dbo.collection("rooms").insert(obj, (err, result)=>{
              if(err){
                console.log("Data not inserted.", err);
                db.close();
              }else{
                socket.emit('roomCreated', roomname);
                db.close();
              }
            });
          }
        });
      }
    });
  });

  //Baratanje porukama koje pristizu od korisnika, spremanje istih u bazu i broadcast ostalim korisnicima u sobi
  socket.on("userInput", (data)=>{
    var obj = { message: data,
                from: socket.username,
                date_time: moment().format('x').toString()
              };
    MongoClient.connect(MONGO_URL, (err, db)=>{
      if(err){
        console.log(err);
      }else{
        var dbo = db.db(db.s.options.dbName);
        dbo.collection("rooms").update({"roomName": socket.room}, { $push: {"messages": obj }}, (err, result)=>{
          if(err){
            console.log("Message not inserted.", err);
            db.close();
          }else{
            io.sockets.in(socket.room).emit("chatData", {message: data, username: socket.username});
            db.close();
            }
       });
     }
    });
  });

  //ispis svih soba iz baze
  socket.on("listRooms", ()=>{
    MongoClient.connect(MONGO_URL, (err, db)=>{
      if(err){
        console.log(err);
      }else{
        var dbo = db.db(db.s.options.dbName);
        dbo.collection("rooms").find({}).toArray((err,result)=>{
          var rooms = [];
          for(var room in result){
            rooms.push(result[room].roomName);
          }
          socket.emit("listRooms", rooms);
          db.close();
        });
      }
    });
  });

  //promjena sobe
  socket.on("changeRoom", (room)=>{
    if(socket.room == room){
      socket.emit("alreadyInRoom", room);
    }else{
    MongoClient.connect(MONGO_URL, (err, db)=>{
      if(err){
        console.log(err);
      }else{
        var dbo = db.db(db.s.options.dbName);

        dbo.collection("rooms").find({ "roomName" : room }).count((e, count)=>{
          if(count != 0){
            dbo.collection("rooms").find({"roomName": room}).toArray((err,result)=>{
              var messages = [];
              for(var message in result[0].messages){
                messages.push(result[0].messages[message]);
              }
              messages.sort((a,b)=>{
                return (a.date_time > b.date_time) ? 1 : ((b.date_time > a.date_time) ? -1 : 0);
              });
              var messagesToClient = [];
              if(messages.length < 20){
                var from = 0;
              }else{
                var from = (messages.length-20);
              }
              for(var i = from; i < messages.length; i++){
                messagesToClient.push(messages[i]);
              }
              socket.emit('roomChanged', {room, messagesToClient});
              if(socket.room)
                socket.leave(socket.room);
              socket.room = room;
              socket.join(room);
              db.close();
            });
          }else{
            socket.emit("roomNameInvalid", room);
            db.close();
            }
          });
        }
      });
    }
  });
});

server.listen(3000);
