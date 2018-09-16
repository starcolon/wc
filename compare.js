/**
 * Compare two teams
 */

var colors = require('colors');
var F      = require('./lib/fundamental');
var PriorityQueue = require('js-priority-queue');

var team1 = process.argv.slice(2)[0];
var team2 = process.argv.slice(2)[1];

var initAnnualPerformance = function(){
  return {round: null, w:0, d:0, l:0, f:0, a:0}
}

var loadTeamScores = function(){
  var maxYears = 10;
  var teams = [team1, team2];
  var results = teams.map((t) => F.loadRecentGames(maxYears,{$or: [{team: t}, {against: t}]}));
  var scorers = teams.map((t) => F.loadRecentGoals(maxYears,{$or: [{team: t}, {against: t}]}));

  var annualPerformance = [initAnnualPerformance(), initAnnualPerformance()];
  var annualScorers = [{name: null, score: null}, {name: null, score: null}];
  var mostOpponentScorers = [];

  F.countYears().asPromise()
    .then((lastYear) => {
      for (let y=0; y<maxYears; y++){
        let Y = lastYear - y;
        if (Y<0) continue;
        
        let resultsY = results.filter((a) => a.year == Y)
        let scorersY = scorers.filter((a) => a.year == Y)

        resultsY.sort((a,b) => a.round - b.round)

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
          for (t in Object.entries(topScorers)){
            topScorersSorted[i].queue(t)
          }
        }

        console.log('YEAR : ', Y)
        console.log(topScorers[0].peek)
        console.log(topScorers[1].peek)

        // TAOTODO:
      }
    })
}

// TAOTODO:
loadTeamScores()