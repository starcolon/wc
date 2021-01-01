/**
 * Compare two teams
 */

var colors = require('colors');
var F      = require('./lib/fundamental');
var PriorityQueue = require('js-priority-queue');

const maxYears = 100;

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

function printGame(lastYear,g,focusedTeam,maxPad){
  if (!g)
    return;
  let yearDiff = lastYear - g.year;
  let diff = yearDiff == 0 ? "This year" : "Last " + yearDiff + " years";
  let teamColour = (t,pad) => {
    let n = pad || 0;
    if (g.outcome=='W' && focusedTeam==g.home) return (t.padEnd(n)).green;
    else if (g.outcome=='L' && focusedTeam==g.away) return (t.padEnd(n)).green;
    else if (g.outcome=='L' && focusedTeam==g.home) return (t.padEnd(n)).red;
    else if (g.outcome=='W' && focusedTeam==g.away) return (t.padEnd(n)).red;
    else return t.padEnd(n);
  }
  let score = teamColour(`${g.f}-${g.a}`);
  let home = g.home == focusedTeam ? teamColour(g.home,maxPad) : g.home.padEnd(maxPad);
  let away = g.away == focusedTeam ? teamColour(g.away) : g.away;

  console.log(`${diff.padEnd(13)} : ${PERF[g.round].padEnd(11)} : ${home} ${score} ${away}`)
}

function collectStreak(matches, team){
  var streak = '';
  for (m of matches){
    if (m.outcome=='W' && m.home==team) streak += 'W'.green;
    else if (m.outcome=='L' && m.away==team) streak += 'W'.green;
    else if (m.outcome=='L' && m.home==team) streak += 'L'.red;
    else if (m.outcome=='W' && m.away==team) streak += 'L'.red;
    else streak += 'D';
  }
  return streak;
}

function collectYear(lastYear, diffYear, games){
  var line = diffYear == 0 ? "This year" : `last ${diffYear} years`;
  line = line.padEnd(16) + ': ';
  for (n=0; n<=1; n++){
    let ydata = games[n].filter((g) => g.year == lastYear-diffYear)
    let bestShot = 32;
    for (a of ydata){
      if (a.round<bestShot)
        bestShot = a.round;
    }

    line += ydata.length == 0 ? '--'.padEnd(14).red : 
            bestShot <= 8 ? (PERF[bestShot].padEnd(14)).green : 
            bestShot == 32? (PERF[bestShot].padEnd(14)).red :
            PERF[bestShot].padEnd(14);
  }
  console.log(line);
}

function collectPastHistory(matches){
  let [lastYear, games1, goals1, games2, goals2, meetings] = matches;

  let teams = [team1, team2];
  let games = [games1, games2];
  
  const LAST_N_GAMES = 15;
  const LAST_N_YEARS = 15;

  for (let n=0; n<=1; n++){
    console.log()
    console.log(`===================================`.magenta)
    console.log(` ${teams[n]} : ${collectStreak(games[n].slice(0,LAST_N_GAMES), teams[n])}`)
    console.log(`===================================`.magenta)
    
    var maxPad = 0;
    for (let i=0; i<LAST_N_GAMES; i++)
      maxPad = Math.max(maxPad, games[n][i].home.length)

    for (let i=0; i<LAST_N_GAMES; i++)
      printGame(lastYear, games[n][i], teams[n], maxPad)
  }

  console.log()
  console.log(`===================================`.magenta)
  console.log(` RECENT ${LAST_N_YEARS} YEARS`)
  console.log(`===================================`.magenta)
  console.log(`${''.padEnd(17)} ${team1.padEnd(14)} ${team2}`)
  for (let i=0; i<LAST_N_YEARS; i++){
    collectYear(lastYear, i, games);
  }

  maxPad = Math.max(teams);
  console.log()
  console.log(`===================================`.magenta)
  console.log(` RECENT ${LAST_N_GAMES} MEETINGS : ${collectStreak(meetings.slice(0,LAST_N_GAMES), team1)}`)
  console.log(`===================================`.magenta)
  for (let i=0; i<LAST_N_GAMES; i++){
    printGame(lastYear, meetings[i], team1, maxPad)
  }

}

F.countYears()
  .asPromise()
  .then(loadAllMatches(team1, team2))
  .then(collectPastHistory)
  .catch((e) => {console.log(e); process.exit(1)})
  .then(() => process.exit(0))