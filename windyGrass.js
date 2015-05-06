
/**
 * @author yomotsu / http://yomotsu.net
 * repository: https://github.com/yomotsu/windyGrass
 *
 */

var windyGrass = ( function () {

  var windyGrass = {};

  var clock = new THREE.Clock();

  windyGrass.param = {

    time: {
      type: 'f',
      value: 1.0
    },
    windDirection: {
      type: 'v2',
      value: new THREE.Vector3( 1, 0 )
    },
    windPower: {
      // http://weather-gpv.info/gw.php
      type: 'f',
      value: 1.5
    }

  };

  var attributes = {
    weight: {
      type: 'f',
      value: null
    },
  };

  var uniforms = THREE.UniformsUtils.merge( [

    THREE.UniformsLib[ "common" ],
    THREE.UniformsLib[ "fog" ],
    THREE.UniformsLib[ "lights" ],
    THREE.UniformsLib[ "shadowmap" ],

    {
      "emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
      "specular" : { type: "c", value: new THREE.Color( 0x111111 ) },
      "shininess": { type: "f", value: 30 },
      "specularStrength" : { type: "f", value: 1 }
    }

  ] );

  var vs = [
    '// attribute vec3 position;',
    '// attribute vec3 normal;',
    '// attribute vec2 uv;',
    'attribute float weight;',

    '// uniform mat4 projectionMatrix;',
    '// uniform mat4 modelMatrix;',
    '// uniform mat4 viewMatrix;',

    'uniform float time;',
    'uniform float windPower;',
    'uniform vec2 windDirection;',

    'varying vec2 vUv;',
    'varying vec3 vViewPosition;',
    'varying vec3 vNormal;',

    THREE.ShaderChunk[ "common" ],
    THREE.ShaderChunk[ "lights_phong_pars_vertex" ],

    'void main ( void ) {',

      // TODO better noise and wind simulation
      'float noise = sin( time ) * sin( time * 0.8 ) * 0.05 + 0.05;',
      'float factor = weight * noise * windPower;',
      'float x = windDirection.x * factor;',
      'float z = windDirection.y * factor;',
      'float y = - length( vec2( x, z ) ); //TODO',

      'vec4 worldPosition  = modelMatrix * vec4( position, 1.0 );',
      'vec4 worldPosition2 = worldPosition + vec4( x, y, z, 0.0 );',
      'vec4 mvPosition = viewMatrix * worldPosition2;',

      'gl_Position = projectionMatrix * mvPosition;',

      'vUv = uv;',
      'vNormal = normal;',
      'vViewPosition = -mvPosition.xyz;',

      THREE.ShaderChunk[ "lights_phong_vertex" ],

    '}'

  ].join( '\n' );

  var fs = [

    'uniform sampler2D map;',
    "uniform vec3 emissive;",
    "uniform vec3 specular;",
    "uniform float shininess;",
    "uniform float specularStrength;",

    'varying vec2 vUv;',

    THREE.ShaderChunk[ "common" ],
    THREE.ShaderChunk[ "fog_pars_fragment" ],
    THREE.ShaderChunk[ "lights_phong_pars_fragment" ],

    "void main() {",

      "vec3 outgoingLight = vec3( 0.0 );",
      "vec4 diffuseColor = texture2D( map, vUv );",

      THREE.ShaderChunk[ "alphatest_fragment" ],
      THREE.ShaderChunk[ "lights_phong_fragment" ],
      THREE.ShaderChunk[ "fog_fragment" ],

      "gl_FragColor = vec4( outgoingLight, diffuseColor.a );",
      // "gl_FragColor = vec4( 1 );",

    "}"

  ].join("\n");


  windyGrass.update = function () {

    var elapsed = clock.getElapsedTime();
    windyGrass.param.time.value = elapsed;

  }


  windyGrass.Geometry = function ( width, height, depth ) {

    THREE.BufferGeometry.call( this );

    this.type = 'WindyGrassBufferGeometry';

    var width_half  = width  * 0.5;
    var height_half = height * 0.5;
    var depth_half  = depth  * 0.5;

    var indices = new Uint16Array( [
      0, 2, 1,
      2, 3, 1,

      4, 6, 5,
      6, 7, 5
    ] );

    var vertices = new Float32Array( [
      -width_half,  height_half,  0,
       width_half,  height_half,  0,
      -width_half, -height_half,  0,
       width_half, -height_half,  0,

      0,  height_half, -depth_half,
      0,  height_half,  depth_half,
      0, -height_half, -depth_half,
      0, -height_half,  depth_half
    ] );

    var normals = new Float32Array( [
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,

      1, 0, 0,
      1, 0, 0,
      1, 0, 0,
      1, 0, 0
    ] );

    var uvs = new Float32Array( [
      0, 1,
      1, 1,
      0, 0,
      1, 0,

      0, 1,
      1, 1,
      0, 0,
      1, 0
    ] );

    var weights = new Float32Array( [
      1, 1, 0,
      0, 1, 1,

      0, 0, 1,
      1, 1, 1
    ] );

    this.addAttribute( 'index',    new THREE.BufferAttribute( indices,  1 ) );
    this.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    this.addAttribute( 'normal',   new THREE.BufferAttribute( normals,  3 ) );
    this.addAttribute( 'uv',       new THREE.BufferAttribute( uvs,      2 ) );
    this.addAttribute( 'weight',   new THREE.BufferAttribute( weights,  1 ) );

  };

  windyGrass.Geometry.prototype = Object.create( THREE.BufferGeometry.prototype );
  windyGrass.Geometry.prototype.constructor = windyGrass.Geometry;



  windyGrass.Material = function ( params ) {

    var shaderParams = {
      vertexShader   : vs,
      fragmentShader : fs,
      attributes     : THREE.UniformsUtils.clone( attributes ),
      uniforms       : THREE.UniformsUtils.clone( uniforms )
    }

    shaderParams.uniforms.windDirection = windyGrass.param.windDirection;
    shaderParams.uniforms.windPower     = windyGrass.param.windPower;
    shaderParams.uniforms.time          = windyGrass.param.time;

    THREE.ShaderMaterial.call( this, shaderParams );

    this.side      = THREE.DoubleSide;
    this.alphaTest = 0.8;
    this.fog       = true;
    this.lights    = true;
    // this.wireframe = true;

    if ( params.map ) {

      this.uniforms.map.value = params.map;

    }

  }

  windyGrass.Material.prototype = Object.create( THREE.ShaderMaterial.prototype );


  return windyGrass;

} )();
