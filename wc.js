/**
 * WC executable
 */ 

var colors = require('colors');
var F      = require('./lib/fundamental');

function padEnd(str,targetLength,padString) {
  targetLength = targetLength>>0; //floor if number or convert non-number to 0;
  padString = String((typeof padString !== 'undefined' ? padString : ' '));
  if (str.length > targetLength) {
    return String(str);
  }
  else {
    targetLength = targetLength-str.length;
    if (targetLength > padString.length) {
      padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
    }
    return String(str) + padString.slice(0,targetLength);
  }
}

function printTable(group){
  console.log('             W  D  L '.cyan + '  F   A '.green + '  P'.magenta)
  group.teams.forEach((t) => {
    console.log(
      padEnd(t.team, 12, ' '), 
      t.w + ' ', 
      t.d + ' ',
      t.l + ' ',
      (t.f < 10 ? ' ' + t.f : t.f) + ' ',
      (t.a < 10 ? ' ' + t.a : t.a) + ' ',
      t.pt < 10 ? ' ' + t.pt : t.pt)
  })
}

function printLeg(group){
  console.log(
    'First leg : '.green,
    group.teams[0].team + ' ' + group.teams[0].f + '-' + group.teams[0].a + ' ' + group.teams[1].team
  )
}

function repl(){
  let year;
  let tour;
  let [nextRound, nextGroup, nextMatch] = [null,null,null]
  return F.countYears().asPromise()
    .then((yr) => {
      if (yr == 0){
        // Start a new tournament
        year = 1;
        return F.newTournament().then(() => Promise.all([F.proceedTournament(1), F.loadTournament(1)]))
      }
      else {
        // Continue the recent tournament
        year = yr;
        return Promise.all([F.proceedTournament(yr), F.loadTournament(yr)])  
      }
    })
    .then((both) => {
      let [a,tours] = both;
      tour = tours[0];
      [nextRound, nextGroup, nextMatch] = a;
      console.log(a) // TAODEBUG:
      return nextRound
    })
    .then((round) => { 
      if (round > 0) return F.refreshTournament(year,nextRound)
      else {
        // TAOTODO: Display summary of the last tournament
        console.log('TOURNAMENT ENDED!'.magenta)

        // Proceed to the next year!
        nextGroup = 0;
        nextMatch = 0;
        nextRound = 32;
        return F
          .refreshTournament(year,1) // Update current champions!
          .then(() => {
            year = year + 1;
            return F.newTournament()
          })
          .then(() => F.loadTournament(year))
          .then((tours) => tours[0])
      }
    })
    .then((t) => {

      tour = t;

      let home = tour.round[nextRound][nextGroup].fixture[nextMatch].home;
      let away = tour.round[nextRound][nextGroup].fixture[nextMatch].away;
      
      console.log('YEAR  : '.green, year)
      console.log('ROUND : '.green, nextRound, ' #', nextGroup)
      console.log('GAME  : '.green, nextMatch)
      console.log()
      
      if (nextRound == 32){
        printTable(tour.round[32][nextGroup])
      }
      else if (nextMatch == 1){
        printLeg(tour.round[nextRound][nextGroup])
      }

      console.log('NEXT MATCH : '.magenta, home + ' v ' + away)
      console.log()
      return F.inputScore()
    })
    .then((sc) => {
      let [score,scorers] = sc;
      console.log(score)
      console.log(scorers);
      return F.addFixture(year,nextRound,nextGroup,nextMatch,score,scorers)
    })
    .then(() => {
      if (nextRound == 32){
        // Re-display the table after match
        return F.loadTournament(year)
          .do((tours) => {
            printTable(tours[0].round[32][nextGroup])
          })
          .asPromise()
      }
      else return Promise.resolve(null)
    })
    .then(() => repl())
}

repl()