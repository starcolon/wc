/**
 * Compare two teams
 */

var colors = require('colors');
var F      = require('./lib/fundamental');
var PriorityQueue = require('js-priority-queue');

var team1 = process.argv.slice(2)[0];
var team2 = process.argv.slice(2)[1];

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

      var t1 = padEnd(teams[0], 19, ' ')
      var t2 = padEnd(teams[1], 19, ' ')
      console.log(' YEAR | ', t1, t2)
      console.log(padEnd('-', 40, '-'))

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
              topScorers[i][s.player].goal ++;
            }

            // Scored against the team
            if (s.against == t){
              if (!(s.player in topOppoScorers[i]))
                topOppoScorers[i][s.player] = {player: s.player, goal: 0}
              topOppoScorers[i][s.player].goal ++;
            }

            // TAOTODO: Record the minutes that the team score or concede
          })
        })

        // Sort the scoreres
        var scoreComparer = (a,b) => b.goal - a.goal;
        var topScorersSorted = [null, null];
        for (let i=0; i<2; i++){
          topScorersSorted[i] = new PriorityQueue({comparator:scoreComparer})
          for ([_,t] of Object.entries(topScorers[i])){
            topScorersSorted[i].queue(t)
          }
        }

        var yearStr = ' ' + padEnd(Y.toString(),3,' ')

        console.log(yearStr, ' | ', 
          padEnd(PERF[bestPerf[0]],16,' '),' | ',
          padEnd(PERF[bestPerf[1]],16,' '))

        for (i=0; i<5; i++){
          var v1 = padEnd(' ',16,' ')
          var v2 = padEnd(' ',16,' ')
          if (topScorersSorted[0].length > 0){
            let n = topScorersSorted[0].dequeue();
            v1 = padEnd(`${n.player} ${n.goal}`,16,' ')
          }
          if (topScorersSorted[1].length > 0){
            let n = topScorersSorted[1].dequeue();
            v2 = padEnd(`${n.player} ${n.goal}`,16,' ')
          }

          console.log('      | ', v1, ' | ', v2)
        }
        console.log('      | ')
      }
    })
    .then(() => process.exit(0))
}

loadTeamScores()