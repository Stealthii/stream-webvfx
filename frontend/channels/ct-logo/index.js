var THREE = require('three');
require('imports?THREE=three!../../libs/shaders/CopyShader');
require('imports?THREE=three!../../libs/shaders/DigitalGlitch');
require('imports?THREE=three!../../libs/shaders/FilmShader');
require('imports?THREE=three!../../libs/shaders/DotScreenShader');
require('imports?THREE=three!../../libs/shaders/VignetteShader');
require('imports?THREE=three!../../libs/postprocessing/EffectComposer');
require('imports?THREE=three!../../libs/postprocessing/RenderPass');
require('imports?THREE=three!../../libs/postprocessing/MaskPass');
require('imports?THREE=three!../../libs/postprocessing/ShaderPass');
require('imports?THREE=three!../../libs/postprocessing/FilmPass');
require('imports?THREE=three!../../libs/postprocessing/DotScreenPass');

require('gsap');


var Pumper = require('pumper');

var words = [
    'CONSOLETATION'
];

var divisions = 16;

var camera, scene, renderer, composer;
var namesMesh = [];

function init() {

    //Create bands
    var bandMin = 10;
    var bandSize = 80 / divisions;
    for (var i = 0 ; i < divisions ; i++){
        Pumper.createBand(bandMin, bandMin + bandSize, 127, 4 );
        bandMin += bandSize;
    }

    //Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    renderer.setClearColor(0xffffff, 1);

    //Create camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 3000);
    camera.position.z = 900;

    //Create scene
    scene = new THREE.Scene();

    initName();

    //Bring the lights
    scene.add(new THREE.AmbientLight(0xcacaca));

    initPostProcessing();

    window.addEventListener('resize', onWindowResize, false);

    frame();
}

function initName(){
    //Create shapes container
    var namesContainer = new THREE.Object3D();
    namesContainer.position.x =  window.innerWidth * 0.5;
    namesContainer.position.y =  window.innerHeight * -0.5;
    scene.add(namesContainer);

    var txtWidth, bitmap,
        g,
        texture, material, nameSlicesContainer,
        nameMesh, nameMesh2, nameMesh3, nameMesh4,
        divisionWidth, slices1, slices2, slices3, slices4,
        posX, posY,
        i = 0, j = 0;

    //create text image
    for (i = 0 ; i < words.length ; i ++){

        // canvas contents will be used for a texture
        nameSlicesContainer = new THREE.Object3D();
        nameSlicesContainer.position.x = window.innerWidth * -0.5;
        nameSlicesContainer.position.y = window.innerHeight * 0.5;

        slices1 = [];
        slices2 = [];
        slices3 = [];
        slices4 = [];
        for (j = 0 ; j < divisions ; j ++){
            //Dirty as fuck, but I've got to create a canvas per name's slice
            //Also, weirdly the width can't seem to be set after adding a text in
            bitmap = document.createElement('canvas');
            g = bitmap.getContext('2d');
            bitmap.width = 1024;
            bitmap.height = 200;
            g.font = 'bold 160px rigid-square';
            g.fillStyle = 'white';
            txtWidth = g.measureText(words[i]).width;
            divisionWidth = txtWidth / divisions;

            bitmap.width = divisionWidth;
            g.font = 'bold 160px rigid-square';
            g.fillStyle = 'white';
            txtWidth = g.measureText(words[i]).width;
            g.fillText(words[i], (divisionWidth * j) * -1, 160 );

            texture = new THREE.Texture(bitmap);
            texture.needsUpdate = true;
            texture.minFilter = THREE.LinearFilter;

            material = new THREE.MeshBasicMaterial({
                map : texture, color: 0x000000, transparent: true, opacity: 1
            });

            posX = j * (divisionWidth) - txtWidth * 0.5;
            posY = 0;

            nameMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(divisionWidth, 200), material);
            nameMesh.material.opacity = 0.6;
            nameMesh.position.set(posX, posY, 0);
            nameSlicesContainer.add(nameMesh);
            slices1.push(nameMesh);

            nameMesh2 = nameMesh.clone();
            nameMesh2.material = material.clone();
            nameMesh2.position.set(posX, posY, 0);
            nameMesh2.material.opacity = 0.1;
            nameSlicesContainer.add(nameMesh2);
            slices2.push(nameMesh2);

            nameMesh3 = nameMesh.clone();
            nameMesh3.material = material.clone();
            nameMesh3.position.set(posX, posY, 0);
            nameMesh3.material.opacity = 0.1;
            nameSlicesContainer.add(nameMesh3);
            slices3.push(nameMesh3);

            nameMesh4 = nameMesh.clone();
            nameMesh4.material = material.clone();
            nameMesh4.position.set(posX, posY, 0);
            nameMesh4.material.opacity = 0.2;
            nameSlicesContainer.add(nameMesh4);
            slices4.push(nameMesh4);
        }
        namesMesh.push({
            container: nameSlicesContainer,
            slices1: slices1,
            slices2: slices2,
            slices3: slices3,
            slices4: slices4
        });
    }
    namesContainer.add(namesMesh[0].container);

}

function initPostProcessing(){
    // postprocessing
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));

    var shaderVignette = THREE.VignetteShader;
    var effectVignette = new THREE.ShaderPass(shaderVignette);
    effectVignette.uniforms.offset.value = 0.5;
    effectVignette.uniforms.darkness.value = 1.6;
    composer.addPass(effectVignette);

    var effectFilmPass = new THREE.FilmPass(0.35, 0.025, 648, false);
    effectFilmPass.renderToScreen = true;
    composer.addPass(effectFilmPass);
}

function update() {
    Pumper.update();

    //Animate names based on bands
    var currentNameSlices1 = namesMesh[0].slices1;
    var currentNameSlices2 = namesMesh[0].slices2;
    var currentNameSlices3 = namesMesh[0].slices3;
    var currentNameSlices4 = namesMesh[0].slices4;
    var bandVolume;
    for (var i = 0 ; i < currentNameSlices1.length ; i ++){
        bandVolume = Pumper.bands[i].volume;
        currentNameSlices1[i].position.y = bandVolume * 0.1;
        currentNameSlices2[i].position.y = bandVolume * -0.2;
        currentNameSlices3[i].position.y = bandVolume * 0.5;
        currentNameSlices4[i].position.y = bandVolume * 0.3;
    }
}

function render() {
    composer.render();
}

function frame() {
    requestAnimationFrame(frame);
    update();
    render();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function shuffle(array) {
    var counter = array.length, temp, index;
    while (counter > 0) {
        index = Math.floor(Math.random() * counter);
        counter--;
        temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
}

var BeatProcessing = {
    init: init
};

module.exports = BeatProcessing;