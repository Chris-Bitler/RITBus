/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Vector2 = require('vector2');
var ajax = require("ajax");
var accel = require("ui/accel");
var splashWindow = new UI.Window();
var mainMenu;
var menu2;
var routes = [];
var stops = [];

var curRouteStop;


// Text element to inform user
var text = new UI.Text({
  position: new Vector2(0, 0),
  size: new Vector2(144, 168),
  text:'Downloading data..',
  font:'GOTHIC_28_BOLD',
  color:'black',
  textOverflow:'wrap',
  textAlign:'center',
  backgroundColor:'white'
});

var stopData;

// Add to splashWindow and show
splashWindow.add(text);
splashWindow.show();

ajax(
  {
    url:'https://transloc-api-1-2.p.mashape.com/stops.json?agencies=643&callback=call',
    headers: {"X-Mashape-Key" : "vuDPS5EJPVmshPRON0u2wZK9Rqdap1Asa8sjsn3GevvSArSsaj"},
    type:'json'
  },
  function(data) {
    //console.log("test1");
    for(var i = 0; i < data.data.length; i++) {
      var stop = data.data[i];
      //console.log(stop.stop_id);
      stops[stop.stop_id] = stop;
    }
  },
  function(error) {
    console.log('Download failed: ' + error);
  }
);

//Routes
ajax(
  {
    url:'https://transloc-api-1-2.p.mashape.com/routes.json?agencies=643&callback=call',
    headers: {"X-Mashape-Key" : "vuDPS5EJPVmshPRON0u2wZK9Rqdap1Asa8sjsn3GevvSArSsaj"},
    type:'json'
  },
  function(data) {
    for(var i = 0; i < data.data[643].length; i++) {
      var route = data.data[643][i];
    //  console.log(route.long_name + "," + route.route_id + "," + route.stops);
      routes[route.route_id] = route;
    }
    var items = [];
    routes.forEach(function(element, index, array) {
      items.push({title: routes[index].long_name});
    });
    createMenu(items);
  },
  function(error) {
    console.log('Download failed: ' + error);
  }
);

//Getting it by name is really hacky and could break if a duplicate route/stop appeared.
function getRouteByName(title) {
  var route;
  routes.forEach(function(element,index,array) {
   // console.log(routes[index].long_name + " - " + title);
    if(routes[index].long_name === title) {
      route = routes[index];
    }
  });
  return route;
}

function createMenu(items) {
  mainMenu = new UI.Menu({
      sections: [{
        title: 'Bus Routes',
        items: items
      }]
    });
    mainMenu.on('select', routeSelect);
  
    mainMenu.show();
    splashWindow.hide();
}

function createMenu2(route, items, stopRef) {
  menu2 = new UI.Menu({
      sections: [{
        title: 'Bus Stops - ' + route.long_name,
        items: items
      }]
    });
    curRouteStop = route;
    menu2.on('select', function(e) {
      var rid = curRouteStop.route_id;
      var stop = stops[stopRef[e.itemIndex]];
      //consoe.log('https://transloc-api-1-2.p.mashape.com/arrival-estimates.json?agencies=643&callback=call&routes=' + rid + '&stops=' + stop.stop_id);
      showStop(rid,stop);
    });
  
    menu2.show();
    //mainMenu.hide();
}

function routeSelect(e) {
  var route = getRouteByName(e.item.title);
  if(route !== undefined) {
    var items = [];
    var stopRef = [];
    var i = 0;
    route.stops.forEach(function(element, index, array) {
      if(stops[route.stops[index]] !== undefined) {
        items.push({title: stops[route.stops[index]].name});
        stopRef[i] = route.stops[index];
        i++;
      }
    });
    createMenu2(route,items,stopRef);
  }
}

function showStop(rid,stop) {
  if(stopData !== undefined) {
    stopData.body = "Updating...";
  }
    ajax(
  {
    url:'https://transloc-api-1-2.p.mashape.com/arrival-estimates.json?agencies=643&callback=call&routes=' + rid + '&stops=' + stop.stop_id,
    headers: {"X-Mashape-Key" : "vuDPS5EJPVmshPRON0u2wZK9Rqdap1Asa8sjsn3GevvSArSsaj"},
    type:'json'
  },
  function(data) {
    if(data.data.length !== 0) {
      if(data.data[0].arrivals.length !== 0) {
        var millisStop = new Date(data.data[0].arrivals[0].arrival_at).getTime();
        var now = Date.now();
        var diff = millisStop - now;
        var min = Math.floor((diff/1000)/60);
          stopData = new UI.Card({
            scrollable: true,
            //title: curRouteStop.long_name,
            subtitle: "Stop: " + stop.name,
            body: "Arriving in approximately " + min + " minutes! Shake to refresh.",
          });
          stopData.show();
          accel.on("tap", function() {
            //console.log("Refreshing");
              ajax(
                {
                  url:'https://transloc-api-1-2.p.mashape.com/arrival-estimates.json?agencies=643&callback=call&routes=' + rid + '&stops=' + stop.stop_id,
                  headers: {"X-Mashape-Key" : "vuDPS5EJPVmshPRON0u2wZK9Rqdap1Asa8sjsn3GevvSArSsaj"},
                  type:'json'
                },function(data) {
                  //console.log("set body");
                  stopData.body("Updating..");
                  if(data.data.length !== 0) {
                    if(data.data[0].arrivals.length !== 0) {
                       var millisStop = new Date(data.data[0].arrivals[0].arrival_at).getTime();
                        var now = Date.now();
                        var diff = millisStop - now;
                        var min = Math.floor((diff/1000)/60);
                      stopData.body("Arriving in approximately " + min + " minutes! Shake to refresh.");
                     // console.log("Setbody 2");
                    }else{
                      stopData.body("Error retrieving data. Shake to try again.");
                    //  console.log("Setbody 3");
                    }
                  }else{
                    stopData.body("Error retrieving data. Shake to try again.");
                    //console.log("Setbody 4")
                  }
                },function(error){
                  
                });
          });
      }else{
        stopData = new UI.Card({
          //title: curRouteStop.long_name,
          subtitle: "Stop: " + stop.name,
          body: "No data! This probably means the bus isn't coming again for a while."
        });
        stopData.show();
      }
    }else{
      stopData = new UI.Card({
          title: curRouteStop.long_name,
          subtitle: "Stop:" + stop.name,
          body: "No data! This probably means the bus isn't coming again for a while."
        });
        stopData.show();
    }
  },
  function(error) {
    console.log('Download failed: ' + error);
  }
);
}