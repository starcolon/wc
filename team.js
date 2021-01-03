var colors = require('colors');
var F      = require('./lib/fundamental');
var PriorityQueue = require('js-priority-queue');

const maxYears = 15;
var team = process.argv.slice(2)[0].replace('_', ' ');

let annualScorers = F.loadAnnualScorersByCountry(team).asPromise()
let recentGames = F.loadTeamRecentGames(team).asPromise()

let byYearDesc = (a,b) => {
  if (a.year > b.year) return -1
  else if (a.year > b.year) return 1
  else return 0
}

function analyseStreak(games){
  let longestWin = [];
  let longestLost = [];
  let longestUndefeat = [];
  let longestNoWin = [];

  let getResult = (g) => {
    if (g.home == team){
      return [g.outcome, g.f, g.a, true, g.away, g.year]
    }
    else {
      let outcomeMap = {W: 'L', D: 'D', L: 'W'}
      return [outcomeMap[g.outcome, g.a, g.f, false, g.home, g.year]]
    }
  }

  // Current state as we iterate through games
  let winningStreak = []
  let unwinningStreak = []
  let undefeatStreak = []
  let losingStreak = []

  games.forEach((g) => {
    let [result, f, a, isHome, opp, y] = getResult(g);

    if (result=='W'){
      winningStreak.push([result, f, a, isHome, opp, y])
      undefeatStreak.push([result, f, a, isHome, opp, y])

      // End of unwinning streak
      if (unwinningStreak.length > longestNoWin.length){
        longestNoWin = Array.from(unwinningStreak)
      }
      unwinningStreak = []

      // End of losing streak
      if (losingStreak.length > longestLost.length){
        longestLost = Array.from(losingStreak)
      }
      losingStreak = []
    }

    if (result=='L'){
      losingStreak.push([result, f, a, isHome, opp, y])
      unwinningStreak.push([result, f, a, isHome, opp, y])

      // End of winning streak
      if (winningStreak.length > longestWin.length){
        longestWin = Array.from(winningStreak)
      }
      winningStreak = []

      // End of unbeaten streak
      if (undefeatStreak.length > longestUndefeat.length){
        longestUndefeat = Array.from(undefeatStreak)
      }
      undefeatStreak = []
    }

    if (result=='D'){
      undefeatStreak.push([result, f, a, isHome, opp, y ])
      unwinningStreak.push([result, f, a, isHome, opp, y])

      // End of winning streak
      if (winningStreak.length > longestWin.length){
        longestWin = Array.from(winningStreak)
      }
      winningStreak = []

      // End of losing streak
      if (losingStreak.length > longestLost.length){
        longestLost = Array.from(losingStreak)
      }
      losingStreak = []
    }
  })

  return {
    longestWin: longestWin,
    longestLost: longestLost,
    longestUndefeat: longestUndefeat,
    longestNoWin: longestNoWin
  }
}

Promise.all([annualScorers, recentGames])
  .then((res) => {
    let [scorersByYear, games] = res
    let N = scorersByYear.length;
    let scorers = Object.values(scorersByYear)

    let streakInfo = analyseStreak(games);

    console.log(`Longest run of winning streak (${streakInfo.longestWin.length} games)`.magenta)
    streakInfo.longestWin.forEach((p) => {
      let [result, f, a, isHome, opp, y] = p;
      console.log(`    ${result.green} ${f}-${a} ${opp} .... year ${y}`)
    })

    console.log(`Longest run of unbeaten streak (${streakInfo.longestUndefeat.length} games)`.magenta)
    streakInfo.longestUndefeat.forEach((p) => {
      let [result, f, a, isHome, opp, y] = p;
      console.log(`    ${result.blue} ${f}-${a} ${opp} .... year ${y}`)
    })

    console.log(`Longest run of losing streak (${streakInfo.longestLost.length} games)`.magenta)
    streakInfo.longestLost.forEach((p) => {
      let [result, f, a, isHome, opp, y] = p;
      console.log(`    ${result.red} ${f}-${a} ${opp} .... year ${y}`)
    })

    console.log(`Longest run without winning (${streakInfo.longestNoWin.length} games)`.magenta)
    streakInfo.longestNoWin.forEach((p) => {
      let [result, f, a, isHome, opp, y] = p;
      console.log(`    ${result.red} ${f}-${a} ${opp} .... year ${y}`)
    })

    console.log(`Top scorers last ${maxYears} editions`.magenta)
    const toStr = (p) => {
      return `${p.player} (${p.goals})`.padEnd(16)
    }

    scorers.reverse().map((pn, i) => {
      if (i>maxYears) 
        return 0;
      let yearStr = (i==0) ? "This year".padEnd(15) : `Last ${i+1} editions`
      let sc = pn.map(toStr).join(', ')
      console.log(`${yearStr} : ${sc}`)
    })
  })
  .then(() => process.exit(0))
