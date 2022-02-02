
import './babylon_scene.js'
import * as dat from 'dat.gui';
//https://jsfiddle.net/ikatyang/182ztwao/
//https://github.com/dataarts/dat.gui/blob/master/API.md
const gui = new dat.GUI()

var objVal = {
    values_1:89,
    checker:false,
};
gui.add(objVal, 'values_1', 0, 100);
gui.add(objVal, 'checker');

var palette = {
    color1: '#FF0000', // CSS string
    color2: [ 0, 128, 255 ], // RGB array
    color3: [ 0, 128, 255, 0.3 ], // RGB with alpha
    color4: { h: 350, s: 0.9, v: 0.3 } // Hue, saturation, value
  };
  gui.addColor(palette, 'color3');