//begin script when window loads
//QUESTIONS FOR CARL: CONSOLE LOG STUFF IN D3
window.onload = setMap();

//set up choropleth map
function setMap(){
    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/CBWaterQuality.csv") //load attributes from csv
        .defer(d3.json, "data/Watershed.topojson") //load choropleth spatial data
        .await(callback);
    function callback(error, waterQuality, watershed){
        console.log(error);
        console.log(waterQuality);
        console.log(watershed);
        };
};
