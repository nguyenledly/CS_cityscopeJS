import "./Storage";
import { Maptastic } from "./lib/maptastic";

import * as turf from "@turf/turf";
import { create_threeJS_grid_form_cityIO } from "./three";
import { Camera, rotateCamera } from "./camera";
import { update, update_grid_from_cityio } from "./update";

export function layers() {
  // cityio update interval
  var update_interval = 200;
  let map = Storage.map;
  let cityIOdata = Storage.cityIOdata;
  // table physical loction
  let table_lat = cityIOdata.header.spatial.latitude;
  let table_lon = cityIOdata.header.spatial.longitude;
  var scence_origin_position = [table_lat, table_lon, 0];
  // ! FOR NOW !!
  scence_origin_position = [10.013586800974366, 53.53297429860049, 0];

  //add the dummy data of 1 point
  map.addSource("simData", {
    type: "geojson",
    data: {
      type: "MultiPoint",
      coordinates: [0, 0]
    }
  });

  //add the custom THREE layer
  map.addLayer({
    id: "custom_layer",
    type: "custom",
    onAdd: function(map, gl) {
      onAdd(map, gl);
    },
    render: function() {
      threebox.update();
    }
  });

  //table extents
  map.addLayer({
    id: "route",
    type: "line",
    source: {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: Storage.tableExtents
        }
      }
    },
    layout: {
      "line-join": "round",
      "line-cap": "round"
    },
    paint: {
      "line-color": "rgb(255,255,255)",
      "line-width": 3,
      "line-dasharray": [3, 2, 1]
    }
  });
  //
  // Three
  function onAdd(map, mbxContext) {
    window.threebox = new Threebox(map, mbxContext, { defaultLights: true });
    let csGrid = threebox
      .Object3D({ obj: create_threeJS_grid_form_cityIO(), units: "meters" })
      .setCoords(scence_origin_position);
    // adds the 3d cityscope gemoerty

    threebox.add(csGrid);
    // add the scene objects to storage for later update
    Storage.threeGrid = threebox.scene.children[0].children[1].children[0];
    console.log(Storage.threeGrid);
  }

  //
  map.addLayer({
    id: "noiseMap",
    displayName: "Noise",
    type: "raster",
    source: {
      type: "raster",
      tiles: [
        "https://geodienste.hamburg.de/HH_WMS_Strassenverkehr?format=image/png&service=WMS&version=1.3.0&STYLES=&bbox={bbox-epsg-3857}&request=GetMap&crs=EPSG:3857&transparent=true&width=512&height=512&layers=strassenverkehr_tag_abend_nacht_2017"
      ],
      tileSize: 512
    },
    paint: {}
  });

  map.setPaintProperty("noiseMap", "raster-opacity", 0.65);

  //  add the point simulation layer
  map.addLayer({
    id: "simData",
    source: "simData",
    type: "heatmap",
    maxzoom: 20,
    paint: {
      "heatmap-weight": [
        "interpolate",
        ["linear"],
        ["get", "mag"],
        0,
        20,
        3,
        1
      ],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 2, 3, 5, 15],
      "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0, 8, 1],
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(255,255,255,0)",
        0.1,
        "rgb(209,229,240)",
        0.25,
        "rgb(103,169,207)",
        0.4,
        "rgb(100,100,200)",
        0.6,
        "rgb(200,60,250)"
      ]
    }
  });

  //! turf hidden area aroud
  var polygon = turf.polygon([Storage.tableExtents]);
  var masked = turf.mask(polygon);

  map.addLayer({
    id: "mask",
    type: "fill",
    source: {
      type: "geojson",
      data: masked
    },
    layout: {},
    paint: {
      "fill-color": "#000000",
      "fill-opacity": 1
    }
  });

  //run the layers update
  window.setInterval(update, update_interval);
}

/*
Gui function 
*/
export function gui() {
  document.getElementById("listing-group").style.display = "none";
  document.addEventListener("keydown", keyDownTextField, false);
  function keyDownTextField(e) {
    if (e.keyCode == 32) {
      let x = document.getElementById("listing-group");
      if (x.style.display === "none") {
        x.style.display = "block";
      } else {
        x.style.display = "none";
      }
      // else if clikced (p)rojection
    } else if (e.keyCode == 80) {
      let localStorage = window.localStorage;
      if (localStorage["maptastic.layers"]) {
        let storageJSON = JSON.parse(localStorage.getItem("maptastic.layers"));
        //
        var w = screen.width;
        // 1920;
        var h = screen.height;
        //  1080;
        let windowDims = [[0, 0], [w, 0], [w, h], [0, h]];
        //
        if (!storageJSON[0].mode || storageJSON[0].mode == "projection") {
          storageJSON[0].mode = "screen";
          storageJSON[0].sourcePoints_BU = storageJSON[0].sourcePoints;
          storageJSON[0].targetPoints_BU = storageJSON[0].targetPoints;
          //
          storageJSON[0].sourcePoints = windowDims;
          storageJSON[0].targetPoints = windowDims;
          localStorage.setItem("maptastic.layers", [
            JSON.stringify(storageJSON)
          ]);
          location.reload();
        } else {
          storageJSON[0].mode = "projection";
          storageJSON[0].sourcePoints = storageJSON[0].sourcePoints_BU;
          storageJSON[0].targetPoints = storageJSON[0].targetPoints_BU;
          localStorage.setItem("maptastic.layers", [
            JSON.stringify(storageJSON)
          ]);
          location.reload();
        }
      }
    }
  }

  const cam = new Camera(Storage.map);
  cam.getLatLon();
  cam.reset_camera_position(0);
  //bring map to projection postion
  document
    .getElementById("listing-group")
    .addEventListener("change", function(e) {
      switch (e.target.id) {
        case "noiseMap":
          if (e.target.checked) {
            Storage.map.setLayoutProperty("noiseMap", "visibility", "visible");
          } else {
            Storage.map.setLayoutProperty("noiseMap", "visibility", "none");
          }
          break;
        case "simData":
          if (e.target.checked) {
            Storage.map.setLayoutProperty("simData", "visibility", "visible");
            Storage.map.setLayoutProperty(
              "simData-point",
              "visibility",
              "visible"
            );
          } else {
            Storage.map.setLayoutProperty("simData", "visibility", "none");
            Storage.map.setLayoutProperty(
              "simData-point",
              "visibility",
              "none"
            );
          }
          break;
        case "rotateTo":
          if (e.target.checked) {
            if (Storage.reqAnimFrame !== null) {
              cancelAnimationFrame(Storage.reqAnimFrame);
            }
            Storage.map.setLayoutProperty("mask", "visibility", "visible");
            Storage.map.setLayoutProperty("building", "visibility", "none");

            cam.reset_camera_position();
            Storage.threeState = "flat";
            update_grid_from_cityio();
          } else {
            Storage.map.setLayoutProperty("mask", "visibility", "none");
            Storage.map.setLayoutProperty("building", "visibility", "visible");
            Storage.threeState = "height";
            update_grid_from_cityio();
            rotateCamera(1);
          }
        default:
          break;
      }
    });
}
