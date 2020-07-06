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
    gameId: "cubeballpro",
    teamColors: ["darkblue","darkred"],
    teamTextColors: ["blue","red"],
    teamNames: ["Blue Team","Red Team"],
    backgroundImage: "url('games/cubeballpro/background.png')",
    teamid: -1 ,
    autojoin: true ,
    lastAngle: 0 ,
    accelerometerHandler: function(e) {
        return true;
    },
    send: function(playerID) {
        log ("Send not used by this game.");
        return true;
    },
    autoPlay:function(p) {
        playerController.automoves('rrrslrslllslllsrls',250,0);
    },
    simSwipe: function(dir,up) {
        sendChat(usernameGameEngine,"touchDown("+(up.x-dir.x).toFixed(1)+", "+(up.y-dir.y).toFixed(1)+"):");
        setTimeout(function() {
            sendChat(usernameGameEngine,"Swipe("+dir.x.toFixed(1)+", "+dir.y.toFixed(1)+"):");
            sendChat(usernameGameEngine,"touchUp("+up.x.toFixed(1)+", "+up.y.toFixed(1)+"):");
        },10);
    },

    autoswipe: false ,
    go: function(c) {
        console.log("cubeballpro go('"+c+"')");
        // If up.x is greater than 300 then "autoswipe" will be activated
        // Use
        var up = {x:500,y:100} ;
        if (cbp.autoswipe)
            up.x = 100 ;
        var d = 10 ;
        if (c=="u") {
            cbp.simSwipe({x: 0,y: d},up);
            playerController.dashUp();
        }
        else if (c=="d") {
            cbp.simSwipe({x: 0,y:-d},up);
            playerController.dashUp();
        }
        else if (c=="l") {
            cbp.simSwipe({x:-d,y: 0},up);
            playerController.dashUp();
        }
        else if (c=="r") {
            cbp.simSwipe({x: d,y: 0},up);
            playerController.dashUp();
        }
        else if (c=="p") {
            cbp.dashToggle();
        }
        else if (c=="n") {
            cbp.dashToggle();
        }
        else {
            log("cubeballpro go('"+c+"') not implemented yet.");
        }
        return true ;
    },
    dashIsDown: false ,
    dashDown: function() {
        playerController.dashIsDown = true ;
        // TODO: Handle multitouch while dash button is being pressed?
        sendChat(usernameGameEngine,"ControllerInputDashDown:");
    },
    dashUp: function() {
        playerController.dashIsDown = false ;
        sendChat(usernameGameEngine,"ControllerInputDashUp:");
    },
    dashToggle: function(t) {
        if (playerController.dashIsDown)
            playerController.dashUp();
        else {
            playerController.dashDown();
            if (t)
                setTimeout(playerController.dashUp,t);
        }
    },
    handleKey: function(event) {
        //cbp.autoswipe = event.shiftKey ;
        oscport.reconnectDelay = oscport.reconnectDelayMin ;
        if (event.key == "Shift") {
            playerController.dashDown();
            return true ;
        }
        if (playerController.handleKeyArrows(event)) {
            return true ;
        }
        //else if(event.key == "/") {playerController.go("p");}
        return true;        
    },
    handleKeyUp: function(event) {
        oscport.reconnectDelay = oscport.reconnectDelayMin ;
        if (event.key == "Shift") {
            playerController.dashUp();
            return true ;
        }
        return true;        
    },
    touchStart: {x:0,y:0},
    touchTime: 0,
    lastTouches: [],
    touchstartHandler: function(evt) {
        playerController.touchTime = Date.now();
        playerController.touchStart = {x: evt.touches[0].screenX, y: screen.height - evt.touches[0].screenY} ;
        sendChat(usernameGameEngine,"touchDown("+playerController.touchStart.x.toFixed(1)+", "+playerController.touchStart.y.toFixed(1)+"):");
        return true ;
    },
    touchmoveHandler: function(evt) {
        playerController.lastTouches = evt.touches ;
        event.preventDefault(); // Prevent scrolling and pull-refresh
        var t = Date.now();
        if (t < playerController.touchTime)
            return ;
        log("Screen: "+screen.width + " " + screen.height);
        var delta = {
            x: evt.touches[0].screenX - playerController.touchStart.x,
            y: (screen.height - evt.touches[0].screenY) - playerController.touchStart.y
        };
        var delta2 = {x:delta.x*delta.x, y: delta.y*delta.y};
        var thresh2 = 20*20 ;
        if ((delta2.x < thresh2) && (delta2.y < thresh2))
            return ;
        playerController.touchTime = t+1000;
        sendChat(usernameGameEngine,"Swipe("+delta.x.toFixed(1)+", "+delta.y.toFixed(1)+"):");
        return true ;
    },
    touchendHandler: function(evt) {
        sendChat(usernameGameEngine,"touchUp("+playerController.lastTouches[0].screenX.toFixed(1)+", "
            +(screen.height - playerController.lastTouches[0].screenY).toFixed(1)+"):");
        return true ;
    },
    addEventListeners: function() {
        document.addEventListener('keydown', playerController.handleKey);
        document.addEventListener('keyup', playerController.handleKeyUp);
        document.addEventListener('touchstart', playerController.touchstartHandler);
        document.addEventListener('touchend', playerController.touchendHandler);
        document.addEventListener('touchmove', playerController.touchmoveHandler);
    },
    gameState: "",
    showChooseTeam: function() {
        var controller = document.getElementById("controller") ;
                controller.style.position = "fixed" ;
                controller.style.align = "center" ;
                controller.style.bottom = "0" ;
                controller.style.top = "0" ;
                controller.style.left = "0" ;
                controller.style.right = "0" ;
                controller.style.fontSize = "20vw" ;
                controller.style.fontFamily="Impact";
    },
    playingHTML: "<div style='position:fixed; right:0; bottom:0; width:100vw; height:50vh; align:center;'>"+
    //"<div id=playernum font-size:20vw><div>"+
    "</div>",
    showGameController: function() {
        log("showGameController() called")
        playerController.controllerSetup();
        var controller = document.getElementById("controller") ;
        var butsize = playerController.height/1.5 ;
        var numPos = playerController.height/3 ;
        var myCol = playerController.teamTextColors[playerController.teamid-1];
        controller.innerHTML = "<table style='width: 100%;'><tr style='height: "+ playerController.height + "px;'>"+
            "<td style='width:"+playerController.height+"px; text-align:center;'><button id=dashbutton style='background-color: "+myCol + "; opacity:0.75; border-radius:50%; width:"+butsize+"px; height:"+butsize+"px; vertical-align:middle; border:1;' onmousedown=playerController.dashDown() onmouseup=playerController.dashUp() ontouchstart=playerController.dashDown() ontouchend=playerController.dashUp()></button></td>"+
            "<td style='width:auto'></td>" +
            "<td style='width:"+numPos*2+"px; text-shadow: 4px 4px 20px black; color: " +myCol +"; font-size:400%; text-align: center;'>"+(playerID+1)+"</td>"+
            "</tr></table>";
        if (!touchAvailable)
            playerController.addJoystick(1,1,0.35);
        playerController.addLocateButton("5vh","5vh");
        console.log("Controller: " ,controller);
    },
    onRegistered: function() {
        playerController.setPlayerID(OSCindex);
        PlayerController.onRegistered();
    },
    onMessage: function (ev,params) {
        if (PlayerController.onMessage(ev,params)) {
            return true ;
        }
        log("cubeballpro onMessage");        
        log("onMessage unhandled: '"+ev+"'");
        return true ;
    },
    renderController: function () {
        playerController.showGameController();
    },
    unloadController: function () {
        // Things to do when leaving the controller
        document.removeEventListener('keydown', playerController.handleKey);
        document.removeEventListener('touchstart', playerController.touchstartHandler);
        document.removeEventListener('touchend', playerController.touchendHandler);
        document.removeEventListener('touchmove', playerController.touchmoveHandler);
    }

}

playerControllers.cubeballpro = cbp ;

console.log("Done loading cubeballpro.js");
