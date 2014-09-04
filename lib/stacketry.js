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

    /**
      * Fetch a resource
      *
      * @param {string} resource - The url of the resource to load
      * @return {promise} - Fulfilled with {data, status, xml} when successful, {status, xml} otherwise
      */
    function _fetch(resource) {
      var d = new Promises.Deferred()
      var req = new ajaxObject(resource, function(data, status, xml){
        if (status == 200)
          d.fulfill({
            data: data, 
            status: status, 
            xml: xml
          }) 
        else
          d.reject({
            status: status, 
            xml: xml
          })
      })

      req.update()
      return d.promise()
    }

    /**
      * Bootstap the applications of various types.  Currently suports Angular and None
      * 
      *
      * 
      * @param {object} runtime - the runtime configutaiton of the applciaiton
      */
    function _bootstrap(runtime) {
      console.log('')

      switch( runtime.platform ) {
        case "angular" : 
          _bootstrapAngular(runtime)
          break
        case "none" :
        default: 
          console.log("  no platform specified...your on your onw :-)")
      }
    }

    function _T(e) {
      console.log('')
      console.log('WHOA!')
      console.log(e.message)
      console.log(e.stack)
      throw(e)
    }


    /**
      * Bootstraps an Angular based application. Angular platform support is based on angular-ui-router, injects a 
      * ui-view div for the app and bootstraps angular on the body element
      *
      * @param {object} runtime - the angular runtime configuration
      */
    function _bootstrapAngular(runtime) {
      console.log('Configuring Angular applicaiton "' + runtime.ngApp + '"')

      // load all route manifests and related data

      // sitePath defaults to 'site'
      var sitePath = runtime.site || "site"


      // keep track of how many routes are being loaded
      // and only conitnue when they are all done
      var allRoutesLoaded = new Promises.Deferred()
      var totalRoutesBeingLoaded = 0
      var siteManifests = []

      runtime.routes.forEach(function(route) {
        ++totalRoutesBeingLoaded

        // called after each route has been fully loaded 
        // and configured
        function _continue(result) { 
          siteManifests.push(result)

          if (!(--totalRoutesBeingLoaded)) {
            allRoutesLoaded.fulfill()
          }
        }

        // load the route
        if ( typeof(route) == "object") 
        {
          // inline manifest
          _loadRouteRequires(_join(sitePath, route.name), route).always(_continue)
        }
        else
        {
          // look for a manifest at route
          var routePath = _join(sitePath, route)
          var manifestUrl = _join(routePath, 'manifest.json')
          
          _fetch(manifestUrl).then(
            function(data) {
              manifest = JSON.parse(data)
              _loadRouteRequires(routePath, manifest).always(_continue)
            },
            
            function(status) {
              // supply a default manifest
              var defaultManifest = {
                "name": route,
                "templateUrl": _join(sitePath, route, 'index.html'),
                require: []
              }
              _loadRouteRequires(routePath, defaultManifest ).always(_continue)
            }
          ) // _fetch()
        }
      }) //forEach 


      // after routes are all loaded, bootstrap angular 
      allRoutesLoaded.promise().always(function() {
        console.log('Bootstrapping Angular')
        // insert ngview tag
        var ngView = document.createElement("div")
        ngView.setAttribute("ui-view", "")

        var body = document.getElementsByTagName('body')[0]
        body.insertBefore(ngView, body.firstChild)
        // cofnigure the angular app

        angular.module(runtime.ngApp, ['ui.router'])
          .config(function($stateProvider, $urlRouterProvider, $locationProvider) {
            try {
              $locationProvider.html5Mode(runtime.html5Mode)

              var defaultRoute = runtime.open || "/"
              $urlRouterProvider.otherwise(defaultRoute);

              // Configure ui-router
              // 
              // TODO: replace loading fucntionaliy with FutreState (see
              // http://christopherthielen.github.io/ui-router-extras/#/future)
              // to enable deferred state loading to spped application startup.

              function fireEvents(manifest, event) {
                console.log( manifest)
                manifest.require.forEach(function(require){
                  if (require.type == "text/javascript") {
                    console.log("EVENT: ", require)
                    if (event in require.exports)
                    {

                      require.exports.onLoad.apply(window,[])
                    }
                  }
                })
              }


              siteManifests.forEach(function(manifest) {
                console.log('----->', manifest)

                $stateProvider.state(manifest.name, {
                  url: manifest.name,
                  templateUrl: manifest.templateUrl,
                  
                  // exports bound by closure
                  controller: (function(manifest) {
                    return function() {
                      console.log('Swutched to view', manifest.name)
                      
                      fireEvents(manifest, 'onLoad')
                    }
                  }(manifest))

                })
                console.log( '  route configured:', manifest.name, ' =>', manifest.name)
              })

            }catch(e){_T(e)}
          })// .config

          // fire it up whgen all routes are loaded
          angular.bootstrap(document, [runtime.ngApp]); //Note: we *could* be booting multiple apps, now sure how/why to leverage that :-)

          console.log('  Angular started!')
          console.log('')

      }) // allroutesloaded

    } // _bootstrapAngular


    /**
      * Load an angular route and all it's parts from the route manifest
      * 
      * @param {object} manifest - a manifest of all route components to be loaded
      * @return {promise} Promise that is fulfilled when all parts are loaded
      */
    function _loadRouteRequires(routePath, manifest) {
      //console.log("  loading route", manifest.name)

      manifest.require = manifest.require || []
      
      var deferred = new Promises.Deferred()
      var pendingRequests = 0

      // callback / gate to block until all req's are loaded
      function _continue(file){
        //console.log('    ', file, 'loaded')
        if (!(--pendingRequests)) {
          //console.log("     dependancies for", manifest.name, 'loaded')
          deferred.fulfill(manifest)
        }
      }
      
      if (manifest.require.length == 0) {
        deferred.fulfill(manifest)
      }
      else {
        manifest.require.forEach(function(require){
          //console.log('    requires', require.path)
          pendingRequests++

          if ( require.type == "text/css") {
            // TODO: make this a namespaced cSS merge rather than 
            // the brute force load!  This method depends on yepnope
            // which is going to go away and allows for oru fragmented 
            // css partitioning to easity allow classes step on each other.
            
            // IMPORTANT! this will complete async and we cannot be certain it's ready when this route is fulfilled
            // TODO: fix when implmenting CSS merge feature described above
            yepnope.injectCss(_join(routePath, require.path)) 
            
            //TODO how to make this async - timer siulates this!
            setTimeout( function(){_continue(require.path)}, 1000)
          }
          else {
            // Load route specific js
            _fetch(_join(routePath, require.path)).then(
              function(result) {
                // save the exports
                require.exports = injectScript(result.data)
                _continue(require.path)   
              },
              function(status) {
                // script not found
                console.log('Stacketry error loading scirpt', manifest.require[1].path)
                require.exports = {}
                _continue(require.path)
              }
            )
          }
        })
      }    
      
      return deferred.promise()
    }


    /**
      * Execute route specific sciptt 
      *
      * TODO: not sure we need the exports for 
      * yet...What would we do wiht them? Also 
      * passing in a placeholder 'require' method
      * that could be used to gain ref to other sciprt 
      * exports perhaps???
      *
      * @param {string} script to inject
      * @return {object} exports from script executiopn
      */
    function injectScript(script) {    
      // pass in 'expoerts' and 'require' 
      var _exports = {}

      var _require = function(dep) {
          console.log('reuquiring', dep)
        }

      // load and execute script
      try {
        var _run = eval(wrap(script))

        // pass in 'globals' - we could sandbox this if 
        // we wanted to, maybe that should be a manifest option?
        var _context = window

        _run.apply(_context, [_exports, _require]);
      }

      catch(e) {
        console.log("Unhandled Exception!", e.message)
        console.log(e.stack)

        throw(e)
      }

      return _exports;
    }

    /**
      * Wraps injected script 
      * @param {string} the script text
      * @return {string} script text for execution
      */
    function wrap(script) {
      var wrapper = [
        '(function(exports, require){',
        '\n})'
      ]
      return wrapper[0] + script + wrapper[1]
    }


    //////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////
    // Some untility stuff - we could rely on jQuery, but trying 
    // to avoid any 3rd lib dep's for the stacketry core.  That 
    // will just complicate things :-)
    // 
    // so, that said, below are a few bits of usefulness that 
    // many or may not rewritten at some point.

    /**
      * Joins path segments - from creationix/path.js 
      * 
      * Preserves initial "/" and resolves ".." and "."
      * Does not support using ".." to go above/outside the root.
      * This means that join("foo", "../../bar") will not resolve to "../bar"
      */
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
      * Tiny ajax cross browser ajax loader
      * from http://www.hunlock.com/blogs/The_Ultimate_Ajax_Object
      */
    function ajaxObject(url, callbackFunction) {
      var that=this;      
      this.updating = false;
      this.abort = function() {
        if (that.updating) {
          that.updating=false;
          that.AJAX.abort();
          that.AJAX=null;
        }
      }
      this.update = function(passData,postMethod) { 
        if (that.updating) { return false; }
        that.AJAX = null;                          
        if (window.XMLHttpRequest) {              
          that.AJAX=new XMLHttpRequest();              
        } else {                                  
          that.AJAX=new ActiveXObject("Microsoft.XMLHTTP");
        }                                             
        if (that.AJAX==null) {                             
          return false;                               
        } else {
          that.AJAX.onreadystatechange = function() {  
            if (that.AJAX.readyState==4) {             
              that.updating=false;                
              that.callback(that.AJAX.responseText,that.AJAX.status,that.AJAX.responseXML);        
              that.AJAX=null;                                         
            }                                                      
          }                                                        
          that.updating = new Date();                              
          if (/post/i.test(postMethod)) {
            var uri=urlCall+'?'+that.updating.getTime();
            that.AJAX.open("POST", uri, true);
            that.AJAX.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            that.AJAX.setRequestHeader("Content-Length", passData.length);
            that.AJAX.send(passData);
          } else {
            var uri=urlCall+'?'+passData+'&timestamp='+(that.updating.getTime()); 
            that.AJAX.open("GET", uri, true);                             
            that.AJAX.send(null);                                         
          }              
          return true;                                             
        }                                                                           
      }
      var urlCall = url;        
      this.callback = callbackFunction || function () { };
    }

    /**
      * Promise implementaiton from
      *
      * MIT license; Project homepage: http://promises.codeplex.com 
      */

      var Promises; (function (n) { "use strict"; var t = function (n) { var t = function () { }; return n && typeof n == typeof t }, i = function () { function n() { } return n.scheduleExecution = function () { var n = !1; try { n = t(setImmediate) } catch (i) { } return n ? function (n) { setImmediate.call(null, n) } : setTimeout.call ? function (n) { setTimeout.call(null, n, 0) } : function (n) { setTimeout(n, 0) } }(), n }(); n.Scheduler = i })(Promises || (Promises = {})), function (n) { "use strict"; (function (n) { n[n.Pending = 0] = "Pending"; n[n.Fulfilled = 1] = "Fulfilled"; n[n.Rejected = 2] = "Rejected" })(n.DeferredState || (n.DeferredState = {})); var e = n.DeferredState, t = function (n) { var t = function () { }; return n && typeof n == typeof t }, u = function (n) { return n && typeof n == "object" }, i = function (r, f) { if (f !== undefined && f !== null) if (f instanceof n.Promise) if (r.then === f.then) r.reject(new TypeError); else { f.then(function (n) { return i(r, n) }, r.reject); return } else if (u(f) || t(f)) { var e = n.Promise.fromThenable(f); if (e != null) { e.then(function (n) { return i(r, n) }, r.reject); return } } r.fulfill(f) }, f = function () { function u() { this.state = 0; this.fulfilledContinuations = []; this.rejectedContinuations = [] } return u.prototype.fulfill = function (n) { if (this.state === 0) { for (this.state = 1, this.resultData = n; this.fulfilledContinuations.length > 0;) this.fulfilledContinuations.shift()(this.resultData); this.rejectedContinuations = null } }, u.prototype.reject = function (n) { if (this.state === 0) { for (this.state = 2, this.resultData = n; this.rejectedContinuations.length > 0;) this.rejectedContinuations.shift()(this.resultData); this.fulfilledContinuations = null } }, u.prototype.then = function (u, f) { var c = this, h = function (t, r) { return function (u) { n.Scheduler.scheduleExecution.call(null, function () { var n; try { n = r(u) } catch (f) { t.reject(f); return } i(t, n) }) } }, e, o, s; return !t(u) && !t(f) ? new n.Promise(function (n, t) { return c.then(n, t) }) : (e = new r, t(u) || (u = e.fulfill), t(f) || (f = e.reject), o = h(e, u), this.state === 1 ? o(this.resultData) : this.state === 0 && this.fulfilledContinuations.push(o), s = h(e, f), this.state === 2 ? s(this.resultData) : this.state === 0 && this.rejectedContinuations.push(s), e.promise()) }, u }(), r = function () { function t() { var i = this, t = new f; this.getState = function () { return t.state }; this.promise = function () { return new n.Promise(i.then) }; this.reject = function (n) { return t.reject(n) }; this.fulfill = function (n) { return t.fulfill(n) }; this.then = function (n, i) { return t.then(n, i) } } return t }(); n.Deferred = r }(Promises || (Promises = {})), function (n) { "use strict"; var t = function (n) { var t = function () { }; return n && typeof n == typeof t }, i = function () { function i(n) { this.then = n } return i.prototype.always = function (n) { return this.then(n, n) }, i.fromThenable = function (r) { var f, u, e; try { f = r.then } catch (o) { return i.rejectedWith(o) } return t(f) ? (u = new n.Deferred, e = function (n) { return function (t) { arguments.length > 1 ? n(arguments) : n(t) } }, n.Scheduler.scheduleExecution(function () { try { f.call(r, e(u.fulfill), e(u.reject)) } catch (n) { u.reject(n) } }), u.promise()) : null }, i.fulfilledWith = function (t) { if (arguments.length == 0) return i.fulfilled; var r = new n.Deferred; return r.fulfill(t), r.promise() }, i.rejectedWith = function (t) { if (arguments.length == 0) return i.rejected; var r = new n.Deferred; return r.reject(t), r.promise() }, i.whenAll = function (t) { var u, r, f, e; if (t.length == 0) return i.fulfilled; if (t.length == 1) return t[0]; for (u = new n.Deferred, r = 0, f = 0; f < t.length; f++) e = t[f], r++, e.then(function () { r--; r == 0 && u.fulfill() }, function (n) { r--; u.reject(n) }); return u.promise() }, i.whenAny = function (t) { var r, u, f; if (t.length == 0) return i.fulfilled; if (t.length == 1) return t[0]; for (r = new n.Deferred, u = 0; u < t.length; u++) f = t[u], f.then(function (n) { r.fulfill(n) }, function (n) { r.reject(n) }); return r.promise() }, i.never = new i(function () { return i.never }), i }(); n.Promise = i }(Promises || (Promises = {})), function (n) { "use strict"; n.Promise.rejected = function () { var t = new n.Deferred; return t.reject(), t.promise() }(); n.Promise.fulfilled = function () { var t = new n.Deferred; return t.fulfill(), t.promise() }() }(Promises || (Promises = {})), function (n) { "use strict"; var t = function () { function t() { } return t.objectMethods = function (n, t, i, r, u) { typeof r == "undefined" && (r = "Async"); var f = [], e = []; if (t.forEach(function (t) { if (t in n) { var o = t + r; o in n ? e.push(o) : n[o] = i(n[t], u) } else f.push(t) }), f.length > 0) throw new Error("The following method names were not found on the source object: " + f.join(", ") + "."); if (e.length > 0) throw new Error("The following target method names are already present on the source object: " + e.join(", ") + "."); }, t.objectNodeAsyncMethods = function (n, i, r, u) { typeof r == "undefined" && (r = "Async"); t.objectMethods(n, i, t.fromNodeAsyncMethod, r, u) }, t.objectSyncMethods = function (n, i, r, u) { typeof r == "undefined" && (r = "Async"); t.objectMethods(n, i, t.fromSyncMethod, r, u) }, t.fromAsyncMethod = function (t, i) { return function () { for (var e, u, f = [], r = 0; r < arguments.length - 0; r++) f[r] = arguments[r + 0]; return e = i === undefined ? this : i, u = new n.Deferred, t.apply(e, [u.fulfill, u.reject].concat(f)), u.promise() } }, t.fromNodeAsyncMethod = function (n, i) { return t.fromAsyncMethod(function (t, i) { for (var f, u = [], r = 0; r < arguments.length - 2; r++) u[r] = arguments[r + 2]; f = function (n) { for (var f, r = [], u = 0; u < arguments.length - 1; u++) r[u] = arguments[u + 1]; n === undefined || n === null ? (f = r.length === 1 ? r[0] : r, t(f)) : i(n) }; n.apply(this, u.concat([f])) }, i) }, t.fromSyncMethod = function (i, r) { return t.fromAsyncMethod(function (t, r) { for (var e, f = [], u = 0; u < arguments.length - 2; u++) f[u] = arguments[u + 2]; e = this; n.Scheduler.scheduleExecution(function () { try { t(i.apply(e, f)) } catch (n) { r(n) } }) }, r) }, t }(); n.Convert = t }(Promises || (Promises = {}));




    /**
      * public interface 
      */

	  var Stacketry = {}

    Stacketry.load = function(manifest) {
      console.log('Stacketry version', version, 'assembling application "' +  manifest.appid + '"')

      yepnope([{
        load: manifest.require,
        callback: function( key, result ) {
          console.log(  "  requires", key)
        },
        complete: function(){
          _bootstrap(manifest.runtime)
        }
      }])

    }


    return Stacketry
})(this, this.document);