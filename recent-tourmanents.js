/**
 * View tournament
 */ 

var colors = require('colors');
var F      = require('./lib/fundamental');

var numRecentYears = process.argv.slice(2)[0]*1;

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

var determineWinners = function(legs){
  
  if (legs.length < 2) return ['??', '??', '??', '??']

  var home1stLeg = {
    team: legs[0].home, 
    f: legs[0].f, a: legs[0].a, 
    awayGoal: 0, awayGoalConceded: legs[0].a}

  home1stLeg.f += legs[1].a;
  home1stLeg.a += legs[1].f;
  home1stLeg.awayGoalConceded += legs[1].a;

  var toScore = function(leg,venue,swap){
    if (swap == 'swap') return leg.a + '-' + leg.f + ' ' + venue
    else return leg.f + '-' + leg.a + ' ' + venue
  }

  if (home1stLeg.f > home1stLeg.a || (home1stLeg.f == home1stLeg.a && home1stLeg.awayGoal > home1stLeg.awayGoalConceded)){
    return [legs[0].home, legs[0].away, toScore(legs[0], 'H'), toScore(legs[1], 'A', 'swap')]
  }
  else 
    return [legs[0].away, legs[0].home, toScore(legs[0], 'A', 'swap'), toScore(legs[1], 'H')]
}

var determineTopScorers = function(goals){
  var reg = {};
  var topScorer = null;
  var topNumGoals = 0;
  goals.forEach((g) => {
    if (g.ex != 'og') {
      let key = g.player + ' (' + g.team + ')';
      if (!(key in reg))
        reg[key] = 0;
      
      reg[key]++;

      if (reg[key] > topNumGoals){
        topScorer = key;
        topNumGoals = reg[key];
      }
    }
  })
  return [topScorer, topNumGoals];
}

F.countYears().asPromise()
  .then((n) => Promise.all([
    Promise.resolve(n), 
    F.loadRecentGames(n - numRecentYears).asPromise(),
    F.loadRecentGoals(n - numRecentYears).asPromise()]))
  .then(([maxYear, games, goals]) => {
    console.log(games.length, ' games to process');
    console.log(goals.length, ' goals to process');
    console.log()
    console.log('-------------------------------------------------------------------')
    console.log('YEAR | CHAMPIONS   | RUNNERS-UP  | SCORES     |')
    console.log('-------------------------------------------------------------------')
    champs = {};
    for (var year = maxYear - numRecentYears; year <= maxYear; year++){
      if (year <= 0) continue;
      
      let gamesYear = games.filter((g) => g.year == year)
      let goalsYear = goals.filter((g) => g.year == year)

      let finals = gamesYear
        .filter((g) => g.round == 2)
        .sort((a,b) => (a.f - a.a)*100 + a.awayGoal < (b.f - b.a)*100 + b.awayGoal )

      let [champ,runner,score1,score2] = determineWinners(finals);

      let [topScorer,topNumGoals] = determineTopScorers(goalsYear);

      if (!champs[champ]){
        champs[champ] = {team: champ, champ: 0, runner: 0}
      }

      if (!champs[runner]){
        champs[runner] = {team: runner, champ: 0, runner: 0}
      }

      champs[champ].champ++;
      champs[runner].runner++;

      console.log(' ', year, (year<10) ? ' | ' : '| ',
        padEnd(champ, 12, ' '),
        padEnd(runner, 12, ' '),
        score1,
        score2,' ',
        topScorer,
        topNumGoals)
    }
    console.log('-------------------------------------------------------------------')
    sorted = [];
    for (let t in champs){
      sorted.push(champs[t])
    }
    sorted = sorted.sort((a,b) => (b.champ*1000 + b.runner) - (a.champ*1000 + a.runner))
    for (let s of sorted){
      if (s.team == "??") continue;
      let team = s.team.padEnd(12)
      if (s.champ > 0)
        team = team.green;
      console.log(' ' + team + s.champ + " champions, " + s.runner + " runners-ups (" + 
        (s.champ + s.runner) + " finals)")
    }
    console.log('-------------------------------------------------------------------')
  })
  .then(() => process.exit(0))