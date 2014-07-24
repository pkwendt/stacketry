'use strict'


exports.setup = function(program) {
  program
		.command('init <name>')
	  .description('start a new stacketry application')
	  
	  .action( function(name) {
			console.log('initializing ', name)
		})
}

