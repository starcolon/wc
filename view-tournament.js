/**
 * View tournament
 */ 

var colors = require('colors');
var F      = require('./lib/fundamental');

var year = process.argv.slice(2)[0]

console.log('READING TOURNAMENT : ', year)

F.loadTournament(year*1).then((tours) => {

  var tour = tours[0]

  // console.log(tour)
  for (let i=0; i<4; i++){
    console.log('GROUP : '.cyan, i)
    console.log(tour.round[32][i])
    console.log(tour.round[32][i].fixture.map((m) => m.home + ' v ' + m.away))
  }
}).then(() => process.exit(0))