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

var currentRoom = '';
var currentImage = '';
var roomNumber = 0;
var nbClients = 0;

io.sockets.on('connection', function(socket){
	++nbClients;
	socket.on('login', function () {
		console.log('ROOMNUMBER: ' + roomNumber);
		if (nbClients % 2 == 0) { // even: get in last room and increment roomNumber
			knoxClient.get('images').on('response', function(res){
			  res.setEncoding('utf8');
			  res.on('data', function(chunk){
					socket.emit('receive', 'images', chunk.split('\n')[roomNumber]);
					knoxClient.get('chatrooms').on('response', function(res){
					  res.setEncoding('utf8');
					  res.on('data', function(chunk){
							socket.emit('receive', 'chatrooms', chunk.split('\n')[roomNumber++]);
					  });
					}).end();
			  });
			}).end();
		}
		else { // odd: new room
			knoxClient.get('images').on('response', function(res){
			  res.setEncoding('utf8');
			  res.on('data', function(chunk){
					socket.emit('receive', 'images', chunk.split('\n')[roomNumber]);
					knoxClient.get('chatrooms').on('response', function(res){
					  res.setEncoding('utf8');
					  res.on('data', function(chunk){
							socket.emit('receive', 'chatrooms', chunk.split('\n')[roomNumber]);
					  });
					}).end();
			  });
			}).end();
		}
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
		if (nbClients % 2 == 0 && nbClients != 0) { // even: someone left a room but there's still another person there
			--roomNumber;
		}
		console.log("DISCONNECT: NEW ROOM NUMBER: " + roomNumber);
		--nbClients;
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
