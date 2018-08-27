/**
 * Fundamental
 */

const M = require('./ext/monadb');
const assert = require('assert');

let __dbTournament = new M('mongo', 'localhost', 'wc', 'tour')
let __dbTeam = new M('mongo', 'localhost', 'wc', 'team')
let __dbResult = new M('mongo', 'localhost', 'wc', 'result')
let __dbScorer = new M('mongo', 'localhost', 'wc', 'scorer')

var MatchFixture = function(a,b){
  return {home: a.team, away: b.team, score: null}
}

var Score = function(scoreStr){
  let comp = scoreStr.split(/-|e|p/g)
  let R = function(a,b){
    if (a>b) return 'W';
    else if (a<b) return 'L';
    else return 'D';
  }

  var c = null;

  if (comp.length == 2){
    // in 90 mins
    let [a,b] = comp
    a = a*1;
    b = b*1;
  }
  else if (comp.length == 3){
    // after penalty / extra time
    let [a,b,c] = comp
    a = a*1;
    b = b*1;
  }

  return {outcome: R(a,b), f: a, a: b, ex: c, home: null, away: null, year: null}
}

var Scorer = function(scorerStr){
  let [_,who,when] = scorerStr.split(' ') // 4-1 Vitolo pen25
  
  var [min,ex] = when.match(/(pen|og)*(\d+\+*\d*)/).slice(0,2)

  return {
    player: who, team: null, against: null, 
    venue: null, min: min*1, year: null, round: null, 
    ex: ex || null}
}

var F = {  

  drawTeams: function(continent){
    return __dbTeam
      .load({'confed': continent})
      .do((teams) => {
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
    var groups = new Array(G.length);
    var generateFixture = function(g){

      g.fixture = [
        MatchFixture(g.teams[0], g.teams[1]), MatchFixture(g.teams[2], g.teams[3]),
        MatchFixture(g.teams[1], g.teams[2]), MatchFixture(g.teams[3], g.teams[0]),
        MatchFixture(g.teams[0], g.teams[2]), MatchFixture(g.teams[1], g.teams[3]),
        MatchFixture(g.teams[2], g.teams[0]), MatchFixture(g.teams[3], g.teams[1]),
        MatchFixture(g.teams[0], g.teams[3]), MatchFixture(g.teams[2], g.teams[1]),
        MatchFixture(g.teams[1], g.teams[0]), MatchFixture(g.teams[3], g.teams[2]) 
      ]

      return g;
    }
    return Promise.all(['AS','EU','AM','AF'].map((cont) => {
      return F
        .drawTeams(cont)
        .do((teams) => {
          assert.strictEqual(teams.length, G.length);
          teams.forEach((t,i) => {
            if (!groups[i]) groups[i] = { teams: [], fixture: []};
            groups[i].teams.push({team: t, pt: 0, w: 0, d: 0, l: 0, f: 0, a: 0})
          })
        })
      }))
      .then((_) =>{
        return __dbTournament
          .count({})
          .do((n) => {
            var tour = {
              year: n+1,
              champ: null,
              runner: null,
              round: {
                32: groups.map(generateFixture),
                16: null,
                8: null,
                4: null,
                2: null
              }
            }

          __dbTournament.insert(tour)
          return tour;  
      })
    })
  },

  countYears: function(){
    return __dbTournament.countAll()
  },

  loadTournament: function(year){
    return __dbTournament.load({year: year})
  },

  listAllTournaments: function(){

  },

  addFixture: function(year,round,group,match,score,scorers){
    return F.loadTournament(year)
      .do((tours) => {
        var tour = tours[0];
        score = Score(score)
        tour.round[round][group].fixture[match].score = score;

        console.log('... Updating fixture');

        let home = tour.round[round][group].fixture[match].home;
        let away = tour.round[round][group].fixture[match].away;

        let updateTeamTable = function(team, score, reverse){
          let p = reverse ? {'W': 0, 'D': 1, 'L': 3} : {'W': 3, 'D': 1, 'L': 0};
          let a = reverse ? score.f : score.a;
          let f = reverse ? score.a : score.f;

          team.p += p[score.outcome];
          team.f += f;
          team.a += a;

          if (score.outcome == 'W'){
            if (reverse) team.l += 1;
            else team.w += 1;
          }
          else if (score.outcome == 'D'){
            team.d += 1;
          }
          else if (score.outcome == 'L'){
            if (reverse) team.w += 1;
            else team.l += 1;
          }
          return team;
        }

        // Update table if round of 32
        if (round == 32){
          tour.round[round][group].teams = tour.round[round][group].teams.map((t) => {
            
            if (t.team == home){
              updateTeamTable(t, score, false)
            }
            else if (t.team == away){
              updateTeamTable(t, score, true)
            }
            else t;
          })
        }

        return __dbTournament.set({year: year}, tour)
      })
      .do(() => {
        // Add score
        console.log('... Updating score records')
        score.home = home;
        score.away = away;
        score.year = year;

        return __dbResult.insert(score)
      })
      .do(() => {

        // Add scorer
        // TAOTODO:
        console.log('... Updating scorers')

      })
  },

  getResults: function(teams, onlyLast){

  },

  addResult: function(teams, score, scorers){

  },

  proceedTournament: function(){

  }
}

module.exports = F;