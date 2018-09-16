/**
 * Compare two teams
 */

var colors = require('colors');
var F      = require('./lib/fundamental');
var PriorityQueue = require('js-priority-queue');

var team1 = process.argv.slice(2)[0];
var team2 = process.argv.slice(2)[1];

var PERF = {64: 'Did not qualify', 32: 'Group stage', 16: 'Round16', 8: 'Qtr', 4: 'Semi', 2: 'Runners-up', 1: 'CHAMPIONS'}

var initAnnualPerformance = function(){
  return {round: null, w:0, d:0, l:0, f:0, a:0}
}

var loadTeamScores = function(){
  var maxYears = 10;
  var teams = [team1, team2];

  var annualPerformance = [initAnnualPerformance(), initAnnualPerformance()];
  var annualScorers = [{name: null, score: null}, {name: null, score: null}];
  var mostOpponentScorers = [];

  var lastYear = null;

  F.countYears().asPromise()
    .then((_lastYear) => {
      lastYear = _lastYear;
      return Promise.all([
          F.loadRecentGames(lastYear - maxYears,{$or: [{home: team1}, {away: team1}, {home: team2}, {away: team2}]}),
          F.loadRecentGoals(lastYear - maxYears,{$or: [{team: team1}, {against: team1}, {team: team2}, {against: team2}]})
        ])
    })
    .then(([results, scorers]) => {

      console.log(`From ${results.length} matches`)
      console.log(`From ${scorers.length} goals`)
      console.log()

      for (let y=0; y<maxYears; y++){
        let Y = lastYear - y;
        if (Y<0) continue;

        let resultsY = results.filter((a) => a.year == Y)
        let scorersY = scorers.filter((a) => a.year == Y)

        resultsY.sort((a,b) => a.round - b.round)

        let bestPerf = [64,64];

        resultsY.forEach((r) => {
          [0,1].forEach((i) => {
            if (r.home == teams[i] || r.away == teams[i]){
              if (r.round < bestPerf[i]){
                // Find the best performance so far
                bestPerf[i] = r.round
              }

              // TAOTODO: Record win/tie/lose
            }
          })
        })

        let topScorers = [{},{}];
        let topOppoScorers = [{},{}];

        scorersY.forEach((s) => {
          teams.forEach((t,i) => {
            // Scored by the team
            if (s.team == t){
              if (!(s.player in topScorers[i]))
                topScorers[i][s.player] = {player: s.player, goal: 0}
              topScorers[i][s.player]++;
            }

            // Scored against the team
            if (s.against == t){
              if (!(s.player in topOppoScorers[i]))
                topOppoScorers[i][s.player] = {player: s.player, goal: 0}
              topOppoScorers[i][s.player]++;
            }

            // TAOTODO: Record the minutes that the team score or concede
          })
        })

        // Sort the scoreres
        var scoreComparer = (a,b) => a.goal - b.goal;
        var topScorersSorted = [null, null];
        for (let i=0; i<2; i++){
          topScorersSorted[i] = new PriorityQueue({comparator:scoreComparer})
          for ([_,t] of Object.entries(topScorers)){
            topScorersSorted[i].queue(t)
          }
        }

        console.log('YEAR : ', Y)
        console.log(`Best performance ${teams[0]} : ${PERF[bestPerf[0]]}`)
        console.log(`Best performance ${teams[1]} : ${PERF[bestPerf[1]]}`)
        console.log(topScorersSorted[0].dequeue())
        console.log(topScorersSorted[1].dequeue())

        // TAOTODO:
      }
    })
    .then(() => process.exit(0))
}

loadTeamScores()