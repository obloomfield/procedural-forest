import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import "../public/style.css";
import {GrahamScan} from "./graham_scan_TEST.js";
import Delaunator from 'delaunator';
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";


function sample2D(n, w, h) {
    const points = [];
    for (var i = 0; i < n; i++) {
        var x = Math.floor(Math.random() * w);
        var y = Math.floor(Math.random() * h);
        points.push([x,y])
    }
    return points;
}

// return the outer hull for points
// 
function outerHull(points) {
    const grahamScan = new GrahamScan();
    grahamScan.setPoints(points);
    const hull = grahamScan.getHull();
    return hull;
}

function edgesOfTriangle(t) { return [3 * t, 3 * t + 1, 3 * t + 2]; }

function pointsOfTriangle(delaunay, t) {
    return edgesOfTriangle(t)
        .map(e => delaunay.triangles[e]);
}

function forEachTriangle(points, delaunay, callback) {
    const vertices = [];
    // const vertices = new Float32Array(delaunay.triangles.length*3);
    for (let t = 0; t < delaunay.triangles.length / 3; t++) {
        var locs = pointsOfTriangle(delaunay, t).map(p => points[p]);
        // console.log(locs);
        vertices.push(locs[0][0]);
        vertices.push(locs[0][1]);
        vertices.push(0);
        vertices.push(locs[1][0]);
        vertices.push(locs[1][1]);
        vertices.push(0);
        vertices.push(locs[2][0]);
        vertices.push(locs[2][1]);
        vertices.push(0);
    }
    return new Float32Array(vertices);
}

function handleTriangle(t, points) {
    // console.log(points);
    // retu
}

export function generateBase(x, y, n, w, h) {

    // const x = 0, y = 0, z = 0;
    const base = new THREE.Shape();
    const hull = outerHull(sample2D(n, w, h));

    const randPoints = sample2D(50, w, h);
    const coords = randPoints.flat();
    const delaunay = new Delaunator(coords);

    const vertices = forEachTriangle(randPoints, delaunay, handleTriangle);
    
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    geometry = BufferGeometryUtils.mergeVertices(geometry);
    var material = new THREE.MeshStandardMaterial({
        color: 0xff3951,
        side: THREE.DoubleSide,
      });
    const mesh = new THREE.Mesh( geometry, material );

    augmentVerts(mesh);

    mesh.rotation.x = -Math.PI / 2;
    mesh.translateZ(10);
    return mesh; // scene.add( mesh );
}


function augmentVerts(mesh) {
    var verts = mesh.geometry.attributes.position.array;
    for (var i = 0; i <= verts.length; i += 3) {
        verts[i + 2] += Math.floor(Math.random() * 30);
    }
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
}
