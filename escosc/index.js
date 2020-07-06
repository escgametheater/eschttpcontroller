// Simple OSC over Websocket relay
module.paths.push("osc/bower_components/eventEmitter");
module.paths.push("osc/dist/osc-module");
var osc = require("osc");

// Port number constants
const WEBSOCKET_PORT_IN = 8081 ;
const OSC_PORT_OUT = 3222;

// For WebSockets:

var http = require("http");
var WebSocket = require("ws");

/************************
 * OSC in Over WebSocket
 ***********************/
// See https://github.com/colinbdclark/osc.js-examples/blob/master/udp-browser/index.js

var wss = new WebSocket.Server({port:WEBSOCKET_PORT_IN});

wss.on("connection", function (socket) {
    console.log("A Web Socket connection has been established!");
    var socketPort = new osc.WebSocketPort({
        socket: socket
    });
    socketPort.on("data", function (data) {
        console.log("OSC data received for relay:", data);
        udpPort.sendRaw(data);
    });

    socketPort.on("message", function (oscMsg, timeTag, packetInfo) {
        console.log("An OSC Message was received:", oscMsg);
        // This is just for logging purposes. the on("data"...) function handles
        // relaying the raw data, so we don't have to ensure the types are correct.
        // If for some reason you want to manipulate the data, then you probably want to use this function
        // instead.
        return ;

        // The following code shows what you would have to do to resend the data using "message" instead of "data" event handler:

        // The args[].type fields must match the types expected. For ESC games, they are all floats, after the index, but 
        // If they are not, this needs to be changed, but this script is currently not aware of the game being
        // played.  That's way it's probably better to just relay the raw data.
        var args = [{type: "i",value: oscMsg.args[0]}] ;
        var i ;
        for (i = 1 ; i < oscMsg.args.length ; i++) {
            args.push({type:"f",value:oscMsg.args[i]});
        }
        var outMsg = {
            address: oscMsg.address,
            args: args
        }
        var player = oscMsg.args[0] ;
        playerActive[player] = true ;
        console.log("Sending message:", outMsg);
        udpPort.send(outMsg);
    });
});

/*********************************
 * OSC out to localhost Over UDP *
 ********************************/

var LOCAL_PORT_NUMBER = 57121; // Not needed because this is a one-way relay

var udpPort = new osc.UDPPort({
    localAddress: "127.0.0.1",
    localPort: LOCAL_PORT_NUMBER,
    remoteAddress: "127.0.0.1",
    remotePort: OSC_PORT_OUT
});

udpPort.on("ready", function () {
    console.log("UDP port ready.");
});

// Listen for incoming OSC bundles on UDP port.
// Not expecting any, so just log and ignore
udpPort.on("bundle", function (oscBundle, timeTag, info) {
    console.log("An OSC bundle just arrived for time tag", timeTag, ":", oscBundle);
    console.log("Remote info is: ", info);
});

// Listen for incoming OSC messages on UDP port.
// Not expecting any, so just log and ignore
udpPort.on("message", function (oscMessage) {
    console.log("An OSC message just arrived:", oscMessage);
});

udpPort.on("error", function (err) {
    console.log(err);
});

udpPort.open();

console.log("Done setting up OSC relay on websocket port " + WEBSOCKET_PORT_IN + " to UDP port " + OSC_PORT_OUT);
