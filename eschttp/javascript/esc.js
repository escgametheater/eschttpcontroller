// ESC communication and controller functions
// for both docent and players

// The default ports can be changed via URL parameters, e.g.:
// ?bosh=5281&ws=8886
const BOSH_PORT_PARAM = "bosh";
const WEBSOCKET_PORT_PARAM = "ws";
console.log("Loading esc.js...");


var myDomain = window.location.hostname ;
var myURL = new URL(window.location.href) ;
var myPort = window.location.port ;


// We'll use port 8001 as default for tunneling connections, with different default BOSH & Websocket ports
const DEFAULT_FORWARDED_HTTP_PORT = 8001 ;
const DEFAULT_FORWARDED_BOSH_PORT = 5281 ;
const DEFAULT_FORWARDED_WEBSOCKET_PORT = 8886 ;

var GRAVITY = 9.81 ; // Gravity for accelerometer 

// Default communication layer to use is Unity Websocket for communication to game-engine
var UseOSC = false ;    // Use OSC communication layer for updates
var UseXMPP = false ;   // Use XMPP for communication to game-engine
var ConnectXMPP = true ;   // Connect to XMPP to use XMPP as an alternative for communication FROM game-engine, if the game engine is not built to send all messages using websockets

var BOSH_PORT = 5280 ;
var WEBSOCKET_PORT = 8887 ;

if (myPort == DEFAULT_FORWARDED_HTTP_PORT) {
    BOSH_PORT = DEFAULT_FORWARDED_BOSH_PORT ;
}

var noSleepEnabled = false ;
var noSleep = null;

function tempAlert(msg,duration,left,top)
{
    if (arguments.length < 3)
        left="20%";
    if (arguments.length < 4)
        top="40%";
    var el = document.createElement("div");
    el.setAttribute("style","border-style:solid; border-width:1px; border-color:black;position:absolute;padding:0.5em;top:"+top+";left:"+left+";background-color:white;color:black;z-index:1;");
    el.innerHTML = msg;
    setTimeout(function(){
        el.parentNode.removeChild(el);
    },duration);
    //if (isPlayer)
    //    document.getElementById("controller").appendChild(el);
    //else
        document.body.appendChild(el);
}


// noSleep Must be called from a user input event handler
// so trying caffeine instead
function enableNoSleep() {
    //if (!noSleepEnabled)
        noSleep.enable();
    //caffeine.start();
    //tempAlert("NoSleep enabled.",5000,"80%","10%");
    noSleepEnabled = true ;
}
function disableNoSleep() {
    //if (noSleepEnabled)
        noSleep.disable();
    //tempAlert("NoSleep disabled.",5000,"80%","10%");
    //caffeine.stop(); 
    noSleepEnabled = false ;
}


// For compatibility with old browsers, can't rely on URL having searchParams
// We make use of this library:
// https://www.npmjs.com/package/url-search-params-polyfill
var searchParams = new URLSearchParams(myURL.search);

if (searchParams.has(BOSH_PORT_PARAM)) {
    BOSH_PORT = searchParams.get(BOSH_PORT_PARAM);
}

// More compatibility issues with old browsers that don't have Math.sign!
if (!Math.sign) {
  Math.sign = function(x) {
    // If x is NaN, the result is NaN.
    // If x is -0, the result is -0.
    // If x is +0, the result is +0.
    // If x is negative and not -0, the result is -1.
    // If x is positive and not +0, the result is +1.
    return ((x > 0) - (x < 0)) || +x;
    // A more aesthetical persuado-representation is shown below
    //
    // ( (x > 0) ? 0 : 1 )  // if x is negative then negative one
    //          +           // else (because you cant be both - and +)
    // ( (x < 0) ? 0 : -1 ) // if x is positive then positive one
    //         ||           // if x is 0, -0, or NaN, or not a number,
    //         +x           // Then the result will be x, (or) if x is
    //                      // not a number, then x converts to number
  };
}

var BOSH_SERVICE = 'http://'+myDomain+':' + BOSH_PORT + '/http-bind';
console.log("BOSH service: "+BOSH_SERVICE);

