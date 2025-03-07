var server = 'mydomain.com';
var BOSH_SERVICE = 'http://127.0.0.1:7070/http-bind/';
var ROOM = 'prova@conference.' + server;
var ROOM_SERVICE = 'conference.' + server;
var connection = null;

function log(msg) {
  $('#log').append('<div></div>').append(document.createTextNode(msg));
  console.log(msg);
}

function onConnect(status) {
  if (status == Strophe.Status.CONNECTING) {
    log('Strophe is connecting.');
  } else if (status == Strophe.Status.CONNFAIL) {
    log('Strophe failed to connect.');
    updateConnButton(false);
  } else if (status == Strophe.Status.DISCONNECTING) {
    log('Strophe is disconnecting.');
  } else if (status == Strophe.Status.DISCONNECTED) {
    log('Strophe is disconnected.');
    updateConnButton(false);
  } else if (status == Strophe.Status.CONNECTED) {
    log('Strophe is connected.');
    updateConnButton(true);
    $('#to').get(0).value = connection.jid; // full JID
    // set presence
    connection.send($pres());
    // set handlers
    connection.addHandler(onMessage, null, 'message', null, null, null);
    connection.addHandler(onSubscriptionRequest, null, "presence", "subscribe");
    connection.addHandler(onPresence, null, "presence");
    
    listRooms();
  }
}

function onMessage(msg) {
  var to = msg.getAttribute('to');
  var from = msg.getAttribute('from');
  var type = msg.getAttribute('type');
  var elems = msg.getElementsByTagName('body');

  if (type == "chat" && elems.length > 0) {
    var body = elems[0];
    log('CHAT: I got a message from ' + from + ': ' + Strophe.getText(body));
  }
  // we must return true to keep the handler alive.  
  // returning false would remove it after it finishes.
  return true;
}

function sendMessage(msg) {
  log('CHAT: Send a message to ' + $('#to').get(0).value + ': ' + msg);

  var m = $msg({
    to: $('#to').get(0).value,
    from: $('#jid').get(0).value,
    type: 'chat'
  }).c("body").t(msg);
  connection.send(m);
}

function setStatus(s) {
  log('setStatus: ' + s);
  var status = $pres().c('show').t(s);
  connection.send(status);
}

function subscribePresence(jid) {
  log('subscribePresence: ' + jid);
  connection.send($pres({
    to: jid,
    type: "subscribe"
  }));
}

function getPresence(jid) {
  log('getPresence: ' + jid);
  var check = $pres({
    type: 'probe',
    to: jid
  });
  connection.send(check);
}

function getRoster() {
  log('getRoster');
  var iq = $iq({
    type: 'get'
  }).c('query', {
    xmlns: 'jabber:iq:roster'
  });
  connection.sendIQ(iq, rosterCallback);
}

function rosterCallback(iq) {
  log('rosterCallback:');
  $(iq).find('item').each(function() {
    var jid = $(this).attr('jid'); // The jabber_id of your contact
    // You can probably put them in a unordered list and and use their jids as ids.
    log('	>' + jid);
  });
}

function onSubscriptionRequest(stanza) {
  if (stanza.getAttribute("type") == "subscribe") {
    var from = $(stanza).attr('from');
    log('onSubscriptionRequest: from=' + from);
    // Send a 'subscribed' notification back to accept the incoming
    // subscription request
    connection.send($pres({
      to: from,
      type: "subscribed"
    }));
  }
  return true;
}

function onPresence(presence) {
  log('onPresence:');
  var presence_type = $(presence).attr('type'); // unavailable, subscribed, etc...
  var from = $(presence).attr('from'); // the jabber_id of the contact
  if (!presence_type) presence_type = "online";
  log('	>' + from + ' --> ' + presence_type);
  if (presence_type != 'error') {
    if (presence_type === 'unavailable') {
      // Mark contact as offline
    } else {
      var show = $(presence).find("show").text(); // this is what gives away, dnd, etc.
      if (show === 'chat' || show === '') {
        // Mark contact as online
      } else {
        // etc...
      }
    }
  }
  return true;
}

