

window.onload = mainScene;

var verts_shader, frag_shader;

function initBabylon() {
    var canvas = document.getElementById('renderCanvas');

    var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    var createScene = function () {
        // This creates a basic Babylon Scene object (non-mesh)
        var scene = new BABYLON.Scene(engine);

        var camera = new BABYLON.ArcRotateCamera("camera1", Math.PI, Math.PI / 2.0, 20, new BABYLON.Vector3(0, 0, -1000), scene);
        camera.setTarget(BABYLON.Vector3.Zero());
        // camera.attachControl(canvas, true);

        
        var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.1;

        BABYLON.Effect.ShadersStore["customVertexShader"] = verts_shader;
        BABYLON.Effect.ShadersStore["customFragmentShader"] = frag_shader;

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


        // var Dome = BABYLON.Mesh.CreateSphere('Dome', 50, 50, scene);
        // Dome.material = shaderMaterial;

        var plane = BABYLON.MeshBuilder.CreatePlane("plane", {width:window.innerWidth, height:window.innerHeight}, scene);    
        plane.material = shaderMaterial

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
}

async function mainScene() {

    verts_shader = await fetch('/src/shader.vert');
    verts_shader = await verts_shader.text()

    frag_shader = await fetch('/src/shader.frag');
    frag_shader = await frag_shader.text()


    initBabylon()

    // const dat = require('dat.gui');
    //https://jsfiddle.net/ikatyang/182ztwao/
    //https://github.com/dataarts/dat.gui/blob/master/API.md
    const gui = new dat.GUI()

    var objVal = {
        values_1: 89,
        checker: false,
    };
    gui.add(objVal, 'values_1', 0, 100);
    gui.add(objVal, 'checker');

    var palette = {
        color1: '#FF0000', // CSS string
        color2: [0, 128, 255], // RGB array
        color3: [0, 128, 255, 0.3], // RGB with alpha
        color4: { h: 350, s: 0.9, v: 0.3 } // Hue, saturation, value
    };
    gui.addColor(palette, 'color3');
}
