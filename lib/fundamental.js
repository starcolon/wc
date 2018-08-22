/**
 * Fundamental
 */

const M = require('monadbjs');

var F = {
  __dbTournament: new M('mongo', 'localhost', 'wc', 'tour'),
  __dbTeam: new M('mongo', 'localhost', 'wc', 'team'),
  __dbResult: new M('mongo', 'localhost', 'wc', 'result'),

  drawTeams: function(continent){
    var genPop = function(){
      return __dbTeam.loadAll({'confed': continent})
        .then((teams) => {
          let pp = [];
          teams.forEach((t) => pp.concat(new Array(t.seed).fill(t.team)))
          return pp
        })
    }
    var outcome = new Set();
    var population = genPop();
    while (outcome.size < 8){ // Draw 8 candidates from each continent
      let c = population[Math.floor(Math.random()*population.length)];
      outcome.add(c);
    }
    return outcome;
  },

  newTournament: function(){
    var teams = ['AS','EU','AM','AF'].map(drawTeams)
    var groups = [];
    while (teams[0].length > 0){
      groups.push([0,1,2,3].map((i) => 
        { return {team: teams[i].pop(), pt: 0, w: 0, d: 0, l:0, f:0, a: 0}}
      ));
    }

    return __dbTournament
      .count({})
      .then((n) => {
        var tour = {
          year: n+1, // TAOTODO: Increment
          champ: null,
          runner: null,
          round: {
            32: groups(teams),
            16: null,
            8: null,
            4: null,
            2: null
          }
        }


        // TAOTODO: Add tournament to db
        return __dbTournament.insert(tour)
      })
  },

  loadTournament: function(year){ // year = -1 will load the last

  },

  listAllTournaments: function(){

  },

  getResults: function(teams, onlyLast){

  },

  addResult: function(teams, score, scorers){

  },

  proceedTournament: function(){

  }
}

module.exports = F;