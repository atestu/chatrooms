var connect = require('connect'),
	express = require('express'),
	sys = require('sys'),
	io = require('socket.io'),
	knox = require('knox'),
	port = (process.env.PORT || 8081);

// set global variable on the server to avoid a keys.js
var knoxClient = knox.createClient({
	key: process.env['RPSAWSID'],
	secret: process.env['RPSAWSSECRET'],
	bucket: "mturk-chatrooms"
});

//Setup Express
var app = express.createServer();
app.configure(function(){
	app.set('views', __dirname + '/views');
	app.use(connect.bodyDecoder());
	app.use(connect.staticProvider(__dirname + '/static'));
	app.use(app.router);
});

//setup the errors
app.error(function(err, req, res, next){
	if (err instanceof NotFound) {
		res.render('404.ejs', {
			locals: { 
				header: '#Header#',
				footer: '#Footer#',
				title : '404 - Not Found',
				description: '',
				author: '',
				analyticssiteid: 'XXXXXXX' 
				},status: 404 });
			}
	else {
		res.render('500.ejs', {
			locals: { 
				header: '#Header#',
				footer: '#Footer#',
				title : 'The Server Encountered an Error',
				description: '',
				author: '',
				analyticssiteid: 'XXXXXXX',
				error: err 
				},status: 500 });
			};
});

app.listen(port);


function writeJSON (message, filename) {
  var req = knoxClient.put(filename, {
      'Content-Length': message.length,
      'Content-Type': 'text/plain',
			'x-amz-acl': 'private'
  });
  req.on('response', function(res){
    if (200 == res.statusCode) {
      console.log('saved to %s', req.url);
    }
  });
  req.end(message.toString());
}

//Setup Socket.IO
var io = io.listen(app);

io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});

var rooms = [
	{ name: '0',
	 	open: true },
	{ name: '1',
	 	open: true },
	{ name: '2',
	 	open: true },
	{ name: '3',
	 	open: true },
	{ name: '4',
	 	open: true },
	{ name: '5',
	 	open: true },
	{ name: '6',
	 	open: true },
	{ name: '7',
	 	open: true },
	{ name: '8',
	 	open: true }
]
var currentRoom = '';
var currentImage = '';
var roomNumber = 0;
var nbClients = 0;
var delay = 10; // time to wait for another player, in minutes
var nextRoom = true;
var intervalId = 0;
var maxClientsPerRoom = 2; // Change the size of chatrooms


// knoxClient.get('nbchatrooms').on('response', function(res){
//   res.setEncoding('utf8');
//   res.on('data', function(chunk){
// 		console.log(chunk);
// 	});
// 		res.on('end', function() {
// 			socket.emit('receive', 'nbchatrooms', result.split('\n')[i]);						
// 		});
// }).end();
	
function nbClientsInRoom (room) {
	console.log("There are %s clients in room %s", io.sockets.clients(room).length, room);
	return io.sockets.clients(room).length;
}

setInterval(function () {
	for (var i = rooms.length - 1; i >= 0; i--){
		if (!rooms[i].open && nbClientsInRoom(rooms[i].name) == 0)
			rooms[i].open = true;
	};
}, 10000); // every 10 seconds, open rooms with no one in them

function closeRoom (i) {
	if (rooms[i].open && (nbClientsInRoom(rooms[i].name) == maxClientsPerRoom))
	{
		console.log("Closed room " + i);
		rooms[i].open = false;
	}
}

function joinLastOpenRoom (socket) {
	for (var i = 0; i < rooms.length; i++) {
		console.log(rooms[i]);
		if (rooms[i].open) {
			socket.join(rooms[i].name);
			knoxClient.get('images').on('response', function(res){
			  res.setEncoding('utf8');
				var result = '';
			  res.on('data', function(chunk){
					result += chunk;
			  });	
				res.on('end', function() {
					socket.emit('receive', 'images', result.split('\n')[i]);
				});
				knoxClient.get('chatrooms').on('response', function(res){
				  res.setEncoding('utf8');
					var result = '';
				  res.on('data', function(chunk){
						result += chunk;
				  });
					res.on('end', function() {
						socket.emit('receive', 'chatrooms', result.split('\n')[i]);						
					});
					knoxClient.get('captions').on('response', function(res){
					  res.setEncoding('utf8');
						var result = '';
					  res.on('data', function(chunk){
							result += chunk;
					  });
						res.on('end', function() {
							socket.emit('receive', 'captions', result.split('\n')[i]);						
						});
					}).end();
				}).end();
			}).end();
			setTimeout(function () {
				rooms[i].open = false;
			}, 60000 * delay); // close room in delay minutes
			return closeRoom(i);
		}
	};
}

io.sockets.on('connection', function(socket){
	socket.on('login', function () {
		joinLastOpenRoom(socket);
	});

	socket.on('ask', function(type, callback) {
		knoxClient.get(type).on('response', function(res){
		  res.setEncoding('utf8');
		  res.on('data', function(chunk){
				socket.emit('receive', type, chunk);
		  });
		}).end();
	});
	
	socket.on('save', function(type, data, callback) {
		callback(writeJSON(data, type));
	});
	
	socket.on('disconnect', function(){
		for (var i = rooms.length - 1; i >= 0; i--){
			console.log("room %s, with %s clients", rooms[i], nbClientsInRoom(rooms[i].name));
			if (!rooms[i].open && (nbClientsInRoom(rooms[i].name) == 1)) {
				console.log("Reopened room ", rooms[i].name);
				rooms[i].open = true;
				return;
			}
		};
	});
});


///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

app.get('/', function(req,res){
	res.render('index.ejs', {
		locals : { 
			header: '',
			footer: '',
			title : 'mturk Chatrooms',
			description: 'Page Description',
			author: 'Alexandre Testu',
			analyticssiteid: 'XXXXXXX' 
		}
	});
});

app.get('/admin', function(req,res){
	res.render('admin.ejs', {
		locals : { 
			header: '',
			footer: '',
			title : 'Edit chatrooms info',
			description: 'Page Description',
			author: 'Alexandre Testu',
			analyticssiteid: 'XXXXXXX' 
		}
	});
});

//A Route for Creating a 500 Error (Useful to keep around)
app.get('/500', function(req, res){
	throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
app.get('/*', function(req, res){
	throw new NotFound;
});

function NotFound(msg){
	this.name = 'NotFound';
	Error.call(this, msg);
	Error.captureStackTrace(this, arguments.callee);
}
