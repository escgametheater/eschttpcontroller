// Pixel Prison Blues OSC communication
console.log("Loading pixelprisonblues.js");

var ppb = {

    controllerName: "Pixel Prison Blues",
    grav_x: 1 ,
    grav_y: 0 ,
    isCop: false ,
    autojoin: true ,
    startTime: Date.now(),

    joinGame1: function() {
        sendChat(gameEngineUser,"special:JoinRequest=true");
    },
    joinGame: function() {
        this.startTime = Date.now();
        setCookie("startTime",this.startTime,60*60*24);

        console.log("Joinging game!");
        // Open when XMPP connection started?
        //playerController.port.open();
        // Send twice.
        ppb.joinGame1();
        setTimeout(ppb.joinGame1,100);
    },
    onShake: function() {
        log("Shaking!");
        playerController.shakeToLocate(playerID);
    },
    shakeToLocate: function(id) {
        sendChat(gameEngineUser,"special:shakeToLocate="+id);
    },
    shakeToLocateN: function(n) {
        var i ;
        for (i = 0 ; i < n ; i++)
            this.shakeToLocate(i);
    },
    autoPlay: function(p) {
        playerController.automoves('lrluduruldurudlrudlurldurlduludlruldluddruldrluruldlur',50,0);
    },
    send: function(playerID,x,y,sendTime) {
        var params = ["grav-x","grav-y"] ;
        var args = [
            {type: "i",value: playerID},
            {type: "f",value: x},
            {type: "f",value: y}
        ] ;
        if (sendTime) {
            params.push("LastFreshTouch");
            args.push({type: "f",value:  0.001*(Date.now()-this.startTime) });
        }
        //console.log("Sending to address " + addr,args);
        sendUpdate(params,args);
    },

    sendMovesRot: function () {
        var new_x = -this.grav_y ;
        this.grav_y = this.grav_x ;
        this.grav_x = new_x ;
        this.send(OSCindex,this.grav_x,this.grav_y,true);
        setTimeout(this.sendMovesRot,2000);
    },
    automoves: function(moveString,msdelay, index) {
        // cycle through the moves in moveString, once every delay milliseconds, starting at index
        index = index % moveString.length ;
        this.go(moveString.charAt(index));
        index ++ ;
        this.automovesTimeout = setTimeout(function () {
            ppb.automoves(moveString,msdelay,index);
        },msdelay);
    },
    automovesTimeout: null ,

    go: function(c) {
        console.log("ppb go "+c);
        var elemIDs = {u:"up",d:"down",l:"left",r:"right",n:"neutral"};
        var dirs = {u:[0,1],d:[0,-1],l:[-1,0],r:[1,0],n:[0,0]};
        var transform = {u:"matrix(0,-1,1,0,0,0)",d:"matrix(0,1,1,0,0,0)",l:"matrix(-1,0,0,1,0,0)",r:"unset",n:"unset"};
        var d = dirs[c];
        playerController.send(OSCindex,d[0],d[1],c!="n");
        var el = document.getElementById(elemIDs[c]);
        if (el != undefined) {
            el.style.background= "#4CAF50";
            setTimeout(function(){el.style.background=null;},200);
            document.getElementById("background").style.transform= transform[c];
        }
        return true;
    },
    handleKey: function(event) {
        oscport.reconnectDelay = oscport.reconnectDelayMin ;
        if(event.keyCode == 37) {playerController.go("l");}
        else if(event.keyCode == 39) {playerController.go("r");}
        else if(event.keyCode == 38) {playerController.go("u");}
        else if(event.keyCode == 40) {playerController.go("d");}
        else if(event.key == "o") {playerController.go("n");}
        else if(event.key == "n") {playerController.go("n");}
        else if(event.key == "0") {playerController.go("n");}
        else if(event.key == " ") {playerController.go("n");}
        return true;        
    },
    init: function() {
        // create the controller interface
        this.renderController();
        this.addEventListeners();
        this.startTime = Date.now();
        this.loadSavedState();
    },
    addEventListeners: function() {
        // Add event listeners for touch events, key events, accelerometer
        this.addSwipeHandler();
        document.addEventListener('keydown', function(event) {
            playerController.handleKey(event);
        });
    },
    addSwipeHandler: function() {
        window.handleSwipe = function(dir,lastdir) {
            // User is swiping, try to reconnect immediately if there is an error
            oscport.reconnectDelay = oscport.reconnectDelayMin ;
            if (dir!=lastdir) {
                playerController.go(dir);            
            }
            console.log("Detected swipe, direction "+dir+" last dir " + lastdir);
        }        
    },
    loadSavedState: function () {
        // Cookies to save state in case of disconnection and reconnection
        // This will only work for reconnecting the same browser,
        // If we want to allow reconnection from a different device we need to save the data to a server

// To do: isCop cookie handling
        var cookies = {
            sprite: getCookie("sprite"),
            isCop: parseInt(getCookie("isCop")),
            startTime: parseInt(getCookie("startTime"))
        }
        console.log("PPB Cookies: ",cookies);

        if (cookies.sprite != "")
            this.setSprite(cookies.sprite);
        else 
            this.setSprite("alien");

        if (cookies.isCop !== NaN) {
            this.setIsCop(cookies.isCop);
        }

        if (cookies.startTime !== NaN) {
            this.startTime = cookies.startTime ;
        }
    },
    spriteImage: function(s,d) {
        d = defaultValue(d,"e");
        if (s == "Frankenstein")
            s = "frank" ;
        else if (s == "Pumpkin")
            s = "jack" ;
        s = s.toLowerCase();
        return "ppb/art/heads/sprite_head_"+s+"_"+d+".png";
    },
    setSprite: function(s) {
            this.playerSprite = s ;
            setCookie("sprite",s,60*60*24);
            var imageURL = this.spriteImage(this.playerSprite);
            console.log("Setting sprite image to "+imageURL);
            document.getElementById("sprite").innerHTML = this.playerSprite ;
            document.getElementById("background").style.backgroundRepeat = "no-repeat" ;
            document.getElementById("background").style.backgroundPosition = "center" ;
            document.getElementById("background").style.backgroundSize = "contain" ;
            document.getElementById("background").style.backgroundImage = "url("+imageURL+")" ;
    },
    spriteDirection: "e" ,
    animateSprite: function() {
        if (this.playerSprite == "")
            return ;
        if (this.spriteDirection == "e")
            this.spriteDirection = "ne" ;
        else if (this.spriteDirection == "ne")
            this.spriteDirection = "se" ;
        else if (this.spriteDirection == "se")
            this.spriteDirection = "e" ;
        var imageURL = this.spriteImage(this.playerSprite,this.spriteDirection);
            console.log("Setting sprite image to "+imageURL);
        document.body.style.backgroundImage = "url("+imageURL+")" ;
        setTimeout(function () {playerController.animateSprite()},500);
    },
    setIsCop: function (ic) {
        this.isCop = ic ;
        // Use 1 and 0 for cookie instead of "true" and "false", as "false" will be interpreted as true.
        setCookie("isCop",this.isCop?1:0,60*60*24);
        if (this.isCop)
            document.getElementById("sprite").innerHTML = this.playerSprite + " Cop";
        else 
            document.getElementById("sprite").innerHTML = this.playerSprite + " Inmate";
    },
    onMessage: function (ev,params) {
        if (ev != "special") {
            // gameEnd
            return ;
        }

        // Possible params:
        // JoinRequest: true
        // id: <n>
        // sprite: "sprite"
        // MirrorGameState: InitialLoad/JoinScreen/DisplayCops/Instructions/Gameplay/EndZoom/FinalResults/Credits
        // gotoControllerState: Playing
        // bCop: true/false
        // setNeutralInput: true

        if ("setNeutralInput" in params) {
            // PPB wants us to send a neutral input
            if (params.setNeutralInput)
                this.go("n");
        }
        if ("id" in params) {
            playerID = params.id ;
            document.getElementById("playerid").innerHTML = playerID ;
            setCookie("playerID",playerID,60*60*24);
        }
        if ("sprite" in params) {
            this.setSprite(params.sprite);
        }
        if ("bCop" in params) {
            this.setIsCop(params.bCop === "True");
        }
        if ("gotoControllerState" in params) {
            if (params.gotoControllerState == "Playing") {
            }
        }
        if ("MirrorGameState" in params) {
            if (params.MirrorGameState === "DisplayCops") {
                if (!this.isCop)
                    this.setIsCop(0);
            } else if (params.MirrorGameState === "InitialLoad") {
            } else if (params.MirrorGameState === "JoinScreen") {
            } else if (params.MirrorGameState === "Instructions") {
            } else if (params.MirrorGameState === "Gameplay") {
            } else if (params.MirrorGameState === "EndZoom") {
            } else if (params.MirrorGameState === "FinalResults") {
            } else if (params.MirrorGameState === "Credits") {
            } else {
                console.log("Unknown MirrorGameState: ",params.MirrorGameState);
            }
        }
    },
    renderController: function () {
        document.getElementById("controller").innerHTML = "\
<button class='button' onclick =\"playerController.automoves('lululululdldldldrdrdrdrdrurururu',250,0)\">Diamond Auto</button>\
<button class='button' onclick='clearTimeout(playerController.automovesTimeout)'>Cancel</button>\
<div style='position:fixed; right:0; bottom:0; width:50%; height:50%; align:center;'><table style='position:absolute;right:0%;bottom:0%;align:center;' >\
    <tr><td></td><td><button id=up class=dir onclick=\"ppb.go('u')\">Up</button></td><td></td></tr>\
    <tr><td><button id=left class=dir onclick=\"ppb.go('l')\">Left</button></td><td><button id=neutral class=dir onclick=\"ppb.go('n')\">O</button></td><td><button id=right class=dir onclick=\"ppb.go('r')\">Right</button></td></tr>\
    <tr><td></td><td><button class=dir id=down onclick=\"ppb.go('d')\">Down</button></td><td></td></tr>\
</table></div>\
";
        //setTimeout(function () {playerController.animateSprite();},1000);
    }
}

playerControllers.pixelprisonblues = ppb ;

console.log("Done loading pixelprisonblues.js");
