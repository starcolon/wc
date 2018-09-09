/**
 * View tournament
 */ 

var colors = require('colors');
var F      = require('./lib/fundamental');

var year = process.argv.slice(2)[0]

var loader = year ? 
  F.loadTournament(year*1).asPromise() : 
  F.countYears().asPromise().then((n) => {
    return F.loadTournament(n*1).asPromise()
  });

loader.then((tours) => {

  console.log('READING TOURNAMENT : ', year)
  var tour = tours[0]

  var scoreToStr = function(score){
    if (score == null) return 'v';
    else [score.f, score.a].join('-')
  }

  for (let i=0; i<1; i++){
    console.log('GROUP : '.cyan, i)
    console.log(tour.round[32][i])
    console.log(tour.round[32][i].fixture.map((m) => {
      return [m.home, 'v', m.away].join(' ')
    }))
  }

  console.log(tour.round[1][0].teams) // Champions
}).then(() => process.exit(0))