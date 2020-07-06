// up-down-left-right swipe detection
// allows multiple swipes in a single touch 
// redefine handleSwipe(dir,lastdir) to change what happens when a swipe is detected
console.log("Loading swipe.js");

document.addEventListener('touchstart', handleTouchStart, false);        
document.addEventListener('touchmove', handleTouchMove, false);

var touching = false ;
var touchStartPosition = {x:0,y:0};
var touchPosition = {x:0,y:0};
var touchDir = "";

// Handler for what to do with the swipe.
if (typeof handleSwipe === undefined) {
    window.handleSwipe = function(dir,lastdir) {
        console.log("Detected swipe, direction "+dir+" last dir " + lastdir);    
    }
}

function handleTouchStart(evt) {
    touching = true ;
    touchDir = "" ;
    // Use screen coordinates and not client or page, because the latter can move during a swipe
    touchStartPosition.x = evt.touches[0].screenX;                                      
    touchStartPosition.y = evt.touches[0].screenY;
    touchPosition.x = touchStartPosition.x ;
    touchPosition.y = touchStartPosition.y ;
    console.log("Touch start at ",touchStartPosition);
    return true;
}

function handleTouchEnd(evt) {
    console.log("Got touchend event, sending to handleTouchMove");
    handleTouchMove(evt);
    touching = false ;
    return true;
}

function handleTouchCancel(evt) {
    console.log("Got touchcancel event");
    touching = false ;
    return true;
}

function handleTouchMove(evt) {
    event.preventDefault(); // Prevent scrolling and pull-refresh
    if ( ! touching ) {
        console.log("Got touchmove event without touch start")
        return true;
    }

    var newPosition = {
        x:evt.touches[0].screenX,
        y:evt.touches[0].screenY  
    };

    var diff = {
        x: newPosition.x - touchPosition.x ,
        y: newPosition.y - touchPosition.y
    };

    var diff2 = {
        x: diff.x * diff.x,
        y: diff.y * diff.y
    }

    var thresh2 = 15*15 ;
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

    handleSwipe(dir,touchDir);

    touchDir = dir ;
    touchPosition = newPosition ;
    return true ;
}

console.log("Done loading swipe.js");
