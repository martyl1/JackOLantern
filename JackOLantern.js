import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

//Stats variables
const stats = new Stats();

//Scene variables
let scene, camera, renderer, clock, draggableModel, raycaster, clickMouse, moveMouse;

//Physics variables
let rigidbodies = [], physicsWorld, tmpTrans;

//Ammo Init
Ammo().then( function ( AmmoLib ) {

    Ammo = AmmoLib;

    start();

} );


function start (){

    tmpTrans = new Ammo.btTransform();

    //Setup stats
    setupStats();
    
    //Setup physics
    setupPhysicsWorld();

    //Set up scene
    setupGraphics();

    //GLTF Loader function
    loadGLTF('/scene.gltf');
    
    //Create floor
    createBlock({x: 0, y: 0, z:0}, {x:1000, y:2, z:1000}, {color: 0x0000});
    createBlock({x: 0, y: 0, z: -600}, {x:10000, y:10000, z:2}, {color: 0x0000});
    
    //Animate (update)
    renderFrame();

}

function setupPhysicsWorld(){

    let collisionConfiguration  = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher              = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache    = new Ammo.btDbvtBroadphase(),
        solver                  = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld           = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));

}

//Supply path for model to load
async function loadGLTF(path){
    const loader = new GLTFLoader();    

    loader.load( path, function ( gltf ) {

        //threeJS Section
        gltf.scene.position.set(0, 10, 0);
        gltf.scene.scale.set(75, 75, 75);
        gltf.scene.castShadow = true;
        gltf.scene.recieveShadow = true;

        scene.add( gltf.scene );
        gltf.scene.isDraggable=true;


        //AmmoJS Section
        let transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin( new Ammo.btVector3( 0, 10, 0 ) );
        transform.setRotation( new Ammo.btQuaternion( 0, 0, 0, 1 ) );
        let motionState = new Ammo.btDefaultMotionState( transform );

        let colShape = new Ammo.btSphereShape( .5 );
        colShape.setMargin( 0.05 );

        let localInertia = new Ammo.btVector3( 0, 0, 0 );
        colShape.calculateLocalInertia( 1, localInertia );

        let rbInfo = new Ammo.btRigidBodyConstructionInfo( 1, motionState, colShape, localInertia );
        let body = new Ammo.btRigidBody( rbInfo );


        physicsWorld.addRigidBody( body );
        
        gltf.scene.userData.physicsBody = body;
        rigidbodies.push(gltf.scene);
        
    
    },
    (error) => {console.log(error)
    
    } );
}

//Create basic rectangle and add to scene.
function createBlock(p, s, color){
                
    let pos = {x: 0, y: 0, z: 0};
    let scale = {x: 1000, y: 2, z: 1000};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 0;

    //threeJS Section
    let blockPlane = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhongMaterial(color));

    blockPlane.position.set(p.x, p.y, p.z);
    blockPlane.scale.set(s.x, s.y, s.z);

    blockPlane.castShadow = true;
    blockPlane.receiveShadow = true;

    scene.add(blockPlane);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( p.x, p.y, p.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );

    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( s.x * 0.5, s.y * 0.5, s.z * 0.5 ) );
    colShape.setMargin( 0.05 );

    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );

    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );


    physicsWorld.addRigidBody( body );
}

//Function for configuring scene
function setupGraphics(){

    //create clock for timing
    clock = new THREE.Clock();  

    //create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x0000 );

    //create camera
    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 5000 );
    camera.position.set( 0, 30, 70 );
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    //Add hemisphere light
    let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.1 );
    hemiLight.color.setHSL( 0.6, 0.6, 0.6 );
    hemiLight.groundColor.setHSL( 0.1, 1, 0.4 );
    hemiLight.position.set( 0, 50, 0 );
    scene.add( hemiLight );

    //Add directional light
    let dirLight = new THREE.DirectionalLight( 0xffffff , 1);
    dirLight.color.setHSL( 0.1, 1, 0.95 );
    dirLight.position.set( -1, 1.75, 1 );
    dirLight.position.multiplyScalar( 100 );
    scene.add( dirLight );

    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    let d = 50;

    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;

    dirLight.shadow.camera.far = 13500;

    //Setup fog
    scene.fog = new THREE.Fog( 0x38cf30, 0.005, 150 );

    //Setup the renderer
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setClearColor( 0xbfd1e5 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    renderer.shadowMap.enabled = true;

    //Orbit controls
    const controls = new OrbitControls( camera, renderer.domElement );
    controls.update();			

}

function updatePhysics( deltaTime ){

    // Step world
    physicsWorld.stepSimulation( deltaTime, 10 );

    // Update rigid bodies
    for ( let i = 0; i < rigidbodies.length; i++ ) {
        let objThree = rigidbodies[ i ];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if ( ms ) {

            ms.getWorldTransform( tmpTrans );
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );

        }
    }

}

//Update function
function renderFrame(){

    stats.begin();

    let deltaTime = clock.getDelta();

    updatePhysics(deltaTime);

    renderer.render( scene, camera );

    stats.end();

    requestAnimationFrame( renderFrame );

}

//TO DO: get this retarded function to work
function createTriangleShapeByBufferGeometry(geometry, scalingFactor) {
    var mesh = new Ammo.btTriangleMesh(true, true);
    var vertexPositionArray = geometry.attributes.position.array;
    for (var i = 0; i < geometry.attributes.position.count/3; i++) {
            mesh.addTriangle(
                new Ammo.btVector3(vertexPositionArray[i*9+0]*scalingFactor, vertexPositionArray[i*9+1]*scalingFactor, vertexPositionArray[i*9+2]*scalingFactor ),
                new Ammo.btVector3(vertexPositionArray[i*9+3]*scalingFactor, vertexPositionArray[i*9+4]*scalingFactor, vertexPositionArray[i*9+5]*scalingFactor),
                new Ammo.btVector3(vertexPositionArray[i*9+6]*scalingFactor, vertexPositionArray[i*9+7]*scalingFactor, vertexPositionArray[i*9+8]*scalingFactor),
                false
            );
    }
    var shape = new Ammo.btBvhTriangleMeshShape(mesh, true, true);
    return shape;
}

function setupStats(){
    stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);
}

