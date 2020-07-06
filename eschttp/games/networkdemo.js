// Pixel Prison Blues OSC communication
console.log("Loading networkdemo.js");

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
var NetworkDemo = {

    controllerName: "Network Demo",
    gameId: "networkdemo",
    teamColors: ["red","blue"],
    teamTextColors: ["red","blue"],
    teamNames: ["Red Team","Blue Team"],
//    backgroundImage: "url('games/robotbasketballpro/logo-pro-512.png')",
    teamid: -1 ,
    desiredOrientation: "landscape" ,
    autojoin: true ,
    lastAcc: {x:0,y:0,z:0} ,
    filteredAcc: {x:0,y:0,z:0} ,
    direction: 1,
    lastUpdateTime: 0 ,
    accelerometerHandler: function(e) {
        var acc = e.accelerationIncludingGravity ;
            //tempAlert("acc: "+acc.x+" "+acc.y+" "+acc.z,1000,"10%","80%");
        if (acc && (acc.x != null)) {
            var timenow = Date.now() ;
            var params = [] ;
            var args = [{type: "i",value: OSCindex}];
            var delta = xyzDiff(acc,playerController.lastAcc);
            var thresh = 0.2 ;
            var filterThresh = 0.05 ;
            var scale = 1 ;
            var deltaTime = timenow - playerController.lastUpdateTime ;

            var x = 0.9 ;
            playerController.filteredAcc.x = {
                "x": playerController.filteredAcc.x * x + (1-x) * acc.x ,
                "y": playerController.filteredAcc.y * x + (1-x) * acc.y ,
                "z": playerController.filteredAcc.z * x + (1-x) * acc.z

            } ;
            var filterDelta = xyzDiff(playerController.filteredAcc,playerController.lastAcc);

            var accChange = (delta.x > thresh) || (delta.x < -thresh) ||
                            (delta.y > thresh) || (delta.y < -thresh) ||
                            (delta.z > thresh) || (delta.z < -thresh);
            accChange = accChange || (filterDelta.x > filterThresh) || (filterDelta.x < -filterThresh) ||
                            (filterDelta.y > filterThresh) || (filterDelta.y < -filterThresh) ||
                            (filterDelta.z > filterThresh) || (filterDelta.z < -filterThresh);
            // Should send all accelerometer values if any changeed by delta, otherwise they can get out of sync
            // Slope is dependent on the ratio of the components

            if (accChange || (deltaTime > 100)) {
                params.push("x-accel");
                args.push({type: "f",value: scale*acc.x });
                playerController.lastAcc.x = acc.x ;
                params.push("y-accel");
                args.push({type: "f",value: scale*acc.y });
                playerController.lastAcc.y = acc.y ;
                params.push("z-accel");
                args.push({type: "f",value: scale*acc.z });
                playerController.lastAcc.z = acc.z ;
            }
            if (params.length) {
                playerController.lastUpdateTime = timenow;
                tempAlert("acc: "+acc.x+" "+acc.y+" "+acc.z,1000,"10%","80%");
                //tempAlert("acc: "+delta.x+" "+delta.y+" "+delta.z,1000,"10%","80%");
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
    },
    go: function(c) {
        return ;
        // TODO: use arrow keys to provide rotation to accelerometer
        var ev = {
            accelerationIncludingGravity: {
                x: 0 ,
                y: y ,
                z: x
                }
        }
        playerController.accelerometerHandler(ev);
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
    touchDeviceCoord: function (touch) {
        if (window.screen.width < document.documentElement.clientWidth ) {
            // mobile device held horizontally
            // Have to swap x & y, add in the height of the menu bar, and invert the y component
            return {x: touch.clientY+window.screen.width-window.innerHeight, y: window.screen.height-touch.clientX} ;
        }
        return {x: touch.clientX, y: touch.clientY + window.screen.height-window.innerHeight} ;
    },
    touchstartHandler: function(evt) {
        var coord = NetworkDemo.touchDeviceCoord(evt.changedTouches[0]) ; 
        var x = coord.x;
        var y = coord.y;
        sendChat(usernameGameEngine,"touchstart "+x+" "+y);
        evt.preventDefault();
    },
    touchmoveHandler: function(evt) {
        var coord = NetworkDemo.touchDeviceCoord(evt.changedTouches[0]) ; 
        var x = coord.x;
        var y = coord.y;
        sendChat(usernameGameEngine,"touchmove "+x+" "+y);
        evt.preventDefault();
    },
    touchendHandler: function(evt) {
        var coord = NetworkDemo.touchDeviceCoord(evt.changedTouches[0]) ; 
        var x = coord.x;
        var y = coord.y;
        sendChat(usernameGameEngine,"touchend "+x+" "+y);
        evt.preventDefault();
    },
    touchcancelHandler: function(evt) {
        var coord = NetworkDemo.touchDeviceCoord(evt.changedTouches[0]) ; 
        var x = coord.x;
        var y = coord.y;
        sendChat(usernameGameEngine,"touchcancel "+x+" "+y);
        evt.preventDefault();
    },
    addEventListeners: function() {
        // Add event listeners for touch events, key events, accelerometer
        document.addEventListener('keydown', playerController.handleKey);
        document.addEventListener('touchstart', playerController.touchstartHandler);
        document.addEventListener('touchmove', playerController.touchmoveHandler);
        document.addEventListener('touchend', playerController.touchendHandler);
        document.addEventListener('touchcancel', playerController.touchcancelHandler);
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
        document.removeEventListener('touchmove', playerController.touchmoveHandler);
        document.removeEventListener('touchend', playerController.touchendHandler);
        document.removeEventListener('touchcancel', playerController.touchcancelHandler);
    }

}

playerControllers.networkdemo = NetworkDemo ;

console.log("Done loading networkdemo.js");
