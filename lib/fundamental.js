/**
 * Fundamental
 */

const M = require('./ext/monadb');
const assert = require('assert');

let __dbTournament = () => new M('mongo', 'localhost', 'wc', 'tour')
let __dbTeam = () => new M('mongo', 'localhost', 'wc', 'team')
let __dbResult = () => new M('mongo', 'localhost', 'wc', 'result')
let __dbScorer = () => new M('mongo', 'localhost', 'wc', 'scorer')

// https://stackoverflow.com/a/6274381/4154262
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
      prevHome = h;
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
    return __dbTeam()
      .load({'confed': continent})
      .do((teams) => {
        let pp = [];
        teams.forEach((t) => pp = pp.concat(new Array(t.seed).fill(t.team)))

        var outcome = new Set();
        while (outcome.size < 8){ // Draw 8 candidates 
          let c = pp[Math.floor(Math.random()*pp.length)];
          outcome.add(c);
        }
        return shuffle(Array.from(outcome));
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
        return __dbTournament()
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

          __dbTournament().insert(tour)
          return tour;  
      })
    })
  },

  countYears: function(){
    return __dbTournament().countAll()
  },

  loadTournament: function(year){
    return __dbTournament().load({year: year})
  },

  loadRecentGames: function(minYear, customFilter){
    var filter = {year: {$gte: minYear}}
    if (customFilter) 
      filter = {$and: [{year: {$gte: minYear}}, customFilter]}
    let order = {year: -1, round: 1, match: -1};
    return __dbResult().load(filter, order)
  },

  loadTeamRecentGames: function(team){
    let filter = {$or: [{home: team}, {away: team}]};
    let order = {year: -1, round: 1, match: -1};
    return __dbResult().load(filter, order)
  },

  loadRecentGoals: function(minYear, customFilter){
    var filter = {year: {$gte: minYear}};
    if (customFilter) 
      filter = {$and: [{year: {$gte: minYear}}, customFilter]}
    let order = {year: -1, round: 1};
    return __dbScorer().load(filter,order)
  },

  loadAggScorers: function(){
    let keys = ['team','player']
    let by = {goals: {'$sum': 1}}
    let sort = {'goals': -1}
    let prefilter = {'team': {'$ne': '$against'}} // Ignore own goals
    return __dbScorer().agg(keys,by,sort,prefilter)
  },

  loadHattricks: function(){
    let keys1 = ['team','player','year','against','venue','round']
    let by1 = {goals: {'$sum': 1}, player: {'$min': '$player'}, team: {'$min': '$team'}}
    let sort1 = {'goals': -1}
    let prefilter1 = {}

    let keys2 = ['player','team','goals']
    let by2 = {times: {'$sum': 1}, goals: {'$min': '$goals'}}
    let sort2 = {'goals':-1, 'times':-1}
    let prefilter2 = {'goals': {'$gte':3}}

    let agg = [
      [keys1, by1, sort1, prefilter1],
      [keys2, by2, sort2, prefilter2]
    ];
    return __dbScorer().multiAgg(agg)
  },

  loadAwayAggScorers: function(){
    let keys = ['team','player']
    let by = {goals: {'$sum': 1}}
    let sort = {'goals': -1}
    let prefilter = {'venue': 'A'}
    return __dbScorer().agg(keys,by,sort,prefilter)
  },

  loadTopScorersByCountry: function(){
    const simplify = (p) => {
      return {
        team: p._id.team,
        player: p._id.player,
        goals: p.goals
      }
    }
    return __dbTeam().load({})
      .do((teams) => 
        Promise.all(teams.map(t => {
          let keys = ['player']
          let by = {goals: {'$sum': 1}}
          let sort = {'goals': -1}
          let prefilter = {'team': t.team}
          return __dbScorer().agg(keys,by,sort,prefilter).do((ns) => {
            return {team: t.team, scorers: ns.slice(0,5).map(simplify)}
          })
        }))
      )
  },

  loadAnnualScorersByCountry: function(cnt){
    let keys = ['year', 'player']
    let by = {goals: {'$sum': 1}}
    let sort = {'year': -1, 'goals': -1}
    let cond = {team: cnt};
    const maxScorersPerYear = 5;

    let simplify = (p) => {
      return {
        team: p._id.team,
        player: p._id.player,
        goals: p.goals
      }
    }

    // Descending
    let byYear = (a,b) => {
      if (a.year > b.year) return -1
      else if (a.year < b.year) return 1
      else return 0
    }

    return __dbScorer()
      .agg(keys,by,sort,cond)
      .do((ns) => {
        // Sort and aggregate by year
        var agg = {};
        ns.sort(byYear).forEach((n) => {
          if (!(n._id.year in agg ))
            agg[n._id.year] = [];
          
          // Do not collect more than {K} scorers per year
          if (agg[n._id.year].length < maxScorersPerYear)
            agg[n._id.year].push({player: n._id.player, goals: n.goals});
        })
        
        return agg;
      })
  },

  inputScore: function(){
    var readline = require('readline-sync')
    var n = '';
    var scorers = [];
    do {
      n = readline.question('> ')
      if (n.trim().length > 0)
        scorers.push(n)
    } while (n.trim().length > 0)

    // TAOREVIEW: This doesn't support a penalty shootout
    var score = scorers.length == 0 ? '0-0' : scorers[scorers.length-1].split(/\s+/)[0]

    return Promise.resolve([score, scorers])
  },

  addFixture: function(year,round,group,match,score,scorers){
    var home, away;
    return F.loadTournament(year)
      .do((tours) => {
        var tour = tours[0];
        score = Score(score)

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
          }).sort((a,b) => (b.pt*1000 + (b.f-b.a)*10 + b.a) - (a.pt*1000 + (a.f-a.a)*10 + a.f))
        }
        else {
          if (match == 0){
            // First leg
            tour.round[round][group].teams[0].f += score.f;
            tour.round[round][group].teams[0].a += score.a;
            tour.round[round][group].teams[1].f += score.a;
            tour.round[round][group].teams[1].a += score.f;
            for (i=0; i<2; i++){
              if (tour.round[round][group].teams[i].team == away){
                tour.round[round][group].teams[i].awayGoal += score.a;
              }
            }
          }
          else {
            // Second leg
            tour.round[round][group].teams[1].f += score.f;
            tour.round[round][group].teams[1].a += score.a;
            tour.round[round][group].teams[0].f += score.a;
            tour.round[round][group].teams[0].a += score.f;
            for (i=0; i<2; i++){
              if (tour.round[round][group].teams[i].team == away){
                tour.round[round][group].teams[i].awayGoal += score.a;
              }
            }
          } 
        }

        return tour;
      })
      .asPromise()
      .then((tour) => __dbTournament().set({year: year}, tour).asPromise())
      .then(() => {
        // Add score
        console.log('... Updating score records')
        score.home = home;
        score.away = away;
        score.year = year;
        score.round = round;
        score.group = group;
        score.match = match;
        return __dbResult().insert(score).asPromise()
      })
      .then(() => {
        // Add scorer
        if (scorers.length>0){
          console.log('... Updating scorers');
          var sc = Scorers(scorers,home,away,year,round);
          return __dbScorer().insertMany(sc).asPromise()  
        }
        else {
          console.log('... Skip updating scorers');
        }
      })
      .then(() => console.log('... Done'))
  },

  // Make sure the certain round of the tournament is generated
  refreshTournament: function(year,round){
    var tour;
    return F
      .loadTournament(year)
      .do((tours) => {tour = tours[0]})
      .asPromise()
      .then(() => {
        if (tour.round[round] == null){
          if (round == 16){
            // Pick the qualifying teams
            let qualifiers = [];
            for (let g=0; g<8; g++) {
              qualifiers.push(tour.round[32][g].teams[0].team)
              qualifiers.push(tour.round[32][g].teams[1].team)
            }
            console.log(qualifiers)

            tour.round[16] = []

            for (let g=0; g<8; g++) {
              
              let indexHome = 1*Math.floor((qualifiers.length-1)*Math.random())
              let home = qualifiers.splice(indexHome,1)[0]

              let indexAway = 1*Math.floor((qualifiers.length-1)*Math.random())
              let away = qualifiers.splice(indexAway,1)[0]

              tour.round[16][g] = {
                teams: [
                  {team: home, f: 0, a: 0, awayGoal: 0},
                  {team: away, f: 0, a: 0, awayGoal: 0}
                ],
                fixture: [
                  {home: home, away: away},
                  {home: away, away: home}
                ]
              }
            }

            return __dbTournament()
              .set({year: year}, tour).asPromise()
              .then(() => Promise.resolve(tour))
          }
          // Round 8,4,2
          else {
            // Sort the teams in the previous round by aggregation
            tour.round[round*2].map((g) => {
              g.teams = g.teams.sort((a,b) => ((b.f - b.a)*100 + b.awayGoal) - ((a.f - a.a)*100 + a.awayGoal))
              console.log('Results are:')
              console.log(g.teams)
              return g;
            })

            // Pick the qualifying teams from the previous round
            let qualifiers = [];
            for (let g=0; g<round; g++) {
              qualifiers.push(tour.round[round*2][g].teams[0].team)
            }
            console.log(qualifiers)

            tour.round[round] = []

            for (let g=0; g<round/2; g++) {
              
              console.log('REFRESHING ROUND #', round);

              let indexHome = 1*Math.floor((qualifiers.length-1)*Math.random())
              let home = qualifiers.splice(indexHome,1)[0]

              let indexAway = 1*Math.floor((qualifiers.length-1)*Math.random())
              let away = qualifiers.splice(indexAway,1)[0]

              tour.round[round][g] = {
                teams: [
                  {team: home, f: 0, a: 0, awayGoal: 0},
                  {team: away, f: 0, a: 0, awayGoal: 0}
                ],
                fixture: [
                  {home: home, away: away},
                  {home: away, away: home}
                ]
              }
            }

            return __dbTournament()
              .set({year: year}, tour).asPromise()
              .then(() => Promise.resolve(tour))
          }
        }
        else return Promise.resolve(tour)
      })
  },

  proceedTournament: function(year){
    var tour;
    var nextRound, nextGroup, nextMatch;

    return F
      .loadTournament(year)
      .do((tours) => {tour = tours[0]})
      .asPromise()
      .then(() => {
        return __dbResult().load({year: year}).asPromise()
      })
      .then((matches) => {
        if (matches.length == 0){
          // Fresh start of the tournament
          [nextRound, nextGroup, nextMatch] = [32,0,0]
        }
        else {
          let m0 = {round: 32, group: 0, match: 0}
          let f = (n) => {
            // Sort the fixture
            if (n.round == 32)
              return ((64-n.round) * 1000) + (Math.abs(Math.ceil((n.match-1)/2)) * 100)
                + (n.group * 10)
                + (n.match)
            else 
              return ((64-n.round) * 1000) + (n.match * 100) + n.group*10
          }
          matches.forEach((m) => {
            if (f(m) > f(m0)){
              m0.round = m.round;
              m0.group = m.group;
              m0.match = m.match;
            }
          })

          let lastGroup = {32: 7, 16: 7, 8: 3, 4: 1, 2: 0}

          // TAODEBUG:
          // console.log('last round = ', m0.round)
          // console.log('last group = ', m0.group)
          // console.log('last match = ', m0.match)

          let finalMatch = 1;
          if (m0.round == 32){
            finalMatch = 2*Math.abs(Math.ceil((m0.match-1)/2))+1
          }
          else {
            finalMatch = 0;
          }

          console.log('final match = ', finalMatch)

          if (m0.group < lastGroup[m0.round] || m0.match < ((m0.round == 32) ? 11 : 1)){
          
            nextRound = m0.round;
            if (m0.match < finalMatch){
              // Next match in the group
              nextGroup = m0.group;
              nextMatch = finalMatch;
            }
            else {
              // Next group in the round
              if (m0.round == 32){
                if (m0.group == 7){
                  nextGroup = 0;
                  nextMatch = finalMatch + 1;  
                }
                else {
                  nextGroup = m0.group + 1;
                  nextMatch = finalMatch - 1;  
                }
              }
              // Next group in KO
              else {
                if (m0.group == m0.round/2 - 1){
                  nextGroup = 0;
                  nextMatch = 1; // Final leg
                }
                else {
                  nextGroup = m0.group + 1;
                  nextMatch = m0.match;
                }
              }
            }
          } 
          else {
            // Proceed to next round
            // or proceed to next fixture (in case of round of 32)
            if (m0.round == 32 && m0.match < 11){
              nextRound = m0.round;
              nextGroup = 0;
              nextMatch = finalMatch;
            }
            else {
              nextRound = m0.round / 2;
              nextGroup = 0;
              nextMatch = 0;

              if (nextRound > 1){
                console.log('================================='.magenta)
                console.log(' NEXT ROUND : '.magenta, nextRound )
                console.log('================================='.magenta)  
              }
              else {
                return [-1,-1,-1]
              }
            }
          }
        }

        return [nextRound, nextGroup, nextMatch]
      })
  },

  viewYearSummary : function(year){
    var tour;
    return F
      .loadTournament(year)
      .do((tours) => {tour = tours[0]})
      .asPromise()
      .then(() => {
        return Promise.all([
          __dbResult().load({year: year}).asPromise(), 
          __dbScorer().load({year: year}).asPromise()
        ])
      })
      .then((nn) => {

        const MAX = 3;
        let [results,scorers] = nn;

        let _ = (any) => true;
        let onlyGroup = (n) => n.round == 32;
        let onlyKO = (n) => n.round < 32;

        let ROUND_FILTERS = {GROUP_STAGE: onlyGroup, KNOCKOUTS: onlyKO};

        let byWins = (a,b) => (b.w - a.w);
        let byScore = (a,b) => (b.f - a.f);
        let byConced = (a,b) => (a.a - b.a);
        let byCleansheet = (a,b) => (b.cleansheets - a.cleansheets);

        let groupByTeam = function(ns){
          var gr = {}
          ns.forEach((t) => {
            if (!(t.home in gr))
              gr[t.home] = {team: t.home, w:0, l:0, f:0, a:0, cleansheets:0}
            if (!(t.away in gr))
              gr[t.away] = {team: t.away, w:0, l:0, f:0, a:0, cleansheets:0}

            if (t.outcome == 'W'){
              gr[t.home].w ++;
              gr[t.away].l ++;
              gr[t.home].f += t.f;
              gr[t.home].a += t.a;
              if (t.a == 0) gr[t.home].cleansheets ++;
              gr[t.away].f += t.a;
              gr[t.away].a += t.f;
              if (t.f == 0) gr[t.away].cleansheets ++;
            }
            else if (t.outcome == 'L'){
              gr[t.home].l ++;
              gr[t.away].w ++;
              gr[t.home].f += t.f;
              gr[t.home].a += t.a;
              if (t.a == 0) gr[t.home].cleansheets ++;
              gr[t.away].f += t.a;
              gr[t.away].a += t.f;
              if (t.f == 0) gr[t.away].cleansheets ++;
            }
            else {
              gr[t.home].f += t.f;
              gr[t.home].a += t.a;
              if (t.a == 0) gr[t.home].cleansheets ++;
              gr[t.away].f += t.a;
              gr[t.away].a += t.f;
              if (t.f == 0) gr[t.away].cleansheets ++;
            }
          })
          return Object.values(gr)
        }

        // Team performance ranking
        for ([category, fl] of Object.entries(ROUND_FILTERS)){
          var teams = groupByTeam(results.filter(fl))
          console.log()
          console.log('MOST WINNING TEAMS '.blue + '[' + category + ']')

          teams.sort(byWins).slice(0,MAX).forEach((n) => {
            console.log(n.team.green + '  ', n.w)
          })

          console.log()
          console.log('MOST SCORING TEAMS '.blue + '[' + category + ']')
          teams.sort(byScore).slice(0,MAX).forEach((n) => {
            console.log(n.team.green + '  ', n.f)
          })

          console.log()
          console.log('LEAST CONCEDING TEAMS '.blue + '[' + category + ']')
          teams.sort(byConced).slice(0,MAX).forEach((n) => {
            console.log(n.team.green + '  ', n.a)
          })

          console.log()
          console.log('MOST CLEANSHEETS '.blue + '[' + category + ']')
          teams.sort(byCleansheet).slice(0,MAX).forEach((n) => {
            console.log(n.team.green + '  ', n.cleansheets)
          })
        }
      })
  }
}

module.exports = F;