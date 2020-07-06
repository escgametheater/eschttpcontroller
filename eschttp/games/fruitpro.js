// Pixel Prison Blues OSC communication
console.log("Loading fruitpro   .js");

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
var FruitPro = {

    controllerName: "Fruit Tattoo Pro",
    gameId: "fruitpro",
    teamColors: ["green","orange"],
    teamTextColors: ["white","white"],
    teamNames: ["Apples Team","Oranges Team"],
    teamid: -1 ,
    autojoin: true ,
    lastAcc: {x:0,y:0,z:0} ,

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
        if (acc && (acc.x !== null)) {
            var params = [] ;
            var args = [{type: "i",value: OSCindex}];

            var delta = xyzDiff(acc,playerController.lastAcc);
            var thresh = 0.1 ;
            var scale = 1.0/GRAVITY ;
            if ((delta.x > thresh) || (delta.x < -thresh)) {
                params.push("y-accel");
                args.push({type: "f",value: scale*acc.x });
                playerController.lastAcc.x = acc.x ;
                playerController.lastUpdateTime = Date.now();
            }
            if ((delta.y > thresh) || (delta.y < -thresh)) {
                params.push("x-accel");
                args.push({type: "f",value: - scale*acc.y });
                playerController.lastAcc.y = acc.y ;
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
    autoPlay:function(p) {
        playerController.automoves('rrrslrslllslllsrls',250,0);
    },
    go: function(c) {
        console.log("go('"+c+"')");
        if ((c == "n")||(c == "s")) {
            // Shoot
            sendChat(usernameGameEngine,"Swipe (0.0, 0.0):")
            return true ;
        }
        function newa(last,a) {
            if (a>=0) {
                if (last < 0)
                    return 0 ;
                return a ;
            }
            else if (a<=0) {
                if (last > 0)
                    return 0;
                return a ;
            }
            // Shouldn't get here.
            return 0 ;
        }
        // Simulate accelerometer event
        if (c==="d"||c==="u"||c==="l"||c==="r"||c==="0") {
            var a = GRAVITY/2 ;
            var ev = { accelerationIncludingGravity: {x: 0,y: 0,z: 0}};
            if (c==="d") ev.accelerationIncludingGravity.x = newa(playerController.lastAcc.x, - a);
            else if (c==="u") ev.accelerationIncludingGravity.x= newa(playerController.lastAcc.x, + a);
            else if (c==="l") ev.accelerationIncludingGravity.y= newa(playerController.lastAcc.y, + a);
            else if (c==="r") ev.accelerationIncludingGravity.y= newa(playerController.lastAcc.y, - a);
            playerController.accelerometerHandler(ev);
            return ;            
        }
        log("go('"+c+"') not implemented yet.");
        return true ;
    },
    handleKey: function(event) {
        oscport.reconnectDelay = oscport.reconnectDelayMin ;
        if (playerController.handleKeyArrows(event)) {
            return true ;
        }
        else if(event.key == "o") {playerController.go("0");}
        else if(event.key == "0") {playerController.go("0");}
        else if(event.key == "n") {playerController.go("n");}
        else if(event.key == " ") {playerController.go("n");}
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

    gameState: "",
    showGameController: function() {
        log("showGameController() called")
        playerController.controllerSetup();
        var controller = document.getElementById("controller") ;
        controller.innerHTML = "<center>"+(playerID+1)+"</center>" ;
        if (accNotAvailable)
            playerController.addJoystick(1,0.5,0.5);
        playerController.addLocateButton("5vh","5vh");
        console.log("Controller: " ,controller);
    },
    onMessage: function (ev,params) {
        if (PlayerController.onMessage(ev,params)) {
            return true ;
        }
        log("onMessage");
        log("onMessage unhandled: '"+ev+"'");
        return true ;
    },
    renderController: function () {
        playerController.showGameController()
        //document.getElementById("controller").innerHTML = playerController.autoPlayButtonsHTML +  playerController.joystickHTML ;
    },
    unloadController: function () {
        // Things to do when leaving the controller
        document.removeEventListener('touchstart', playerController.touchstartHandler);
    }

}

playerControllers.fruitpro = FruitPro ;

console.log("Done loading fruitpro.js");
