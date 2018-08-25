/**
 * WC executable
 */ 

var colors = require('colors');
var F      = require('./lib/fundamental');

// test init

['EU','AS','AM','AF'].forEach((cont) => {
  F.drawTeams(cont).then((teams) => console.log(teams.join(', ')));  
})
