// ESC communication and controller functions
// for both docent and players

// To do:
// Auto-register new players
// Reconnect on disconnects


var myDomain = window.location.hostname ;

var BOSH_SERVICE = 'http://'+myDomain+':5280/http-bind';
var connection = null;

//var defaultUser = "testandy";
//var defaultUser = "fffa814f-9e8a-4ead-acff-a112cec56834";
//var defaultUser = "f746c573-ca3c-4847-b43c-fa7dcea8cf10";
var defaultUser = "player1";
//var defaultUser = "game-engine";
//var defaultUser = "81144701-83d2-4497-8c4d-2a11cf20b125";

var userID ="";
var userName = "";

var isPlayer = true ; // Is this a player or a docent?
// We are using both isPlayer and isDocent in case we extend in future to other types

//var defaultDomain = "esc-game-server.local"; // XMPP host name
var defaultDomain = "esc-andy.local"; // XMPP host name

var docentUser = "docent@" + defaultDomain ;
var gameEngineUser = "game-engine@" + defaultDomain ;
var gameLauncherUser = "game-launcher@" + defaultDomain ;

var currentGame = "";
var gameList = [];

var serverIP="";

var OSCindex = 0 ; // Set when registered
var playerID = 0 ; // Set by special:id=<#>
var playerSprite = "" ;

var registering = false ; // To track when we are registering a new username
var reconnectDelay = - 1 ; // Set to 0 to reconnect 
//var defaultUser = "testandy";

console.log("Loading esc.js");

