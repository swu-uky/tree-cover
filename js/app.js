(function () {

  const options = {
    center: [40, 34],
    zoom: 2,
    zoomSnap: .1,
    zoomControl: false
  }

  // create the Leaflet map
  const map = L.map('map', options);

  // request tiles and add to map
  const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  // create a Leaflet control for the legend
  const legendControl = L.control({
    position: 'topright'
  });

  // when the control is added to the map
  legendControl.onAdd = function (map) {

    // create a new division element with class of 'legend' and return
    const legend = L.DomUtil.create('div', 'legend');
    return legend;

  };

  // add the legend control to the map
  legendControl.addTo(map);

  // create Leaflet control for the slider
  const sliderControl = L.control({
    position: 'bottomleft'
  });

  // when added to the map
  sliderControl.onAdd = function (map) {

    // select an existing DOM element with an id of "ui-controls"
    const slider = L.DomUtil.get("ui-controls");

    // disable scrolling of map while using controls
    L.DomEvent.disableScrollPropagation(slider);

    // disable click events while using controls
    L.DomEvent.disableClickPropagation(slider);

    // return the slider from the onAdd method
    return slider;
  }

  // add the control to the map
  sliderControl.addTo(map);

  $.getJSON("data/countries.json", function (countries) {

      Papa.parse('data/forest-area-percent2.csv', {

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
          rates.push(Number(country.properties[prop]));
        }
      }
    });

    var breaks = chroma.limits(rates, 'q', 5);
    var colorize = chroma.scale(chroma.brewer.Greens).classes(breaks).mode('lab');

    drawMap(countries, colorize);
    drawLegend(breaks, colorize);
  }

  function drawMap(countries, colorize) {

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
    createSliderUI(dataLayer, colorize);
  }

  function updateMap(dataLayer, colorize, currentYear) {

    dataLayer.eachLayer(function (layer) {

      const props = layer.feature.properties;

      layer.setStyle({
        fillColor: colorize(Number(props[currentYear]))
      })

      var popup = `<b>${props["COUNTRY"]}</b><br>
          ${props[currentYear]}%`;

      layer.bindPopup(popup, {
        sticky: true
      });
    })
  }

  function drawLegend(breaks, colorize) {

    const legend = $('.legend').html("<h3><span>1990</span>Tree Cover Percentages</h3><ul>");

    for (let i = 0; i < breaks.length - 1; i++) {

      const color = colorize(breaks[i], breaks);

      const classRange = `<li><span style="background:${color}"></span>
      ${breaks[i].toLocaleString()}% &mdash;
      ${breaks[i + 1].toLocaleString()}% </li>`

      $('.legend ul').append(classRange);
    }

    // Add legend item for missing data
    $('.legend ul').append(`<li><span style="background:lightgray"></span>
            Data not available</li>`)

    legend.append("</ul>");
  }

  function createSliderUI(dataLayer, colorize) {

    $(".year-slider")
      .on("input change", function () { // when user changes
        const currentYear = this.value; // update the year
        $('.legend h3 span').html(currentYear); // update the map with current timestamp
        updateMap(dataLayer, colorize, currentYear); // update timestamp in legend heading
      });

  }

})();