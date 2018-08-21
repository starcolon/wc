/**
 * Fundamental
 */

const M = require('monadbjs');

var F = {
  __dbTournament: new M('mongo', 'localhost', 'wc', 'tour'),
  __dbTeam: new M('mongo', 'localhost', 'wc', 'team'),
  __dbResult: new M('mongo', 'localhost', 'wc', 'result'),

  drawTeams: function(continent){

  },

  newTournament: function(){
    var teams = ['AS','EU','AM','AF'].map(drawTeams)
    var groups = [];
    while (teams[0].length > 0){
      groups.push([0,1,2,3].map((i) => 
        {team: teams[i].pop(), pt: 0, w: 0, d: 0, l:0, f:0, a: 0}
      ));
    }
    var tour = {
      year: 0, // TAOTODO: Increment
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
    ??? // TAOTODO:
  },

  loadTournament: function(year){

  },

  listAllTournaments: function(){

  },

  getResults: function(teams, onlyLast){

  },

  addResult: function(teams, score, scorers){

  }
}

module.exports = F;