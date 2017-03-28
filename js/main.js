//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function all (){
  //pseudo-global variables
  var attr2012 = ["2012_DO", "2012_TCOLI_M", "2012_TN", "2012_TP", "2012_TSS"]; //list of attributes
  var expressed = attr2012[0]; //initial attribute
  //begin script when window loads
  window.onload = setMap();
  //set up choropleth map
  function setMap(){

    //map frame dimensions
    //why isn't inner width responsive?
    var width = window.innerWidth * 0.5,
    height = 400;

    //create new svg container for the map
    var map = d3.select("body")
    .append("svg")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height);

    //create Albers equal area conic projection centered on Chesapeake Bay
    //this still needs somme tweaking
    var projection = d3.geoAlbers()
    .center([0, 40])
    .rotate([77.3, 0, 0])
    .parallels([36.6, 43.2])
    .scale(3450)
    .translate([width / 2, height / 2]);
    //puts the paths on the screen
    var path = d3.geoPath()
    .projection(projection);

    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
    .defer(d3.csv, "data/CBWaterQuality.csv") //load attributes from csv
    .defer(d3.json, "data/Watershed.topojson") //load choropleth spatial data
    .defer(d3.json, "data/States.topojson") //load choropleth spatial data
    .await(callback);
    function callback(error, waterQuality, watershed,states){

      //translate watershed and states TopoJSON back to GeoJSON
      var waterPoly = topojson.feature(watershed,  watershed.objects.Watershed).features;
      var states = topojson.feature(states,  states.objects.States).features;


      //call Data Join loop
      joinData(waterPoly, waterQuality);
      //create the color scale
      var colorScale = makeColorScale (waterQuality);
      //call adding polygons to map
      layers (waterPoly, map, path, colorScale);
      //add the coordinated viz to the page
      setChart (waterPoly, colorScale);
    };
  };
  //end of Set Map
  //adds the json layers
  function layers (waterPoly, map, path, colorScale, states){
    // //starting to code for adding state layer for context
    var stateBounds = map.append('path')
      .datum(states)
      .attr("class", "states")
      .attr("d", path);
console.log(stateBounds);
    //add watersheds to map
    //waterPoly are the watershed polygons
    var watershedBounds = map.append('g')
    .attr('class', 'watershed');
    //adding color scheme etc to watershedpolys
    watershedBounds.selectAll(".watershedBounds")
    .data(waterPoly)
    .enter()
    .append("path")
    .attr("class", "watershedBounds")
    .attr("d", path)
    .style("fill", function(d){
      return colorScale(d.properties[expressed]);
    });
    //styling neutral values in the CSS
  };
  //joins the csv data to the polygons
  function joinData (waterPoly, waterQuality){
    // loop over every item of the geojson
    for (var i = 0; i < waterPoly.length; i++) {
      // create a variable to hold the current
      // geojson property in the loop
      var feature = waterPoly[i];
      // save the join id
      var huc = feature.properties.HUC8;
      // for each item inn the geojson,
      // loop over every item in the csv data
      for (var k = 0; k < waterQuality.length; k++) {
        var waterData = waterQuality[k];
        // check if the csv item has the same
        // join key as the geojson item
        if (huc === waterData.HUC8) {
          // when the two have the same join key,
          // attach all the properties from the csv
          // to the geojson
          for (var key in waterData) {
            //assign the water parameter variables to polygon and turn them into numbers
            feature.properties[key] = parseFloat(waterData[key]);
          }
        }
      }
    }
    return waterPoly;
  }

  //function to create color scale generator
  function makeColorScale(data){
    var colorClasses = [
      "#f6e8c3",
      "#dfc27d",
      "#bf812d",
      "#8c510a",
      "#543005"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
    .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
      var val = parseFloat(data[i][expressed]);
      domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);
    return colorScale;
  };

  //function to create coordinated bar chart
  function setChart(waterPoly, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.5,
        chartHeight = 400;

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
      .append("svg")
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("class", "chart");

    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
      .range([0, chartHeight])
      .domain([0, 12]);

    //loops over waterPoly attaches a new property to each feature that contains the number I want to use in the chart
    for (var i = 0; i < waterPoly.length; i++){
      //cleaning the data
      var value = waterPoly[i].properties[expressed];
      //if the value is currently false instead set to zero
      if (!value) {
        value = 0;
      }
      //attaches object back to the waterPoly
      waterPoly[i].chartValue = value;
    }

    //set bars for each watershed
    var bars = chart.selectAll(".bars")
      .data(waterPoly)
      .enter()
      .append("rect")
      .sort(function(a, b){
        return b.chartValue - a.chartValue;
      })
      .attr("class", function(d){
        return "bars " + d.adm1_code;
      })
      .attr("width", chartWidth / waterPoly.length - 1)
      .attr("x", function(d, i){
        return i * (chartWidth / waterPoly.length);
      })
      .attr("height", function(d){
        return yScale(d.chartValue);
      })
      .attr("y", function(d){
        return chartHeight - yScale(d.chartValue);
      })
      .style("fill", function(d){
        return colorScale(d.chartValue);
      });

    //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
      .data(waterPoly)
      .enter()
      .append("text")
      .sort(function(a, b){
        return a[expressed]-b[expressed]
      })
      .attr("class", function(d){
        return "numbers " + d.adm1_code;
      })
      .attr("text-anchor", "middle")
      .attr("x", function(d, i){
        var fraction = chartWidth / waterPoly.length;
        return i * fraction + (fraction - 1) / 2;
      })
      .attr("y", function(d){
        return chartHeight - yScale(parseFloat(d[expressed])) + 15;
      })
      .text(function(d){
        return d[expressed];
      });
  };
})(); //last line of main.js
