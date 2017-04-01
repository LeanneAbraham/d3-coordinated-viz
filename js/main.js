//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function all (){
  //pseudo-global variables
  var attr2012 = ["2012_DO", "2012_TCOLI_M", "2012_TN", "2012_TP", "2012_TSS"]; //list of attributes
  var expressed = attr2012[0]; //initial attribute
  //begin script when window loads
  var year = 2012
  //frame dimensions
  var width = window.innerWidth/2,
      height = 750;
  window.onload = setMap();
  //set up choropleth map
  function setMap(){
    //map frame dimensions

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
    .rotate([76.1, 0, 0])
    .parallels([36.6, 43.2])
    .scale(4200)
    .translate([width * .65, height / 2]);
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
      layers (waterPoly, map, path, colorScale,states);
      //add the coordinated viz to the page
      setChart (waterPoly, colorScale);
    };
  };
  //end of Set Map
  //adds the json layers
  function layers (waterPoly, map, path, colorScale, states){
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
    //starting to code for adding state layer for context
    var stateBounds = map.append('g')
    .attr("class", "states");

    stateBounds.selectAll(".stateBounds")
    .data(states)
    .enter()
    .append("path")
    .attr("class", "states")
    .attr("d", path);
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
    //chart frame dimensions
    var chartWidth = width,
        chartHeight = height,
        leftPadding = 10,
        rightPadding = 10,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2
        translate = "translate(0,730)";

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
      .append("svg")
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("class", "chart");
    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
    .range([0, chartWidth])
    .domain([6.5, 12]);
    //set bars for each watershed
    var bars = chart.selectAll(".bars")
    .data(waterPoly)
    .enter()
    .append("g");
    //create the bars themselves
    bars.append("rect")
    .attr("class","bars")
    .sort(function(a, b){
      return a.chartValue - b.chartValue;
    })
    .attr("height", chartHeight / waterPoly.length -5)
    .attr("width", function(d){
      return yScale(d.chartValue);
    })
    .attr("y", function(d, i){
      return i * ((chartHeight - 20) / waterPoly.length);
    })
    .attr("x", "0")
    .style("fill", function(d){
      return colorScale(d.chartValue);
    });
    //annotate bars with attribute value text
    // bars.append("g")
    // .append("text")
    // .sort(function(b,a){
    //   return b.chartValue - a.chartValue;
    // })
    // .attr("class", "numbers")
    // // .attr("text-anchor", "middle")
    // .attr("x", function(d){
    //   return (yScale(d.chartValue)+5);
    // })
    // .attr("y", function(d, i){
    //   return i * ((chartHeight - 20) / waterPoly.length)+7;
    // })
    // .text(function(d){
    //   var format = d3.format(",.2f")
    //   return format(d.chartValue);
    // });
    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", chartWidth * .025)
        .attr("y", chartHeight-(chartHeight-30))
        .attr("class", "chartTitle")
        .text(function(){
          var a  = expressed.split("_")
          return "Average Amount of " + a[1] + " per Subwatershed in " + a[0];
        });
    //create a text element for subchart title
      chart.append("text")
        .attr("x", chartWidth * .025)
        .attr("y", chartHeight-(chartHeight-50))
        .attr("class", "subTitle")
        .text("*in mg/l");

    //create horizonatal axis generator
    var xAxis = d3.axisBottom()
        .tickValues([7, 8, 9, 10, 11])
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(xAxis);
  };
})(); //last line of main.js
