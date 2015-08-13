var THREE = require('three');
require('imports?THREE=three!../../libs/shaders/CopyShader');
require('imports?THREE=three!../../libs/shaders/DigitalGlitch');
require('imports?THREE=three!../../libs/shaders/FilmShader');
require('imports?THREE=three!../../libs/postprocessing/EffectComposer');
require('imports?THREE=three!../../libs/postprocessing/RenderPass');
require('imports?THREE=three!../../libs/postprocessing/MaskPass');
require('imports?THREE=three!../../libs/postprocessing/ShaderPass');
require('imports?THREE=three!../../libs/postprocessing/GlitchPassCustom');
require('imports?THREE=three!../../libs/postprocessing/FilmPass');

require('gsap');


var Pumper = require('pumper');
var Datas = require('./datas')

var _ift = Date.now();
var glitchTimeout;
var bassCheck = Pumper.createBand(20, 60, 127, 6 );

var colors = [0xce1748, 0x14abbe, 0xfca412];
var currentColor = 0;

var main;
var divisions = 16, bands = [];

var camera, scene, renderer, composer;
var shapesContainer, light;
var shapeMesh, shapeMaterial, shapeGeometry;
var shapeStrokeLine, shapeStrokeLine, shapeStrokeGeometry;
var namesMesh = [];
var currentName = 0;
var currentShape = 0;
var glitchPass;

function init() {
    //Create bands
    var bandMin = 10;
    var bandSize = 80 / divisions;
    for (var i = 0 ; i < divisions ; i++){
        Pumper.createBand(bandMin, bandMin + bandSize, 127, 4 );
        bandMin += bandSize;
    }

    //Create renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    renderer.domElement.addEventListener('click', simulateBeat);
    renderer.setClearColor( 0x000000, 1 );

    //Create camera
    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 3000 );
    camera.position.z = 900;

    //Create scene
    scene = new THREE.Scene();
    // scene.fog = new THREE.Fog( 0x000000, 1, 2000 );

    initShape();
    initName();

    //Bring the lights
    scene.add( new THREE.AmbientLight( 0xcacaca ) );
    // light = new THREE.DirectionalLight( 0xffffff );
    // light.position.set( 1, 1, 1 );
    // scene.add( light );


    initPostProcessing();

    window.addEventListener( 'resize', onWindowResize, false );
    glitchPass.goWild = false;


    _t = _ft = _rft = Date.now();
    frame();
}

