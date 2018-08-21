/**
 * Fundamental
 */

const M = require('monadbjs');

var F = {
  __dbTournament: new M('mongo', 'localhost', 'wc', 'tour'),
  __dbTeam: new M('mongo', 'localhost', 'wc', 'team'),
  __dbResult: new M('mongo', 'localhost', 'wc', 'result'),

  drawTeams: function(continent){
    var outcome = new Set();
    var population = ???
    while (outcome.size < 8){ // Draw 8 candidates from each continent
      ???
    }
    return outcome;
  },

  newTournament: function(){
    var teams = ['AS','EU','AM','AF'].map(drawTeams)
    var groups = [];
    while (teams[0].length > 0){
      groups.push([0,1,2,3].map((i) => 
        {team: teams[i].pop(), pt: 0, w: 0, d: 0, l:0, f:0, a: 0}
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