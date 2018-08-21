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