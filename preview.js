import { ExtrudeGeometry, 
         MeshStandardMaterial,
         Mesh,
         Shape,
         Path,
         Scene,
         Color,
         DirectionalLight,
         HemisphereLight,
         PerspectiveCamera,
         Vector3,
         WebGLRenderer } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Geometry } from "./geometry";

export class Preview{
    constructor(){
        this.scene = new Scene();
        this.scene.background = new Color( 0xAAAAAA );
        this.camera = new PerspectiveCamera( 40, 1, 0.1, 20 );
        this.camera.position.set( 0, 0, 3 );
        this.renderer = new WebGLRenderer( { antialias: true } );
        this.renderer.setSize( 512, 512 );
        this.light = new DirectionalLight( 0xFFFFFF, 3 );
        this.light.position.set( 1, 1, 1 );
        this.ambient = new HemisphereLight( 0xAAAAFF, 0x222255, 0.1 );
        this.scene.add( this.light );
        this.scene.add( this.ambient );
        this.container = document.getElementById("preview");
        this.container.appendChild( this.renderer.domElement );
        this.controls = new OrbitControls( this.camera, this.renderer.domElement ); 
        this.controls.addEventListener( "change", this.render.bind(this) );
        this.material = new MeshStandardMaterial( { color: 0x3333BB } );//, wireframe: true } );
        this.on = false;
    }

    show( nodes, depth, holes ){
        const shape = this.nodesToShape( nodes );

        if (holes){
            for( const [key, nodes] of Object.entries(holes)){
                const path = this.nodesToPath( nodes );
                shape.holes.push( path );
            }
        }

        if ( this.mesh ){
            this.mesh.geometry.dispose();
            this.scene.remove( this.mesh );
        }

        const geometry = new ExtrudeGeometry( shape, { 
            depth,
            bevelEnabled: false
        });

        this.mesh = new Mesh( geometry, this.material );
        this.scene.add( this.mesh );

        const height = window.innerHeight;
        const top = (height - 512) / 2;
        this.container.style.top = `${top}px`;

        this.controls.target = this.getCenterPoint( this.mesh );
        this.camera.position.set( this.controls.target.x, this.controls.target.y, this.getCameraOffset( this.mesh ) );
        this.controls.update();

        this.render();

        this.on = true;
    }

    hide(){
        this.container.style.top = "-600px";
        this.on = false;
    }

    getCameraOffset(mesh) {
        const geometry = mesh.geometry;
    
        geometry.computeBoundingBox();
    
        const theta = 20 * (Math.PI/180.0);
        const halfwidth = (geometry.boundingBox.max.x - geometry.boundingBox.min.x)/2;
        //y = sin(t) * sc => sc = y/sin(t)
        let scale = halfwidth / Math.sin( theta );
        //x = cos(t) * sc =>  
        let posZ = (Math.cos( theta ) * scale) * 1.5;

        const halfheight = (geometry.boundingBox.max.y - geometry.boundingBox.min.y)/2;
        //y = sin(t) * sc => sc = y/sin(t)
        scale = halfheight / Math.sin( theta );
        //x = cos(t) * sc =>  
        posZ = Math.max( posZ, (Math.cos( theta ) * scale) * 1.5 );
        
        return posZ;
    }

    getCenterPoint(mesh) {
        const middle = new Vector3();
        const geometry = mesh.geometry;
    
        geometry.computeBoundingBox();
    
        middle.x = (geometry.boundingBox.max.x + geometry.boundingBox.min.x) / 2;
        middle.y = (geometry.boundingBox.max.y + geometry.boundingBox.min.y) / 2;
        middle.z = (geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2;
    
        mesh.localToWorld( middle );

        return middle;
    }

    nodesToShape( nodes ){
        const shape = new Shape();

        nodes.forEach( node => {
            switch( node.tool ){
                case 'moveTo':
                    shape.moveTo( node.x, -node.y );
                    break;
                case 'lineTo':
                    shape.lineTo( node.x, -node.y );
                    break;
                case 'quadraticCurveTo':
                    shape.quadraticCurveTo( node.options.ctrlA.x, -node.options.ctrlA.y, node.x, -node.y );
                    break;
                case 'bezierCurveTo':
                    shape.bezierCurveTo( node.options.ctrlA.x, -node.options.ctrlA.y, node.options.ctrlB.x, -node.options.ctrlB.y, node.x, -node.y );
                    break;
                case 'arc':
                    shape.absarc( node.x, -node.y, node.options.radius, -node.options.start, -node.options.end, !node.options.clockwise );
                    const pt = Geometry.calcPointOnCircle( node.x, node.y, node.options.radius, node.options.end );
                    shape.moveTo( pt.x, -pt.y );
                    break;
            }
        });

        return shape;
    }

    nodesToPath( nodes ){
        const path = new Path();

        nodes.forEach( node => {
            switch( node.tool ){
                case 'moveTo':
                    path.moveTo( node.x, -node.y );
                    break;
                case 'lineTo':
                    path.lineTo( node.x, -node.y );
                    break;
                case 'quadraticCurveTo':
                    path.quadraticCurveTo( node.options.ctrlA.x, -node.options.ctrlA.y, node.x, -node.y );
                    break;
                case 'bezierCurveTo':
                    path.bezierCurveTo( node.options.ctrlA.x, -node.options.ctrlA.y, node.options.ctrlB.x, -node.options.ctrlB.y, node.x, -node.y );
                    break;
                case 'arc':
                    path.absarc( node.x, -node.y, node.options.radius, -node.options.start, -node.options.end, !node.options.clockwise );
                    const pt = Geometry.calcPointOnCircle( node.x, node.y, node.options.radius, node.options.end );
                    path.moveTo( pt.x, -pt.y );
                    break;
            }
        });

        return path;
    }

    render(){
        this.renderer.render( this.scene, this.camera );
    }
}