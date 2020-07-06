# ESC HTML/JavaScript Game Controller
*****

Start webserver and OSC relay by running the shell script `eschttpstart`. Ctrl-c in that window should stop the processes, or run `eschttpstop`.

### Directories:

## eschttp/
HTML and Javascript files for the game controller. Serve this directory on a webserver, preferably with php support.

Here is a simple command-line php webserver that will work fine for development (set `$PORT` to the desired port, the traditional port 80 will probably not work):

```
php -S 0.0.0.0:$PORT -t eschttp &
```

## escosc/
For relaying OSC from a websocket to a UDP port. This is not needed for the newer communication layer using websockets directly in Unity, but we're keeping it for speed comparisons.

To start relay from the command line (if this directory is linked from `escosc`):

```
node escosc/index.js
```

### Running over a VPN
The controller can be run over a VPN to a remote machine using ssh port forwarding.
Often during development it will be convenient to run a server on the same machine that is doing the port forwarding,
in which case different port numbers should be used, forwarded to other ports on the remote machine.
Here is an example of an ssh command using port 8001 for the HTTP server (forwarded to 8000), port 5281 forwarded to 5280 for XMPP,
and 8886 forwarded to 8887 for WebSockets:
```
ssh -g -L 8001:192.168.10.203:8000 -g -L 5281:192.168.10.203:5280 -g -L 8886:192.168.10.203:8887 escuser@192.168.10.203 -v
```
The JavaScript code uses these as substitute default ports if the HTTP port is 8001, but if different ports are used they can 
be specified by URL parameters. See ```esc.js```.