import * as BABYLON from 'babylonjs';
// import * as fs from 'fs';
// sconst fs = eval('require("fs")')
// import { readFile, writeFile } from 'fs/promises';

// var fs = require('fs');
// const fs = __non_webpack_require__("fs")


var canvas = document.getElementById('renderCanvas');

var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

var createScene = function () {
    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);

    // This creates and positions a free camera (non-mesh)
    var camera = new BABYLON.ArcRotateCamera("camera1", Math.PI, Math.PI / 2.0, 20, new BABYLON.Vector3(0, 0, 0), scene);

    // This targets the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.1;


    fetch('./src/shader.vert')
        .then(response => response.text())
        .then(data => { BABYLON.Effect.ShadersStore["customVertexShader"] = data; })

    fetch('./src/shader.frag')
        .then(response => response.text())
        .then(data => { BABYLON.Effect.ShadersStore["customFragmentShader"] = data; })




    // Compile
    var shaderMaterial = new BABYLON.ShaderMaterial("shader", scene, {
        vertex: "custom",
        fragment: "custom",
    },
        {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldView", "worldViewProjection", "view", "projection"]
        });


    var mainTexture = new BABYLON.Texture("http://i.imgur.com/kUJBvin.png", scene, true, false, 12);

    //https://www.shadertoy.com/view/ltlSWB
    shaderMaterial.setTexture("iChannel0", mainTexture);
    shaderMaterial.setFloat("time", 0);
    shaderMaterial.setFloat("offset", 10);
    shaderMaterial.setFloat("sunx", 2.0);
    shaderMaterial.setFloat("suny", 0.9);
    shaderMaterial.backFaceCulling = false;


    var Dome = BABYLON.Mesh.CreateSphere('Dome', 50, 50, scene);

    Dome.material = shaderMaterial;

    var time = 0;
    scene.registerBeforeRender(function () {
        var shaderMaterial = scene.getMaterialByName("shader");
        shaderMaterial.setFloat("time", time);

        //Animate Move Sun 
        shaderMaterial.setFloat("suny", Math.sin(time / 3));
        shaderMaterial.setFloat("sunx", Math.sin(time / 3));
        time += 0.008;
    });

    return scene;
}

var scene = createScene();

var divFps = document.getElementById("fps");

engine.runRenderLoop(function () {
    scene.render();

    divFps.innerHTML = engine.getFps().toFixed() + " fps";
});
// the canvas/window resize event handler

window.addEventListener('resize', function () {
    engine.resize();
});
