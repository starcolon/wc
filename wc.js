/**
 * WC executable
 */ 

var colors = require('colors');
var F      = require('./lib/fundamental');

// test init

F.drawTeams('AF').then((teams) => console.log(teams))