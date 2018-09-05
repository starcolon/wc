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
  return {home: a.team, away: b.team}
}

var Score = function(scoreStr){
  let comp = scoreStr.split(/-|e|p/g)
  let R = function(u,v){
    if (u>v) return 'W';
    else if (u<v) return 'L';
    else return 'D';
  }

  var c = null;
  var [a,b,c] = [null,null,null]

  if (comp.length == 2){
    // in 90 mins
    [a,b] = comp
    a = a*1;
    b = b*1;
  }
  else if (comp.length == 3){
    // after penalty / extra time
    [a,b,c] = comp
    a = a*1;
    b = b*1;
  }

  return {outcome: R(a,b), f: a, a: b, ex: c, home: null, away: null, year: null}
}

var Scorers = function(scorerStrings,home,away,year,round){
  let [prevHome, prevAway] = [0,0]
  return scorerStrings.map((s) => {
    let [h,a,who,when] = s.split(/\s|\-/) // 4-1 Vitolo pen25

    let [ex,min] = when.match(/(pen|og)*(\d+\+*\d*)/).slice(1,3)

    let [team,against,venue] = [null,null,null]

    if (h>prevHome){
      // Home team score
      team = home;
      against = away;
      venue = 'H';
    }
    else {
      // Away team score
      team = away;
      against = home;
      venue = 'A';
    }

    return {
      player: who, team: team, against: against, 
      venue: venue, min: min*1, year: year, round: round, 
      ex: ex || null}
  })
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
    var home, away;
    return F.loadTournament(year)
      .do((tours) => {
        var tour = tours[0];
        score = Score(score)
        // tour.round[round][group].fixture[match].score = score;

        console.log('... Updating fixture');

        home = tour.round[round][group].fixture[match].home;
        away = tour.round[round][group].fixture[match].away;

        let updateTeamTable = function(team, score, reverse){
          let p = reverse ? {'W': 0, 'D': 1, 'L': 3} : {'W': 3, 'D': 1, 'L': 0};
          let a = reverse ? score.f : score.a;
          let f = reverse ? score.a : score.f;

          team.pt += p[score.outcome];
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
              console.log('... Updating home team : ', home.green);
              return updateTeamTable(t, score, false)
            }
            else if (t.team == away){
              console.log('... Updating away team : ', away.green);
              return updateTeamTable(t, score, true)
            }
            else return t;
          }).sort((a,b) => a.pt <= b.pt || (a.f-a.a) < (b.f-b.a))
        }

        return tour;
      })
      .asPromise()
      .then((tour) => __dbTournament.set({year: year}, tour).asPromise())
      .then(() => {
        // Add score
        console.log('... Updating score records')
        score.home = home;
        score.away = away;
        score.year = year;
        score.round = round;
        return __dbResult.insert(score).asPromise()
      })
      .then(() => {
        // Add scorer
        console.log('... Updating scorers')
        var sc = Scorers(scorers,home,away,year,round)
        return __dbScorer.insertMany(sc).asPromise()
      })
      .then(() => console.log('... Done'))
  },
  
  proceedTournament: function(year){
    var tour;
    var nextRound, nextGroup, nextMatch;

    F.loadTournament(year)
      .do((tours) => {tour = tours[0]})
      .asPromise()
      .then(() => {
        return __dbResult.load({year: year}).asPromise()
      })
      .then((matches) => {
        if (matches.length == 0){
          // Fresh start of the tournament
          [nextRound, nextGroup, nextMatch] = [32,0,0]
        }
        else {
          let m = matches = matches.sort((a,b) => 
            a.round <= b.round && a.group <= b.group &&
            a.match < b.match)[0]
          // TAOTODO:
        }

        return [nextRound, nextGroup, nextMatch]
      })
  }
}

module.exports = F;