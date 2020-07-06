<?php

include "config/init.php";

GLOBAL $CONFIG;

?>

<!DOCTYPE html>
<html>
<head>
    <title>ESC Player controller</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes"><!--If launched from home screen, will launch in full screen mode -->
    <meta name="mobile-web-app-capable" content="yes">
    <!--<meta name="apple-itunes-app" content="app-id=XXXXXXXXX"> Once we have an app?-->

    <link rel="stylesheet" href="css/player-controller.css" />

    <script src='http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.min.js'></script>
    <script src="javascript/osc/osc-browser.min.js"></script>
    <script src='javascript/strophe.js'></script>
    <script src="javascript/compatibility/startswith.js"></script><!-- Needed to support old browsers-->
    <script src="javascript/compatibility/searchparams.js"></script><!-- Needed to support old browsers-->
    <script src="javascript/compatibility/NoSleep.js"></script><!-- Needed to prevent browser from sleeping-->

    <?php include "javascript/jsmodel.php" ?>

    <script>
      includeJS('javascript/swipe.js','defer');
      includeJS('javascript/esc.js','defer');
      includeJS('javascript/escwebsocket.js','defer');
      includeJS('games/playerController.js','defer');
      includeJS('games/pixelprisonblues.js','defer');
      includeJS('games/robotbasketballpro.js','defer');
      includeJS('games/cubeballpro.js','defer');
      includeJS('games/snb.js','defer');
      includeJS('games/fruitpro.js','defer');
      includeJS('games/beespro.js','defer');
      includeJS('games/networkdemo.js','defer');
      var testPlayer = 0 ;
    </script>

</head>
<body style="background-color: #333333; bottom: 0; left: 0;">
    <!-- <div id='background' style="position:fixed;width: 100%;height:100%; z-index:-1"></div>-->
    <div style="visibility: hidden">
        <div id='login' style='font-size: 100% z-index:1' >
            <label for='jid'>Player name:</label>
            <input type='text' name='jid' id='jid' value='notworking' onchange="setUserName(this.value)">
        </div>
        <button id='connect' value='connect' class="button">Connect</button>
        <button id='join' onclick="playerController.joinGame()" class="button">Join Game</button>
        <br>
        <button id='ping' onclick="sendPing(docentUser,'ping:me');" class="button">Ping</button>
        <button id='renderController' onclick="playerController.renderController(); return false" class="button">Show controller</button>

        <br>
        Current game: <span id="currentGame"></span><br>
        Player ID: <span id="playerid"> </span>
        <button onclick="setOSCindex(prompt('New OSC value:'))">OSC index: <span id="oscindex"> </span></button>
        <span id="sprite"></span> <span id="team"></span>
        <button onclick="document.exitFullScreen();">-FS</button>
        <button onclick="setTimeout(function(){window.scrollTo(0, 100);}, 1);">v</button>
        <button onclick="window.scrollTo(0, 0);">^</button>
    </div>
    <div id="gofullscreen" onclick="goFullScreen();">
        ^<br>^<br>^<br>^<br>^<br>^<br>^<br>^<br>^<br>Go<br>Full<br>Screen<br>^<br>^<br>^<br>^<br>^<br>^<br>^<br>^<br>^<br>^<br>^<br>^<br>^
    </div>
    <br />
    <div id=controller style="opacity: 100%; position: fixed; bottom: 0; right: 0; left: 0; top: 0;"></div>
    <div id=rotateme style="opacity: 100%; position: absolute; bottom: 0; left: 0;">Rotate me please!</div>

    <div id='logdiv' style="height: 50vh; overflow: scroll; visibility: hidden;">
        <table id='log'></table>
    </div>
    <script type="text/javascript">
      // Do anything else here?
    </script>
</body>
</html>