// WebSocket communication for esc game messaging

console.log("Loading escwebsocket.js");


var ESCWebsocket = {
    port: 8887 ,
    uri: "ws://192.168.1.202:8887",
    ackFrequency: 0.1 , // Request acknowledgements this frequently
    ackFrequencyCount: 1 , // For tracking ackFrequency
    username: "",
    usernamePlayer: "",
    pingStats: {
        count: 0 ,
        totalMs: 0 ,
        countLong: 0,
        totalMsLong: 0
    },
    websocket: {} ,
    state: "",
    setUsername: function (u) {
        var self = ESCWebsocket ;
        if (self.username !== u) {
            self.username = u ;
            self.doSend("u"+self.username);
        }
    },
    sendNext: function() {
        var self = ESCWebsocket ;
        self.setUsername(usernameDocent);
        self.doSend("enext:");
    },
    sendStart: function(game) {
        var self = ESCWebsocket ;
        self.setUsername(usernameGameLauncher);
        self.doSend("estart:game="+game+",round=0,difficulty=0");
    },
    shoot: function() {
        var self = ESCWebsocket ;
        self.setUsername(self.usernamePlayer);
        self.doSend("etouchDown(50.0, 50.0):");
    },
    shake: function() {
        var self = ESCWebsocket ;
        self.setUsername(self.usernamePlayer);
        self.doSend("eShake:");
    },
    sendUpdate: function(obj) {
        var self = ESCWebsocket ;
        console.log("ESCWebsocket: sendUpdate: ",obj);
        self.setUsername(self.usernamePlayer);
        self.doSend("s"+JSON.stringify(obj));
    },
    init: function() {
        var self = ESCWebsocket ;
        self.newConnection();
    },
    onConnected: function(){},
    newConnection: function() {
        var self = ESCWebsocket ;
        onConnected = function() {};
        self.websocket = new WebSocket(self.uri);
        self.websocket.onopen = function(evt) { self.onOpen(evt) };
        self.websocket.onclose = function(evt) { self.onClose(evt) };
        self.websocket.onmessage = function(evt) { self.onMessage(evt) };
        self.websocket.onerror = function(evt) {
            self.onError(evt)
        };
        self.websocket.binaryType = "arraybuffer"; // We don't want to use blobs, the default, because we would then need to use a FileReader to convert them to anything useful
        console.log("ESCWebsocket: connecting...");
        self.state = self.websocket.readyState ;
    },
    onOpen: function(evt) {
        var self = ESCWebsocket ;
        console.log("ESCWebsocket: CONNECTED");
        self.username ="";
        self.onConnected();
        self.state = self.websocket.readyState ;
        // Autoping to keep connection awake
        self.keepalive();
    },
    onClose: function(evt) {
        var self = ESCWebsocket ;
        self.username = "";
        console.log("ESCWebsocket: DISCONNECTED");
        self.state = self.websocket.readyState ;
    },
    ab2str: function(buf) {
        // Convert an array buffer with Uint8 encoding to String
        // See
        // https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    },
    xmppReconnectOnUsernameRequest: true , // Whether to attempt a reconnect when username requested from server 
    onMessage: function(evt)
    {
        var self = ESCWebsocket ;
        // Make sure we are only calling this once at a time
        if (self.onMessage.active) {
          setTimeout(function() {self.onMessage(evt);},1);
          return ;
        }
        self.onMessage.active = true ;
        //console.log("ESCWebsocket: Response: ",evt);
        var delay = Date.now()-self.doSend.time ;
        var dataString = self.ab2str(evt.data);
        var commandChar = dataString.charAt(0);
        var messageString = dataString.substring(1);

        console.log('ESCWebsocket: Message received: ' + dataString + ". Time since last send: "+ delay + ' ms');
        if (dataString.length == 1) {
            console.log ("Only one character received: "+commandChar, evt.data)
        }
        else switch (commandChar) {
        case 'e': // "Event" message
            console.log("ESCWebsocket: Event received: " + messageString);
            onEventMessage(messageString);
            break;
        case 'p': // Ping received
            console.log("ESCWebsocket: Ping received, sending back response.");
            self.doSend ('q'+messageString);
            break;
        case 'q': // Ping response
            self.onPingResponse(messageString);
            break;
        case 't': // Test message - like a ping but commandChar (first byte) not sent in response
        // Thus, the second byte becomes the new commandChar.
        // This is a simple way for the GameServer to run tests.
            self.doSend (messageString);
            break;
        case 'u': // Username requested
            console.log("ESCWebsocket: server is requesting user name. Probably need to reregister." );
            // Attempt to disconnect and reconnect XMPP to reregister.
            // Set a timeout that prevents this from getting called more than once every X seconds.
            if (self.xmppReconnectOnUsernameRequest) {
                reconnectDelay=0 ; // Reconnect immediately after disconnection
                self.xmppReconnectOnUsernameRequest =false ;
                setTimeout(function() {self.xmppReconnectOnUsernameRequest = true},60000);
                xmppDisconnect();
            }

            //var u = self.username ;
            //self.username = "" ;
            //self.setUsername(u);
        break;
        default:
            console.log("ESCWebsocket: Unknown message type (sending back verbatim): "+ commandChar + " " + messageString );
        break;
        }
        self.onMessage.active = false ;
    },
    onError: function(evt) {
        var self = ESCWebsocket ;
        console.log('ESCWebsocket: ERROR: ',evt);
        if (self.state === WebSocket.CONNECTING) {
            // Failed to connect
            tempAlert("Game server not running.",5000,"20%","50%");
            //tempAlert("Failed to connect to game server via WebSocket port " + self.port + "<br>Check that game server is running and listening to correct port.",5000,"20%","50%");
        }
        self.state = self.websocket.readyState ;
    },
    onPingResponse: function(message) {
        var self = ESCWebsocket ;
        var now = Date.now();
        var s = message.split(":",2);
        var oldTime = Number(s[0]);
        if (oldTime > 0) {
            var delay = now-oldTime ;
            if (delay < 1000) {
                self.pingStats.totalMs += delay ;
                self.pingStats.count ++ ;
                var avg = self.pingStats.totalMs/self.pingStats.count ;
                //console.log('Network Latency - Count: '+ self.pingStats.count + ' Delay: '+ delay + " avg: " + avg.toFixed(2));
                tempAlert('Count ' + self.pingStats.count + ' Latency '+ delay + ' avg: '+avg.toFixed(2),1000,"10%","90%");
            }
            else {
                self.pingStats.totalMsLong += delay ;
                self.pingStats.countLong ++ ;
                console.log('Network Latency: ' + delay + ", greater than 1 second; not counted in total. Assumed to be a disconnection or game server not running.");                
            }
        }
    },
    ping: function(message) {
        if (message === undefined)
            message = "" ;
        var self = ESCWebsocket ;
        // resend username if necessary (after a disconnection username is cleared)
        //if (isPlayer)
        //    self.setUsername(self.usernamePlayer);
        self.doSend("p"+Date.now()+":"+message);
    },
    pinger: function(n,delay,message) {
        // Auto send n pings separated by <delay> milliseconds
        // If n = 0 or less, run forever
        // Otherwise, send n pings and stop
        var self = ESCWebsocket ;
        if (n === 1) {
            self.ping(message);
            return ;
        }
        n--;
        var myinterval = setInterval( function() {
            self.ping(message);
            if (n===1)
                return ;
            n = n - 1 ;
            if (n<=0) n = 0 ;
        },delay);
        return myinterval ;
    },
    keepaliveInterval: null ,
    keepalive: function() {
        // calls pinger, saves the ID so that it can be stopped later
        var self = ESCWebsocket ;
        if (self.keepaliveInterval === null)
            self.keepaliveInterval = self.pinger(0,400,"keepalive");
    },
    autopingInterval: null ,
    autoping: function(n,delay,message) {
        // calls pinger, saves the ID so that it can be stopped later
        var self = ESCWebsocket ;
        self.autopingInterval = self.pinger(n,delay,message);
    },
    autopingStop: function() {
        var self = ESCWebsocket ;
        if (self.autopingInterval !== null) {
            clearInterval(self.autopingInterval);
            self.autopingInterval = null ;
        }
    },
    doSend: function(message) {
        var self = ESCWebsocket ;
        // If not connected, connect and try again
        if (self.websocket.readyState != WebSocket.OPEN) {
            if (self.websocket.readyState != WebSocket.CONNECTING) {
            // Send once we're connected/reconnected
                var oldusername = self.username ;
                onConnected = function() {
                    self.setUsername(oldusername);
                    self.doSend(message);
                } ;
                self.newConnection() ;
            }
            return ;
        }

        // Automatically send acknowledgment requests for latency measurements
        //console.log("Ack frequency: " + self.ackFrequency + " " + self.ackFrequencyCount);
        if (message.charAt(0)!=='p' && self.ackFrequency>0) {
            self.ackFrequencyCount += self.ackFrequency ;
            if (self.ackFrequencyCount >= 1) {
                self.ackFrequencyCount-- ;
                message = "a" + Date.now() + ":" + message ;
            }
        }

        if (message.charAt(0)!=='p')
            console.log("ESCWebsocket: SENDING: " + message);
        //var blob = new Blob([message]);
        //websocket.send(blob);
        self.doSend.time = Date.now();
        self.websocket.send(message);
    },
    closeConnection: function() {
        var self = ESCWebsocket ;
        console.log("ESCWebsocket: Closing websocket");
        self.websocket.close();
    }
};

console.log("Done loading escwebsocket.js");
