/**
  * Stacketry - htttp://Stacketry.io
  * Copyright (c) 2014 Stacketry, Inc.
  * http://www.stacketry.com
  *
  * HTML5 applicaiton assembly framework
  * 
  * version: 0.0.1
  *
  *
  */
 
 /**
   * Things to work in:
   * 
   * Reset angular - http://stackoverflow.com/questions/23973744/how-to-restart-angular-app-without-page-reload
   *               - client watcher for easier dev
   * css insertion - http://www.hunlock.com/blogs/Totally_Pwn_CSS_with_Javascript
   * local caching - http://addyosmani.github.io/basket.js/
   * grid system -(not) - http://www.gridsystemgenerator.com/download/gs01/uncompressed/1300_5_10_10.html
   *
   */


/** 
  * @namespace Stacketry
  */

window.Stacketry = (function(window, document, undef) {
    //alert(__application__)
    var version = "0.0.1"


    function _bootstrap(runtime) {
      console.log('bootstrapping: ', runtime)

      switch( runtime.platform ) {
        case "angular" : 
          _bootstrapAngular(runtime)
          break
        default: 
          console.log("Unsupported Platfrom")
      }
    }

    /**
      * Angular platform support assume we are using angular-ui-router and setts 
      * up the ui-view div for the app and bootstraps angular on the body
      */
    function _bootstrapAngular(runtime) {
      
      // insert ngview tag
      var ngView = document.createElement("div")
      ngView.setAttribute("ui-view", "")

      var body = document.getElementsByTagName('body')[0]
      body.insertBefore(ngView, body.firstChild)

      // cofnigure the angular app
      angular.module(runtime.ngApp, ['ui.router'])
        .config(function($stateProvider, $urlRouterProvider, $locationProvider) {

         $locationProvider.html5Mode(runtime.html5Mode)

          var defaultRoute = runtime.open || "/"
          $urlRouterProvider.otherwise(defaultRoute);
          console.log('adding default route: ', defaultRoute)

          // configure applicaiton states
/*          Object.keys(runtime.states).forEach(function(key){
            console.log( 'Adding state', key, '-> ', runtime.states[key])
            $stateProvider.state(key, runtime.states[key])
          })
*/
          runtime.routes.forEach(function(route) {
            //bind the route template/controller
            var sitePath = runtime.site || "site"
            var path = _join(sitePath, route, 'index.html')
            $stateProvider.state( route, {
              url: route,
              templateUrl: path
            })
            console.log( '   added route', route, '->', path)

            //merge route styles
            var path = _join(sitePath, route, 'index.css')
            
            // TODO: make this a namespaced cSS merge rather than 
            // the brute force load!  This method depends on yepnope
            // which is going to go away and allows for oru fragmented 
            // css partitioning to easity allow classes step on each other.
            yepnope.injectCss(path)
          })  
          
        })

      // fire it up!
      angular.bootstrap(document, [runtime.ngApp]);
    }


    /* from creationix/path.js */
    // Joins path segments.  Preserves initial "/" and resolves ".." and "."
    // Does not support using ".." to go above/outside the root.
    // This means that join("foo", "../../bar") will not resolve to "../bar"
    function _join(/* path segments */) {
      // Split the inputs into a list of path commands.
      var parts = [];
      for (var i = 0, l = arguments.length; i < l; i++) {
        parts = parts.concat(arguments[i].split("/"));
      }
      // Interpret the path commands to get the new resolved path.
      var newParts = [];
      for (i = 0, l = parts.length; i < l; i++) {
        var part = parts[i];
        // Remove leading and trailing slashes
        // Also remove "." segments
        if (!part || part === ".") continue;
        // Interpret ".." to pop the last segment
        if (part === "..") newParts.pop();
        // Push new path segments.
        else newParts.push(part);
      }
      // Preserve the initial slash if there was one.
      if (parts[0] === "") newParts.unshift("");
      // Turn back into a single string path.
      return newParts.join("/") || (newParts.length ? "/" : ".");
    }
     
    // A simple function to get the dirname of a path
    // Trailing slashes are ignored. Leading slash is preserved.
    function dirname(path) {
      return join(path, "..");
    }





    /**
      * public interface 
      */

	  var Stacketry = {}

    Stacketry.load = function(manifest) {
      console.log("Assembling...")

      yepnope([{
        load: manifest.require,
        callback: function( key, result ) {
          console.log(  "loaded", key)
        },
        complete: function(){
          _bootstrap(manifest.runtime)
        }
      }])

    }

    return Stacketry
})(this, this.document);