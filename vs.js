/**
 * Compare two teams
 */

var colors = require('colors');
var F      = require('./lib/fundamental');
var PriorityQueue = require('js-priority-queue');

const maxYears = 60;

var team1 = process.argv.slice(2)[0].replace('_', ' ');
var team2 = process.argv.slice(2)[1].replace('_', ' ');

var PERF = {64: 'Did not qualify '.gray, 32: 'Group stage', 16: 'Round16', 8: 'Qtr', 4: 'Semi', 2: 'Final'}
var initAnnualPerformance = function(){
  return {round: null, w:0, d:0, l:0, f:0, a:0}
}

function loadAllMatches(team1, team2){

  return (lastYear) => {
    let years = lastYear - maxYears;
    return Promise.all([
        Promise.resolve(lastYear),
        // Team 1
        F.loadRecentGames(years, {$or: [{home: team1},{away: team1}]}),
        F.loadRecentGoals(years, {$or: [{team: team1},{against: team1}]}),
        // Team 2
        F.loadRecentGames(years, {$or: [{home: team2},{away: team2}]}),
        F.loadRecentGoals(years, {$or: [{team: team2},{against: team2}]}),
        // VS
        F.loadRecentGames(years, {$and: [
          {home: {$in: [team1, team2]}},
          {away: {$in: [team1, team2]}}
        ]})
      ])
  }
}

function printGame(lastYear,g,focusedTeam){
  let yearDiff = lastYear - g.year;
  let diff = yearDiff == 0 ? "This year" : yearDiff + " yrs ago";
  let teamColour = (t) => {
    if (g.outcome=='W' && focusedTeam==g.home) return t.green;
    else if (g.outcome=='L' && focusedTeam==g.away) return t.green;
    else if (g.outcome=='L' && focusedTeam==g.home) return t.red;
    else if (g.outcome=='W' && focusedTeam==g.away) return t.red;
    else return t;
  }
  let score = teamColour(`${g.f}-${g.a}`);
  let home = g.home == focusedTeam ? teamColour(g.home) : g.home;
  let away = g.away == focusedTeam ? teamColour(g.away) : g.away;

  console.log(`${diff.padEnd(10)} : ${PERF[g.round]} : ${home} ${score} ${away}`)
}

function collectPastHistory(matches){
  let [lastYear, games1, goals1, games2, goals2] = matches;

  // TAOTODO:
  for (let i=0; i<15; i++)
    printGame(lastYear, games1[i], team1)
}

F.countYears()
  .asPromise()
  .then(loadAllMatches(team1, team2))
  .then(collectPastHistory)
  .catch((e) => {console.log(e); process.exit(1)})
  .then(() => process.exit(0))

// TAOTODO