var connection = null;
var oscport = {};

var username = "";

var playerControllers = {none:{}} ;

var isPlayer = true ; // Is this a player or a docent?
// We are using both isPlayer and isDocent in case we extend in future to other types

// XMPP host name
//var xmppDomain = "esc-game-server.local"; // XMPP host name
//if ((myDomain == "esc-andy.local") || (myDomain == "192.168.1.202"))
//    xmppDomain = "esc-andy.local";
xmppDomain = serverHostname;
//tempAlert("xmppDomain: "+serverHostname,5000);


var usernameDocent = "docent";
var usernameGameEngine = "game-engine" ;
var usernameGameLauncher = "game-launcher" ;
var usernameXMPP = "";

var gameIsLoaded = false ;

var presenceStatus = {} ;

var currentGame = "";
var gameList = [];

var serverIP="";

var OSCindex = 0 ; // Set when registered
var playerID = 0 ; // In some games same as OSCindex. Other games set other ways. In PPB set by special:id=<#>
var playerSprite = "" ;

var registering = false ; // To track when we are registering a new username
var reconnectDelay = - 1 ; // Set to 0 to reconnect 

function sendUpdateOSCmsg(msg) {
    // Saving in case there is an error so we can retry
    console.log("Sending OSC message ",msg);
    oscport.lastmessage = msg ;
    oscport.send(msg);
}
function sendUpdateOSC(params,args) {
    var addr = "/" + params.join("/");
    sendUpdateOSCmsg({
        address: addr,
        args: args
    });
}
function sendUpdateWebsocket(params,args) {
    ESCWebsocket.usernamePlayer = username ;
    var values = [] ;
    args.shift();
    args.forEach( function (item, index) {
        values.push(item.value);
    } );
    ESCWebsocket.sendUpdate({keys:params,values:values});    
}
function sendUpdate(params,args) {
    if (UseOSC)
        sendUpdateOSC(params,args);
    else
        sendUpdateWebsocket(params,args);
}


function getRawOSC(msg) {
    // Get a raw OSC-formatted data buffer
    var encoded = oscport.encodeOSC(oscPacket);
    var buf = osc.nativeBuffer(encoded);
    return buf ;
}

