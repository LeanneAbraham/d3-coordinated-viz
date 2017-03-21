//begin script when window loads
//QUESTIONS FOR CARL: CONSOLE LOG STUFF IN D3
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
    //call joinData
    //create graticule generator
    //this isnt working??
    // var graticule = d3.geoGraticule()
    //     .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

    //translate watershed TopoJSON back to GeoJSON
    var features = topojson.feature(watershed,  watershed.objects.Watershed).features;

    joinFeaturesWithData(features, waterQuality);

    //add watersheds to map
    var watershedBounds = map.selectAll(".boundaries")
    .data(features)
    .enter()
    .append("path")
    .attr("class", "watershedBounds")
    .attr("d", path);
  };
};
//end of Set Map
function joinFeaturesWithData (features, waterQuality){
  // loop over every item of the geojson
  for (var i = 0; i < features.length; i++) {
    // create a variable to hold the current
    // geojson property in the loop
    var feature = features[i];
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
          feature.properties[key] = waterData[key];
        }
      }
    }
  }
}
