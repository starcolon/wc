var colors = require('colors');
var F      = require('./lib/fundamental');
var PriorityQueue = require('js-priority-queue');

const maxYears = 20;
var team = process.argv.slice(2)[0].replace('_', ' ');

let annualScorers = F.loadAnnualScorersByCountry(team).asPromise()

let byYearDesc = (a,b) => {
  if (a.year > b.year) return -1
  else if (a.year > b.year) return 1
  else return 0
}

Promise.all([annualScorers])
  .then((res) => {
    let [scorersByYear] = res
    let scorers = Object.values(scorersByYear).slice(maxYears)

    console.log(`Top scorers last ${maxYears} editions`.magenta)
    const toStr = (p) => {
      return `${p.player} (${p.goals})`.padEnd(16)
    }

    scorers.map((pn, i) => {
      let yearStr = (i==0) ? "This year" : `Last ${i+1} editions`
      let sc = pn.map(toStr).join(', ')
      console.log(`${yearStr} : ${sc}`)
    })
  })
  .then(() => process.exit(0))