// Cookies, to remember the playerID, OSCindex, and username for reconnecting
function setCookie(cname, cvalue, exSeconds) {
    var d = new Date();
    d.setTime(d.getTime() + (exSeconds * 1000));
    var expires = "expires="+d.toUTCString();
    var cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    document.cookie = cookie ;
    console.log("Setting cookie: "+cookie);
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
/*    var tr = document.createElement('tr');
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

    var jqlog = $('#log') ;
*/
    console.log(msg,data);
    return ;
    var elem = document.getElementById("logdiv");
    //console.log("jqlog:",jqlog);
    //console.log("logdiv:",elem);
    var height = elem.offsetHeight ;
    var scrollTop = elem.scrollTop ;
    var scrollHeight = elem.scrollHeight ;
    // Only autoscroll if we're scrolled to the bottom
    var autoscroll =  (scrollTop + height >= scrollHeight) ;
    //console.log("height, scrollHeight, scrollTop",height,scrollHeight,scrollTop);
    //jqlog.append(tr);
    elem.innerHTML += "<br>" + msg; 
    if (autoscroll)
        elem.scrollTop = elem.scrollHeight;
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

function broadcast(msg) {
    log ("Broadcasting message to online roster: "+msg);
    getRoster(function(iq) {
        loopOverRoster(iq,function(sub,jid,name){
            if ((sub === "both")) {
                sendChat(jid,msg);
            }
        });
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

function setPresence(from,show) {
    //console.log("setPresence",from,show);
    var fromSplit = from.split("/");
    var jid = fromSplit[0] ;
    var loc = fromSplit[1] ;                
    if (!(jid in presenceStatus)) {
        presenceStatus[jid] = {} ;
    }
    presenceStatus[jid][loc] = show ;
}
function deletePresence(from) {
    var fromSplit = from.split("/");
    var jid = fromSplit[0] ;
    var loc = fromSplit[1] ;                
    if (jid in presenceStatus) {
        delete presenceStatus[jid][loc] ;
    }
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
            from =  from.split("/")[0];
            if (from ==  usernameGameEngine + "@" + xmppDomain ) {
                console.log("Game exited.");
                if (isPlayer)
                    playerController.onGameExit();
                gameIsLoaded = false ;
            } 

            //setPresence(from,"unavailable");
            deletePresence(from);
        } else {
            var show = $(presence).find("show").text();
            if (show === "" || show === "chat") {
                log ("Presence: " + from + " online.");
                setPresence(from,"online");
            } else {
                log ("Presence: " + from + " away.");
                setPresence(from,"away");
            }
        }
        console.log("New presence",presenceStatus);
    } else {
        log ("Presence error.");
    }

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
    id = id + "@" + xmppDomain ;
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
    // Check to see if gameEngine and gameLauncher are in roster, otherwise subscribe.
    getRoster(function(iq){
        var ok = false ;
        ok = subscribeIfNotInRoster(iq,usernameGameEngine);
        if (isDocent) {
            if (ok)
                sendChat(usernameGameEngine,"checkIfLoaded");
            var ok2 = subscribeIfNotInRoster(iq,usernameGameLauncher);
            ok = ok && ok2 ;
            if (ok ) {
                sendChat(usernameGameLauncher,"init:");                
            }
        } else {
            var ok2 = subscribeIfNotInRoster(iq,usernameDocent);
            ok = ok && ok2 ;
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
        log('Strophe failed to connect. Turning off automatic reconnects until next connection.');
        // Could be caused by attempting to connect a single XMPP user from two devices with the same "location".
        reconnectDelay=-1 ;
        tempAlert('Strophe failed to connect. May be caused by page already running in another window. Turning off automatic reconnects until next connection.',10000);

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
        if (isPlayer && UseOSC) {
            console.log("Opening OSC WebSocket port....");
            oscport.open();
        }

        connection.addHandler(onMessageXMPP, null, 'message', null, null,  null); 
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
    if (game =="")
        game = "none"
    if (currentGame == game)
        return ;
    if ("unloadController" in playerController)
        playerController.unloadController();

    currentGame = game ;

    // load and init playerController for new game
    if (isPlayer) {
        playerController = objectAssign({},PlayerController);
        objectAssign(playerController,playerControllers[currentGame]) ;
        playerController.init();
    }

    document.getElementById("currentGame").innerHTML = game ;
    setCookie("currentGame",currentGame,60*60*24);
    setTimeout(function(){
        // This scrolls a tiny bit to hide the address bar in mobile browsers.
        // It's a bit of a hack but works
        window.scrollTo(0, 100);
    }, 1);


    // should set playerController here
}
function setOSCindex(i) {
    i = parseInt(i);
    if (i == OSCindex)
        return ;
    if (i==NaN)
        return ;
    if (i < 0)
        return ;
    OSCindex = i ;
    //log("OSCindex is "+i);
    setCookie("OSCindex",OSCindex,60*60*24);
    document.getElementById("oscindex").innerHTML = OSCindex ;
}
var pingStart = 0 ;
function oscPing(){
    sendUpdateOSCmsg({
        address: "/ping",
        args: [
            {type: "i",value:1234},
            {type: "f",value:1.23456789}
            ]
    });

}
function oscTest(player,param,value){
    sendUpdateOSCmsg({
        address: "/"+param,
        args: [
            {type: "i",value:player},
            {type: "f",value:value}
            ]
    });
}
function gameListButtons(games) {
    var div = document.getElementById("gamebuttons");
    var i ;
    var html = "Load game: ";
    for (i = 0; i < games.length; i++) {
        var game = games[i];
        html += " <button id='connect' onclick='loadGame(\""+ game +"\")' class='button'>" + game +"</button>";
    }
    div.innerHTML = html ;
}
function onMessageXMPP(msg) {

    console.log("onMessageXMPP",msg);
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
    var messageText = Strophe.getText(body) ;
    var bodyHTML = htmlEscape(messageText);

    log(type + ' message from ' + from + ':' );
    log(" < " + bodyHTML);
    if (type == "error") {
        if (bodyHTML == "checkIfLoaded") {
            // No current game. Let's select one
            log("No current game.");
            gameIsLoaded = false ;
            //loadGame("pixelprisonblues");
        }
        return true ;
    }
    return onEventMessage(messageText);
}
function onEventMessage(message) {

    if (message == "gameLoaded") {
        gameIsLoaded = true ;
        // Game is loaded, OK to send next, etc.
        return true ;
    }
    var bodySplit = message.split(":");
    // Pinging for latency testing, etc.

    if (bodySplit[0] == "ping") {
        console.log("Received "+message+ ", responding with pong.");
        // Return pong with the rest of the body
        sendChat(from,"pong:"+bodySplit[1]);
        return true ;
    }
    if (bodySplit[0] == "pong") {
        log("Ping took "+(Date.now()-pingStart)+ " msec.");
        return true ;
    }
    if (bodySplit[0] == "gamePreviouslyLoaded") {
        gameIsLoaded = true ;
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
        return true ;
    }
    var result;
    // Move some of these to playerController.js ?
    if (bodySplit[0] == "reloadClient") {
        // Docent can tell the clients to all reload. This is helpful during testing of
        // lots of clients, but could be used during a game.
        location.reload();
    }
    else if (bodySplit[0] == "autoplay") {
        // Docent can tell the clients to all start and stop autoplay.
        console.log("Autoplay requested");
        playerController.autoPlay(bodySplit[1]);
    }
    else if (bodySplit[0] == "autoplaystop") {
        // Docent can tell the clients to all start and stop autoplay.
        console.log("autoplaystop requested");
        playerController.autoPlayStop(bodySplit[1]);
    }
    else if (bodySplit[0] == "games") {
        log(">> Games list received");
        var params = paramStringToObject(bodySplit[1]);
        gameList = Object.keys(params);
        gameListButtons(gameList);
        console.log("Games list received:", gameList);
    }
    else if (bodySplit[0] == "registered") {
        // Game controller registered
        // Format:
        //   registered:<ip>,<client index>,<gameID>
        // Example:
        //   registered:192.168.1.200,1,pixelprisonblues
        // Note:IP may depend on the AP/router used to connect to the server
        // This should be changed in the future. We don't need serverIP. OSCindex
        // is now playerIndex. Other than displaying our playerIndex, we shouldn't need it,
        // as the server knows it. It's really an internal index on the game engine, and not
        // necessarily the on-screen identifier. A game might want to display a nickname or avatar instead.
        // We do need to know the current game, and optionally other game state information from the server.
        var params = bodySplit[1].split(",");
        serverIP = params[0];
        setOSCindex(params[1]);
        setCurrentGame(params[2]);
        console.log("Controller registered, IP: "+serverIP+" OSCindex: "+OSCindex + " current game: "+currentGame);

        // We shouldn't need this in the future. Server does not need our IP address (it already has it, doesn't it?)
        // Game should register us when it sent the registered message instead of waiting for our response.
        sendChat(usernameGameEngine,"registered:"+myIP);

        console.log("Game server IP: "+serverIP+ ", my index: " +OSCindex + ", game loaded: "+currentGame);

        playerController.onRegistered();
    }
    else if (bodySplit[0] == "special") {
        var params = paramStringToObject(bodySplit[1]);
        console.log("special:",params);
        playerController.onMessage("special",params);
    }
    else {
        var params = {} ;
        if (bodySplit[1]) {
            params = paramStringToObject(bodySplit[1]);
        }
        console.log(bodySplit[0]+":",params);
        if (isPlayer)
            playerController.onMessage(bodySplit[0],params);
    }
    return true ; // If we don't return true, handler won't be called again!
}

// Docent functions
function loadGame(game) {
    sendChat(usernameGameLauncher,"command:game="+game+",option=load");
    setCurrentGame(game);
}
function startGame() {
    sendChat(usernameGameLauncher,"command:game="+currentGame+",option=start,round=0,difficulty=0");
    ESCWebsocket.sendStart(currentGame);
}
function quitGame() {
    sendChat(usernameGameLauncher,"command:game="+currentGame+",option=quit");
    setCurrentGame("none");
}
function nextCommand() {
    sendChat(usernameGameEngine,"next:");
}

// Player controller functions

function sendChatXMPP(to,text,cb) {
    if (to.indexOf("@")<0)
        to = to + "@" + xmppDomain ;
    console.log("Sending chat message to "+to + ": " );
    console.log(" > " + text);
    var msg = $msg({to: to , type: 'chat'})
        .cnode(Strophe.xmlElement('body', text)).up();
    connection.send(msg.tree(),cb);
}
function sendChat(to,text) {

    if (UseXMPP || to !==usernameGameEngine) {
        sendChatXMPP(to,text);
    }
    else {
        ESCWebsocket.setUsername(username);
        ESCWebsocket.doSend('e'+text);
        return ;
    }

}
function sendPing(to,text) {
    pingStart = Date.now();
    sendChat(to,text);
}
function register() {
    log('Registering new player '+username);
    //https://xmpp.org/extensions/xep-0077.html
    //connection.addHandler(registrationSuccess, null, null, null); 
    setConnectButton('Registering',true);
    registering = true ;
    var iq = $iq({type: 'set'}).c('query', {xmlns: 'jabber:iq:register'});
    iq.c("username").t(username).up();
    iq.c("password").t(username).up();
    connection.sendIQ(iq, function (stanza) {
        // Note that I had to fix a bug (feature?) in strophe.js that prevented handlers from getting called if user was not authenticated
        console.log ("register returned ",stanza);
        log("Registration success! "+stanza);
        log("Attempting to connect.");
        setTimeout(function () {
            connection.connect(usernameXMPP,username,onConnect);
        },100);

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

    var defaultUser = "p"+Date.now();
    if (isPlayer) {
        if (myIP != "0.0.0.0")
            defaultUser == "p"+myIP.split(".")[3]+"_"+Date.now();
    }
    username = id || (username || defaultUser) ;
    console.log("User name: "+username);
    if (id != "docent")
        setCookie("username",username,60*60*24*30);
    usernameXMPP = username + "@" + xmppDomain ;
    document.getElementById("jid").value = username ;
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
    // If we don't specify the resource part of the ID, there will be a random number assigned as a resource each
    // connection. When the page is reloaded a new resource will be assigned and, after a delay, an "unavailable"
    // presence will be sent for the user at the old resource. This can cause disconnects from the game server.
    // To avoid that, specify a resource that doesn't change when the page is reloaded. The resource could be
    // something machine-specific like IP address, but then you could have disconnects when you switch devices.
    // However, you can only have one active session per username per location, XMPP will refuse a second connection.



    //connection.connect(userID+"/"+myIP,username,onConnect);
    connection.connect(usernameXMPP+"/esc",username,onConnect);
}
function xmppDisconnect() {
    setConnectButton('Disconnecting',true);
    connection.disconnect();
}


//var acc = {x:0,y:0,z:0} ;
var accNotAvailable = true ; // Assume it's not available. Some browsers might have window.DeviceMotionEvent but no accceleromter and no events getting fired
var accInterval = 0 ;
var shakeThreshold = 1.5 * 9.8;
var shakeDetected = 0 ;
var shakeTimeout = 0; // For tracking shake 
var shakeTimeoutPeriod = 500 ; // milliseconds that shakeDetected will be 1 after a shake

function accelerometerHandler(e) {
    // Some devices only have accelerationIncludingGravity, no gyro,
    // so try to only use accelerationIncludingGravity.
    var acc = e.accelerationIncludingGravity ;
    if (accInterval === 0) {
        log("Acc interval: " + e.interval )
    }
    accInterval = e.interval ;
    //console.log("Acc",e);
    if (acc && (acc.x != null)) {
        if (accNotAvailable) {
            accNotAvailable = false ;
            tempAlert("Accelerometer is now available.",2000);
            console.log("Accelerometer is now available.",e);

        }
        var mag2 = acc.x*acc.x + acc.y*acc.y + acc.z*acc.z ;
        if (mag2 > shakeThreshold*shakeThreshold) {
            if (!shakeDetected) {
                //log("Shaking!")
                playerController.onShake();
            }
            shakeDetected = 1 ;
            //if (shakeTimeout)
            //    clearTimeout(shakeTimeout);
            shakeTimeout = setTimeout(function () {
                //log("Shaking stopped!")
                shakeDetected = 0 ;
            },shakeTimeoutPeriod);

        }
        if (!playerController.autoPlayActive)
            playerController.accelerometerHandler(e);
        //log(acc.x + " " + acc.y + " " + acc.z);
        //if (acc.x*acc)
    } else {
        if (accNotAvailable === false) {
            console.log("Accelerometer not available on this device. Control with taps, swipes, or keyboard.");
            tempAlert("Accelerometer not available on this device. Control with taps, swipes, or keyboard.",2000);
        }
        accNotAvailable = true ;
    }
}


// For older browsers

function objectAssign(obj1,obj2) {
    if (Object.assign !== undefined) {
        return Object.assign(obj1,obj2);
    }
    else {
        log ("objectAssign");
        for (var p in obj2) { obj1[p] = obj2[p]; }
        return obj1 ;
    }
} 

var touchAvailable = true ;

$(document).ready(function () {
    console.log("document.ready() in esc.js");
    tempAlert("Game loading.",3000,"0%","5%");
    //console.log(String.prototype.startsWith);
    //console.log(String.prototype.match);
    touchAvailable = ('ontouchstart' in document.documentElement) ;
    console.log("Are touch events available? "+touchAvailable);

    // Allow default websocket port to be changed by URL parameters
    if (searchParams.has(WEBSOCKET_PORT_PARAM)) {
        ESCWebsocket.port = searchParams.get(WEBSOCKET_PORT_PARAM);
    }
    else if (myPort == DEFAULT_FORWARDED_HTTP_PORT) { // Different default based on port, 8001 default for SSH port forwarding
        ESCWebsocket.port = DEFAULT_FORWARDED_WEBSOCKET_PORT ;
    }
    else {
        ESCWebsocket.port = WEBSOCKET_PORT ;
    }
 
    ESCWebsocket.uri = "ws://" +myDomain+ ":" + ESCWebsocket.port ;
    console.log("WebSocket URI: "+ESCWebsocket.uri);

    ESCWebsocket.onConnected = function () {
        if (!UseXMPP) {
            ESCWebsocket.setUsername(username);
        }
    }

    if ("isDocent" in window && isDocent) {
        isPlayer = false ;
    } else {
        window.isDocent = false ;
        isPlayer = true ;
        if (window.DeviceMotionEvent === undefined) {
            accNotAvailable = true ;
            tempAlert("Accelerometer not available on this device. Control with buttons, swipes, or keys.",3000,"25%","25%");
            log("Accelerometer not available on this device. Control with buttons, swipes, or keys.")
        }
        else {
            log("window.DeviceMotionEvent available.")
            window.ondevicemotion = accelerometerHandler;
            setTimeout(function () {
                if (accNotAvailable) {
                    tempAlert("Accelerometer not available on this device. Control with buttons, swipes, or keys.",3000,"25%","25%");
                    log("Accelerometer not available on this device. Control with buttons, swipes, or keys.")
                }
            },1000);
        }

    }
    if (isPlayer) noSleep = new NoSleep();

    Strophe.log = function (level,msg) {
        if (level > 1)
            log("Strophe log level "+level+": "+msg);
    }

    connection = new Strophe.Connection(BOSH_SERVICE);
    connection.rawInput = rawInput;
    connection.rawOutput = rawOutput;

    if (isPlayer) {

        // Set up OSC websocket port, but don't open.
        // Connects to a server at the domain name this page was served from
        // Server needs to have running a simple relay listening on this port
        // and forwarding to the game engine
        // OSC relay server is at 
        // ~/escosc/index.js
        // Simply need to run:
        // node ~/escosc/index.js
        // (perhaps run as a daemon using launchd?)
        oscport = new osc.WebSocketPort({
            url: "ws://" + window.location.hostname + ":8081"
        });

        oscport.lastmessage = false ;
        oscport.reconnectDelayMin = 25 ;
        oscport.on("message", function (oscMessage) {
            // Should never get a message
            console.log("OSC message received!", oscMessage);
        });

        oscport.on("error", function (err) {
            console.log("OSC port error!", err);

            if (err.search("closed osc.Port object.") >= 0) {
                console.log("Attempting to send to closed OSC port.");
                // Trying to send on a closed port. Let's reconnect, if we're not already waiting for a reconnect
                if (!oscport.reconnectTimeout) {
                    // Keep track of reconnects
                    console.log("Attempting to reconect to OSC port");
                    oscport.reconnectTimeout = setTimeout(function () {
                        // Clear the way for another reconnect attempt
                        oscport.reconnectTimeout = false ;
                        // every error increase reconnection delay
                        oscport.reconnectDelay = oscport.reconnectDelay * 2 ;
                        // Let's reconnect
                        oscport.open();

                    },oscport.reconnectDelay);
                }
            }
        });

        oscport.on("open", function (msg) {
            console.log("OSC port open!", msg);
            //console.log("Last OSC message: ", oscport.lastmessage);
            // Let's resend the last message
            if (oscport.lastmessage)  {
                console.log("Resending last OSC update",oscport.lastmessage)
                sendUpdateOSCmsg(oscport.lastmessage) ;
            }

            oscport.reconnectDelay = oscport.reconnectDelayMin ;
            oscport.reconnectTimeout = false ;
        });
        oscport.on("close", function (oscMessage) {
            console.log("OSC port closed!", oscMessage);
            console.log("Attempting to reopen OSC port in " + (oscport.reconnectDelay/1000) + " seconds...");

            oscport.reconnectTimeout = setTimeout(function () {
                oscport.reconnectTimeout = false ;
                oscport.open();
            },1000);

        });

        // Wait until XMPP connection
        //oscport.open();

    }

    var cookies = {
        username: getCookie("username"),
        playerID: getCookie("playerID"),
        OSCindex: getCookie("OSCindex"),
        currentGame: getCookie("currentGame")
    };
    console.log("Cookies: ",cookies);
    if (cookies.currentGame != "") {
        setCurrentGame(cookies.currentGame);
    }
    if (currentGame == "") {
        setCurrentGame("none");
    }
    if (currentGame == "none") {
        //setCurrentGame("robotbasketballpro");
        setCurrentGame("robotbasketballpro");
    }

    if (isPlayer && searchParams.has("p")) {
        playerController.setPlayerID(parseInt(searchParams.get("p")));
        console.log("Setting playerID to URL param: "+parseInt(searchParams.get("p")));
    }
    else if (isPlayer && (cookies.playerID != "")) {
        playerController.setPlayerID(parseInt(cookies.playerID));
    }

    if (isPlayer && (cookies.OSCindex != "")) {
        setOSCindex(cookies.OSCindex);
        // We know our OSC player index, so let's open the port in case we lost connection before
        console.log("Opening OSC WebSocket port.");
        oscport.open();
    }


    if ("isDocent" in window && isDocent)
        setUserName("docent");
    else {
        if (isPlayer && searchParams.has("u"))
            setUserName(searchParams.get("u"));
        else
            setUserName(cookies.username);
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

    // Let's auto-connect to the xmpp server if we are using XMPP
    if (ConnectXMPP || UseXMPP || isDocent) {
        xmppConnect();
    }

    // Connect to Websocket connection
    ESCWebsocket.init();
    tempAlert("Websocket initialized.",3000,"0%","15%");

    /*
    document.getElementById('sendButton').onclick = function () {
        //log ("sending");
        var to = $('#sendto').get(0).value ;
        var msg = $('#sendmsg').get(0).value ;
        log('Sending message to ' + to + ': ' + msg );
        sendChat(to,msg);        
    };*/
    if (isPlayer) {
        window.addEventListener("orientationchange", function() {
            console.log("orientationchange");
            playerController.redrawController();
        }, false);
        window.addEventListener("resize", function() {
            console.log("resize");
            playerController.redrawController();
        }, false);
        playerController.redrawController();
    }
});


console.log("Done loading esc.js");