function initName(){
    //Create shapes container
    var namesSize = 1024;
    namesContainer = new THREE.Object3D();
    namesContainer.position.x =  window.innerWidth * 0.5;
    namesContainer.position.y =  window.innerHeight * -0.5;
    scene.add( namesContainer );

    var txtWidth, bitmap,
        g,
        texture, material, nameSlicesContainer,
        nameMesh, nameMesh2, nameMesh3, nameMesh4, nameMesh5,
        divisionWidth, slices1, slices2, slices3, slices4, slices5,
        posX, posY,
        i = 0, j = 0;

    //create text image
    for (i = 0 ; i < Datas.names.length ; i ++){

        // canvas contents will be used for a texture
        nameSlicesContainer = new THREE.Object3D();
        nameSlicesContainer.position.x = namesSize * -0.5;
        nameSlicesContainer.position.y = 0;

        slices1 = [];
        slices2 = [];
        slices3 = [];
        slices4 = [];
        for (j = 0 ; j < divisions ; j ++){
            //Dirty as fuck, but I've got to create a canvas per name's slice
            //Also, weirdly the width can't seem to be set after adding a text in
            bitmap = document.createElement('canvas');
            g = bitmap.getContext('2d');
            bitmap.width = namesSize;
            bitmap.height = 200;
            g.font = 'bold 100px Apercu';
            g.fillStyle = 'white';
            txtWidth = g.measureText(Datas.names[i]).width;
            divisionWidth = txtWidth / divisions

            bitmap.width = divisionWidth;
            g.font = 'bold 70px Apercu';
            g.fillStyle = 'white';
            txtWidth = g.measureText(Datas.names[i]).width;
            g.fillText(Datas.names[i], (divisionWidth * j) * -1, 100 );

            texture = new THREE.Texture(bitmap)
            texture.needsUpdate = true;

            material = new THREE.MeshBasicMaterial( {
                map : texture, color: 0xffffff, transparent: true, opacity: 1
            });

            posX = j * (divisionWidth) - txtWidth * 0.5;
            posY = 0;

            nameMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(divisionWidth, 200), material);
            nameMesh.material.opacity = 0.4;
            nameMesh.position.set(posX, posY, 0);
            nameSlicesContainer.add( nameMesh );
            slices1.push(nameMesh)

            nameMesh2 = nameMesh.clone();
            nameMesh2.material = material.clone();
            nameMesh2.position.set(posX, posY, 0);
            nameMesh2.material.opacity = 0.1;
            nameSlicesContainer.add( nameMesh2 );
            slices2.push(nameMesh2)

            nameMesh3 = nameMesh.clone();
            nameMesh3.material = material.clone();
            nameMesh3.position.set(posX, posY, 0);
            nameMesh3.material.opacity = 0.1;
            nameSlicesContainer.add( nameMesh3 );
            slices3.push(nameMesh3)

            nameMesh4 = nameMesh.clone();
            nameMesh4.material = material.clone();
            nameMesh4.position.set(posX, posY, 0);
            nameMesh4.material.opacity = 0.2;
            nameSlicesContainer.add( nameMesh4 );
            slices4.push(nameMesh4)
        }
        namesMesh.push({
            container: nameSlicesContainer,
            slices1: slices1,
            slices2: slices2,
            slices3: slices3,
            slices4: slices4
        });
    }
    namesContainer.add( namesMesh[0].container );

}
function initShape(){
    //Create shapes container
    shapesContainer = new THREE.Object3D();
    scene.add( shapesContainer );

    //Create current shape and its stroke
    var shapeStaticPoints = Datas.shapes[currentShape].points;
    shapePoints = [];
    //Get shape's points from the shapes file
    for (var i = 0 ; i < shapeStaticPoints.length ; i ++){
        shapePoints.push( new THREE.Vector3( shapeStaticPoints[i].x, shapeStaticPoints[i].y, 0) );
    }

    //Create current shape
    shape = new THREE.Shape( shapePoints );
    shapeStrokeGeometry = shape.createPointsGeometry();
    console.log(shape.createPointsGeometry(50));
    console.log(shapeStrokeGeometry);
    var spacedPoints = shape.createSpacedPointsGeometry( 20 );


    shapeGeometry = new THREE.ShapeGeometry( shape );
    // shapeGeometry.vertices = shape.createSpacedPointsGeometry( 20 ).vertices;
    shapeGeometry.vertices.push( new THREE.Vector3( shapeStaticPoints[0].x, shapeStaticPoints[0].y, 0) );
    // shapeGeometry.verticesNeedUpdate = true;
    // shapeGeometry.dirtyVertices = true;
    shapeMaterial = new THREE.MeshPhongMaterial( { color: colors[currentColor], shading: THREE.FlatShading } );
    shapeMesh = new THREE.Mesh( shapeGeometry, shapeMaterial );
    shapesContainer.add( shapeMesh );

    //Create stroke
    shapeStrokeMaterial = new THREE.LineBasicMaterial( {
        color: colors[currentColor], shading: THREE.FlatShading,
        opacity: 0.5, transparent: true} );
    shapeStrokeLine = new THREE.Line(shapeStrokeGeometry, shapeStrokeMaterial);
    shapeStrokeLine.scale.set(1.2, 1.2, 1.2)
    shapesContainer.add( shapeStrokeLine );
    // shapeStrokeLine.rotation.x = 10;
}

function initPostProcessing(){
    // postprocessing
    composer = new THREE.EffectComposer( renderer );
    composer.addPass( new THREE.RenderPass( scene, camera ) );

    glitchPass = new THREE.GlitchPass();
    // glitchPass.renderToScreen = true;
    composer.addPass( glitchPass );

    effectFilmPass = new THREE.FilmPass( 0.35, 0.1, 648, false );
    effectFilmPass.renderToScreen = true;
    composer.addPass( effectFilmPass );
}


function simulateBeat(){
    glitchPass.goWild = true;
    setTimeout(function (){
        glitchPass.goWild = false;
    }, 300)

    tweenVertices(0.5);
}

