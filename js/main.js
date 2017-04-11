//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function all (){
  //pseudo-global variables
  //all years & pollutants in data

  var years = ["2016", "2015", "2014", "2013", "2012", "2011", "2010"]
  var pollutants = ["DO", "TCOLI_M", "TN", "TP", "TSS"]

//return full text from abbreviation
  function abbreviations (a){
    if (a === "DO") {return "Dissolved Oxygen"}
    else if (a === "TN") {return "Total Nitrogen"}
    else if (a === "TCOLI") {return "Total Coliforms"}
    else if (a === "TSS") {return "Total Suspended Solids"}
    else if (a === "TP") {return "Total Phosphorus"}
  };

  var attr2015 = ["2015_DO", "2015_TCOLI_M", "2015_TN", "2015_TP", "2015_TSS"]; //list of attributes

  var expressed = attr2015[0]; //initial attribute
  //begin script when window loads
  //frame dimensions
  var width = ($("#body").width()),
  height = 580,
  translate = "translate(0," + (height - 19) + ")"
  // translate = "translate(0," + (height - (height * .036)) + ")";

  //create a second svg element to hold the bar chart
  var chart = d3.select("#mapChart")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("class", "chart");

  //create a scale to size bars proportionally to frame
  var yScale = d3.scaleLinear()
  .range([0, width * .4])

  //create axis
  var xAxis = d3.axisBottom()
  .scale(yScale);

  //place axis
  var axis = chart.append("g")
  .attr("class", "axis")
  .attr("transform", translate)
  .call(xAxis);

  //make this global so deHighlight works
  var colorScale, waterPoly

  window.onload = setMap();

  //set up choropleth map
  function setMap(){
    //map frame dimensions

    //create new svg container for the map
    var map = d3.select("#mapChart")
    .append("svg")
    .attr("class", "map")
    .attr("height", height);

    //create Albers equal area conic projection centered on Chesapeake Bay
    var projection = d3.geoAlbers()
    .center([0, 40])
    .rotate([71.5, 0, 0])
    .parallels([36.6, 43.2])
    .scale(5000)
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

    function callback(error, waterQuality, watershed, states){

      //translate watershed and states TopoJSON back to GeoJSON
      waterPoly = topojson.feature(watershed,  watershed.objects.Watershed).features;
      var states = topojson.feature(states,  states.objects.States).features;

      //call Data Join loop
      waterPoly = joinData(waterQuality);

      //create the color
      colorScale = makeColorScale (expressed);

      //call adding polygons to map
      layers (map, path, states);

      //add the coordinated viz to the page
      setChart ();

      //add the footer
      footer ();

      //add the header
      createDropdowns ();

    };
  };
  //joins the csv data to the polygons
  function joinData (waterQuality){
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

  //adds the json layers
  function layers (map, path, states){
    //starting to code for adding state layer for context
    var stateBounds = map.append('g')
    .attr("class", "states");

    stateBounds.selectAll(".stateBounds")
    .data(states)
    .enter()
    .append("path")
    .attr("class", "states")
    .attr("d", path);
    //add watersheds to map
    //waterPoly are the watershed polygons
    var watershedBounds = map.append('g')
    .attr('class', 'watershed');

    //adding color scheme etc to watershedpolys
    watershedBounds.selectAll(".watershedBounds")
    .append('g')
    .data(waterPoly)
    .enter()
    .append("path")
    .attr("class", function (d){
      return "watershedBounds a" + d.properties.HUC8;
    })
    .attr("d", path)
    .style("fill", function(d){
      return choropleth(d.properties[expressed]);
    })
    .on("mouseover", highlight)
    .on("mouseout", function (d) { deHighlight(d); })
    .on("mousemove", moveLabel);
  };

  //function to test for data value and return color
  function choropleth(property){
    //make sure attribute value is a number
    var val = parseFloat(property)
    //if attribute value exists, assign a color; otherwise assign gray
    if  (!isNaN(val)){
      color =  colorScale(val);
      return color;
    } else {
      return "#e0eeee";
    };
  };

  //function to create color scale generator
  function makeColorScale(){
    var colorClasses = ["#543005","#8c510a","#bf812d","#dfc27d","#f6e8c3"]
    colorClasses.reverse();
    //create color scale generator
    var scale = d3.scaleQuantile()
    .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<waterPoly.length; i++){
      var val = +(waterPoly[i].properties[expressed]);
      domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    scale.domain(domainArray);
    return scale;
  };

  //clean the data
  function cleanData (){
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
    return waterPoly;
  };

  //function to create coordinated bar chart
  function setChart(){

    waterPoly = cleanData ();

    //set the range and domain for the bars
    var values = waterPoly.map(function (x) { return x.chartValue; });
    //create a scale to size bars proportionally to frame
    yScale.domain(d3.extent(values));

    //create group for the bars
    var barContainer = chart.append('g');

    //set bars for each watershed
    var bars = barContainer.selectAll(".bars")
    .data(waterPoly)
    .enter();
    //create the bars themselves, add class that joins bars to watersheds
    bars.append("rect")
    .attr("class",  function (d){
      return "bars a" + d.properties.HUC8;
    })
    .sort(function(a, b){
      return a.chartValue - b.chartValue;
    })
    .attr("height", height / waterPoly.length - 1)
    .attr("width", function(d){
      return yScale(d.chartValue);
    })
    .attr("y", function(d, i){
      return i * ((height - 20) / waterPoly.length);
    })
    .attr("x", "0")
    .style("fill", function(d){
      return colorScale(d.chartValue);
    })
    .on("mouseover", highlight)
    .on("mouseout", function (d) { deHighlight(d); })
    .on("mousemove", moveLabel);
  };

  //dropdown change listener handler
  function changeAttribute(attribute){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    colorScale = makeColorScale(attribute);
    waterPoly = cleanData (attribute);

    //recolor enumeration units
    var regions = d3.selectAll(".watershedBounds")
    .transition()
    .duration(500)
    .style("fill", function(d){
      return choropleth(d.properties[expressed], colorScale)
    });

    //set the range and domain for the bars
    var values = waterPoly.map(function (x) { return x.chartValue; });
    //create a scale to size bars proportionally to frame
    yScale.domain(d3.extent(values));

    //update axis
    xAxis.scale(yScale);

    //place axis
    axis.call(xAxis);

    //updating the bars
    d3.selectAll('.bars')
    .sort(function(a, b){
      return a.chartValue - b.chartValue;
    })
    .transition()
    .duration(200)
    .attr("width", function(d){
      return yScale(d.chartValue);
    })
    .attr("y", function(d, i){
      return i * ((height - 20) / waterPoly.length);
    })
    .style("fill", function(d){
      return colorScale(d.chartValue);
    });

    //update the title
    d3.select("#mainTitle")
    .transition()
    .duration(500)
    .text(function(){
      var a  = expressed.split("_")
      b = a[1]
      return "Average Amount of " + abbreviations(b) + " per Chesapeake Bay Subwatershed in " + a[0];
    })
  };

  //function to highlight enumeration units and bars
  function highlight(d){
    setLabel(d);
    //change stroke
    var selected = d3.selectAll(".a" + d.properties.HUC8)
    .style('fill', 'tomato')
  };

  //function to remove highlighting on mouseout
  function deHighlight(d) {
    var selected = d3.selectAll(".a" + d.properties.HUC8)
    .style("fill", function(d){
      //PROBLEM
      return colorScale(d.properties[expressed])
    });

    d3.select(".infolabel")
    .remove();
  };

  //function to create dynamic label
  function setLabel(d){
    //label content
    var format = d3.format(",.2f")
    var a  = expressed.split("_")
    var labelAttribute = "<h1>" + a[1] +": " + format(d.properties[expressed]) +
    "</h1> mg/l";

    //create info label div
    var infolabel = d3.select("#body")
    .append("div")
    .attr("class", "infolabel")
    .attr("id", d.properties.HUC8 + "_label")
    .html(labelAttribute);

    var regionName = infolabel.append("div")
    .attr("class", "labelname")
    .html("<b>Watershed:</b> " + d.properties.NAME);
  };

  //function to move info label with mouse
  function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
    .node()
    .getBoundingClientRect()
    .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 12,
    y1 = d3.event.clientY - 2,
    x2 = d3.event.clientX - labelWidth - 12,
    y2 = d3.event.clientY - 2;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 30 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 30 ? y2 : y1;

    d3.select(".infolabel")
    .style("left", x + "px")
    .style("top", y + "px");
  };

