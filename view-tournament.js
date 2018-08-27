/**
 * View tournament
 */ 

var colors = require('colors');
var F      = require('./lib/fundamental');

var year = process.argv.slice(2)[0]

var loader = year ? 
  F.loadTournament(year*1) : 
  F.countYears().do((n) => {
    year = n;
    return F.loadTournament(n*1) // TAOTODO: Doesn't work well here
  });

loader.do((tours) => {

  console.log('READING TOURNAMENT : ', year)
  var tour = tours[0]

  var scoreToStr = function(score){
    if (score == null) return 'v';
    else [score.f, score.a].join('-')
  }

  // console.log(tour)
  for (let i=0; i<4; i++){
    console.log('GROUP : '.cyan, i)
    console.log(tour.round[32][i])
    console.log(tour.round[32][i].fixture.map((m) => {
      return [m.home, scoreToStr(m.score), m.away].join(' ')
    }))
  }
}).then(() => process.exit(0))