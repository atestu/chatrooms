/* Author: Alexandre Testu
*/

$(document).ready(function() {
	var socket = io.connect("http://" + window.location.host);

	function admin () {
		return ($('textarea').length != 0);
	}

	if (admin ()) {
		socket.emit('ask', 'nbchatrooms');
		socket.emit('ask', 'images');
		socket.emit('ask', 'chatrooms');
		socket.emit('ask', 'captions');
	}
	else {
		socket.emit('login');
	}
	
	socket.on('receive', function (type, data) {
		if (data)
			switch (type) {
				case 'nbchatrooms':
					if (admin ()) $('#nbchatrooms').text(data);
					break;
				case 'images':
					admin () ? $('#images').text(data) : $('img').attr('src', data);
					break;
				case 'chatrooms':
					admin () ? $('#chatrooms').text(data) : $('#iframe').append(data);
					break;
				case 'captions':
					admin () ? $('#captions').text(data) : $('#caption').append(data);
					break;
			}
		else
			$('#iframe').append('No enough ' + type + '! Go to admin!<br />');
	});

	$('#send').live('click', function () {
		socket.emit('save', 'nbchatrooms', $('#nbchatrooms').val(), function (response) {
			socket.emit('save', 'images', $('#images').val(), function (response) {
				socket.emit('save', 'chatrooms', $('#chatrooms').val(), function (response) {
					socket.emit('save', 'captions', $('#captions').val(), function (response) {	
						console.log(response);
						window.location.replace('/');
					})
				})
			})
		})
	});

	socket.on('connect', function() {
	});
});
