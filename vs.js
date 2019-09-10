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

function loadAllMatches(team1, team2){

  return (lastYear) => {
    let years = lastYear - maxYears;
    return Promise.all([
        // TAOTODO: This wont work, it causes duplicate records
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

F.countYears()
  .asPromise()
  .then(loadAllMatches(team1, team2))
  .then(([games1, goals1, games2, goals2]) => {

    // console.log(`Games 1 (${team1}): ${games1.length}`)
    // console.log(`Games 2 (${team2}): ${games2.length}`)
    console.log(goals1.length)
    console.log(goals2.length)

  })
  .catch((e) => {console.log(e); process.exit(1)})
  .then(() => process.exit(0))

// TAOTODO