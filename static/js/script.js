/* Author: Alexandre Testu
*/

$(document).ready(function() {
	// var socket = io.connect('http://0.0.0.0');
	var socket = io.connect('http://mturk-chatrooms.herokuapp.com');
	
	io.configure(function () { 
	  io.set("transports", ["xhr-polling"]); 
	  io.set("polling duration", 100); 
	});

	function admin () {
		return ($('textarea').length != 0);
	}

	if (admin ()) {
		socket.emit('ask', 'images');
		socket.emit('ask', 'chatrooms');
	}
	else {
		socket.emit('login');
	}
	
	socket.on('receive', function (type, data) {
		if (data)
			if (type == 'images') {
				admin () ? $('#images').text(data) : $('img').attr('src', data);
			}
			else {
				admin () ? $('#chatrooms').text(data) : $('#iframe').append(data);
			}
		else
			$('#iframe').append('No enough ' + type + '! Go to admin!<br />');
	});

	$('#send').live('click', function () {
		socket.emit('save', 'images', $('#images').val(), function (response) {
			socket.emit('save', 'chatrooms', $('#chatrooms').val(), function (response) {			
				console.log(response);
				window.location.replace('/');
			})
		})
	});

	socket.on('connect', function() {
	});
});
