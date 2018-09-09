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

  if (tour.round[1] != null){
    console.log('CHAMPIONS ARE '.magenta, tour.round[1][0].teams[0].team)
  }
  
  return F.viewYearSummary(year*1)
}).then(() => process.exit(0))