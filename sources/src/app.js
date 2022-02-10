
window.onload = async function () {

    var verts_shader = await fetch('/src/shader.vert');
    verts_shader = await verts_shader.text()

    var frag_shader = await fetch('/src/shader.frag?1.99');//цифра для сброса кэша/куков 
    frag_shader = await frag_shader.text()

    var time = 0, elapsed = 0.0;
    var timestamp = Date.now();

    //конфиг который вставлен в dat gui о ттуда меняются 
    //значение и некоторые  каллбеку вызывают изменения групп переменных
    var Config = {

        valX: 100,
        valY: 39,
        hasDynamicDay: false,
        tday: 200,
        d_startDay: 1,



        hasScattering: true,
        phaseR_c: .0596831,
        phaseM_c: .1193662,
        phaseS_c: .1193662,

        R0: 6360e3,
        dR: 20e3,
        bM: 21,

        speed: 8,
        cloudy: 0.25,

        I: 10.,
        SI: 5.,

        steps: 8,
        stepss: 8,
        step_fog: 32,

        extend_sun: true,

        sky_color: new BABYLON.Vector3(5.8e-6, 13.5e-6, 33.1e-6),
        hasAlien: false,
        normal: function () {
            Config.sky_color = new BABYLON.Vector3(5.8e-6, 13.5e-6, 33.1e-6);
        },
        green: function () {
            Config.sky_color = new BABYLON.Vector3(63.5e-6, 13.1e-6, 50.8e-6);
        },
        yeellow: function () {
            Config.sky_color = new BABYLON.Vector3(13.5e-6, 23.1e-6, 115.8e-6);
        },
        red_purple: function () {
            Config.sky_color = new BABYLON.Vector3(3.5e-6, 333.1e-6, 235.8e-6);
        },

        t_val_1: 0.05,
        t_val_2: 0.2,

        t_val_3: 0.5,

        hasFog: false,
        fogFader: 0.00,
    };

    //либо через переменную либо через найминг функции обавляем то что делаем с переменной
    const gui = new dat.GUI()

    let folder = gui.addFolder("Day parameters");
    folder.add(Config, 'hasDynamicDay').name('Dynamic time').onChange(function (newVal) {
        timestamp = Date.now();
        if (newVal) {
            // elapsed = Date.now() - timestamp;
            Config.d_startDay = 0;
            gui.updateDisplay()
        }
    });
    folder.add(Config, 'tday', 0, 1000).name('Length_day(sec.)');
    folder.add(Config, 'd_startDay', 0, 100).name('Day time');
    folder.open();

    folder = gui.addFolder("Scattering");
    folder.add(Config, 'hasScattering').name('Enable').onChange(function (newValue) {
        if (newValue) {
            Config.R0 = 6360e3;
            Config.dR = 20e3;
            Config.phaseR_c = .0596831;
            Config.phaseM_c = .1193662;
            Config.phaseS_c = .1193662;
            Config.extend_sun = true
            Config.I = 10.;
            Config.SI = 5.;
        } else {
            Config.R0 = 375668;
            Config.dR = 7513;
            Config.phaseR_c = .8;
            Config.phaseM_c = .0;
            Config.phaseS_c = .24;
            Config.extend_sun = false
            Config.I = 3.;
            Config.SI = 2.1;
        }
        gui.updateDisplay()
    });
    folder.add(Config, 'R0', 0, 10000e3);
    folder.add(Config, 'dR', 0, 200e3);
    folder.add(Config, 'bM', 0, 100);

    folder.add(Config, 'phaseR_c', 0, 2, 0.01);
    folder.add(Config, 'phaseM_c', 0, 2, 0.01);
    folder.add(Config, 'phaseS_c', 0, 4, 0.01);

    folder.open();

    gui.add(Config, 'speed', 5, 30).name('Cloud_move.');
    gui.add(Config, 'cloudy', 0, 1.0, 0.1).name('Cloudiness')

    // gui.add(Config, 'steps', 1, 100)
    // gui.add(Config, 'stepss', 1, 100)

    // gui.add(Config, 'extend_sun');

    // gui.add(Config, 'I', 0, 20, 0.1)
    // gui.add(Config, 'SI', 0, 20, 0.1)

    // folder = gui.addFolder('Color');
    // gui.addColor(Config, 'sky_color');
    // folder.add(Config,'normal');
    // folder.add(Config,'green');
    // folder.add(Config,'yeellow');
    gui.add(Config, 'hasAlien').name('Alien_atmosphere').onChange(function (newValue) {
        if (newValue) {
            Config.sky_color = new BABYLON.Vector3(3.5e-6, 333.1e-6, 235.8e-6);
        } else {
            Config.sky_color = new BABYLON.Vector3(5.8e-6, 13.5e-6, 33.1e-6);
        }
    });


    folder = gui.addFolder('Haze')
    folder.add(Config, 'hasFog').name('Enable').onChange(function (newVal) {
        if (newVal) {
            Config.fogFader = 0.55;
        } else {
            Config.fogFader = 0.0;
        }
        gui.updateDisplay()
    })
    folder.add(Config, 'fogFader', 0, 1, 0.01);
    folder.add(Config, 'step_fog', 1, 34, 1).name('качество');
    folder.open();

    // folder = gui.addFolder('Debug');
    // folder.add(Config, 'valX', 1, 100);
    // folder.add(Config, 'valY', 1, 100);
    // folder.add(Config, 't_val_1', 0, 1.0, 0.05);
    // folder.add(Config, 't_val_2', 0.0, 1.0, 0.05);
    // folder.add(Config, 't_val_3', 0.0, 1.0, 0.05);
    // folder.open();

    // gui.addColor(palette, 'color3');


    //создаём канвас и BABYLON
    var canvas = document.getElementById('renderCanvas');
    var engine = new BABYLON.Engine(canvas, true);

    var createScene = function () {
        var scene = new BABYLON.Scene(engine);

        var camera = new BABYLON.ArcRotateCamera("camera1", Math.PI, Math.PI / 2.0, 20, new BABYLON.Vector3(0, 0, -1000), scene);
        camera.setTarget(BABYLON.Vector3.Zero());
        // camera.attachControl(canvas, true);

        BABYLON.Effect.ShadersStore["customVertexShader"] = verts_shader;
        BABYLON.Effect.ShadersStore["customFragmentShader"] = frag_shader;
        var shaderMaterial = new BABYLON.ShaderMaterial("shader", scene, {
            vertex: "custom",
            fragment: "custom",
        },
            {
                attributes: ["position", "normal", "uv"],
                uniforms: ["world", "worldView", "worldViewProjection", "view", "projection"]
            });


        //текстура шума - для случайных чисел в шейдере
        var mainTexture = new BABYLON.Texture("/src/noise.png", scene, true, false, 12);

        shaderMaterial.setTexture("iChannel0", mainTexture);
        shaderMaterial.setVector2("iResolution", new BABYLON.Vector2(window.innerWidth, window.innerHeight));

        //создаём плоскость и выставляем её в экране так чтобы закрыть всё пространство
        //текстура размера экрана - поэтому ресайз неработает надо обновлять страницу
        var plane = BABYLON.MeshBuilder.CreatePlane("plane", { width: window.innerWidth, height: window.innerHeight }, scene);
        plane.material = shaderMaterial

        scene.registerBeforeRender(function () {

            if (Config.hasDynamicDay) {
                elapsed = Date.now() - timestamp;
            }

            shaderMaterial = scene.getMaterialByName("shader");

            shaderMaterial.setFloat("elapsed", elapsed);
            shaderMaterial.setFloat("tday", Config.tday);
            shaderMaterial.setFloat("d_startDay", Config.d_startDay);


            shaderMaterial.setFloat("phaseR_c", Config.phaseR_c);
            shaderMaterial.setFloat("phaseM_c", Config.phaseM_c);
            shaderMaterial.setFloat("phaseS_c", Config.phaseS_c);

            shaderMaterial.setFloat("R0", Config.R0);
            shaderMaterial.setFloat("Ra", Config.R0 + Config.dR);
            shaderMaterial.setVector3("C", new BABYLON.Vector3(0, -Config.R0, 0));

            let tmp_bM = Config.bM * 1e-6;
            shaderMaterial.setVector3("bM", new BABYLON.Vector3(tmp_bM, tmp_bM, tmp_bM));

            shaderMaterial.setFloat("iTime", time * Config.speed);
            shaderMaterial.setVector2("iMouse", new BABYLON.Vector2(Config.valX / 100.0, Config.valY / 100.0));
            shaderMaterial.setFloat("cloudy", Config.cloudy);

            shaderMaterial.setFloat("t_val_1", Config.t_val_1);
            shaderMaterial.setFloat("t_val_2", Config.t_val_2);
            shaderMaterial.setFloat("t_val_3", Config.t_val_3);
            shaderMaterial.setFloat("fogFader", Config.fogFader);
            shaderMaterial.setInt("step_fog", Config.step_fog);


            shaderMaterial.setInt("extend_sun", Config.extend_sun ? 1 : 0);
            shaderMaterial.setFloat("I", Config.I);
            shaderMaterial.setFloat("SI", Config.SI);

            shaderMaterial.setInt("steps", Config.steps);
            shaderMaterial.setInt("stepss", Config.stepss);

            // shaderMaterial.setVector3("bR", new BABYLON.Vector3(
            //     Config.sky_color[0] / 255 * 0.0001,
            //     Config.sky_color[1] / 255 * 0.0001,
            //     Config.sky_color[2] / 255 * 0.0001,
            // ));
            shaderMaterial.setVector3("bR", Config.sky_color);


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

    window.addEventListener('resize', function () {
        engine.resize();
    });

}
