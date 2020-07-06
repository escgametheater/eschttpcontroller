<?php
/**
 * Created by PhpStorm.
 * User: christophercarter
 * Date: 5/3/18
 * Time: 2:29 PM
 */

$CONFIG = [
    'game-server-ip' => $_SERVER['REMOTE_ADDR'],
    'game-server-host' => gethostname()
];

// Uncomment below if you want to use defaults and connect to shared game server
//$CONFIG['game-server-host'] = 'esc-game-server.local'; // This is currently the hostname of the main office game server.
//$CONFIG['game-server-ip'] = '192.168.10.68'; // This IP is collected from the main game server via DHCP.