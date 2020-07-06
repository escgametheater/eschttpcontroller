// up-down-left-right swipe detection
// allows multiple swipes in a single touch 
// redefine handleSwipe(dir,lastdir) to change what happens when a swipe is detected
// lastdir is "" for the first swipe in a single touch.
// To avoid 
console.log("Loading swipe.js");


var Swipe = {};

Swipe.touching = false ;
Swipe.touchStartPosition = {x:0,y:0};
Swipe.touchPosition = {x:0,y:0};
Swipe.touchDir = "";
Swipe.threshold = 30 ;

Swipe.handleSwipe = function(dir,lastdir) {
        console.log("Detected swipe, direction "+dir+" last dir " + lastdir);    
        log("Detected swipe, direction "+dir+" last dir " + lastdir);    
};

Swipe.handleTouchStart = function(evt) {
    Swipe.touching = true ;
    Swipe.touchDir = "" ;
    // Use screen coordinates and not client or page, because the latter can move during a swipe
    Swipe.touchStartPosition.x = evt.touches[0].screenX;                                      
    Swipe.touchStartPosition.y = evt.touches[0].screenY;
    Swipe.touchPosition.x = Swipe.touchStartPosition.x ;
    Swipe.touchPosition.y = Swipe.touchStartPosition.y ;
    console.log("Touch start at ",Swipe.touchStartPosition);
    log("Touch start at "+Swipe.touchStartPosition.x+"  "+Swipe.touchStartPosition.y);
    return true;
}

Swipe.handleTouchEnd = function (evt) {
    console.log("Got touchend event");
    Swipe.touching = false ;
    return true;
}

Swipe.handleTouchCancel = function (evt) {
    console.log("Got touchcancel event");
    Swipe.touching = false ;
    return true;
}

Swipe.handleTouchMove = function(evt) {
    event.preventDefault(); // Prevent scrolling and pull-refresh
    if ( ! Swipe.touching ) {
        console.log("Got touchmove event without touch start")
        return true;
    }

    var newPosition = {
        x:evt.touches[0].screenX,
        y:evt.touches[0].screenY  
    };


    var diff = {
        x: newPosition.x - Swipe.touchPosition.x ,
        y: newPosition.y - Swipe.touchPosition.y
    };

    var diff2 = {
        x: diff.x * diff.x,
        y: diff.y * diff.y
    }

    var thresh2 = Swipe.threshold*Swipe.threshold ;
    // Is the swipe long enough?
    if ((diff2.x < thresh2) && (diff2.y < thresh2)) {
        return true;
    }

    var dir = "" ;
    // left-right or up-down?
    if (diff2.x > diff2.y) {
        if (diff.x < 0) dir ="l" ;
        else dir = "r";
    } else {
        if (diff.y < 0) dir ="u" ;
        else dir = "d";
    }
    //log("Swipe to "+newPosition.x+"  "+newPosition.y + " dir "+dir);

    Swipe.handleSwipe(dir,Swipe.touchDir);
    if ((window.handleSwipe) && typeof window.handleSwipe == "function")
        window.handleSwipe(dir,Swipe.touchDir);

    Swipe.touchDir = dir ;
    Swipe.touchPosition = newPosition ;
    log("handleTouchMove finished");
    return true ;
}

Swipe.addEventListeners = function() {
    document.addEventListener('touchstart', Swipe.handleTouchStart, false);        
    document.addEventListener('touchmove', Swipe.handleTouchMove, false);
    document.addEventListener('touchend', Swipe.handleTouchEnd, false);
    document.addEventListener('touchcancel', Swipe.handleTouchCancel, false);
}
Swipe.removeEventListeners = function() {
    document.removeEventListener('touchstart', Swipe.handleTouchStart, false);        
    document.removeEventListener('touchmove', Swipe.handleTouchMove, false);
    document.removeEventListener('touchend', Swipe.handleTouchEnd, false);
    document.removeEventListener('touchcancel', Swipe.handleTouchCancel, false);
}

console.log("Done loading swipe.js");
