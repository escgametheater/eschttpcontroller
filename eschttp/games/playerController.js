console.log("Loading playerController.js");

var PlayerController = {
    debugMode: true,

    controllerName: "Generic controller",
    teamColors: ["aqua","red"],
    teamTextColors: ["white","white"],
    teamNames: ["Team 1","Team 2"],
    escBackgroundImage: "url('games/images/LB-001-logo.png')",
    autojoin: true ,
    gameState: "",
    gamemenu: "",
    desiredOrientation: "landscape",
    orientation: -90,
    width: 960,
    height: 540,
    teamidReceived: -1 ,
    autoPlayActive: false ,
    autoPlayStats: {
        count: 0 ,
        startTime: 0
    },
    joinGame: function() {
        log("Join game not implemented!");
    },
    onShake: function() {
        log("Shaking!");
        tempAlert("Shaken!",2000);
        playerController.shakeToLocate(playerID);
    },
    shakeToLocate: function(id) {
        enableNoSleep();
        sendChat(usernameGameEngine,"Shake:");
    },
    locateButtonHTML: function () {
        return "<button id='locate' onclick='playerController.shakeToLocate(playerID)' style='font-size:3vw'>Locate Me</button>";
    },
    nosleepButtonHTML: function () {
        return "<button id='nosleep' onclick='enableNoSleep()' style='font-size:3vw'>Prevent sleep</button>";
    },
    addDiv: function(x,y,id,html) {
        var div = document.getElementById(id) ;
        if (!div) {
            div = document.createElement("div");
            div.id = id ;
            document.getElementById("controller").appendChild(div);
            //document.body.appendChild(div);
        }
        div.innerHTML = html;
        div.style.position = "fixed" ;
        div.style.align = "center" ;
        div.style.top = y ;
        div.style.left = x ;
        console.log("addDiv called", arguments);
    },
    addLocateButton: function(x,y) {
        console.log("addLocateButton called",arguments);
        playerController.addDiv(x,y,"locatediv",playerController.locateButtonHTML());
    },
    addNoSleepButton: function(x,y) {
        playerController.addDiv(x,y,"nosleepdiv",playerController.nosleepButtonHTML());
    },
    accelerometerHandler: function(e) {
        // Called after shake detection
        return ;
    },
    touchstartHandler: function(evt) {
    },
    autoPlay: function(t) {
        playerController.autoPlayStop();
        if (t === undefined)
            t = 33 ;
        playerController.autoPlayActive = true ;
        playerController.automoves('lrluduruldurudlrudlurldurlduludlruldluddruldrluruldlur',t,0);
    },
    automoves: function(moveString,msdelay, index) {
        // cycle through the moves in moveString, once every delay milliseconds, starting at index
        playerController.autoPlayStats.count ++ ;
        if ((playerController.autoPlayStats.count % 1000) === 0) {
            var t = (Date.now() - playerController.autoPlayStats.startTime) / 1000 ;
            tempAlert("autoPlay moves per second: "+(playerController.autoPlayStats.count/t),5000,"50%","70%");
        }

        index = index % moveString.length ;
        var c = moveString.charAt(index) ;
        if (c==="p") {
            if (UseXMPP)
                sendPing(usernameGameEngine,"Autoplay Ping.");
            else
                ESCWebsocket.ping("Autoplay Ping.");
        }
        else
            playerController.go(c);
        index ++ ;
        if (playerController.autoPlayActive) {
            playerController.automovesTimeout = setTimeout(function () {
                playerController.automoves(moveString,msdelay,index);
            },msdelay);
        }
    },
    automovesTimeout: null ,
    autoPlayStop: function () {
        playerController.autoPlayActive = false ;
        if (playerController.automovesTimeout !== null) {
            clearTimeout(playerController.automovesTimeout);
            playerController.automovesTimeout = null ;
        }
    },

    go: function(c) {
        console.log("go("+c+")");
        var elemIDs = {u:"up",d:"down",l:"left",r:"right",n:"neutral"};
        log("go('"+c+"') not implemented");
        var el = document.getElementById(elemIDs[c]);
        if (el != undefined) {
            el.style.background= "#4CAF50";
            setTimeout(function(){el.style.background=null;},200);
        }
        return true;
    },
    handleKeyArrows: function(event) {
        if ((event.keyCode < 37)||(event.keyCode > 40))
            return false ;
        if(event.keyCode == 37) {playerController.go("l");}
        else if(event.keyCode == 39) {playerController.go("r");}
        else if(event.keyCode == 38) {playerController.go("u");}
        else if(event.keyCode == 40) {playerController.go("d");}
        return true ;
    },
    handleKey: function(event) {
        oscport.reconnectDelay = oscport.reconnectDelayMin ;
        if (playerController.handleKeyArrows(event)) {
            return true ;
        }
        else if(event.key == "o") {playerController.go("n");}
        else if(event.key == "n") {playerController.go("n");}
        else if(event.key == "0") {playerController.go("n");}
        else if(event.key == " ") {playerController.go("n");}
        return true;
    },
    init: function() {
        // create the controller interface
        //playerController.renderController();
        playerController.addEventListeners();
        playerController.loadSavedState();
    },
    addEventListeners: function() {
        // Add event listeners for touch events, key events, accelerometer
        //Swipe.addEventListeners();
        //this.addSwipeHandler();
        document.addEventListener('keydown', playerController.handleKey);
        //document.addEventListener('touchstart', playerController.touchstartHandler);
    },
    addSwipeHandler: function() {
        window.handleSwipe = function(dir,lastdir) {
            enableNoSleep();
            log("window.handleSwipe()")
            // User is swiping, try to reconnect immediately if there is an error
            oscport.reconnectDelay = oscport.reconnectDelayMin ;
            if (dir!=lastdir) {
                playerController.go(dir);
            }
            //log("Detected swipe, direction "+dir+" last dir " + lastdir);
        }
    },
    setPlayerID: function(id) {
        playerID = id ;
        document.getElementById("playerid").innerHTML = playerID ;
        setCookie("playerID",playerID,60*60*24);
    },
    setTeamID: function(t) {
        if ("teamid" in playerController) {
            playerController.teamid = t ;
            document.getElementById("team").innerHTML = "Team: " + t ;
            setCookie("teamid",t,60*60*24);
        }
    },
    loadSavedState: function () {
        // Cookies to save state in case of disconnection and reconnection
        // This will only work for reconnecting the same browser,
        // If we want to allow reconnection from a different device we need to save the data to a server
        var cookies = {
            teamid: parseInt(getCookie("teamid"))
        }
        console.log("playerController Cookies: ",cookies);
        if (cookies.teamid !== NaN) {
            playerController.setTeamID(cookies.teamid);
        }

    },
    sentInit: false ,
    onRegisterColor: function() {
        if (playerController.gameState == "gamemenu") {
            console.log("onRegisterColor called, but game already active. Ignoring.");
            return ;
        }
        if (playerController.teamidReceived >= 1) {
            console.log("onRegisterColor called, but team already set. Ignoring.");
            return ;
        }
        if (playerController.gameState == "registercolor") {
            console.log("onRegisterColor called, but game already in registercolor state. Ignoring.");
            return ;
        }
        playerController.sentInit = false ;
        playerController.gameState = "registercolor" ;
        playerController.redrawController();
        sendChat(usernameGameEngine,"Swipe (0.0, 0.0):"); // Pretend to pick a team
        if (playerController.teamid > 0) {
            playerController.selectTeamID(playerController.teamid);
        }
        else {
            var randomTeam = 1 ;
            if (Math.random()>=0.5)
                randomTeam = 2 ;
            console.log("Randomly picked team " + randomTeam);
            tempAlert("Randomly picked team " + randomTeam);
            playerController.selectTeamID(randomTeam);
        }

        //console.log(document.getElementById("controller"));
        return true ;
    },
    chooseTeamButtons: function (){
        console.log("chooseTeamButtons()");
        var margin = 0.2*playerController.height ;
        var marginpx = margin + "px";
        var width = (playerController.width - 2*margin)/2 + "px" ;
        var height = (playerController.height -2*margin) + "px" ;
        return "<table style='width: 100%; margin-top:"+marginpx +"'><tr style='height: "+ playerController.height + "px;'>"+
            "<td style='text-align:center; height:100%; vertical-align: middle;'>"+
            "<button id=leftbutton style='font-size:6vw; background-color:"+playerController.teamColors[0]+
            "; color:white; width:"+width+"; height:"+height+"; margin:0 0; padding:0 0; border:0;' onclick=playerController.selectTeamID(1)>"+
            playerController.teamNames[0]+"</button>"+
            "<button id=rightbutton style='font-size:6vw; background-color:"+playerController.teamColors[1]+
            "; color:white; width:"+width+"; height:"+height+"; margin:0 0; padding:0 0; border:0; ' onclick=playerController.selectTeamID(2)>"+
            playerController.teamNames[1]+"</button>"+
            "</td></tr></table>";
    },
    controllerSetup: function () {
        var controller = document.getElementById("controller") ;
        var clientWidth = document.documentElement.clientWidth ;
        var clientHeight = document.documentElement.clientHeight ;
        var vw = clientWidth ;
        var vh = clientHeight ;
        var mobileScreen = false ;
        var detectedOrientation = "portrait" ;
        //alert (vw + "x" + vh + " " + window.screen.width + "x" + window.screen.height);

        // If it's probably a mobile device, let's use the whole screen for cacluclating size
        if (window.screen.width == vw) {
        // Probably  mobile, held in portrait
            mobileScreen = true ;
            vh = window.screen.height ;
        } else if (window.screen.width < vw) {
            // Probably mobile, held in landscape mode. Swap vw and vh
            vw = window.screen.height ;
            vh = window.screen.width ;
            mobileScreen = true ;
        }
        if  (vw>vh)
            detectedOrientation = "landscape" ;
        var notFullScreen = clientHeight < vh *0.95 ;
        var vmin = vw > vh ? vh : vw;
        var vmax = vw > vh ? vw : vh;

        controller.style.position = "fixed" ;
        controller.style.top = "0" ;
        controller.style.left = "0" ;

        controller.style.fontSize = "" + (vw/20).toFixed(0) + "px";

        var rotateme = document.getElementById("rotateme") ;
        if (mobileScreen &&  notFullScreen && playerController.desiredOrientation == detectedOrientation) {
            // Not full screen, indicate to usr to swipe to go full screen
            document.getElementById("gofullscreen").style.visibility = "visible";
            //tempAlert("Swipe up to go full screen.",5000,"80%","10%");
        }
        else
            document.getElementById("gofullscreen").style.visibility = "hidden";

        if (playerController.desiredOrientation === "landscape") {
            // controller is going to be full width
            controller.style.right = "0" ;
            var h = 100*vmin/vmax ;
            controller.style.height = "" + h +"vw" ;
            playerController.width = vw ;
            playerController.height = h/100*vw;

            if (vw<vh) {
                rotateme.style.top = "" + 1.1*h +"vw" ;
                rotateme.style.visibility = "visible" ;
            }
            else
                rotateme.style.visibility = "hidden" ;
        }
        else {
            controller.style.height = vh ;
            var w = 100*vmin/vmax*vh/document.documentElement.clientHeight ;
            controller.style.width = "" + w +"vh" ;
            playerController.height = vh;
            playerController.width = w/100*vh;
            if (vw>vh) {
                rotateme.style.left = "" +  1.1*w + "vh" ;
                rotateme.style.visibility = "visible" ;
            }
            else
                rotateme.style.visibility = "collapse" ;
        }

        controller.style.align = "center" ;
        controller.style.fontFamily="Impact";
        controller.style.color = playerController.teamTextColors[i];

        var i = playerController.teamid - 1 ;
        if (playerController.gameState === "") {
            controller.style.backgroundColor = "black";
            controller.style.backgroundImage = playerController.escBackgroundImage ;
            controller.style.backgroundRepeat = "no-repeat" ;
            controller.style.backgroundPosition = "center" ;
            if (playerController.desiredOrientation === "landscape")
                controller.style.backgroundSize = playerController.height*0.75+"px" ;
            else
                controller.style.backgroundSize = playerController.width*0.75+"px" ;
        }
        else if (playerController.backgroundImage) {
            controller.style.backgroundImage = playerController.backgroundImage ;
            controller.style.backgroundRepeat = "no-repeat" ;
            controller.style.backgroundPosition = "center" ;
            controller.style.backgroundSize = "cover" ;
        }
        else {
            controller.style.backgroundImage = "none" ;
            if (i >= 0 && i < playerController.teamColors.length) {
                controller.style.backgroundColor = playerController.teamColors[i];
            } else {
                controller.style.backgroundColor = "black";
                controller.style.color = "white";
            }
        }
    },
    showTeamChoice: function() {
        var t = playerController.teamid ;
        if (t > 0) {
            var ids = ["leftbutton" , "rightbutton"] ;
            var selectedButton = document.getElementById(ids[t-1]) ;
            selectedButton.innerHTML = "JOINED!" ;
            selectedButton.style.opacity = "1.0" ;
            var otherButton = document.getElementById(ids[2-t]) ;
            otherButton.innerHTML = "Switch team" ;
            otherButton.style.opacity = "0.85" ;
        }

    },
    selectTeamID: function (t) {
        enableNoSleep();
        if (playerController.gameState == "registercolor")
            sendChat(usernameGameEngine,"Swipe (0.0, 0.0):");
        playerController.setTeamID(t);
        console.log("Team chosen: "+t);
        playerController.showTeamChoice();
        if (playerController.gameState != "registercolor")
            playerController.sendTeamID();
    },
    sendTeamID: function() {
        if (playerController.teamid <= 0)
            return ;
        playerController.teamidSent = true ;
        sendChat(usernameGameEngine,"squadPref"+playerController.teamid+":");
    },
    onRegistered: function() {
        console.log("onRegistered");
        playerController.gameState = "registered";
        playerController.controllerSetup();
        var controller = document.getElementById("controller") ;
        //console.log("Font size: " + controller.style.fontSize);
        if (!playerController.backgroundImage)
            controller.innerHTML = "Welcome to " + playerController.controllerName;
        else
            controller.innerHTML = "";
        //tempAlert("Welcome to "+ playerController.controllerName,5000);
        console.log("gameState now "+playerController.gameState);
    },
    onCollectSquadChoice: function() {
        enableNoSleep();
        playerController.gameState = "collectsquadchoice";
        console.log("onCollectSquadChoice, teamid = " + playerController.teamid );
        if (playerController.teamid > 0) {
            playerController.sendTeamID();
            playerController.showGameController();
        }
        return true ;
    },
    redrawController: function() {
        console.log("redraw, state is '" +playerController.gameState +"'");
        if (playerController.gameState === "registered" || playerController.gameState === "collectsquadchoice" || playerController.gameState === "gamemenu") {
            playerController.showGameController();
        }
        else if (playerController.gameState === "registercolor") {
            playerController.controllerSetup();
            document.getElementById("controller").innerHTML = playerController.chooseTeamButtons();
            playerController.showTeamChoice();
            //playerController.addLocateButton("5vw","5vw");
        }
        else if (playerController.gameState === "") {
            playerController.controllerSetup();
            var controller = document.getElementById("controller") ;
            controller.innerHTML="";
        }
        else {
            playerController.controllerSetup();
        }
    },
    onGameMenu: function(msg) {
        enableNoSleep();
        playerController.gameState = "gamemenu";
        playerController.gamemenu = msg.substring("gamemenu;".length);
        playerController.showGameController();
        return true ;
    },
    onUImessage: function(msg) {
        if (msg == "uimessage;GAME ALREADY STARTED;PLEASE WAIT FOR NEXT GAME;") {
            tempAlert("Game in progress. Please wait until next game to play.",20000);
            playerController.gameState = "gameEnd" ;
            playerController.teamidReceived = -1 ;
            return true ;
        }
        return true ;
    },
    onRequestVote: function() {
        playerController.gameState = "requestvote";
        tempAlert("Thanks for playing!",5000);
        // TODO: Voting screen
        return true ;
    },
    onGameExit: function() {
        //disableNoSleep();
        tempAlert("Game engine exited.",5000);
        playerController.teamidReceived = -1 ;
        playerController.gameState = "";
        playerController.redrawController();

        // TODO: Change controller screen
        return true ;
    },
    onMessage: function (ev,params) {
        console.log("onMessage: "+ev);
        if (result = ev.match(/^playerID(.*)/)) {
            // robotbasketballpro sets playerID this way, probably others too
            if (!playerController.sentInit)
                playerController.setPlayerID(parseInt(result[1]));
            return true ;
        }
        if (result = ev.match(/^team(.*)/)) {
            playerController.teamidReceived = result[1];
            // robotbasketballpro sets team this way, probably others too
            playerController.setTeamID(result[1]);
            playerController.renderController();
            if (!playerController.sentInit) {
                sendChat(usernameGameEngine,"init:team=1"); // Must send this confirmation. Team = 1 no matter what
                playerController.sentInit = true ;
            }
            return true ;
        }
        if (ev === "gameEnd") {
            playerController.teamidReceived = -1 ;
            if (playerController.gameState == "registercolor" ) {
                playerController.gameState = "gameEnd" ;
                tempAlert("Game in progress. Please wait until next game to play.",20000);
            }
            else {
                tempAlert("Game ended. Let's play again!",2000);
                playerController.gameState = "gameEnd" ;
            }
            return true ;
        }
        if (ev === "gameStart") {
            enableNoSleep();
            tempAlert("Game Starting!",2000);
            playerController.gameState = ev ;
            return true ;
        }

        var prefix = "UIMenu; " ;
        if (ev.startsWith(prefix)) {
            console.log(prefix);
            var uev = ev.substring(prefix.length);
            var s = uev.split(";");
            var state = s[0];

            //playerController.gameState = state ;
            console.log("Game state: '"+playerController.gameState+"' -> '"+ state +"'");
            tempAlert("Game state: '"+playerController.gameState+"' -> '"+ state +"'",3000,"50%","90%");
            if (state == "registercolor")
                return playerController.onRegisterColor();
            if (state == "collectsquadchoice")
                return playerController.onCollectSquadChoice();
            if (state == "gamemenu")
                return playerController.onGameMenu(uev);
            if (state == "uimessage")
                return playerController.onUImessage(uev);
            if (state == "requestvote")
                return playerController.onRequestVote(uev);
            tempAlert("Game state: '"+playerController.gameState+"' -> '"+ state +"' x",3000,"50%","90%");
        }
        return false ;
    },
    addJoystick: function(x,y,d) {
        // x and y are left/top in fraction of controller width/height

        var controller = document.getElementById("controller") ;
        var div = document.getElementById("joystick") ;

        if (!div) {
            div = document.createElement("div");
            div.id = "joystick" ;
            controller.appendChild(div);
        }

        var controllerStyle = window.getComputedStyle(controller) ;
        console.log(controllerStyle);

        // Calculate sizes in pixels
        var pw = parseFloat(controllerStyle.width) ;
        var ph = parseFloat(controllerStyle.height) ;
        var pmin = pw < ph ? pw : ph ;
        var pd = d * pmin ;

        var top = (ph-pd)*y;
        var left = (pw-pd)*x;

        var buttonwidth = pd/3 ;

        div.style.position = "fixed" ;
        div.style.top = "" + top+"px" ;
        div.style.left = "" + left+"px" ;
        var buttonTexts = ["Left","Right","Up","Down","O"];
        var buttonChars = ["l","r","u","d","n"];
        var buttonLocs = [[0,1],[2,1],[1,0],[1,2],[1,1]];
        var buttons = [] ;
        var i ;
        for (i = 0 ; i < buttonLocs.length ; i++) {
            buttons[i] = document.getElementById("joystick"+i) ;
            if (!buttons[i]) {
                buttons[i] = document.createElement("button");
                buttons[i].appendChild(document.createTextNode(buttonTexts[i]));
                div.appendChild(buttons[i]);
                buttons[i].id = "joystick"+i ;
            }
            buttons[i].style.position="absolute";
            buttons[i].style.top = "" + buttonLocs[i][1]*buttonwidth + "px" ;
            buttons[i].style.left = "" + buttonLocs[i][0]*buttonwidth + "px" ;
            buttons[i].style.height = "" +0.95*buttonwidth + "px" ;
            buttons[i].style.width = "" +0.95*buttonwidth + "px" ;
            buttons[i].onclick=function(c){return function() {playerController.go(c);}}(buttonChars[i]);
        }
        console.log(div);
    },
    joystickHTML: "<div id=joystick style='position:fixed; right:0; bottom:0; height:50vh; width:50vh; align:center;'><table style='position:absolute;right:0%;bottom:0%;align:center;' >\
    <tr><td></td><td><button id=up class=dir onclick=\"playerController.go('u')\">Up</button></td><td></td></tr>\
    <tr><td><button id=left class=dir onclick=\"playerController.go('l')\">Left</button></td><td><button id=neutral class=dir onclick=\"playerController.go('n')\">O</button></td><td><button id=right class=dir onclick=\"playerController.go('r')\">Right</button></td></tr>\
    <tr><td></td><td><button class=dir id=down onclick=\"playerController.go('d')\">Down</button></td><td></td></tr>\
</table></div>" ,
    autoPlayButtonsHTML: "<button class='button' onclick =\"playerController.autoPlay()\">Autoplay</button>\
<button class='button' onclick='autoPlayStop()'>Stop</button>",

    renderController: function () {
        document.getElementById("controller").innerHTML = playerController.autoPlayButtonsHTML +  playerController.joystickHTML ;
    },
    unloadController: function () {
    }

}

function requestFullScreen(element) {
  // Supports most browsers and their versions.
  var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullScreen;
  if (requestMethod) { // Native full screen.
    requestMethod.call(element);
  } else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
    var wscript = new ActiveXObject("WScript.Shell");
    if (wscript !== null) {
      wscript.SendKeys("{F11}");
    }
  }
}


function goFullScreen() {
  // Works
  requestFullScreen(document.body);
}

console.log("Done loading playerController.js");
