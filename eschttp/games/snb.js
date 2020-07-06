console.log("Loading snb.js");

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
var snb = {

    controllerName: "SnB",
    teamColors: ["gold","silver"],
    teamTextColors: ["white","white"],
    teamNames: ["Gold Team","Silver Team"],
    backgroundImage: "url('/games/snb/snb-background.png')",
    teamid: -1 ,
    autojoin: true ,
    lastAngle: 0 ,
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
            var angle = -Math.asin(y)/(Math.PI/2);
            var delta = angle-playerController.lastAngle ;
            var thresh = 0.007 ;
            if ((delta > thresh) || (delta < -thresh)) {
                angle = angle.toFixed(2);
                params.push("x-accel");
                args.push({type: "f",value:  angle });
                playerController.lastAngle = parseFloat(angle) ;
                log("accelerometerHandler sending angle: "+90*playerController.lastAngle);
                playerController.lastUpdateTime = Date.now();
            }




            //checkAndAddAcc(thresh2,acc,delta,lastAcc,params,args,"y","x-accel",-1./G);

            //checkAndAddAcc(thresh2,acc,delta,lastAcc,params,args,"y","-accel");
            //checkAndAddAcc(thresh2,acc,delta,lastAcc,params,args,"z","-accel");
            //checkAndAddAcc(thresh2,acc,delta,lastAcc,params,args,"x","-gyro");
            //checkAndAddAcc(thresh2,acc,delta,lastAcc,params,args,"y","-gyro");
            //checkAndAddAcc(thresh2,acc,delta,lastAcc,params,args,"z","-gyro");
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
    autoPlay:function(p) {
        playerController.automoves('rrrslrslllslllsrls',250,0);
    },
    go: function(c) {
        console.log("snb go('"+c+"')");
        if ((c == "n")||(c == "u")||(c == "s")) {
            // Blow
            sendChat(usernameGameEngine,"ControllerInputButton,1:")
            return true ;
        }
        if ((c=="0")||(c=="d")) {
            var ev = {
                accelerationIncludingGravity: {
                    x: GRAVITY ,
                    y: 0 ,
                    z: 0
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
                    x: x ,
                    y: y ,
                    z: 0
                }
            }
            playerController.accelerometerHandler(ev);
            return ;
        }
        log("snb go('"+c+"') not implemented yet.");
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
    onchangeSlider: function(x) {
        sendChat(usernameGameEngine,"ControllerInputSlider,1,"+x+":");
        return false;
    },
    verticalSliderHTML:function() {
        return '<input type="range" onchange="playerController.onchangeSlider(this.value)" min="0" max="1" value="0.5" step="0.01" style="position: fixed; top: 80vh; left: 20vh; width:60vh; height:5vh; transform-origin:0vh 0vh; transform: rotate(-90deg);">';
    },
    showGameController: function() {
        log("showGameController() called")
        playerController.controllerSetup();
        var controller = document.getElementById("controller") ;
        var innerHTML = playerController.verticalSliderHTML()+"<center>"+(playerID+1)+"</center>" ;

        if (controller.innerHTML != innerHTML)
            controller.innerHTML = innerHTML ;

        if (accNotAvailable)
            playerController.addJoystick(1,0.5,0.5);
        playerController.addLocateButton("5vh","5vh");
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

playerControllers.snb = snb ;

console.log("Done loading snb.js");
