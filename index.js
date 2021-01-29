const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

var path = require('path');
var onlineUsers = [];
var games = [];
var idRefs = [];

app.use(express.static(path.join(__dirname, '/public')));

app.get('/', function(req, res) {
  	res.sendFile(__dirname + '/views/login.html');
});

app.get('/setup', function(req, res) {
  	res.sendFile(__dirname + '/views/setup.html');
});

app.get('/results', function(req, res) {
  	res.sendFile(__dirname + '/views/index.html');
});

app.get('/play', function(req, res) {
	res.sendFile(__dirname + '/views/player.html');
})

io.on('connection', function(socket) {

	var game;

  socket.on('username', function(gameId, username, screen) {
  	socket.gameId = gameId;
  	socket.join(socket.gameId);
    socket.username = username;
    socket.player = new Player(username);
    console.log(socket.player);

    //updates game
    socket.idRef = idRefs.indexOf(gameId);
    game = games[socket.idRef];

    if (game) {
		game.addPlayer(socket.player);
		//get all player names
		
		console.log(game.playerNames());
		io.to(socket.gameId).emit('initPage', game.playerNames(), game.categories, game.word);
		console.log(socket.username + ' connected to ' + gameId);
		console.log(game);

		//start timer if one not already running
		if (screen == "play") {
			if (game.started == false) {
				game.startGame();
			}
			sendTime(game, io);
		}
	}
    });

  socket.on('disconnect', function() {
    console.log(socket.username + ' disconnected from ' + socket.gameId);  
    if (game) {
    	game.removePlayer(socket.player);
    	io.to(socket.gameId).emit('initPage', game.playerNames(), game.categories, game.word);
    }
  });

  socket.on('answers', function(answers) {
  	if (game) {
  		game.findPlayer(socket.player).answers = answers;
  		console.log(answers);
  		io.to(socket.gameId).emit('gameInfo', game);
  	}
  })

  socket.on('createGame', function(gameId) {
  	idRefs.push(gameId);
  	games.push(new Game(gameId));
  	var index = idRefs.indexOf(gameId);
  	console.log(games[index]);
  })

  socket.on('startGame', function() {
  	console.log('Game Started');
  	io.to(socket.gameId).emit('startGame');
  })

  socket.on('typing', function(num, txt) {
  	if (game) {
  		switch(num) {
  			case 1||2||3||4:
  				game.categories[num-1] = txt;
  				break;
  			case 5:
  				game.word = txt;
  				break;
  			case 6:
  				game.minutes = txt;
  				break;
  			case 7:
  				game.secs = txt;
  		}
  		console.log(game);
  		io.to(socket.gameId).emit('initPage', game.playerNames(), game.categories, game.word,
  		 game.minutes, game.secs);
  	}
  })

  socket.on('points', function(player, index, value) {
  	var playerIndex = game.playerNames().indexOf(player);
  	game.players[playerIndex].points[index] = value;
  	console.log(player, index, value);
  	io.to(socket.gameId).emit('gameInfo', game);
  })

  socket.on('check', function(gameId, username) {
  	//find index of game to check if exists
  	var idRef = idRefs.indexOf(gameId)
  	var gameCheck = true;
  	var userCheck = true;
  	var startedCheck = true;

  	if (idRef == -1) { //if gameID does not exist
  		gameCheck = false;
  		userCheck = false;
  	} else { //if gameId does exist
  		if (games[idRef].started) {
  			startedCheck = false;
  		} else if (games[idRef].playerNames().indexOf(username) != -1) { //check if username already taken, return false if yes
  		userCheck = false;
  		}
  	}
  	io.to(socket.id).emit('checkResult', gameCheck, startedCheck, userCheck);
  })

});

http.listen(8080, function() {
  console.log('listening on *:8080');
});

//CLASSES ------------------------------------

class Game {
	constructor(gameId) {
		this.id = gameId;
		this.started = false;
		this.categories = ["Enter category...","Enter category..."
		,"Enter category...","Enter category..."];
		this.word = "Enter 4 letter word...";
		this.players = [];
		this.timeDeadline = 0;
		this.minutes = 2;
		this.secs = 0;
	}

	playerNames() {
		var names = [];
		for (var player of this.players) {
			names.push(player.username);
		}
		return names;
	}

	addPlayer(player) {
		this.players.push(player);
	}

	removePlayer(player) {
		var username = player.username;
		var names = this.playerNames();
		var index = names.indexOf(username);
    	this.players.splice(index, 1);
	}

	findPlayer(player) {
		var username = player.username;
		var names = this.playerNames();
		var index = names.indexOf(username);
		return this.players[index];
	}

	duration() {
		var mins = this.minutes*60;
		var secs = this.secs*1;
		var total = mins + secs;
		console.log(total);
		return total;
	}

	startGame() {
		this.started = true;
		console.log('Game ' + this.id + ' has started');
		var d = new Date();
		this.timeDeadline = d.getTime() + this.duration()*1000; //milliseconds
	}

	timeRemaining() {
		var total = this.timeDeadline - Date.parse(new Date()); //milliseconds
		var seconds = Math.floor((total/1000));
		return seconds;
	}
}

class Player {
	constructor(username) {
		this.username = username;
		this.answers = [];
		this.points = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	}
}

//FUNCTIONS -----------------------------------

function removeUser(user) {
    var index = onlineUsers.indexOf(user);
    if (index > -1) {
        onlineUsers.splice(index, 1);
    }
}

function sendTime(game, socket) {
	var timer = game.timeRemaining();
	var myTimer = setInterval(function() {
		socket.to(game.id).emit('timer', timer);

		if (--timer < 0) {
			clearInterval(myTimer);
		}
	}, 1000)
}









