function listRooms() {
  connection.muc.listRooms(mydomain, function(msg) {
    log("listRooms - success: ");
    $(msg).find('item').each(function() {
      var jid = $(this).attr('jid'),
        name = $(this).attr('name');
      log('	>room: ' + name + ' (' + jid + ')');
    });
  }, function(err) {
    log("listRooms - error: " + err);
  });
}

function enterRoom(room) {
  log("enterRoom: " + room);
  connection.muc.init(connection);
  connection.muc.join(room, $('#jid').get(0).value, room_msg_handler, room_pres_handler);
  //connection.muc.setStatus(room, $('#jid').get(0).value, 'subscribed', 'chat');
}

function room_msg_handler(a, b, c) {
  log('MUC: room_msg_handler');
  return true;
}

function room_pres_handler(a, b, c) {
  log('MUC: room_pres_handler');
  return true;
}

function exitRoom(room) {
  log("exitRoom: " + room);
  //TBD
}

function register() {
	var registerCallback = function (status) {
		if (status === Strophe.Status.REGISTER) {
			log("registerCallback: REGISTER");
			connection.register.fields.username = $('#reg_name').get(0).value;
			connection.register.fields.password = $('#reg_pass').get(0).value;
			console.log(connection.register.fields);
			connection.register.submit();
		} else if (status === Strophe.Status.REGISTERED) {
			log("registerCallback: REGISTERED");
			$('#jid').get(0).value = $('#reg_name').get(0).value + "@" + server;
			$('#pass').get(0).value = $('#reg_pass').get(0).value;
			connection.authenticate();
		} else if (status === Strophe.Status.CONNECTED) {
			log("registerCallback: CONNECTED");
			// set presence
      connection.send($pres());
      updateConnButton(true);
		} else if (status === Strophe.Status.CONFLICT) {
			log("registerCallback: Contact already existed!");
		} else if (status === Strophe.Status.NOTACCEPTABLE) {
			log("registerCallback: Registration form not properly filled out.")
		} else if (status === Strophe.Status.REGIFAIL) {
			log("registerCallback: The Server does not support In-Band Registration")
		} else {
			// every other status a connection.connect would receive
		}
	};
	
	if (!connection) {
		var url = BOSH_SERVICE;
		connection = new Strophe.Connection(url);
		connection.rawInput = rawInput;
		connection.rawOutput = rawOutput;
	}
	connection.register.connect(server, registerCallback);
}

function rawInput(data) {
  console.log('RECV: ' + data);
}

function rawOutput(data) {
  console.log('SENT: ' + data);
}

function updateConnButton(connected) {
    var button = $('#connect').get(0);
    if (connected) {
      button.value = 'disconnect';
    } else {
      button.value = 'connect';
    }
}

$(document).ready(function() {

  $('#jid').get(0).value = "pippo@"+server;
  $('#pass').get(0).value = "pippo";

  $('#connect').bind('click', function() {
  	if (!connection) {
  		var url = BOSH_SERVICE;
  		connection = new Strophe.Connection(url);
  		connection.rawInput = rawInput;
  		connection.rawOutput = rawOutput;
  	}
    var button = $('#connect').get(0);
    if (button.value == 'connect') {
      connection.connect($('#jid').get(0).value, $('#pass').get(0).value, onConnect);
    } else {
      connection.disconnect();
    }
  });
  
	$("#btnRegister").bind('click', function () {
		register();
	});

  $('#send').bind('click', function() {
    var msg = $('#msg').val();
    sendMessage(msg);
  });

  $('#btnGetPres').bind('click', function() {
    var jid = $('#to').val();
    getPresence(jid);
  });

  $('#btnSubPres').bind('click', function() {
    var jid = $('#to').val();
    subscribePresence(jid);
  });

  $('#btnRoster').bind('click', function() {
    getRoster();
  });

  $('#btnAway').bind('click', function() {
    setStatus('away');
  });

  $('#room').val(ROOM);

  $('#btnEnter').bind('click', function() {
    enterRoom($('#room').val());
  });

  $('#btnExit').bind('click', function() {
    exitRoom($('#room').val());
  });

});