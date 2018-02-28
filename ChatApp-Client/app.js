var io = require('socket.io-client');
var readline = require('readline');

const socket = io('http://localhost:3000');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

socket.on('error', function(err){
  console.log(err);
});

//Kada se korisnik spoji pitam ga za username
socket.on('connect', ()=>{
  rl.question('Unesi nickname ', (user)=>{
    socket.emit("user", user);
  });
});

//Ukoliko username postojim, odspojim i ponovno spojim korisnika, kako bi se pozvao 'connect'
socket.on('usernameExists', ()=>{
  console.log(" Username exists");
  socket.disconnect();
  socket.connect();
});
//Ukoliko ime sobe koju korisnik zeli napraviti vec postoji, ispis greske u konzolu
socket.on('roomnameExists', (roomname)=>{
  console.log(" Roomname exists, try again.");
});
//Ukoliko je soba kreirana, ispis poruke u konzolu
socket.on('roomCreated', (roomname)=>{
  console.log(" Room created, change room by typing 'change room', then space and your roomname.");
});
//Kada se korisnik unese u bazu, ispis mogucih radnja, nakon toga zadnjih 20 poruka iz globalne sobe
socket.on('userInserted', (username)=>{
  console.log("To change room type the keyword 'change room', then space and the roomname by your wish.");
  console.log("To create room type the keyword 'create room', then space and the roomname by your wish.");
  console.log("To list available rooms type the keyword 'list rooms'.");
  socket.emit("changeRoom", "Global room");
  rl.on("line", function(data){
    socket.username = username;
    if(data.slice(0,11) === "change room"){
      socket.emit("changeRoom", data.slice(12, data.length));
    }else if(data.slice(0,11) === "create room"){
      socket.emit("createRoom", data.slice(12, data.length));
    }else if(data.slice(0, 10) === "list rooms"){
      socket.emit("listRooms");
    }else{
      socket.emit("userInput", data);
    }
  });
});
//Baratanje porukama koje pristizu od servera
socket.on('chatData', (data)=>{
  if(socket.username !== data.username){
    console.log(data.username + ": " + data.message);
  }
});
//Ispis soba pristiglih od servera
socket.on('listRooms', (rooms)=>{
  console.log("Available rooms:");
  for(var room in rooms){
    console.log(" " + (parseInt(room)+1) +". " + rooms[room]);
  }
});
//Poruka o uspjesnoj izmjeni sobe
socket.on('roomChanged', (data)=>{
  for(var message in data.messagesToClient){
    console.log(data.messagesToClient[message].from + ": " + data.messagesToClient[message].message);
  }
  console.log("You successfully joined room. (" + data.room + ").");
});
//Poruka o neuspjesnom pokusaju izmjene sobe, soba sa tim imenom ne postoji
socket.on('roomNameInvalid', (room)=>{
  console.log("There is no existing room with roomname '" + room + "'.");
});
//Ukoliko se korisnik vec nalazi u nekoj sobi, zabranjeno mu je ponovni ulazak u istu sobu
socket.on('alreadyInRoom', (room)=>{
  console.log("You are already in this room (" + room + ").");
});
