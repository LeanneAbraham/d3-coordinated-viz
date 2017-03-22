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
    var width = 400,
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
      .center([19, 40])
      //.rotate([0, 0, 0])
      .parallels([43, 62])
      .scale(3450)
      .translate([width / 2, height / 2]);
      //puts the paths on the screen
      var path = d3.geoPath()
      .projection(projection);

    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
      .defer(d3.csv, "data/CBWaterQuality.csv") //load attributes from csv
      .defer(d3.json, "data/Watershed.topojson") //load choropleth spatial data
    .await(callback);
    function callback(error, waterQuality, watershed){

      //translate watershed TopoJSON back to GeoJSON
      var waterPoly = topojson.feature(watershed,  watershed.objects.Watershed).features;

      //call Data Join loop
      joinData(waterPoly, waterQuality);
      //create the color scale
      var colorScale = makeColorScale (waterQuality);
      //call adding polygons to map
      layers (waterPoly, map, path, colorScale);
    };
  };
  //end of Set Map
  function layers (waterPoly, map, path, colorScale){
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

    //starting to code for adding state layer for context
    // var stateBounds = map.append('g')
    // .attr('class', 'states');
  };
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
      "#D4B9DA",
      "#C994C7",
      "#DF65B0",
      "#DD1C77",
      "#980043"
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
})(); //last line of main.js