// Cookies, to remember the playerID, OSCindex, and userName for reconnecting
function setCookie(cname, cvalue, exSeconds) {
    var d = new Date();
    d.setTime(d.getTime() + (exSeconds * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

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
        pre.appendChild( document.createTextNode( Strophe.serialize(data) ) );
        tr.appendChild(td);
    } else {
        th.setAttribute('colspan', '2');
    }

    $('#log').append(tr);
}

// Simple helper function for default values of optional parameters
// Some older phones with older browsers do not allow default values in function definitions
function defaultValue(param,def) {
    return (typeof param !== 'undefined') ? param : def ;
}

function rawInput(data) {
    if (registering) {
        checkRegistrationRaw(data);
    }
    console.log('RECV', data);
}

function checkRegistrationRaw(data) {
    console.log("Registering response?",data);
    var result = data.match(/\<iq xmlns\=\'jabber\:client\' from\=\'([^\']*)\' id\=\'([^\']*)\' type\=\'([^\']*)\'\/\>\<\/body\>/);
    var r = {
        from: result[1] ,
        id: result[2],
        type: result[3]
    };
    console.log(r);
    registering = false ;
    // Reconnect right after disconnecting
    reconnectDelay=0 ;
    xmppDisconnect();
}

function rawOutput(data) {
    console.log('SENT', data);
}

function getRoster(cb) {
    var iq = $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster'});
    connection.sendIQ(iq, function (iq) {
        //log("Roster received.");
        //log("iq: " + Object.keys(iq.tree()) + " " + htmlEscape(Strophe.getText(iq.tree())));
        rosterReceived(iq);
        cb(iq);
    });
}

function rosterFindID(iq,id) {
    var found = false ;
    loopOverRoster(iq,function(sub,jid,name){
        if ((jid == id) && ((sub == "both")||(sub == "to")))
            found = true ;
    });
    return found;
}

function loopOverRoster(iq,cb) {
    var items = $(iq).find('item');
    //console.log("items:",items);
    items.each(function (i) {
        console.log(i,this);
        var sub = $(this).attr('subscription');        
        var jid = $(this).attr('jid');        
        var name = $(this).attr('name') || jid;
        cb(sub,jid,name);
    });
}

function rosterReceived(iq) {
    //log ("Roster received:");
    console.log("Roster response:",iq);
    loopOverRoster(iq,function(sub,jid,name) {
        //log("> " + sub + ": " + jid) ;
        // if to:, send subscribed message
        if (sub == "to") {
            log ("Sending subscribed for "+jid);
            connection.send($pres({ to: jid, type: "subscribed" }));
        }
    });
        // set up presence handler and send initial presence
    connection.addHandler(on_presence, null, "presence");
    connection.send($pres());
}

function on_presence(presence) {
    console.log("Presence received:",presence);
    //log (Strophe.serialize(presence) );

    var ptype = $(presence).attr('type');
    var from = $(presence).attr('from');

    if (ptype === 'subscribe') {
        log ("Subscribe received from "+from);
        // populate pending_subscriber, the approve-jid span, and
        // open the dialog
        connection.send($pres({ to: from, type: "subscribed" }));
    } else if (ptype !== 'error') {
        if (ptype === 'unavailable') {
            log ("Presence: " + from + " unavailable.");
        } else {
            var show = $(presence).find("show").text();
            if (show === "" || show === "chat") {
                log ("Presence: " + from + " online.");
            } else {
                log ("Presence: " + from + " away.");
            }
        }

    } else {
        log ("Presence error.");
    }

    console.log ("on_presence ended")
    return true;
}

function onSubscriptionRequest(stanza) {
    console.log("Subscription request received:",stanza);
    var from = stanza.getAttribute("from")
    if(stanza.getAttribute("type") == "subscribe")
    {
        // Send a 'subscribed' notification back to accept the incoming
        // subscription request
        connection.send($pres({ to: from, type: "subscribed" }));
    }
    return true;    
}
function onSubscribed(stanza) {
    console.log("Subscribed received:",stanza);
    return true;    
}

function subscribeIfNotInRoster(iq,id) {
    if (!rosterFindID(iq,id)) {
        log(id + " not found in roster, subscribing.");
        console.log(id + " not found in roster.");
        connection.send($pres({ to: id, type: "subscribe" }));
        return false ;
    } else {
        log(id + " found in roster. :)");
        console.log(id + " found in roster.");
        connection.send($pres({ to: id, type: "subscribe" }));
        return true ;
    }
}
function getRosterAndCheck(noretry) {
    // Check to see if gameEngineUser and gameLauncherUser are in roster, otherwise subscribe.
    getRoster(function(iq){
        var ok = false ;
        ok = subscribeIfNotInRoster(iq,gameEngineUser);
        if (userID == docentUser) {
            var ok2 = subscribeIfNotInRoster(iq,gameLauncherUser);
            ok = ok && ok2 ;
            if (ok) {
                sendChat(gameEngineUser,"checkIfLoaded");
                sendChat(gameLauncherUser,"init:");                
            }
        }
        if (!ok & !noretry) {
            setTimeout(function () {
                getRosterAndCheck(true)},100);
        }
        return true ;
    });

}
function onConnect(status)
{
    if (status == Strophe.Status.CONNECTING) {
        setConnectButton('Connecting',true);
        log('Strophe is connecting.');
    } else if (status == Strophe.Status.CONNFAIL) {
        setConnectButton('Connect');
        log('Strophe failed to connect.');
    } else if (status == Strophe.Status.DISCONNECTING) {
        setConnectButton('Disconnecting',true);
        log('Strophe is disconnecting.');
    } else if (status == Strophe.Status.DISCONNECTED) {
        log('Strophe is disconnected.');
        setConnectButton('Connect');
        if (reconnectDelay == 0) {
            xmppConnect();
        }
        else if (reconnectDelay > 0) {
            setTimeout(xmppConnect,reconnectDelay);
        }
    } else if (status == Strophe.Status.CONNECTED) {
        setConnectButton('Disconnect');
        log('Strophe is connected.');
        reconnectDelay=1000 ;

        // Now open the OSC port? Should we check first to see if it's already open?
        if (isPlayer)
            playerController.port.open();

        connection.addHandler(onMessage, null, 'message', null, null,  null); 
        connection.addHandler(onSubscriptionRequest, null, "presence", "subscribe"); // Accept all subscriptions
        connection.addHandler(onSubscribed, null, "presence", "subscribed");
        connection.send($pres().tree());
        getRosterAndCheck();

        //log('Sent '+Object.keys($pres().tree()));

        //var msg = $msg({to: "docent@esc-game-server.local", from: "testandy@esc-game-server.local", type: 'chat'}).cnode("init");
        //connection.send(msg.tree());

    	//connection.disconnect();
    } else if (status == Strophe.Status.AUTHFAIL) {
        setConnectButton('Auth fail',true);
        log('Strophe authorization failed. Attempting to register new player.');
        register();
    }
    else {
        setConnectButton('Status: '+status);
        log('Strophe connection status:' + status);        
        console.log(Strophe.Status);
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

function setCurrentGame(game) {
    currentGame = game ;
    document.getElementById("currentGame").innerHTML = game ;
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
            //loadGame("pixelprisonblues");
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
        setCurrentGame(params.gameId) ;
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
    else if (bodySplit[0] == "registered") {
        // Game controller registered
        // Format:
        //   registered:<ip>,<client index>,<gameID>
        // Example:
        //   registered:192.168.1.200,1,pixelprisonblues
        // Note:IP may depend on the AP/router used to connect to the server
        log("Controller registered.");
        var params = bodySplit[1].split(",");
        serverIP = params[0];
        OSCindex = params[1];
        setCurrentGame(params[2]);

        setCookie("OSCindex",OSCindex,60*60);
        document.getElementById("oscindex").innerHTML = OSCindex ;

        log("Game server IP: "+serverIP+ ", my index: " +OSCindex + ", game loaded: "+currentGame);
        playerController.myOSCindex = OSCindex
    }
    else if (bodySplit[0] == "special") {
        var params = paramStringToObject(bodySplit[1]);
        console.log("special:",params);
        playerController.onMessage("special",params);
    }
    return true ; // If we don't return true, handler won't be called again!
}

// Docent functions
function loadGame(game) {
    sendChat(gameLauncherUser,"command:game="+game+",option=load");
    setCurrentGame(game);
}
function startGame() {
    sendChat(gameLauncherUser,"command:game="+currentGame+",option=start,round=0,difficulty=0");
}
function quitGame() {
    sendChat(gameLauncherUser,"command:game="+currentGame+",option=quit");
    setCurrentGame("");
}
function nextCommand() {
    sendChat(gameEngineUser,"next:");
}

// Player controller functions
function joinGame1() {
    sendChat(gameEngineUser,"special:JoinRequest=true");
}
function joinGame() {
    console.log("Joinging game!");
    // Open when XMPP connection started?
    //playerController.port.open();
    // Send twice.
    joinGame1();
    setTimeout(joinGame1,200);
    // Open the OSC port
}
function shakeToLocate(id) {
    sendChat(gameEngineUser,"special:shakeToLocate="+id);
}
function shakeToLocateN(n) {
    var i ;
    for (i = 0 ; i < n ; i++)
        shakeToLocate(i);
}

function sendChat(to,text,cb) {
    //to = to + "@" + defaultDomain ;
    log("Sending chat message to "+to + ": " );
    log(" > " + text);
    var msg = $msg({to: to , type: 'chat'})
        .cnode(Strophe.xmlElement('body', text)).up();
    connection.send(msg.tree(),cb);
}

function register() {
    log('Registering new player '+userName);
    //https://xmpp.org/extensions/xep-0077.html
    //connection.addHandler(registrationSuccess, null, null, null); 
    setConnectButton('Registering',true);
    registering = true ;
    var iq = $iq({type: 'set'}).c('query', {xmlns: 'jabber:iq:register'});
    iq.c("username").t(userName).up();
    iq.c("password").t(userName).up();
    connection.sendIQ(iq, function (stanza) {
        // Note that I had to fix a bug (feature?) in strophe.js that prevented handlers from getting called if user was not authenticated
        console.log ("register returned ",stanza);
        log("Registration success!",stanza);
        log("Attempting to connect.");
        connection.connect(userID,userName,onConnect);

    }, function (iq) {
        console.log ("register returned error",iq);        
    }
    );
}

function setUserName(id) {
    if (id && (id != "")) {
        // Although names should be able to have mixed case, it doesn't seem to work 
        id = id.toLowerCase();
        // Get rid of some bad characters
        id = id.replace(/[\"\&\'\/\:\<\>\@]/g,"");
        log("Setting user name to "+id)
    }
    userName = id || (userName || defaultUser) ;
    log("User name: "+userName);
    if (id != "docent")
        setCookie("userName",userName,60*60*24*30);
    userID = userName + "@" + defaultDomain ;    
    document.getElementById("jid").value = userName ;
}

var playerController = {};

var connectButton = document.getElementById("connect") ;

function setConnectButton(c,d) {
    connectButton.value = c.toLowerCase();
    connectButton.innerHTML = c; 
    connectButton.disabled = d;
}
function xmppConnect() {
    setConnectButton('Connecting',true);
    connection.connect(userID,userName,onConnect);
}
function xmppDisconnect() {
    setConnectButton('Disconnecting',true);
    connection.disconnect();
}

$(document).ready(function () {
    console.log("document ready in esc.js");
    if ("isDocent" in window && isDocent) {
        isPlayer = false ;
    } else {
        window.isDocent = false ;
        isPlayer = true ;
    }

    Strophe.log = function (level,msg) {
        if (level > 1)
            log("Strophe log level "+level+": "+msg);
    }

    connection = new Strophe.Connection(BOSH_SERVICE);
    connection.rawInput = rawInput;
    connection.rawOutput = rawOutput;

    if (isPlayer) {
        playerController = ppb ;
        playerController.init();
    }

    var cookies = {
        userName: getCookie("userName"),
        playerID: getCookie("playerID"),
        OSCindex: getCookie("OSCindex")
    };
    console.log("Cookies: ",cookies);

    if (isPlayer && (cookies.playerID != "")) {
        playerID = cookies.playerID ;
        playerController.myPlayerID = playerID ;
        document.getElementById("playerid").innerHTML = playerID ;
    }

    if (isPlayer && (cookies.OSCindex != "")) {
        OSCindex = cookies.OSCindex ;
        playerController.myOSCindex = OSCindex
        document.getElementById("oscindex").innerHTML = OSCindex ;
        // We know our OSC player index, so let's open the port in case we lost connection before
        playerController.port.open();
    }

    if ("isDocent" in window && isDocent)
        setUserName("docent");
    else {
        setUserName(cookies.userName);
    }

    connectButton.addEventListener('click', function () {
        if (connectButton.value == 'connect') {
            xmppConnect()
    	} else {
            // Turning off automatic reconnection for manual disconnect
            reconnectDelay=-1 ;
            xmppDisconnect()
        }
    });

    // Let's auto-connect to the xmpp server
    xmppConnect();

    /*
    document.getElementById('sendButton').onclick = function () {
        //log ("sending");
        var to = $('#sendto').get(0).value ;
        var msg = $('#sendmsg').get(0).value ;
        log('Sending message to ' + to + ': ' + msg );
        sendChat(to,msg);        
    };*/
});
console.log("Done loading esc.js");