function tweenVertices(duration){
    //Change color of the shape
    currentColor ++;
    if(currentColor > colors.length - 1){
        currentColor = 0;
    }
    shapeMaterial.color.setHex( colors[currentColor] );
    shapeStrokeMaterial.color.setHex( colors[currentColor] );
    renderer.setClearColor( colors[currentColor ], 1 );

    //Change name
    namesContainer.remove( namesMesh[currentName].container );
    currentName ++;
    if(currentName > namesMesh.length - 1){
        currentName = 0;
    }
    namesContainer.add( namesMesh[currentName].container );

    //Rotate shape
    var shapeRotation = THREE.Math.randInt(-45, 45) * Math.PI / 180;
    TweenMax.to(shapeMesh.rotation, duration, {
        z:  shapeRotation,
        ease: Cubic.easeInOut
    })
    TweenMax.to(shapeStrokeLine.rotation, duration + 0.05, {
        z:  shapeRotation,
        ease: Cubic.easeInOut
    })

    //Change shape
    currentShape ++ ;
    if( currentShape >= Datas.shapes.length ){
        currentShape = 0;
    }
    var shapeStaticPoints = Datas.shapes[currentShape].points;
    shapePoints = [];
    //Get shape's points from the shapes file
    for (var i = 0 ; i < shapeStaticPoints.length ; i ++){
        shapePoints.push( new THREE.Vector3( shapeStaticPoints[i].x, shapeStaticPoints[i].y, 0) );
    }
    shapePoints.push( new THREE.Vector3( shapeStaticPoints[0].x, shapeStaticPoints[0].y, 0) );

    TweenMax.to(shapeGeometry.vertices[i], duration, {
        x: shapePoints[i].x,
        y: shapePoints[i].y,
        delay: 0,
        ease: Cubic.easeInOut
    })

    //Tween vertices
    for (var i = 0 ; i < shapePoints.length ; i ++){
        TweenMax.to(shapeGeometry.vertices[i], duration, {
            x: shapePoints[i].x,
            y: shapePoints[i].y,
            ease: Cubic.easeInOut
        })
        TweenMax.to(shapeStrokeGeometry.vertices[i], duration + 0.05, {
            x: shapePoints[i].x,
            y: shapePoints[i].y,
            ease: Cubic.easeInOut,
            onUpdate: function(){
                shapeGeometry.verticesNeedUpdate = true;
                shapeStrokeGeometry.verticesNeedUpdate = true;
            }
        })
    }
}

function update() {
    _t = Date.now();

    Pumper.update();

    //Animate names based on bands
    var currentNameSlices1 = namesMesh[currentName].slices1;
    var currentNameSlices2 = namesMesh[currentName].slices2;
    var currentNameSlices3 = namesMesh[currentName].slices3;
    var currentNameSlices4 = namesMesh[currentName].slices4;
    // console.log(Pumper.bands[0].volume);
    var bandVolume;
    for (var i = 0 ; i < currentNameSlices1.length ; i ++){
        bandVolume = Pumper.bands[i].volume;
        // currentNameSlices1[i].scale.set(1 + bandVolume * 0.01, 1 + bandVolume * 0.01, 1);
        currentNameSlices1[i].position.y = bandVolume * 0.1;
        currentNameSlices2[i].position.y = bandVolume * -0.2;
        currentNameSlices3[i].position.y = bandVolume * 0.5;
        currentNameSlices4[i].position.y = bandVolume * 0.3;
    }
    // if(bassCheck.isSpiking === true) {
    if(bassCheck.isSpiking === true) {
        var volume = Math.floor((bassCheck.volume * 0.7));
        var scale = 0.9 + (volume * 0.1);

        tweenVertices(scale * 0.02);

        if(glitchPass.goWild === false){
            // glitchPass.goWild = bassCheck.isSpiking;
            glitchPass.goWild = bassCheck.isSpiking;
            glitchTimeout = setTimeout(function (){
                if(bassCheck.isSpiking === false){
                    glitchPass.goWild = false;
                }
            }, volume)
        }else{
            clearTimeout( glitchTimeout )
            glitchTimeout = setTimeout(function (){
                if(bassCheck.isSpiking === false){
                    glitchPass.goWild = false;
                }
            }, volume)
        }
    }
    scale = Pumper.volume * 0.002 + 1;
    shapeMesh.scale.set(scale, scale, scale);
    setTimeout(function (){
        shapeStrokeLine.scale.set(scale + 0.1, scale + 0.1, scale + 0.1);
    }, 10)
}

function render() {
    var time = Date.now();
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
    renderer.setSize( window.innerWidth, window.innerHeight );
}





var BeatProcessing = {
    init: init
};

module.exports = BeatProcessing;
