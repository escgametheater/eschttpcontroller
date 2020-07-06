<?php

include "config/init.php";

?>

<!DOCTYPE html>
<html>
<head>
    <title>ESC Docent controller</title>
    <link rel="stylesheet" href="css/docent.css" />
    <script src='http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.min.js'></script>
    <script src='javascript/strophe.js'></script>
    <script src="javascript/compatibility/startswith.js"></script><!-- Needed to support old browsers-->
    <script src="javascript/compatibility/searchparams.js"></script><!-- Needed to support old browsers-->

    <?php include "javascript/jsmodel.php" ?>

    <script>
        includeJS('javascript/esc.js','defer');
        includeJS('javascript/escwebsocket.js','defer');
    </script>


  </head>
<body style="font-size: 4vw">
<div id='login' style='font-size: 100%; display:none' >
    <form name='cred'>
        <label for='jid'>JID:</label>
        <input type='text' id='jid' value=''>
        <br>
        <label for='sendto'>Send to:</label>
        <input type='text' id='sendto' value='echobot@esc-game-server.local'>
        <label for='sendmsg'>Chat:</label>
        <input type='text' id='sendmsg' value='hello'>
        <input type='button' id='sendButton' value='Send'>
        <br>
    </form>
</div>
<div id='gamebuttons' style="display: none;"></div>
<div>
    Choose game to load:<br>
    <button onclick='loadGame("pixelprisonblues")' class="button" style="display: none;">pixelprisonblues</button>
    <div class="inline">
        <button  class="bimage" onclick='loadGame("robotbasketballpro")' class="bimage" style="background-image: url('games/robotbasketballpro/logo-pro-512.png');"></button><br>
        <button onclick='loadGame("robotbasketballpro")' class="bimagetext">Robot BBall</button>
    </div>
    <div class="inline">
        <button onclick='loadGame("beespro")' class="bimage" style="background-image: url('games/beespro/beespro_background.jpg');"></button><br>
        <button onclick='loadGame("beespro")' class="bimagetext">Bee Racing</button>
    </div>
    <div class="inline">
        <button onclick='loadGame("cubeballpro")' class="bimage" style="background-image: url('games/cubeballpro/background.png');"></button><br>
        <button onclick='loadGame("cubeballpro")' class="bimagetext">Cube Ball</button>
    </div>
    <br style="clear:both">
    <br>
    Current game id: <span id="currentGame"></span>
    <br>
    <br>
    <!-- Let's add in buttons for all the games -->

    Game controls:<br>
    <button id='nextButton' onclick="nextCommand()" class="button">Next</button>
    <button id='startButton' onclick="startGame()" class="button">Start Game</button>
    <button id='quitButton' onclick="quitGame()" class="button">Quit Game</button>
    <br>
    <br>
    Client controls:<br>
    <table><tr>
            <td><button id='quitButton' onclick="broadcast('autoplay:'+document.getElementById('autoplayperiod').value)" class="button">Autoplay</button></td>
            <td align=center style="line-height: 1.5">Delay: <span id="slidervalue">33</span>ms<br>
                1<input type="range" min="1" max="1000" value="33" class="slider" id="autoplayperiod" oninput="document.getElementById('slidervalue').innerHTML=this.value;+'ms';" onchange="broadcast('autoplay:'+this.value)" >1000</td>
            <td><button id='quitButton' onclick="broadcast('autoplaystop:')" class="button">Stop autoplay</button>
            </td></tr></table>
    <br>
    <button id='quitButton' onclick="broadcast('reloadClient:')" class="button">Reload clients</button>
    <br>
    <br>Connect or disconnect docent:
    <button id='connect' value='connect' class="button">Connect</button><br>
    <hr>
    <div id='logdiv' style="height: 300px; overflow: scroll;">
        <table id='log'></table>
    </div>
    <script type="text/javascript">
      var isDocent = true ;

    </script>
</body>
</html>
