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

var logoText = 'CONSOLETATION';

var divisions = 16;

var camera, scene, renderer, composer;
var logoTextMesh = [];
var logoImageMesh;

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
    renderer.domElement.addEventListener('click', Pumper.play);
    renderer.setClearColor(0xffffff, 1);

    //Create camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 3000);
    camera.position.z = 900;

    //Create scene
    scene = new THREE.Scene();

    initLogoText();
    initLogoImage();

    //Bring the lights
    scene.add(new THREE.AmbientLight(0xcacaca));

    initPostProcessing();

    window.addEventListener('resize', onWindowResize, false);

    frame();
}

function initLogoText(){
    //Create shapes container
    var txtWidth, bitmap,
        g,
        texture, material, logoTextLayerContainer,
        logoTextLayerMesh, logoTextLayerMesh2, logoTextLayerMesh3, logoTextLayerMesh4,
        divisionWidth, slices1, slices2, slices3, slices4,
        posX, posY,
        i = 0, j = 0;

    //create text image
    // canvas contents will be used for a texture
    logoTextLayerContainer = new THREE.Object3D();
    scene.add(logoTextLayerContainer);

    slices1 = [];
    slices2 = [];
    slices3 = [];
    slices4 = [];
    for (j = 0 ; j < divisions ; j ++){
        //Dirty as fuck, but I've got to create a canvas per logo slice
        //Also, weirdly the width can't seem to be set after adding a text in
        bitmap = document.createElement('canvas');
        g = bitmap.getContext('2d');
        bitmap.width = 1024;
        bitmap.height = 200;
        g.font = 'bold 160px rigid-square';
        g.fillStyle = 'white';
        txtWidth = g.measureText(logoText).width;
        divisionWidth = txtWidth / divisions;

        bitmap.width = divisionWidth;
        g.font = 'bold 160px rigid-square';
        g.fillStyle = 'white';
        txtWidth = g.measureText(logoText).width;
        g.fillText(logoText, (divisionWidth * j) * -1, 160 );

        texture = new THREE.Texture(bitmap);
        texture.needsUpdate = true;
        texture.minFilter = THREE.LinearFilter;

        material = new THREE.MeshBasicMaterial({
            map : texture, color: 0x000000, transparent: true, opacity: 1
        });

        posX = j * (divisionWidth) - txtWidth * 0.5;
        posY = 0;

        logoTextLayerMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(divisionWidth, 200), material);
        logoTextLayerMesh.material.opacity = 0.6;
        logoTextLayerMesh.position.set(posX, posY, 0);
        logoTextLayerContainer.add(logoTextLayerMesh);
        slices1.push(logoTextLayerMesh);

        logoTextLayerMesh2 = logoTextLayerMesh.clone();
        logoTextLayerMesh2.material = material.clone();
        logoTextLayerMesh2.position.set(posX, posY, 0);
        logoTextLayerMesh2.material.opacity = 0.1;
        logoTextLayerContainer.add(logoTextLayerMesh2);
        slices2.push(logoTextLayerMesh2);

        logoTextLayerMesh3 = logoTextLayerMesh.clone();
        logoTextLayerMesh3.material = material.clone();
        logoTextLayerMesh3.position.set(posX, posY, 0);
        logoTextLayerMesh3.material.opacity = 0.1;
        logoTextLayerContainer.add(logoTextLayerMesh3);
        slices3.push(logoTextLayerMesh3);

        logoTextLayerMesh4 = logoTextLayerMesh.clone();
        logoTextLayerMesh4.material = material.clone();
        logoTextLayerMesh4.position.set(posX, posY, 0);
        logoTextLayerMesh4.material.opacity = 0.2;
        logoTextLayerContainer.add(logoTextLayerMesh4);
        slices4.push(logoTextLayerMesh4);
    }
    logoTextMesh.push({
        container: logoTextLayerContainer,
        slices1: slices1,
        slices2: slices2,
        slices3: slices3,
        slices4: slices4
    });
}

function initLogoImage(){
    var texture = new THREE.ImageUtils.loadTexture('../../assets/controller.png');
    var material = new THREE.MeshLambertMaterial({ map: texture, transparent: true });
    var geometry = new THREE.PlaneGeometry(235, 235);

    logoImageMesh = new THREE.Mesh( geometry, material );
    logoImageMesh.material.side = THREE.DoubleSide;
    logoImageMesh.position.x = window.innerWidth * 0.335;

    scene.add(logoImageMesh);
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

    //Animate logo text layers based on bands
    var logoTextLayers1 = logoTextMesh[0].slices1;
    var logoTextLayers2 = logoTextMesh[0].slices2;
    var logoTextLayers3 = logoTextMesh[0].slices3;
    var logoTextLayers4 = logoTextMesh[0].slices4;
    var bandVolume;
    for (var i = 0 ; i < logoTextLayers1.length ; i ++){
        bandVolume = Pumper.bands[i].volume;
        logoTextLayers1[i].position.y = bandVolume * 0.1;
        logoTextLayers2[i].position.y = bandVolume * -0.2;
        logoTextLayers3[i].position.y = bandVolume * 0.5;
        logoTextLayers4[i].position.y = bandVolume * 0.3;
    }

    // Animate image with normal mesh
    logoImageMesh.position.y = bandVolume * 0.1 - 175;

    // Give the camera a shove
    camera.position.z = 1100 - Pumper.bands[0].volume * 0.2;
    camera.position.y = window.innerWidth / window.innerHeight - Pumper.bands[0].volume * 0.1;
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
