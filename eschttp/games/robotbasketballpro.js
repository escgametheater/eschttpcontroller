// Pixel Prison Blues OSC communication
console.log("Loading robotbasketballpro.js");

function xyzDiff(a,b) {
    return {
        x:a.x-b.x,
        y:a.y-b.y,
        z:a.z-b.z
    };
}
function xyzDot(a,b) {
    return(a.x*b.x + a.y*b.y + a.z*b.z );
}
var rbp = {

    controllerName: "Robot Basketball Pro",
    gameId: "robotbasketballpro",
    teamColors: ["gold","black"],
    teamTextColors: ["gold","silver"],
    teamNames: ["Gold Team","Black Team"],
    backgroundImage: "url('games/robotbasketballpro/logo-pro-512.png')",
    teamid: -1 ,
    desiredOrientation: "landscape" ,
    autojoin: true ,
    lastAngle: 0 ,
    direction: 1,
    lastUpdateTime: 0 ,
    accelerometerHandler: function(e) {
        // each game that uses the acceleromter may want to handle it differently
        // Don't send accelerometer data that the game engine isn't going to use, etc.
        /*
        function checkAndAddAcc(thresh2,acc,delta,lastAcc,params,args,dir,pname,scale) {
            if (delta[dir]*delta[dir] > thresh2) {
                params.push(pname);
                lastAcc[dir] = acc[dir] ; // remember the last value SENT
                args.push({type: "f",value:  acc[dir]*scale });
            }
        }*/


        var acc = e.accelerationIncludingGravity ;
        //console.log(acc);
        //console.log("accelerometerHandler, evt = ",e);
        if (acc && (acc.x != null)) {
            var params = [] ;
            var args = [{type: "i",value: OSCindex}];

            // Seems like the Unity code reorients the accelerometer based on the 
            // orientation of the controller: UnityReorientVector3
            // So, we should use acc.y instead of x
            var y =acc.y/GRAVITY;
            if (y > 1) y = 1 ;
            if (y<-1) y = -1 ;
            var x = acc.x/GRAVITY ;
            var z = acc.z/GRAVITY ;

            // Detect changes in orientation, but ignore taps
            var mag2 = x*x+y*y+z*z ;
            var newOrientation = 90 ;
            //console.log("window.orientation: " + (window.orientation/90));
            if (window.orientation !== null) {
                if ((window.orientation == 90)||(window.orientation == -90))
                    newOrientation  = window.orientation ;
            }
            else {
                newOrientation = playerController.orientation ;
                if ((mag2>0.98)&& (mag2<1.02)) {
                    if (x < -0.7) newOrientation = 90 ;
                    else if (x >0.7) newOrientation = -90 ;
                }
                if (newOrientation == 0)
                    newOrientation = 90 ;
            }
            if (newOrientation !== playerController.orientation) {
                playerController.orientation = newOrientation ;
                console.log("New orientation: " + playerController.orientation);
                // Do something when orientation changes?
            }
            var dir = Math.sign(playerController.orientation);

            y = y * dir ;
            var angle = -Math.asin(y)/(Math.PI/2);
            angle = Math.round(angle*128)/128;
            var delta = angle-playerController.lastAngle ;
            var thresh = 0.02 ;
            if ((delta > thresh) || (delta < -thresh)) {
                params.push("x-accel");
                args.push({type: "f",value:  angle });
                playerController.lastAngle = angle ;
                log("accelerometerHandler sending angle: "+90*playerController.lastAngle);
                playerController.lastUpdateTime = Date.now();
            }
            if (params.length) {
                log("acc: "+acc.x+" "+acc.y+" "+acc.z);
                sendUpdate(params,args);
            }
        }
        return true;
    },
    send: function(playerID) {
        log ("Send not implemented yet.");
        return true;
    },
    autoPlay:function(t) {
        playerController.autoPlayStop();
        if (t === undefined)
            t = 33 ;
        playerController.autoPlayActive = true ;
        playerController.autoPlayStats = {count: 0 , startTime: Date.now() };
        playerController.automoves('llsllsllsllsrlsrrsrrsrrsrrsrlsrls',t,0);
        //playerController.automoves('lllsprlrsrrrslrls',250,0);
        //ESCWebsocket.autoping(0,20,"autoPlay autoping");
        //playerController.automoves('lpppplpppplppppsprpppplpppprppppspppprpppprpppprppppspppplpppprpppplppppspppp',50,0);
    },
    go: function(c) {
        console.log("robotbasketballpro go('"+c+"')");
        if ((c == "n")||(c == "u")||(c == "s")) {
            // Shoot
            sendChat(usernameGameEngine,"touchDown(50.0, 50.0):")
            return true ;
        }
        if ((c=="0")||(c=="d")) {
            var ev = {
                accelerationIncludingGravity: {
                    x: 0 ,
                    y: 0 ,
                    z: GRAVITY
                }
            }
            playerController.accelerometerHandler(ev);
            return ;            
        }
        if ((c=="l")||(c=="r")) {
            var lastAngle = playerController.lastAngle ;
            // Use arrow keys to change accelerometer
            console.log("Last angle: " + lastAngle);
            var delta = 10/90 ;
            if (c=="r") delta = -delta ;
            var angle = lastAngle + delta ;
            console.log("New angle: "+angle + " "+angle*90); 
            var y =  GRAVITY*Math.sin(-angle*Math.PI/2) ;
            console.log("Y: "+y); 
            var x = Math.sqrt(GRAVITY*GRAVITY - y*y);
            var ev = {
                accelerationIncludingGravity: {
                    x: 0 ,
                    y: y ,
                    z: x
                }
            }
            playerController.accelerometerHandler(ev);
            return ;
        }
        log("robotbasketballpro go('"+c+"') not implemented yet.");
        return true ;
    },
    handleKey: function(event) {
        oscport.reconnectDelay = oscport.reconnectDelayMin ;
        if (playerController.handleKeyArrows(event)) {
            return true ;
        }
        else if(event.key == "o") {playerController.go("0");}
        else if(event.key == "n") {playerController.go("n");}
        else if(event.key == " ") {playerController.go("n");}
        else if(event.key == "0") {playerController.go("0");}
        return true;        
    },
    touchstartHandler: function(evt) {
        // Shoot when player touches the screen 
        playerController.go('s');
        log("Touched!");
    },
    addEventListeners: function() {
        // Add event listeners for touch events, key events, accelerometer
        document.addEventListener('keydown', playerController.handleKey);
        document.addEventListener('touchstart', playerController.touchstartHandler);
    },
    showGameController: function() {
        console.log("showGameController() called")
        if (playerController.teamid < 1) {
            console.log("showGameController() called, but teamid is "+playerController.teamid);
            return ;

        }
        playerController.controllerSetup();
        var controller = document.getElementById("controller") ;
        var myCol = playerController.teamTextColors[playerController.teamid-1];
        controller.innerHTML = "<div style='color: " + myCol+"; background-color: rgba(0,0,0,0.5); text-shadow: 2px 2px 20px black; line-height:"+playerController.height+"px; text-align: center; font-size: 400%;'>"+(playerID+1)+"</div>" ;
        if (accNotAvailable) {
            console.log("Adding joystick.");
            playerController.addJoystick(1,0.5,0.5);
        }
        playerController.addLocateButton("5vw","5vw");
        //playerController.addNoSleepButton("5vw","10vw");
        if (playerController.gamemenu.length > 0) {
            playerController.addDiv("25%","5%","gamemenu",playerController.gamemenu);
        }

        console.log("Controller: " ,controller);
    },
    onMessage: function (ev,params) {
        if (PlayerController.onMessage(ev,params)) {
            return true ;
        }
        log("onMessage unhandled: '"+ev+"'");
        return true ;
    },
    renderController: function () {
        playerController.showGameController()
        //document.getElementById("controller").innerHTML = playerController.autoPlayButtonsHTML +  playerController.joystickHTML ;
    },
    unloadController: function () {
        // Things to do when leaving the controller
        document.getElementById("controller").style="none";
        document.removeEventListener('touchstart', playerController.touchstartHandler);
    }

}

playerControllers.robotbasketballpro = rbp ;

console.log("Done loading robotbasketballpro.js");
