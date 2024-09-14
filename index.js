import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import * as THREE from "three";
import { Store } from "./store.js";
import { Menu } from "./menu.js";
import { Geometry } from "./geometry.js";
import { Preview } from "./preview.js";
import { Graph } from "./graph.js";

class App{
    constructor(){
        const canvas = document.createElement('canvas');
        document.body.appendChild( canvas );
        this.canvas = canvas;

        this.store = new Store();

        const activePath = this.store.read( 'activePath' );

        this.config = { yAxis: 0.1, xAxis: 0.1, xMax: 5, units: 'm', scale: 50, snap: true,
            export: () => {
                this.export();
            }, 
            delete: () => {
                this.deletePath();
            },
            newPath: () => {
                this.newPath();
            },
            copyPath: () => {
                this.copyPath();
            },
            show: () => {
                //console.log( 'Show' );
                this.preview.show( this.nodes, this.config.depth );
                this.previewOn = true;
            },
            udo: () => {
                if (this.store.udo()){
                    this.loadPath( this.activePath );
                }
            },
            readme: () => {
                window.location = 'https://github.com/NikLever/ThreeJS-PathEditor';
            },
            name: activePath,
            tool: 'select', depth: 0.5
        };

        this.graph = new Graph( canvas, this.config );

        const pathNames = this.store.getPathNames();

        if (activePath == undefined ){
            this.config.name = "Path1";
        }

        const gui = new GUI();
        gui.add( this.config, 'xAxis', 0, 1).onChange( value => this.render() );
        gui.add( this.config, 'yAxis', 0, 1).onChange( value => this.render() );
        gui.add( this.config, 'xMax', 0.5, 10, 1).onChange( value => this.render() );
        //gui.add( this.config, 'scale', 0, 100).name('scale (%)');
        gui.add( this.config, 'units', [ 'm', 'cm', 'mm' ] );
        gui.add( this.config, 'depth', 0.02, 2 ).name('extrude depth');
       // gui.add( this.config, 'snap' );
        gui.add( this.config, 'tool', ['select', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc']);
        gui.add( this.config, 'newPath').name('new');
        gui.add( this.config, 'copyPath').name('copy');
        gui.add( this.config, 'delete');
        gui.add( this.config, 'udo');
        gui.add( this.config, 'show');
        gui.add( this.config, 'export');
        gui.add( this.config, 'readme');
        this.nameCtrl = gui.add( this.config, 'name' ).options( pathNames ).onChange( ( value ) => {
            this.loadPath( value );
        });
        this.gui = gui;

        window.addEventListener( 'resize', this.resize.bind(this) );

        this.nodes = [];
        this.activeNode = null;
        this.activeCtrl = null;

        if (activePath) this.loadPath( activePath );

        canvas.addEventListener('pointerdown', ( evt ) => { 
            if ( this.preview.on ){
                this.preview.hide();
                return;
            }
            if ( evt.button == 2 ) return;
            this.pointerDown = true;
            const pt = this.graph.convertScreenToPath( evt.x, evt.y );
            this.activeNode = this.selectNode( pt.x, pt.y );
            if ( this.activeNode == null){
                this.activeCtrl = this.selectCtrl( pt.x, pt.y );
                if (this.activeCtrl == null) this.addNode( this.config.tool, evt.x, evt.y );
                if (this.activeCtrl.type == 'clockwise'){
                    //Just flip the direction
                    this.activeCtrl.node.options.clockwise = !this.activeCtrl.node.options.clockwise;
                    this.activeCtrl = null;
                }
            }
            this.render();
        }, false);

        canvas.addEventListener( 'pointermove', ( evt ) => {
            if (this.pointerDown ){
                const pt = this.graph.convertScreenToPath( evt.x, evt.y );
                let theta;
                if (this.activeCtrl){
                    if (this.activeCtrl.type){
                        switch( this.activeCtrl.type ){
                            case 'radius':
                                let radius = this.activeCtrl.node.x - pt.x;
                                if (radius<0) radius = 0;
                                this.activeCtrl.node.options.radius = radius;
                                break;
                            case 'start':
                                theta = Geometry.calcAngleFromXAxis( this.activeCtrl.node, pt );
                                this.activeCtrl.node.options.start = theta;
                                break;
                            case 'end':
                                theta = Geometry.calcAngleFromXAxis( this.activeCtrl.node, pt );
                                this.activeCtrl.node.options.end = theta;
                                break;
                        }
                    }else{
                        this.activeCtrl.x = pt.x;
                        this.activeCtrl.y = pt.y;
                    }
                    this.render();
                }if (this.activeNode){
                    this.activeNode.x = pt.x;
                    this.activeNode.y = pt.y;
                    this.render();
                }
            }
        });

        canvas.addEventListener( 'pointerup', (evt) => {
            this.pointerDown = false;
            this.render(true);
        });

        this.menu = new Menu( this, [ 
            { name: 'Delete', code: 'deleteNode()'},
            { name: 'Insert', code: 'insertNode()'},
            { name: 'Change', code: 'changeNode()'}
        ]);

        this.preview = new Preview();

        this.resize();
    }

    loadPath( name ){
        const data = this.store.read( name );
        if (data){
            this.nodes = data.nodes;
            for (const [key, value] of Object.entries(data.config)) {
                this.config[key] = value;
            }
            this.activePath = name;
            this.store.activePath = name;
        } 
        this.render();
        this.gui.controllersRecursive().forEach( controller => controller.updateDisplay() );
    }

    deletePath(){
        if ( this.activePath == null ) return;

        this.store.delete( this.activePath );
        const names = this.store.getPathNames();
        this.nameCtrl = this.nameCtrl.options( names );
        this.nameCtrl.onChange( ( value ) => {
            this.loadPath( value );
        });

        if ( names.length > 0) this.loadPath( names[0] );
    }

    export(){
        let unitScalar;
        switch ( this.config.units ){
            case 'm':
                unitScalar = 1;
                break;
            case 'cm':
                unitScalar = 0.01;
                break;
            case 'mm':
                unitScalar = 0.001;
                break;
        }
        let str = "const shape = new THREE.Shape();\n";
        this.nodes.forEach( node => {
            switch( node.tool ){
                case "moveTo":
                    str = `${str}shape.moveTo( ${node.x * unitScalar}, ${-node.y * unitScalar });\n`;
                    break;
                case "lineTo":
                    str = `${str}shape.lineTo( ${node.x * unitScalar}, ${-node.y * unitScalar });\n`;
                    break;
                case "quadraticCurveTo":
                    str = `${str}shape.quadraticCurveTo( ${node.options.ctrlA.x * unitScalar}, ${-node.options.ctrlA.y * unitScalar}, ${node.x}, ${-node.y });\n`;
                    break;
                case "bezierCurveTo":
                    str = `${str}shape.bezierCurveTo( ${node.options.ctrlA.x * unitScalar}, ${-node.options.ctrlA.y * unitScalar}, ${node.options.ctrlB.x * unitScalar}, ${-node.options.ctrlB.y * unitScalar}, ${node.x}, ${-node.y });\n`;
                    break;
                case 'arc':
                    str = `${str}shape.absarc( ${node.x * unitScalar}, ${-node.y * unitScalar}, ${node.options.radius* unitScalar}, ${-node.options.start}, ${-node.options.end}, ${(node.options.clockwise) ? 'true' : 'false'} );\n`;
                    const pt = Geometry.calcPointOnCircle( node.x, node.y, node.options.radius, node.options.end );
                    str = `${str}shape.moveTo( ${pt.x* unitScalar}, ${-pt.y * unitScalar} );\n`;
                    break;
            }
        })

        navigator.clipboard.writeText(str);

        alert( "Code copied to the clipboard" );
    }

    deleteNode(){
        //Called by context menu
        if (this.activeNode){
            const index = this.nodes.indexOf( this.activeNode );
            if (index!=-1){
                this.nodes.splice( index, 1 );
                this.activeNode = null;
            }
            this.render(true);
        }
    }

    insertNode( ){
        //Called by context menu
        const pt = this.menu.position;
        const prevPt = {};
        let found = false;

        this.nodes.forEach( node => {
            if ( !found ){
                const pt1 = this.graph.convertPathToScreen( node.x, node.y );

                if ( node.tool == 'lineTo' && prevPt.x != undefined ){    
                    if ( Geometry.calcIsInsideThickLineSegment( prevPt, pt1, pt, 10 ) ){
                        const index = this.nodes.indexOf( node );
                        this.addNode( this.config.tool, pt.x, pt.y, index );
                        found = true;
                    }
                }

                prevPt.x = pt1.x;
                prevPt.y = pt1.y;
            }
        })
    }

    changeNode(){
        //Called by context menu
        if (this.activeNode){
            const index = this.nodes.indexOf( this.activeNode );
            if (index!=-1){
                const node = this.nodes[index];
                if (node.tool == this.config.tool) return;
                if (index == 0){
                    //Only moveTo allowed
                    if (this.config.tool != 'moveTo'){
                        alert("You can only change the first node to 'moveTo'");
                        return;
                    }
                    node.tool = this.config.tool;
                    delete node.options;
                }else{
                    const prevNode = this.nodes[index-1];
                    node.tool = this.config.tool;
                    delete node.options;
                    let ctrlA, ctrlB, center;
                    switch( node.tool ){
                        case 'quadraticCurveTo':
                            ctrlA = Geometry.calcLineMidPoint( prevNode, node );
                            node.options = { ctrlA };
                            break;
                        case 'bezierCurveTo':
                            ctrlA = Geometry.calcPointAlongLine( prevNode, node, 0.33 );
                            ctrlB = Geometry.calcPointAlongLine( prevNode, node, 0.66 );
                            node.options = { ctrlA, ctrlB };
                            break;
                        case 'arc':
                            const radius = Geometry.distanceBetweenPoints( prevNode, node );
                            node.options = { radius, start: 0, end: Math.PI/2, clockwise: false };
                            break;
                    }
                }
                this.render(true);
            }
        }
    }

    newPath(){
        const names = this.store.getPathNames();
        const name = this.store.nextPathName;
        names.push( name );

        this.nameCtrl = this.nameCtrl.options( names );
        this.nameCtrl.onChange( ( value ) => {
            this.loadPath( value );
        });
        
        this.config.yAxis = 0.1;
        this.config.xAxis = 0.1;
        this.config.xMax = 5;
        this.config.scale = 50;
        this.config.snap = true;
        this.config.name = name;
        this.config.tool = 'select';
        this.config.depth = 0.5;
        
        this.gui.controllers.forEach( controller => controller.updateDisplay() );
        //this.nameCtrl.updateDisplay();

        this.activeNode = null;
        this.nodes = [];

        this.activePath = name;

        this.render(true);
    }

    copyPath(){
        const name = this.store.copy();
        this.loadPath( name );
        const names = this.store.getPathNames();
        //names.push( name );
        this.nameCtrl = this.nameCtrl.options( names );
        this.nameCtrl.onChange( ( value ) => {
            this.loadPath( value );
        });
        this.nameCtrl.updateDisplay();
    }

    savePath(){
        const data = {
            config: this.config,
            nodes: this.nodes
        }

        localStorage.setItem( this.config.name, JSON.stringify( data ));
    }

    selectNode( x, y ){
        let activeNode = null;
        const xOrg = this.canvas.width * this.config.yAxis;
        const scale = (this.canvas.width * 0.95 - xOrg)/ this.config.xMax;
        const tolerance = (9.0/scale) * (9.0/scale);
        this.nodes.forEach( node => {
            const x1 = node.x - x;
            const y1 = node.y - y;
            const sqDist = x1*x1 + y1*y1;
            if (sqDist<tolerance) activeNode = node;
        });
        if (activeNode) this.activeCtrl = null;
        return activeNode;
    }

    selectCtrl( x, y ){
        let activeCtrl = null;
        const xOrg = this.canvas.width * this.config.yAxis;
        const scale = (this.canvas.width * 0.95 - xOrg)/ this.config.xMax;
        const tolerance = (7.0/scale) * (7.0/scale);
        const ctrls = [ 'ctrlA', 'ctrlB', 'radius', 'start', 'end', 'clockwise' ];
        this.nodes.forEach( node => {
            if (node.options){
                if ( activeCtrl == null){
                    ctrls.forEach( ctrlName => {
                        if (activeCtrl == null ){
                            let ctrl;
                            switch(ctrlName){
                                case 'ctrlA':
                                case 'ctrlB':
                                    ctrl = node.options[ctrlName];
                                    break;
                                case 'radius':
                                    ctrl = Geometry.calcPointOnCircle( node.x, node.y, node.options.radius, Math.PI );
                                    ctrl.type = 'radius';
                                    ctrl.node = node;
                                    break;
                                case 'start':
                                    ctrl = Geometry.calcPointOnCircle( node.x, node.y, node.options.radius, node.options.start );
                                    ctrl.type = 'start';
                                    ctrl.node = node;
                                    break;
                                case 'end':
                                    ctrl = Geometry.calcPointOnCircle( node.x, node.y, node.options.radius, node.options.end );
                                    ctrl.type = 'end';
                                    ctrl.node = node;
                                    break;
                                case 'clockwise':
                                    ctrl = { x: node.x, y: node.y + 20/scale, node, type: ctrlName };
                                    break;
                            }
                            if ( ctrl){
                                const x1 = ctrl.x - x;
                                const y1 = ctrl.y - y;
                                const sqDist = x1*x1 + y1*y1;
                                if (sqDist<tolerance) activeCtrl = ctrl;
                            }
                        }
                    });
                }
            }
        })
        return activeCtrl;
    }

    addNode( tool, x, y, insertIndex = -1 ){
        let pt = this.graph.convertScreenToPath( x, y );
        const node = { tool, x: pt.x, y: pt.y };
        this.activeNode = node;
        if (insertIndex != -1){
            this.nodes.splice( insertIndex, 0, node );
        }else{
            this.nodes.push( node );
        }
        const prevNode = ( insertIndex == -1 ) ? this.nodes[ this.nodes.length - 2 ] : this.nodes[ insertIndex - 1 ];

        let ptB;

        switch ( tool ){
            case 'quadraticCurveTo':
                pt = Geometry.calcLineMidPoint( prevNode, node );
                node.options = { ctrlA: pt };
                break;
            case 'bezierCurveTo':
                pt = Geometry.calcPointAlongLine( prevNode, node, 0.66 );
                ptB = Geometry.calcPointAlongLine( prevNode, node, 0.33 );
                node.options = { ctrlA: pt, ctrlB: ptB };
                break;
            case 'arc':
                const radius = ( prevNode ) ? Geometry.calcDistanceBetweenTwoPoints( prevNode, node ) : 0.5;
                node.options = { radius, start: 0, end: Math.PI*2, clockwise: false };
                break;
        }

        this.render(true);
    }

    resize(){
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.render();
    }

    render(save = false){
        this.graph.render( this.nodes, this.activeNode, this.activeCtrl );

        if (save) this.store.write( this.config, this.nodes );
    }
}

const app = new App();
window.app = app;