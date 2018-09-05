/**
 * WC executable
 */ 

var colors = require('colors');
var F      = require('./lib/fundamental');

// F.newTournament()

// var scorers = [
//   '0-1 Arnautovic 10',
//   '1-1 Mahmoud 21',
//   '2-1 Mahmoud pen41',
//   '3-1 Darlem 88'
// ]
// F.addFixture(1,32,0,0,'3-1',scorers).then(() => {
//   console.log('Woohooo!');
//   process.exit(0)
// })

function repl(){
  let year;
  return F.countYears().asPromise()
    .then((yr) => {
      year = yr;
      return Promise.all([F.proceedTournament(yr), F.loadTournament(yr)])
    })
    .then((both) => {
      let [a,tours] = both;
      let tour = tours[0];
      let [nextRound, nextGroup, nextMatch] = a;
      let home = tour.round[nextRound][nextGroup].fixture[nextMatch].home;
      let away = tour.round[nextRound][nextGroup].fixture[nextMatch].away;
      
      console.log('YEAR  : '.green, year)
      console.log('ROUND : '.green, nextRound)
      console.log('GAME  : '.green, nextMatch+1)
      console.log()
      console.log('NEXT MATCH : '.magenta, home + ' v ' + away)
      console.log()
      return F.inputScore()
    })
    .then((sc) => {
      let [score,scorers] = sc;
      console.log(score)
      console.log(scorers);
      // TAOTODO:
    })
}

// TAOTODO: Repeat the REPL until the user terminates the loop
repl()