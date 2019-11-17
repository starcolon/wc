/**
 * Player performances
 */

var colors = require('colors');
var F      = require('./lib/fundamental');
var PriorityQueue = require('js-priority-queue');

let allScorers = F.loadAggScorers().asPromise()
let allTeamScorers = F.loadTopScorersByCountry().asPromise()

const byTeamName = (a,b) => {
  if (a.team < b.team) return -1
  else if (a.team > b.team) return 1
  else return 0
}

Promise.all([allScorers,allTeamScorers])
  .then((res) => {
    [allScorers,allTeamScorers] = res
    
    console.log('All-time scorers'.magenta)
    allScorers.slice(0,15).map((p) => 
      console.log(`${p._id.player.green} (${p._id.team}) = ${p.goals}`)
    )

    console.log()
    console.log('Top scorers by team'.magenta)
    const toStr = (p) => {
      return `${p.player} (${p.goals})`
    }
    allTeamScorers.sort(byTeamName).map((p) =>
      console.log(`${p.team.padEnd(10).green} : ${p.scorers.map(toStr).join(', ')}`)
    )
    
  })
  .catch((e) => {console.log(e); process.exit(1)})
  .then(() => process.exit(0))