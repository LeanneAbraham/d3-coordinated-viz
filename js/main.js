//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function all (){
  //pseudo-global variables
  var attr2012 = ["2012_DO", "2012_TCOLI_M", "2012_TN", "2012_TP", "2012_TSS"]; //list of attributes

  var expressed = attr2012[0]; //initial attribute
  //begin script when window loads
  //frame dimensions
  var a  = expressed.split("_")
  var width = window.innerWidth/2,
  height = 500;

  //chart frame dimensions
  var chartWidth = width,
  chartHeight = height,
  leftPadding = 10,
  rightPadding = 10,
  topBottomPadding = 5,
  chartInnerWidth = chartWidth - leftPadding - rightPadding,
  chartInnerHeight = chartHeight - topBottomPadding * 2
  translate = "translate(0," + (chartHeight - (chartHeight * .036)) + ")";

  //create a second svg element to hold the bar chart
  var chart = d3.select("body")
  .append("svg")
  .attr("width", chartWidth)
  .attr("height", chartHeight)
  .attr("class", "chart");

  //create a scale to size bars proportionally to frame
  var yScale = d3.scaleLinear()
  .range([0, chartWidth])

  //create axis
  var xAxis = d3.axisBottom()
  .scale(yScale);

  //place axis
  var axis = chart.append("g")
  .attr("class", "axis")
  .attr("transform", translate)
  .call(xAxis);

  //create the tilte
  var title = d3.select("#title").append('table')

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

    function callback(error, waterQuality, watershed, states){

      //translate watershed and states TopoJSON back to GeoJSON
      var waterPoly = topojson.feature(watershed,  watershed.objects.Watershed).features;
      var states = topojson.feature(states,  states.objects.States).features;

      //add the title and dropdowns to the page
      //create chart title in div
      title.style("width", window.innerWidth + "px")
      .append('tr')
      .append('td')
      .append('h3')
      .attr("id","mainTitle")
      .text(function(){
        return "Average Amount of " + a[1] + " per Subwatershed in " + a[0];
      })

      var subtitle = d3.select("td")
      .append("p")
      .text("*in mg/l");

      //create a dropdown menu for attribute selection
      //add select element
      var dropdown = d3.select("tr")
      .append("td")
      .append("select")
      .attr("class", "dropdown")
      .on("change", function(){
        changeAttribute(this.value, waterPoly)
      });

      //add initial option
      var titleOption = dropdown.append("option")
      .attr("class", "titleOption")
      .attr("disabled", "true")
      .text("Select Pollutant");

      //add attribute name options
      var attrOptions = dropdown.selectAll("attrOptions")
      .data(attr2012)
      .enter()
      .append("option")
      .attr("value", function(a){return a;})
      .text(function(d){
        //split the pollutatnt name to return name without year
        var a  = d.split("_")
        return a[1];
      });

      //call Data Join loop
      joinData(waterPoly, waterQuality);
      //create the color

      var colorScale = makeColorScale (waterPoly, expressed);
      //call adding polygons to map
      layers (waterPoly, map, path, colorScale, states);
      //add the coordinated viz to the page
      setChart (waterPoly, colorScale);
    };
  };
  //end of Set Map

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

  //adds the json layers
  function layers (waterPoly, map, path, colorScale, states){
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
      return "watershedBounds " + d.properties.HUC8;
    })
    .attr("d", path)
    .style("fill", function(d){
      return choropleth(d.properties[expressed], colorScale);
    })
    .on("mouseover", highlight);
    // function(d){
    //         highlight(d.properties.HUC8);
      //  });
  };
  //function to test for data value and return color
  //pulled directly from module
  function choropleth(waterPoly, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(waterPoly)
    //if attribute value exists, assign a color; otherwise assign gray
    if  (!isNaN(val)){
      color =  colorScale(val);
      return color;
    } else {
      return "#e0eeee";
    };
  };

  //function to create color scale generator
  function makeColorScale(data, expressed){
    var colorClasses = ["#543005","#8c510a","#bf812d","#dfc27d","#f6e8c3"]
    colorClasses.reverse();
    //create color scale generator
    var colorScale = d3.scaleQuantile()
    .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
      var val = parseFloat(data[i].properties[expressed]);
      domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    return colorScale;
  };

  //clean the data
  function cleanData (waterPoly, expressed){
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
  };

  //function to create coordinated bar chart
  function setChart(waterPoly, colorScale){

    cleanData (waterPoly, expressed);

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
      return "bars " + d.properties.HUC8;
    })
    .sort(function(a, b){
      return a.chartValue - b.chartValue;
    })
    .attr("height", chartHeight / waterPoly.length - 1.5)
    .attr("width", function(d){
      return yScale(d.chartValue);
    })
    .attr("y", function(d, i){
      return i * ((chartHeight - 20) / waterPoly.length);
    })
    .attr("x", "0")
    .style("fill", function(d){
      return colorScale(d.chartValue);
    })
    // .on("mouseover", highlight);
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
    //create horizonatal axis generator
  };

  //dropdown change listener handler
  function changeAttribute(attribute, waterPoly){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(waterPoly, expressed);
    cleanData (waterPoly, expressed);

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
    //I think the resorting bar annimation is kinda cheesy
    .attr("width", function(d){
      return yScale(d.chartValue);
    })
    .attr("y", function(d, i){
      return i * ((chartHeight - 20) / waterPoly.length);
    })
    .style("fill", function(d){
      return colorScale(d.chartValue);
    });

    //update the title
    d3.select("#mainTitle")
    .transition()
    .duration(500)
    .text(function(){
      return "Average Amount of " + a[1] + " per Subwatershed in " + a[0];
    })
  };
  //function to highlight enumeration units and bars
  function highlight(waterPoly){
    setLabel(waterPoly);
    //change stroke
    // var selected = d3.selectAll("." + waterPoly.properties.HUC8)
    // .style("stroke", "blue")
    // .style("stroke-width", "2");
  };
  //function to create dynamic label
  function setLabel(waterPoly){
    //label content
    var format = d3.format(",.3f")
    var labelAttribute = "<h1>" + format(waterPoly.properties[expressed]) +
    "</h1> mg/l of <b>" + a[1] + "</b>";

    //create info label div
    var infolabel = d3.select("body")
    .append("div")
    .attr("class", "infolabel")
    .attr("id", waterPoly.properties.HUC8 + "_label")
    .html(labelAttribute);

    var regionName = infolabel.append("div")
    .attr("class", "labelname")
    .html(waterPoly.properties.NAME);
  };
  //function to move info label with mouse
function moveLabel(){
    //use coordinates of mousemove event to set label coordinates
    var x = d3.event.clientX + 10,
        y = d3.event.clientY - 75;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};
})(); //last line of main.js
