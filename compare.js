/**
 * Compare two teams
 */

var colors = require('colors');
var F      = require('./lib/fundamental');
var PriorityQueue = require('js-priority-queue');

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

var loadTeamScores = function(){
  const maxYears = 50;
  const numRecentMatches = 50;
  const maxYearsToDisplay = 5;
  var teams = [team1, team2];

  var lastYear = null;

  var scoreComparer = (a,b) => b.goal - a.goal;

  F.countYears().asPromise()
    .then((_lastYear) => {
      lastYear = _lastYear;
      let years = lastYear - maxYears;
      return Promise.all([
          F.loadRecentGames(years, {$or: [{home: team1}, {away: team1}, {home: team2}, {away: team2}]}),
          F.loadRecentGoals(years, {$or: [{team: team1}, {against: team1}, {team: team2}, {against: team2}]})
        ])
    })
    .then(([games, scorers]) => {

      console.log(`From ${games.length} meetings`)
      console.log(`From ${scorers.length} goals`)
      console.log()

      var lastMeetings = [];
      var totalStats = [
        {w:0, d:0, l:0, f:0, a:0, biggestWin: [], biggestLoss: [], cleansheet: 0, noscore: 0},
        {w:0, d:0, l:0, f:0, a:0, biggestWin: [], biggestLoss: [], cleansheet: 0, noscore: 0}
      ];

      const INDEXES = [0,1];
      let streakColour = function(st, percent){
        let color = (s) => s.blue;
        if (st.w==0 || st.f==0) { color = (s) => s.red }
        else if (st.l==0 || st.a==0) { color = (s) => s.green }
        return color(`W${st.w} D${st.d} L${st.l} - ${st.f}:${st.a} `)
      }

      let toPercentage = function(st){
        let tot = st.w + st.d + st.l;
        let P = (a) => {
          if (a==undefined || a==null) return undefined;
          let v = (a*100/tot);
          if (v<10) return Math.ceil(v) + '%';
          else return Math.floor(v) + '%';
        }
        return {
          w: P(st.w), d: P(st.d), l: P(st.l), 
          f: st.f, a: st.a,
          noscore: P(st.noscore),
          cleansheet: P(st.cleansheet)
        }
      }

      homeCount = 0;
      awayCount = 0;

      let newerFirst = (a,b) => (b.year*100 - b.round) - (a.year*100 - a.round);
      games.sort(newerFirst).forEach((res) => {
        if ((res.home == teams[0] && res.away == teams[1]) || 
          (res.away == teams[0] && res.home == teams[1])){
          lastMeetings.push(res)
        }

        INDEXES.forEach((i) => {
          if ((res.home == teams[i] && homeCount < numRecentMatches) || 
            (res.away == teams[i] && awayCount < numRecentMatches)){

            let [f,a] = [0,0];
            let opponent = null;
            let venue = 'H';
            let outcome = 'D';
            if (res.home == teams[i]){
              homeCount ++;
              opponent = res.away;
              f = res.f;
              a = res.a;
            }
            else {
              awayCount ++;
              venue = 'A';
              opponent = res.home;
              f = res.a;
              a = res.f;
            }

            if (f>a) outcome = 'W';
            else if (f<a) outcome = 'L';

            totalStats[i].f += f;
            totalStats[i].a += a;
            totalStats[i].w += (outcome == 'W') ? 1 : 0;
            totalStats[i].d += (outcome == 'D') ? 1 : 0;
            totalStats[i].l += (outcome == 'L') ? 1 : 0;
            totalStats[i].cleansheet += (a==0) ? 1 : 0;
            totalStats[i].noscore += (f==0) ? 1 : 0;

            let _res = JSON.parse(JSON.stringify(res));

            if (outcome == 'W'){
              // Update biggest win
              if (totalStats[i].biggestWin[venue]){
                let m0 = totalStats[i].biggestWin[venue];
                if (Math.abs(m0.f - m0.a) <= Math.abs(f - a)){
                  totalStats[i].biggestWin[venue] = _res;
                }
              }
              else totalStats[i].biggestWin[venue] = _res;
            }
            else if (outcome == 'L'){
              // Update biggest loss
              if (totalStats[i].biggestLoss[venue]){
                let m0 = totalStats[i].biggestLoss[venue];
                if (Math.abs(m0.f - m0.a) <= Math.abs(f - a)){
                  totalStats[i].biggestLoss[venue] = _res;
                }
              }
              else totalStats[i].biggestLoss[venue] = _res;
            }
          }
        })
      })


      lastMeetings.sort((a,b) => b.year*1000 + b.round - a.year*1000 + a.round)

      let renderMatch = function(m, refTeam){
        if (!m) return '--';
        var color = (s) => s;
        if (m.outcome == 'W' && m.home == refTeam) color = (s) => s.green;
        else if (m.outcome == 'L' && m.away == refTeam) color = (s) => s.green;
        else if (m.outcome == 'L' && m.home == refTeam) color = (s) => s.red;
        else if (m.outcome == 'W' && m.away == refTeam) color = (s) => s.red;
        return color(`  ${m.home} ${m.f}-${m.a} ${m.away} ----- year #${m.year}, ${PERF[m.round]}`)
      }

      console.log()
      console.log('LAST 7 MEETINGS'.blue)
      console.log('========================='.blue)
      for (i=0; i<7; i++){
        if (i >= lastMeetings.length) break;
        var m = lastMeetings[i]
        console.log(renderMatch(m, teams[0]))
      }
      if (lastMeetings.length == 0)
        console.log("  none")

      console.log()
      console.log()

      console.log(`ALL TIME STATS (last ${numRecentMatches} games)`.blue)
      console.log('================================'.blue)
      INDEXES.forEach((i) => {
        let record = totalStats[i];
        let precord = toPercentage(record);
        let stat = `- ${record.cleansheet} cleansheets (${precord.cleansheet}), ${record.noscore} games without scoring (${precord.noscore})`;
        console.log(teams[i], streakColour(precord), stat)
        console.log(`      Biggest home win : `, renderMatch(record.biggestWin['H'], teams[i]))
        console.log(`      Biggest away win : `, renderMatch(record.biggestWin['A'], teams[i]))
        console.log(`      Biggest home loss : `, renderMatch(record.biggestLoss['H'], teams[i]))
        console.log(`      Biggest away loss : `, renderMatch(record.biggestLoss['A'], teams[i]))
        console.log()
      })

      console.log()
      console.log()

      var t1 = padEnd(teams[0], 19, ' ')
      var t2 = padEnd(teams[1], 19, ' ')
      console.log(' YEAR | ', t1, t2)
      console.log(padEnd('-', 50, '-'))

      for (let y=0; y<maxYearsToDisplay; y++){
        let Y = lastYear - y;
        if (Y<0) continue;

        let resultsY = games.filter((a) => a.year == Y)
        let scorersY = scorers.filter((a) => a.year == Y)

        resultsY.sort((a,b) => a.round - b.round)

        let bestPerf = [64,64];
        let streaks = [{w:0, d:0, l:0, f:0, a:0}, {w:0, d:0, l:0, f:0, a:0}]

        resultsY.forEach((r) => {
          INDEXES.forEach((i) => {
            if (r.home == teams[i] || r.away == teams[i]){
              if (r.round < bestPerf[i]){
                // Find the best performance so far
                bestPerf[i] = r.round
              }

              // Record win/tie/lose
              if ((r.home == teams[i] && r.outcome == 'W') || 
                  (r.away == teams[i] && r.outcome == 'L')){
                streaks[i].w ++;
              }
              else if ((r.home == teams[i] && r.outcome == 'L') || 
                  (r.away == teams[i] && r.outcome == 'W')){
                streaks[i].l ++;
              }
              else {
                streaks[i].d ++;
              }

              if ((r.home == teams[i])){
                streaks[i].f += r.f;
                streaks[i].a += r.a;
              }
              else {
                streaks[i].f += r.a;
                streaks[i].a += r.f;
              }
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
        var topScorersSorted = [null, null];
        for (let i=0; i<2; i++){
          topScorersSorted[i] = new PriorityQueue({comparator:scoreComparer})
          for ([_,t] of Object.entries(topScorers[i])){
            topScorersSorted[i].queue(t)
          }
        }
        var yearStr = ' ' + padEnd(Y.toString(),3,' ')

        var streakStr = streaks.map(streakColour);

        var colourRound = (r) => 
          (r.trim().toLowerCase()=='group stage') ? padEnd(r,16,' ').gray : 
          (r.trim().toLowerCase()=='final') ? padEnd(r,16,' ').cyan : padEnd(r,16,' ').yellow;

        let rounds = [colourRound(PERF[bestPerf[0]]), colourRound(PERF[bestPerf[1]])]

        console.log(yearStr, ' | ', 
          rounds[0],' | ',
          rounds[1])
          // padEnd(PERF[bestPerf[0]],16,' '),' | ',
          // padEnd(PERF[bestPerf[1]],16,' '))
        console.log('      | ',
          padEnd(streakStr[0],16,' '), ' | ',
          padEnd(streakStr[1],16,' '))
        console.log(padEnd('-', 50, '-'))

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
        console.log(padEnd('-', 50, '-'))
      }
    })
    .then(() => process.exit(0))
}

loadTeamScores()