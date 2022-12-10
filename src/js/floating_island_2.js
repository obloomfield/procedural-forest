import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import "../public/style.css";
import {GrahamScan} from "./graham_scan_TEST.js";
import Delaunator from 'delaunator';
import NormalDistribuion from 'normal-distribution';
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader.js";

import { generateBase } from "./floating_island";
import {islandMaterial} from "./island_textures.js";
import { BufferGeometry } from "three";


function euclideanDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1[0]-p2[0], 2) + Math.pow(p1[1]-p2[1], 2));
}

function normPdf(val, mean, std) {
    const pdf = (1/(std*Math.sqrt(2*Math.PI)))*Math.exp(-0.5 * Math.pow((val-mean)/std,2));
    // console.log(pdf);
    return pdf;
}

export class FloatingIsland {
    constructor () {
        this.islandMeshes = [];
        this.NOISE2D = createNoise2D();
        this.ORIGIN = new THREE.Vector2(0, 0);
        this.PEAK = 15;
        this.RAD = 50;

        this.width = 0;
        this.height = 0;
        this.ellipseHeight = 20;

        this.treeGeometry = null;
    }

    IsPointInPolygon(poly_array, test_point) {
        var inside = false;
        var test_x = test_point[0];
        var test_y = test_point[1];
        for(var i=0; i<(poly_array.length-1); i++) {
            var p1_x = poly_array[i][0];
            var p1_y = poly_array[i][1];
            var p2_x = poly_array[i+1][0];
            var p2_y = poly_array[i+1][1];
            if((p1_y<test_y && p2_y>=test_y) || (p2_y<test_y && p1_y>=test_y)) { // this edge is crossing the horizontal ray of testpoint
                if((p1_x+(test_y-p1_y)/(p2_y-p1_y)*(p2_x-p1_x)) < test_x) { // checking special cases (holes, self-crossings, self-overlapping, horizontal edges, etc.)
                    inside=!inside;
                }
            }
        }
        return inside;
    }
    
    perlin(amp, freq, v_i, v_i2) {
        v_i += 20;
        v_i2 += 20;
        return amp * this.NOISE2D(v_i / freq, v_i2 / freq);
    }
    
    randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    polarSample(n, w, h) {
        this.width = w;
        this.height = h;
        this.RAD = w+h;
        // this.normW = new NormalDistribution(w, w/3);
        // this.normH = new NormalDistribuion(h, h/3);
        const wRad = w/2;
        const hRad = h/2;

        const max = 1.00;
        const min = .80;
        const coords = [];
        for (var i = 0; i < 2*Math.PI; i += this.randomInRange(Math.PI/n, 2*Math.PI/n)) {
            var cosT = Math.cos(i);
            var sinT = Math.sin(i);
            var rad =  this.randomInRange(min, max) * Math.sqrt(Math.pow((wRad*hRad),2) / (hRad*hRad*cosT*cosT + wRad*wRad*sinT*sinT)); //Math.abs(perlin(0.1, 10, 100*cosT, 100*sinT));
            var x = Math.floor(rad * cosT);
            var y = Math.floor(rad * sinT);
            coords.push([x,y]);
        }
        coords.push(coords[0]);
        console.log(coords.length);
        return coords;
    }
    
    findClosest(point, hull) {
        var hullClone = hull.slice();
        hullClone.sort(function(p1, p2) {
            return euclideanDistance(p1, point) - euclideanDistance(p2, point);
        });
        return hullClone[0];
    }

    ellipsoid(x, y) {
        const a = this.width/2;
        const b = this.height/2;
        const xyComp = Math.abs(1 - (x*x)/(a*a) - (y*y)/(b*b));
        const c2 = this.ellipseHeight*this.ellipseHeight;
        return Math.sqrt(c2*xyComp);
    }
    
