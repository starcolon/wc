/**
 * Fundamental
 */

const M = require('./ext/monadb');

let __dbTournament = new M('mongo', 'localhost', 'wc', 'tour')
let __dbTeam = new M('mongo', 'localhost', 'wc', 'team')
let __dbResult = new M('mongo', 'localhost', 'wc', 'result')

var F = {  

  drawTeams: function(continent){
    return __dbTeam
      .loadAll({'confed': continent})
      .then((teams) => {
        let pp = [];
        teams.forEach((t) => pp = pp.concat(new Array(t.seed).fill(t.team)))

        var outcome = new Set();
        while (outcome.size < 8){ // Draw 8 candidates 
          let c = pp[Math.floor(Math.random()*pp.length)];
          outcome.add(c);
        }
        return Array.from(outcome);
      })
  },

  newTournament: function(){
    const G = 'ABCDFEGH';
    var teams = ['AS','EU','AM','AF'].map(drawTeams)
    var groups = [];
    while (teams[0].length > 0){
      groups.push([0,1,2,3].map((i) => { 
        return {
          group: G[groups.length],
          team: teams[i].pop(), pt: 0, w: 0, d: 0, l:0, f:0, a: 0,
          }
        }
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