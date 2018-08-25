/**
 * WC executable
 */ 

var colors = require('colors');
var F      = require('./lib/fundamental');

// test init

// ['EU','AS','AM','AF'].forEach((cont) => {
//   F.drawTeams(cont).then((teams) => console.log(teams.join(', ')));  
// })


F.newTournament().then((tour) => {
  console.log(tour)
  for (let i=0; i<4; i++)
    console.log(tour.round[32][i])
})