    falloff(point, rad) {
        const pt = new THREE.Vector2(point[0], point[1]);
        const len = pt.length();
        // console.log(point);
        if (point[0] == 0) {
            return 1;
        }
        // const theta = Math.atan(point[1] / point[0]);
        // const cosT = Math.cos(theta);
        // const sinT = Math.sin(theta);
        
        // const wRad = this.width/2;
        // const hRad = this.height/2;

        // const myRad =  Math.sqrt(Math.pow((wRad*hRad),2) / (hRad*hRad*cosT*cosT + wRad*wRad*sinT*sinT)); //Math.max(this.height, this.width); 
        // console.log(myRad);
        const myRad = Math.max(2*this.width, 2*this.height);
        if (len > myRad) {
            return 0;
        }
        let x = len / myRad;
        return -Math.pow(x, 10) + 1;
    }

    augmentVerts(geometry, hull, positive) {
        var verts = geometry.attributes.position.array;
        for (var i = 0; i < verts.length; i += 3) {
            let pt = [verts[i], verts[i + 1]];
            if (!this.IsPointInPolygon(hull, pt)) {
                continue;
            }
            var eHeight = this.ellipsoid(pt[0],pt[1])
            // eHeight *= positive ? 1.5 : 3;
            var newZ = eHeight + Math.abs(this.PEAK * 
                (-(1.5/(this.width/2)) * Math.abs(verts[i]) + 1.5) *
                (-(1.5/(this.height/2)) * Math.abs(verts[i+1]) + 1.5) *
                this.falloff(pt, this.RAD) * 
                (this.perlin(1 / 8, 10, verts[i], verts[i + 1]) +
                this.perlin(1 / 4, 40, verts[i], verts[i + 1]) + 
                this.perlin(1, 400, verts[i], verts[i + 1])));
            verts[i+2] = positive ? 1.5*newZ : -3*newZ;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
    }

    sampleTrees(geometry) {
        const norms = geometry.attributes.normal.array;
        const verts = geometry.attributes.position.array;
        const vert = [0,0,1];
        const locs = [];
        for (var i = 0; i < norms.length; i+=3) {
            // const curr = norms[i];
            // console.log(curr);
            // const dot = curr[2];
            if (norms[i+2] > 0.8 && verts[i+2] > 10) {
                // console.log("VALID");
                if (Math.random() > 0.9) {
                    locs.push(i);
                }
            }
        }
        return locs
    }

    cloneAttribute(attr) {
        return new Float32Array(attr);
    }

    loadObj() {
        return new Promise((resolve, reject) => {
            var loader = new OBJLoader();
            const objs = [];
            // setTimeout(() => {
                loader.load('../models/tree.obj', function ( object ) {
                    objs.push(object);
                    resolve(objs);
                    // object.traverse( function ( node ) {
                    //    if ( node.isMesh ) {
                    //        objs.push('hello!'); //node.geometry.clone());
                    //    }
                    // }); 
                    // console.log("COPIED ATTRS1", object);
                    // geometry.copy(object);
                });
                
            // }, 2000);
            
            // return objs;
        });
        // callback(objs);
    }

    async loadAlienTree(treeBuffer) {
        
        const result = await this.loadObj();
        // console.log("post load", result);
        const geometries = [];
        result[0].traverse(function(node) {
            if ( node.isMesh ) {
                const g1 = new THREE.BufferGeometry();
                g1.copy(node.geometry);
                // g1.center();
                // g1.setAttribute("position", new THREE.BufferAttribute(new Float32Array(node.geometry.attributes.position.arr)));
                // g1.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(node.geometry.attributes.normal.arr)));
                // g1.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(node.geometry.attributes.uv.arr)));
                geometries.push(g1);
            }
        });
        console.log("GEOS", geometries);
        const newBG = BufferGeometryUtils.mergeBufferGeometries(geometries);
        return newBG;
        // this.loadObj(function(objs) {
        //     console.log("OBJS", objs);
        // })
        // var loader = new OBJLoader();
        // var geometry = new THREE.BufferGeometry();
        // const objs = [];

        // loader.load('../models/tree.obj', function ( object ) {
        //     // objs.push(object);
        //     object.traverse( function ( node ) {
        //        if ( node.isMesh ) {
        //         //    node.geometry.setIndex(null);
        //         //    node.geometry.
        //            objs.push('hello!'); //node.geometry.clone());
        //     //         // this.treeGeometry = node.geometry;
        //     //         console.log("node geomentry", node.geometry);
        //     //         console.log("NODE ATTR positions", node.geometry.attributes.position);
        //     //         // treeBuffer.setAttribute("position", new THREE.BufferAttribute(new Float32Array(node.geometry.attributes.position.arr)));
        //     //         treeBuffer.copy(node.geometry);
        //     //         console.log("COPIED ATTRS", treeBuffer.attributes);
        //     //         // treeBuffer.attributes.position.needsUpdate = true;
        //     //         // treeBuffer.computeVertexNormals();
        //     //         // return;
        //     //         // treeBuffer.setAttribute("normal", node.geometry.attributes.normal);
        //     //         // treeBuffer.setAttribute("uv", node.geometry.attributes.uv);

        //     //         // console.log(treeBuffer);
        //        }
        //     }); 
        //     // console.log("COPIED ATTRS1", object);
        //     // geometry.copy(object);
        // });
        // console.log("objects", objs);

        // const g1 = new THREE.BufferGeometry();
        // g1.setAttribute("position", new THREE.BufferAttribute(new Float32Array(objs[0].attributes.position.arr)));
        // g1.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(objs[0].attributes.normal.arr)));
        // g1.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(objs[0].attributes.uv.arr)));

        // const g2 = new THREE.BufferGeometry();
        // g2.setAttribute("position", new THREE.BufferAttribute(new Float32Array(objs[1].attributes.position.arr)));
        // g2.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(objs[1].attributes.normal.arr)));
        // g2.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(objs[1].attributes.uv.arr)));
        
        // const newBG = BufferGeometryUtils.mergeBufferGeometries(objs);

        // treeBuffer.copy(objs[1]);
        // return objs[1]; //
        // console.log("TREE GEO", this.treeGeometry);
        // return geometry;
    }

    async generateIslandBase(x, y, z, w, h) {
        // Instantiating plane mesh
        var geometry = new THREE.PlaneGeometry(200, 200, 512, 512);
        var geometry2 = new THREE.PlaneGeometry(200, 200, 512, 512);

        const hull = this.polarSample(30, w, h);
        
        this.augmentVerts(geometry, hull, true);
        this.augmentVerts(geometry2, hull, false);

        const treeLocs = this.sampleTrees(geometry);
        // console.log(treeLocs);

        var treeGeo = new THREE.BufferGeometry();
        // treeGeo.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array([0,0,0]), 3 ) );

        // console.log("LOADING TREE", this.loadAlienTree(treeGeo));
        // treeGeo = ;
        treeGeo = await this.loadAlienTree(treeGeo);
        // geometry.setIndex(null);
        // geometry = geometry.toNonIndexed ();
        // geometry2.setIndex(null);
        // treeGeo.setIndex(null);

        console.log("Treegeo", treeGeo);
        console.log("tree attributes", treeGeo.attributes);
        console.log("GEO2", geometry2);

        const geos = [geometry.toNonIndexed(), geometry2.toNonIndexed()];
        const posArr = geometry.attributes.position.array;
        for (var i = 0; i < 3; i++) {
            const idx = treeLocs[i];
            // const newTree = new THREE.BufferGeometry();
            // newTree.copy(treeGeo);
            console.log("NEW TREE", treeGeo);
            treeGeo.translate(posArr[idx], posArr[idx+1], posArr[idx+2]);
            geos.push(treeGeo); 
        }

        let mergedGeos = BufferGeometryUtils.mergeBufferGeometries(geos);
        const merged = BufferGeometryUtils.mergeVertices(mergedGeos);


    
        var material = new THREE.MeshStandardMaterial({
        color: 0x836582,
        side: THREE.DoubleSide,
        });

        var terrain = new THREE.Mesh(merged, islandMaterial);
    
        terrain.rotation.x = -Math.PI / 2;
        terrain.translateX(x);
        terrain.translateY(y);
        terrain.translateZ(z);
        return terrain;
    }
    
    
}



