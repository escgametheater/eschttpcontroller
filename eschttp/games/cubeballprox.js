// Pixel Prison Blues OSC communication
console.log("Loading cubeballpro.js");

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
var cbp = {

    controllerName: "Cube Ball Pro",
    teamid: -1 ,
    autojoin: true ,
    lastAngle: 0 ,
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
        if (acc && (acc.x != null)) {
            var params = [] ;
            var args = [{type: "i",value: OSCindex}];

            // Seems like the Unity code reorients the accelerometer based on the 
            // orientation of the controller: UnityReorientVector3
            // So, we should use acc.y instead of x
            var y =acc.y/G;
            if (y > 1) y = 1 ;
            if (y<-1) y = -1 ;
            var angle = -Math.asin(y)/(Math.PI/2);
            var delta = angle-playerController.lastAngle ;
            var thresh2 = 1/90/90 ;
            if (delta*delta >= thresh2) {
                params.push("x-accel");
                args.push({type: "f",value:  angle });
                playerController.lastAngle = angle ;
                log("Angle: "+90*angle);
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
    autoPlay:function(p) {
        playerController.automoves('rrrslrslllslllsrls',250,0);
    },
    go: function(c) {
        console.log("robotbasketballpro go('"+c+"')");
        if ((c == "n")||(c == "u")||(c == "s")) {
            // Shoot
            sendChat(gameEngineUser,"touchDown(50.0, 50.0):")
            return true ;
        }
        if ((c=="0")||(c=="d")) {
            var ev = {
                accelerationIncludingGravity: {
                    x: G ,
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
            var delta = 10/90 ;
            if (c=="r") delta = -delta ;
            var angle = lastAngle + delta ;
            log("New angle: "+angle + " "+angle*90); 
            var y =  G*Math.sin(-angle*Math.PI/2) ;
            log("Y: "+y); 
            var x = Math.sqrt(G*G - y*y);
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
    selectTeamID: function (t) {
        if (playerController.gameState == "registercolor")
            sendChat(gameEngineUser,"Swipe (0.0, 0.0):");
        playerController.setTeamID(t);
        var ids = ["leftbutton" , "rightbutton"] ;
        document.getElementById(ids[t-1]).innerHTML = "JOINED!" ;
        document.getElementById(ids[2-t]).innerHTML = " . " ;
        log("Team chosen: "+t);
        if (playerController.gameState == "collectsquadchoice")
            playerController.sendTeamID();
    },
    touchstartHandler: function(evt) {
        // Shoot when player touches the screen 
        playerController.go('s');
        log("Touched!");
    },
    sendTeamID: function() {
        if (playerController.teamid < 0)
            return ;
        if (playerController.gameState !== "collectsquadchoice")
            return ;
        sendChat(gameEngineUser,"squadPref"+playerController.teamid+":");
        document.getElementById("controller").innerHTML = playerController.autoPlayButtonsHTML +  playerController.joystickHTML ;
    },
    gameState: "",
    chooseTeamHTML: "<div style='position:fixed; right:0; bottom:0; width:100vw; height:50vh; align:center;'>"+
    "<button id=leftbutton style='font-size:6vw; background-color:yellow; width:50%; height:100%; margin:0 0; padding:0 0; border:0;' onclick=playerController.selectTeamID(1)>Yellow Team</button>"+
    "<button id=rightbutton style='font-size:6vw; background-color:black; color:white; width:50%; height:100%; margin:0 0; padding:0 0; border:0; ' onclick=playerController.selectTeamID(2)>Black Team</button>"+
    "</div>",
    playingHTML: "<div style='position:fixed; right:0; bottom:0; width:100vw; height:50vh; align:center;'>"+
    //"<div id=playernum font-size:20vw><div>"+
    "</div>",
    showGameController: function() {
            if (playerController.teamid >= 0) {
                var controller = document.getElementById("controller") ;
                controller.style.position = "fixed" ;
                controller.style.width = "100vw" ;
                controller.style.height = "50vw" ;
                controller.style.align = "center" ;
                controller.style.bottom = "0" ;
                controller.style.fontSize = "20vw" ;
                controller.style.fontFamily="Impact";
                //controller.innerHTML = playerController.playingHTML;
                if (playerController.teamid == 1) {
                    controller.style.backgroundColor = "yellow";
                    controller.style.color = "black";
                }
                else {
                    controller.style.backgroundColor = "black";
                    controller.style.color = "white";
                }
                controller.innerHTML = "<center>"+(playerID+1)+"</center>" ;

            }

    },
    onMessage: function (ev,params) {
        if (PlayerController.onMessage(ev,params)) {
            return true ;
        }
        log("cubeballpro onMessage");
        if (ev.startsWith("UIMenu; registercolor")) {
            playerController.sentInit = false ;
            playerController.gameState = "registercolor" ;
            console.log("Game state: "+playerController.gameState);
            log("Choose team: ");
            document.getElementById("controller").innerHTML = playerController.chooseTeamHTML;
            sendChat(gameEngineUser,"Swipe (0.0, 0.0):"); // Pretend to pick a team
            return true ;
        }
        if (ev.startsWith("UIMenu; collectsquadchoice")) {
            playerController.gameState = "collectsquadchoice" ;
            console.log("Game state: "+playerController.gameState);
            if (playerController.teamid >= 0) {
                playerController.sendTeamID();
                playerController.showGameController();
            }
            return true ;
        }
        if (ev.startsWith("UIMenu; gamemenu")) {
            playerController.gameState = "gamemenu" ;
            console.log("Game state: "+playerController.gameState);
            playerController.showGameController();
            return true ;
        }
        log("onMessage unhandled: '"+ev+"'");
        return true ;
    },
    renderController: function () {
        //document.getElementById("controller").innerHTML = playerController.chooseTeamHTML;
        document.getElementById("controller").innerHTML = playerController.autoPlayButtonsHTML +  playerController.joystickHTML ;
    },
    unloadController: function () {
        // Things to do when leaving the controller
        document.getElementById("controller").style="none";
    }

}

playerControllers.cubeballpro = cbp ;

console.log("Done loading cubeballpro.js");
