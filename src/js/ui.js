import { GUI } from "dat.gui";
import Stats from "stats.js";
import { lightParams, sunParams } from "./lighting";
import { fireflyParams } from "./particles";
import { perlinParams } from "./perlin";
import { terrainParams } from "./terrain";

export var stats = new Stats();

export function makeGUI() {
  const gui = new GUI();
  const generalFolder = gui.addFolder("General");
  // generalFolder.add(terrainParams, "FLAT_SHADING");
  // const centerFolder = gui.addFolder("Center");
  // centerFolder.add(terrainParams.ORIGIN, "x", -50, 50);
  // centerFolder.add(terrainParams.ORIGIN, "y", -50, 50);
  const sunFolder = gui.addFolder("Sun");
  sunFolder.add(sunParams, "ORBIT_SPEED", 0.0001, 0.1);
  // sunFolder.add(sunParams.SUN_AXIS, "x", 0, 1);
  // sunFolder.add(sunParams.SUN_AXIS, "y", 0, 1);
  // sunFolder.add(sunParams.SUN_AXIS, "z", 0, 1);
  // lightFolder.add(lightParams, "HEMI_LIGHT_INTENSITY", 0, 1);
  const terrainFolder = gui.addFolder("Terrain");
  terrainFolder.add(terrainParams, "PEAK", 0, 500);
  terrainFolder.add(terrainParams, "RAD", 200, 1000);
  const perlinFolder = gui.addFolder("Perlin");
  perlinFolder.add(perlinParams, "OCTAVECNT", 1, 10);
  perlinFolder.add(perlinParams, "LACUNARITY", 1, 10);
  perlinFolder.add(perlinParams, "PERSISTANCE", 0, 1);
  perlinFolder.add(perlinParams, "SMOOTHING", 1, 1000);
  const particleFolder = gui.addFolder("Particles");
  particleFolder.add(fireflyParams, "FLY_RADIUS", 200, 1000);
}

export function makeStats() {
  stats.showPanel(0);
  document.body.appendChild(stats.dom);
}