//var BOSH_SERVICE = 'http://esc-game-server.local:5280/xmpp-httpbind';
var BOSH_SERVICE = 'http://esc-game-server.local:5280/http-bind';
var connection = null;

//var defaultUser = "testandy";
//var defaultUser = "fffa814f-9e8a-4ead-acff-a112cec56834";
//var defaultUser = "f746c573-ca3c-4847-b43c-fa7dcea8cf10";
var defaultUser = "docent";
//var defaultUser = "game-engine";
//var defaultUser = "81144701-83d2-4497-8c4d-2a11cf20b125";

var user ;

var defaultDomain = "esc-game-server.local";

var docentUser = "docent@" + defaultDomain ;
var gameEngineUser = "game-engine@" + defaultDomain ;
var gameLauncherUser = "game-launcher@" + defaultDomain ;

var currentGame = "";
var gameList = [];

//var defaultUser = "testandy";

console.log("Loading basic.js");

function log(msg, data) {
    var tr = document.createElement('tr');
    var th = document.createElement('th');
    th.setAttribute( "style", "text-align: left; vertical-align: top;" );
    var td;

    th.appendChild( document.createTextNode(msg) );
    tr.appendChild( th );

    if (data) {
        td = document.createElement('td');
        pre = document.createElement('code');
        pre.setAttribute("style", "white-space: pre-wrap;");
        td.appendChild(pre);
        pre.appendChild( document.createTextNode( vkbeautify.xml(data) ) );
        tr.appendChild(td);
    } else {
        th.setAttribute('colspan', '2');
    }

    $('#log').append(tr);
}

function rawInput(data)
{
    console.log('RECV', data);
}

function rawOutput(data)
{
    console.log('SENT', data);
}

function jid_to_id(jid) {
    return Strophe.getBareJidFromJid(jid)
           .replace(/@/g, "-")
        .replace(/\./g, "-");
}

function getRoster() {
    var iq = $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster'});
    connection.sendIQ(iq, function (iq) {
        //log("Roster received.");
        //log("iq: " + Object.keys(iq.tree()) + " " + htmlEscape(Strophe.getText(iq.tree())));
        rosterReceived(iq);
    });
}
function rosterReceived(iq) {
    log ("Roster received:");
    console.log("Roster response:",iq);
    var items = $(iq).find('item');
    //console.log("items:",items);
    items.each(function (i) {
        console.log(i,this);
        var sub = $(this).attr('subscription');        
        var jid = $(this).attr('jid');        
        //console.log("jid: " + jid);
        var name = $(this).attr('name') || jid;
        //console.log("name:" + name);
        // transform jid into an id
        //var jid_id = jid_to_id(jid);
        //console.log(name,jid,jid_id);

        log("> " + sub + ": " + jid) ;
    });
        // set up presence handler and send initial presence
//        Gab.connection.addHandler(Gab.on_presence, null, "presence");
//        Gab.connection.send($pres());
}

function onConnect(status)
{
    if (status == Strophe.Status.CONNECTING) {
        log('Strophe is connecting.');
    } else if (status == Strophe.Status.CONNFAIL) {
        log('Strophe failed to connect.');
	   $('#connect').get(0).value = 'connect';
    } else if (status == Strophe.Status.DISCONNECTING) {
       log('Strophe is disconnecting.');
    } else if (status == Strophe.Status.DISCONNECTED) {
	   log('Strophe is disconnected.');
	   $('#connect').get(0).value = 'connect';
    } else if (status == Strophe.Status.CONNECTED) {
        log('Strophe is connected.');
        connection.addHandler(onMessage, null, 'message', null, null,  null); 
        connection.send($pres().tree());
        if (user == docentUser) {
            sendChat(gameEngineUser,"checkIfLoaded");
            sendChat(gameLauncherUser,"init:");
        }
        else {
            getRoster();
        }
        //log('Sent '+Object.keys($pres().tree()));

        //var msg = $msg({to: "docent@esc-game-server.local", from: "testandy@esc-game-server.local", type: 'chat'}).cnode("init");
        //connection.send(msg.tree());

    	//connection.disconnect();
    }
}

function htmlEscape(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function paramStringToObject(t) {
    var s = t.split(",");
    var params = {};
    var n = s.length ;
    for (var i = 0 ; i < n ; i++) {
        var pair = s[i].split("=");
        params[pair[0]] = pair[1];
    }
    return params ;
}

function onMessage(msg) {
    console.log("onMessage",msg);
    var to = msg.getAttribute('to');
    var from = msg.getAttribute('from');
    var type = msg.getAttribute('type');
    var elems = msg.getElementsByTagName('body');
    if (elems.length == 0) {
        console.log("ERROR!");
        return ;
    }
    var body = elems[0];
    console.log(body);
    var bodyHTML = htmlEscape(Strophe.getText(body));



    log(type + ' message from ' + from + ':' );
    log(" < " + bodyHTML);
    if (type == "error") {
        if (bodyHTML == "checkIfLoaded") {
            // No current game. Let's select one
            log("No current game.");
            loadGame("pixelprisonblues");
        }
        return true ;
    }
    if (bodyHTML == "gameLoaded") {
        startGame();
        return true ;
    }
    var bodySplit = bodyHTML.split(":");
    if (bodySplit[0] == "gamePreviouslyLoaded") {
        log(">> gamePreviouslyLoaded");
        var params = paramStringToObject(bodySplit[1]);
        console.log(params);
        currentGame = params.gameId ;
        if (params.gameStarted=="True") {
            log ("Game "+currentGame+ " already started.");
        }
        else {
            log ("Game "+currentGame+ " has not started yet.");
        }
    }
    else if (bodySplit[0] == "games") {
        log(">> Games list");
        var params = paramStringToObject(bodySplit[1]);
        gameList = Object.keys(params);
        console.log(gameList);
    }
    return true ; // If we don't return true, handler won't be called again!
}

function loadGame(game) {
    sendChat(gameLauncherUser,"command:game="+game+",option=load");
    currentGame = game ;
}
function startGame() {
    sendChat(gameLauncherUser,"command:game="+currentGame+",option=start,round=0,difficulty=0");
}

function nextCommand() {
    sendChat(gameEngineUser,"next:");
}

function sendChat(to,text) {
    //to = to + "@" + defaultDomain ;
    log("Sending chat message to "+to + ": " );
    log(" > " + text);
    var msg = $msg({to: to , type: 'chat'})
        .cnode(Strophe.xmlElement('body', text)).up();
    connection.send(msg.tree());
}

$(document).ready(function () {
    connection = new Strophe.Connection(BOSH_SERVICE);
    connection.rawInput = rawInput;
    connection.rawOutput = rawOutput;
    user = defaultUser + "@" + defaultDomain ;
    document.getElementById("jid").value = user ;
    document.getElementById("pass").value = defaultUser ;

    $('#connect').bind('click', function () {
        var button = $('#connect').get(0);
        if (button.value == 'connect') {
            button.value = 'disconnect';
            connection.connect($('#jid').get(0).value,
	           $('#pass').get(0).value,
               onConnect);
    	} else {
	       button.value = 'connect';
	       connection.disconnect();
        }
    });
    document.getElementById('sendButton').onclick = function () {
        //log ("sending");
        var to = $('#sendto').get(0).value ;
        var msg = $('#sendmsg').get(0).value ;
        log('Sending message to ' + to + ': ' + msg );
        sendChat(to,msg);        
    };
});
