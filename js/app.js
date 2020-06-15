(function () {

  const robinson = {
    epsg: 'EPSG:54030',
    def: '+proj=robin +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +units=m +no_defs',
    resolutions: [32568, 16284, 8192, 4096, 2048],
    origin: [0, 0]
  }

  const crs = new L.Proj.CRS(robinson.epsg, robinson.def, {
    resolutions: robinson.resolutions,
    origin: robinson.origin
  })

  const options = {
    crs: crs,
    center: [40, 34],
    zoom: 5,
    zoomSnap: .1,
    zoomDelta: 0.2,
    zoomControl: false
  }

  const map = L.map('map', options);

  const legendControl = L.control({
    position: 'topright'
  });

  legendControl.onAdd = function (map) {

    // Create a new division element with class of 'legend' and return
    const legend = L.DomUtil.create('div', 'legend');
    return legend;
  };
  legendControl.addTo(map);

  const worldControl = L.control({
    position: 'topleft'
  });

  worldControl.onAdd = function (map) {

    // Creat another div element for keeping track of world data
    const world = L.DomUtil.create('div', 'world');
    return world;
  };
  worldControl.addTo(map);

  // Create Leaflet control for the slider
  const sliderControl = L.control({
    position: 'bottomleft'
  });

  sliderControl.onAdd = function (map) {

    const slider = L.DomUtil.get("ui-controls");

    L.DomEvent.disableScrollPropagation(slider);
    L.DomEvent.disableClickPropagation(slider);

    return slider;
  }
  sliderControl.addTo(map);

  $.getJSON("data/countries.json", function (countries) {

      Papa.parse('data/forest-area-percent.csv', {

        download: true,
        header: true,
        complete: function (data) {

          processData(countries, data);

        }
      });

    })
    .fail(function () {
      console.log("Ruh roh! An error has occured.");
    });

  function processData(countries, data) {

    for (let i of countries.features) {
      for (let j of data.data) {
        if (i.properties.ADMIN === j.COUNTRY) {
          i.properties = j;
          break;
        }
      }
    }

    const rates = [];

    countries.features.forEach(function (country) {

      for (const prop in country.properties) {
        if (prop != "COUNTRY") {
          if (Number(country.properties[prop]) >= 0) {
            rates.push(Number(country.properties[prop]));
          }
        }
      }
    });

    var breaks = chroma.limits(rates, 'q', 5);
    var colorize = chroma.scale(chroma.brewer.Greens).classes(breaks).mode('lab');

    drawMap(countries, colorize, data); // Taking 'data' along to retain world information
    drawLegend(breaks, colorize);
  }

  function drawMap(countries, colorize, data) {

    const dataLayer = L.geoJson(countries, {

      style: function (feature) {
        return {
          color: 'black',
          weight: 1,
          opacity: 0.5,
          fillOpacity: 1,
          fillColor: '#1f78b4'
        };
      },

      onEachFeature: function (feature, layer) {
        layer.on('mouseover', function () {
          layer.setStyle({
            color: '#76ff03',
            opacity: 1,
            weight: 3
          }).bringToFront()
        });
        layer.on('mouseout', function () {
          layer.setStyle({
            color: 'black',
            opacity: 0.5,
            weight: 1
          }).bringToBack()
        });
      }

    }).addTo(map);

    map.fitBounds(dataLayer.getBounds());
    map.setZoom(map.getZoom() - .2);

    updateMap(dataLayer, colorize, '1990');
    addUI();
    createSliderUI(dataLayer, colorize, data); // Taking 'data' along to retain world information
  }

  function updateMap(dataLayer, colorize, currentYear) {

    dataLayer.eachLayer(function (layer) {

      const props = layer.feature.properties;

      layer.setStyle({
        fillColor: colorize(Number(props[currentYear]))
      })

      var popup = '';

      if (props[currentYear] == "No Data") {
        popup = `<b>${props["COUNTRY"]}</b><br>
          No Data for ${currentYear}`;
      } else if (props[currentYear] == undefined) {
        popup = "No Data";
      } else {
        popup = `<b>${props["COUNTRY"]}</b><br>
        ${props[currentYear]}%`;
      }

      layer.bindPopup(popup, {
        sticky: true
      });
    })
  }

  function drawLegend(breaks, colorize) {

    const world = $('.world').html("<h3>Worldwide Cover in <span>1990</span>:</h3><ul><span>31.80057187</span>%</ul>");

    const legend = $('.legend').html("<h3><span>1990</span>Tree Cover Percentages</h3><ul>");

    for (let i = 0; i < breaks.length - 1; i++) {

      const color = colorize(breaks[i], breaks);

      const classRange = `<li><span style="background:${color}"></span>
      ${breaks[i].toLocaleString()}% &mdash;
      ${breaks[i + 1].toLocaleString()}% </li>`

      $('.legend ul').append(classRange);
    }

    // Add legend item for missing data
    $('.legend ul').append(`<li><span style="background:lightgray"></span>No Data</li>`)
    legend.append("</ul>");
  }

  function createSliderUI(dataLayer, colorize, data) {

    $(".year-slider")
      .on("input change", function () { // When user changes
        const currentYear = this.value; // Update the year
        $('.world h3 span').html(currentYear);
        $('.world ul span').html(data.data[253][currentYear]); // Data finally used here!
        // Data is not duplicated but merely made accessible to this function
        // by scoping the variable inside a chain of functions.
        // We could scope the data variable to the top-level of this self-invoking function
        // by returning the data from the function in which it was made. 
        // After you get a beta version working, create a new branch 
        // and experiment with different solutions.
        $('.legend h3 span').html(currentYear);
        updateMap(dataLayer, colorize, currentYear);
      });
  }

  function addUI() {
    // create the slider control
    var selectControl = L.control({
      position: "topright"
    });

    // when control is added
    selectControl.onAdd = function () {
      // get the element with id attribute of ui-controls
      return L.DomUtil.get("dropdown-ui");
    };
    // add the control to the map
    selectControl.addTo(map);

    $('#dropdown-ui select').change(function () {
      attributeValue = this.value;
    });
  }

  /* --------------- Toggle on/off Information ---------------  */
  // Set initial state of button
  var clicked = false

  var button = document.getElementById("info-button");
  var about = document.getElementById('about');
  var background = document.getElementById('background');
  var close = document.getElementById('x');

  // When the pointing device presses down, e.g., a mouse, tablet pen, finger tip
  button.addEventListener("pointerdown", function () {
    button.style.background = 'rgb(0,128,0)'
  })

  // Below is traditional mouseover events
  button.addEventListener("mouseover", function () {
    button.style.background = 'rgb(0,128,0)'
  })
  button.addEventListener("mouseout", function () {
    if (!clicked) {
      button.style.background = 'rgba(75, 75, 75, 0.8)'
    }
  })

  // Swapping states
  button.addEventListener("click", swapItUp)
  background.addEventListener("click", swapItUp)
  x.addEventListener("click", swapItUp)

  // This prevents the click from propagating through element and activating other events
  about.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  function swapItUp() {
    if (clicked) {
      about.style.display = 'none';
      background.style.display = 'none';
      button.style.background = 'rgba(75, 75, 75, 0.8)'
    } else {
      about.style.height = '60vh';
      about.style.display = 'inherit'
      background.style.display = 'inherit'
      button.style.background = 'rgb(0,128,0)'
    }
    clicked = !clicked
  }

})();