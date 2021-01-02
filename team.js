var colors = require('colors');
var F      = require('./lib/fundamental');
var PriorityQueue = require('js-priority-queue');

const maxYears = 100;
var team = process.argv.slice(2)[0].replace('_', ' ');

let annualScorers = F.loadAnnualScorersByCountry(team).asPromise()

let byYearDesc = (a,b) => {
  if (a.year > b.year) return -1
  else if (a.year > b.year) return 1
  else return 0
}

Promise.all([annualScorers])
  .then((res) => {
    console.log(annualScorers.scorers) // TAODEBUG
    let scorers = annualScorers.sort(byYearDesc).slice(0, 20)
    console.log(`Top scorers last ${nYear} years`.magenta)
    const toStr = (p) => {
      return `${p.player} (${p.goals})`.padEnd(16)
    }
    scorers.map((p) =>
      console.log(`${p.team.padEnd(10).green} : ${p.scorers.map(toStr).join(', ')}`)
    )
  })
  .then(() => process.exit(0))
