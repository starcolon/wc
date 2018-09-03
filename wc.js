/**
 * WC executable
 */ 

var colors = require('colors');
var F      = require('./lib/fundamental');

// F.newTournament()

var scorers = [
  '0-1 Arnautovic 10',
  '1-1 Mahmoud 21',
  '2-1 Mahmoud pen41',
  '3-1 Darlem 88'
]
F.addFixture(1,32,0,0,'3-1',scorers).then(() => {
  console.log('Woohooo!');
  process.exit(0)
})