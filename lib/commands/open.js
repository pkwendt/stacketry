'use strict'

var path = require('path')
var child = require('child_process')
var http = require('http')
var util = require('util')
var connect = require('connect')
var serveStatic = require('serve-static')

exports.setup = function(program) {

	var state = {}


	var config = require(path.join(process.cwd(), (program.conf || "stacketry.json")))

	var port = (program.port || 5000)
	var local_url = 'http://localhost:' + port
	

	var static_serve = {
	    stacketry: path.join(__dirname, '../../lib'),
	    site: path.join(config.root, '/site'),
	    app: config.root
	  }

	var paths = {
	    stacketry_js: path.join(__dirname, '../lib/stacketry.js'),
	    manifest_js: path.join(config.root, '/manifest.js'),
	    app_html: path.join(config.root, '/app.html')
	  }

  program
		.command('open')
	  .description('run the application locally')
	  
	  .action( function() {
			console.log('launching application...')

			setTimeout(function() {
				child.spawn('open', [local_url]);
			}, 200)


			var app = connect()
			  .use(require('connect-logger')())
			  .use('/site', serveStatic( static_serve.site))
			  .use(serveStatic( static_serve.app, {
			  	'index': ['app.html']
			  }))
			  .use('/stacketry', serveStatic( static_serve.stacketry))

console.log(static_serve.stacketry)
			http.createServer(app).listen(port);

		})
}

