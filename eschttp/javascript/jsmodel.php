<?php
/**
 * Created by PhpStorm.
 * User: christophercarter
 * Date: 5/4/18
 * Time: 2:51 PM
 */

GLOBAL $CONFIG;

?>

<script>
  // Set my IP address if this is served as a php file
  // I don't think the IP address is actually used, but it is sent by the controller's "regsitered:" response
  // If the actual IP address is desired, serve this page as a PHP document.
  // A simple way is to link .html to .php, and serve by a webserver
  var myIP="<?= $CONFIG['game-server-ip']; ?>" ;
  var serverHostname="<?= $CONFIG['game-server-host'] ?>" ;
  if (myIP.charAt(0) === "<")
    myIP = "0.0.0.0";
  console.log("Your IP address is: "+myIP);

  serverHostname = serverHostname.toLowerCase();
  if (serverHostname.charAt(0) === "<")
    serverHostname = "esc-game-server.local";
  console.log("Server host name : "+serverHostname);

  // Including my files this way so they don't get cached, which is annoying while debugging
  function includeJS(f,attr) {
    document.write("<script " + attr+ " type='text/javascript' src='"+f+"?v=" + Date.now() + "'><\/script>");
  }
</script>

