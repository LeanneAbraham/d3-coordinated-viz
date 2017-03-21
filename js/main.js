//begin script when window loads
//QUESTIONS FOR CARL: CONSOLE LOG STUFF IN D3
window.onload = setMap();
  //set up choropleth map
  function setMap(){

      //map frame dimensions
      var width = 750,
          height = 410;

      //create new svg container for the map
      var map = d3.select("body")
          .append("svg")
          .attr("class", "map")
          .attr("width", width)
          .attr("height", height);

      //create Albers equal area conic projection centered on Chesapeake Bay
      var projection = d3.geoAlbers()
              .center([18, 40.25])
              //.rotate([0, 0, 0])
              .parallels([43, 62])
              .scale(3450)
              .translate([width / 2, height / 2]);

          var path = d3.geoPath()
              .projection(projection);


    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/CBWaterQuality.csv") //load attributes from csv
        .defer(d3.json, "data/Watershed.topojson") //load choropleth spatial data
        .await(callback);
    function callback(error, waterQuality, watershed){
        //translate watershed TopoJSON back to GeoJSON
        var features = topojson.feature(watershed,  watershed.objects.Watershed).features;
        //add watersheds to map

        var countries = map.selectAll(".boundaries")
            .data(features)
            .enter()
            .append("path")
            .attr("class", "boundaries")
            .attr("d", path);

        };
};