//creates the dropdowns and heading of the page
  function createDropdowns () {
    //add the title and dropdowns to the page
    //create chart title in div
    var header = d3.select('#header')
    .append('h3')
    .attr("id","mainTitle")
    .text(function(){
      var a  = expressed.split("_")
      return "Average Amount of " + abbreviations(a[1]) + " per Chesapeake Bay Subwatershed in " + a[0];
    })
    //create a dropdown for the year
    var yearDropDown = d3.select("#yearChange")
    .append("select")
    .attr("class", "dropdown")
    .append("option")
    .attr("class", "titleOption")
    .attr("disabled", "true")
    .text("Year");

    // .on("change", function(){
    //   changeAttribute(this.value, waterPoly)
    // });

    //create a dropdown menu for attribute selection
    //add select element
    var dropdown = d3.select("#Pollutant")
    .append("select")
    .attr("class", "dropdown")
    .on("change", function(){
      changeAttribute(this.value)
    });

    //add initial option
    var titleOption = dropdown.append("option")
    .attr("class", "titleOption")
    .attr("disabled", "true")
    .text("Select Pollutant");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
    .data(attr2015)
    .enter()
    .append("option")
    .attr("value", function(a){
      return a;})
    .text(function(d){
      //split the pollutants name to return name without year
      a = d.split("_")
      b = a[1]
      return abbreviations(b);
    });
  };
  //create a legand with descriptive text
  function footer () {
    //create the container svg
    var legend = d3.select("#footer")
    .append("svg")
    .attr("width", width/2)
    .attr("height", 20);

    //adds legand swatch
    legend.append("rect")
    .attr("width", 20)
    .attr("height", 20)
    .attr("x", 10)
    .style("fill", "#e0eeee")
    .style("border");

    //adds text to legend
    legend.append("text")
    .attr("font-size",".8em")
    .attr("font-family","sans-serif")
    .attr("font-weight","bold")
    .html("No Data")
    .attr("x", 35)
    .attr("y", 15);
  };
})(); //last line of main.js
