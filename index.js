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

        let activePath = this.store.read( 'activePath' );
        if (activePath==null) activePath = "Path1";

        this.config = { yAxis: 0.5, xAxis: 0.5, xMax: 2, units: 'm', snap: true,
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
                if (this.config.holes){
                    this.preview.show( this.nodes, this.config.depth, this.ghosts.paths );
                }else{
                    this.preview.show( this.nodes, this.config.depth );
                }
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
            tool: 'select', depth: 0.2,
            snap: false,
            holes: false
        };

        this.graph = new Graph( canvas, this.config );

        const pathNames = this.store.getPathNames();

        const gui = new GUI();
        const config = gui.addFolder( 'Settings' );
        config.add( this.config, 'xAxis', 0, 1).onChange( value => this.render() );
        config.add( this.config, 'yAxis', 0, 1).onChange( value => this.render() );
        config.add( this.config, 'xMax', 0.5, 10, 1).onChange( value => this.render() );
        //gui.add( this.config, 'scale', 0, 100).name('scale (%)');
        config.add( this.config, 'units', [ 'm', 'cm', 'mm' ] );
        config.add( this.config, 'depth', 0.02, 2 ).name('extrude depth');
        config.add( this.config, 'snap');
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
        const backdrop = gui.addFolder( 'Backdrop' );
        backdrop.add( this.config, 'holes' ).name('Use ghosts as holes');
        backdrop.close();

        const ghosts = backdrop.addFolder( 'Ghosts' );

        this.ghosts = { folder: ghosts, paths: {}, settings: {}, ctrls: [] };
        
        this.gui = gui;
        this.updatePathNamesGUI();

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
                if (this.activeCtrl == null){
                    pt.x = evt.x;
                    pt.y = evt.y;
                    this.addNode( this.config.tool, pt.x, pt.y );
                }else if (this.activeCtrl.type == 'clockwise'){
                    //Just flip the direction
                    this.activeCtrl.node.options.clockwise = !this.activeCtrl.node.options.clockwise;
                    this.activeCtrl = null;
                }
            }
            this.render();
            if (this.tipActive){
                this.tipActive = false;
            }else{
                this.showTip();
            }
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
                    if (this.config.snap) this.graph.snapToGrid(pt);
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

    showTip(){
        const tipsShown = this.store.tipsShown;
        let count = 0;
        tipsShown.forEach( tip => {
            if ( tip ) count++ 
        } );
        if (count == tipsShown.length) return;

        const tips = [
            "Select a tool",
            "When editing a curve the green dots are the control points",
            "When editing an arc, orange is the radius, green the start angle and red the end angle. The grey triangle lets you flip the direction.",
            "Use Backdrop Ghosts to display a Path(s) while editing another.",
            "Snap makes positioning snap to the grid",
            "Backdrop 'Use Ghosts as holes' will convert the dotted line paths into holes when using the 'show' or 'export' buttons."
        ]

        let index;

        if ( this.config.tool == 'select' && !tipsShown[0]){
            index = 0;
        }else if ( this.config.tool.includes( 'CurveTo') && !tipsShown[1]){
            index = 1;
        }else if (this.config.tool == 'arc' && !tipsShown[2]){
            index = 2;
        }else{
            index = 3;
            while(index < tips.length){
                if (!tipsShown[index]) break;
                index++;
            }
            if (index >= tips.length) return;
        }

        alert( tips[index] );
        this.store.tipShown = index;
        this.tipActive = true;
    }

    updatePathNamesGUI(){
        //this.ghosts = { folder: backdrop, settings: {}, ctrls: {} };
        const pathNames = this.store.getPathNames();

        //Remove settings and ctrls that are no longer in the pathNames array
        for( const [ key, value ] of Object.entries(this.ghosts.settings) ){
            const index = pathNames.indexOf( key );
            if (index == -1){
                delete this.ghosts.settings[ key ];
                this.ghosts.ctrls[ key ].destroy();
                delete this.ghosts.ctrls[ key ];
            }
        }

        //Add new settings and ctrls
        pathNames.forEach( name => {
            if ( this.ghosts.settings[name] == undefined ){
                this.ghosts.settings[name] = false;
                const ctrl = this.ghosts.folder.add( this.ghosts.settings, name ).onChange( value => {
                    if ( value ){
                        try{
                            const path = this.store.read( name ).nodes;
                            this.ghosts.paths[name] = path;
                        }catch(e){
                            console.warn( e.message );
                        }
                    }else{
                        delete this.ghosts.paths[name];
                    } 
                
                    this.render();

                } );
                this.ghosts.ctrls[name] = ctrl;
            }
        });
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
        this.updatePathNamesGUI();
    }

    export(){
        let unitScalar, precision;
        switch ( this.config.units ){
            case 'm':
                unitScalar = 1;
                precision = 3;
                break;
            case 'cm':
                unitScalar = 0.01;
                precision = 5;
                break;
            case 'mm':
                unitScalar = 0.001;
                precision = 6;
                break;
        }
        let str = "const shape = new THREE.Shape();\n";

        this.nodes.forEach( node => {
            switch( node.tool ){
                case "moveTo":
                    str = `${str}shape.moveTo( ${(node.x * unitScalar).toFixed( precision )} , ${(-node.y * unitScalar).toFixed( precision ) });\n`;
                    break;
                case "lineTo":
                    str = `${str}shape.lineTo( ${(node.x * unitScalar).toFixed( precision )}, ${(-node.y * unitScalar).toFixed( precision ) });\n`;
                    break;
                case "quadraticCurveTo":
                    str = `${str}shape.quadraticCurveTo( ${(node.options.ctrlA.x * unitScalar).toFixed( precision )}, ${(-node.options.ctrlA.y * unitScalar).toFixed( precision )}, ${(node.x * unitScalar).toFixed( precision )}, ${(-node.y * unitScalar).toFixed( precision ) };\n`;
                    break;
                case "bezierCurveTo":
                    str = `${str}shape.bezierCurveTo( ${(node.options.ctrlA.x * unitScalar).toFixed( precision )}, ${(-node.options.ctrlA.y * unitScalar).toFixed( precision )}, ${(node.options.ctrlB.x * unitScalar).toFixed( precision )}, ${(-node.options.ctrlB.y * unitScalar).toFixed( precision )}, ${(node.x * unitScalar).toFixed( precision )}, ${(-node.y * unitScalar).toFixed( precision ) });\n`;
                    break;
                case 'arc':
                    str = `${str}shape.absarc( ${(node.x * unitScalar).toFixed( precision )}, ${(-node.y * unitScalar).toFixed( precision )}, ${(node.options.radius * unitScalar).toFixed( precision )}, ${-node.options.start.toFixed( 3 )}, ${-node.options.end.toFixed( 3 )}, ${(node.options.clockwise) ? 'true' : 'false'} );\n`;
                    const pt = Geometry.calcPointOnCircle( node.x, node.y, node.options.radius, node.options.end );
                    str = `${str}shape.moveTo( ${(pt.x* unitScalar).toFixed( precision )}, ${(-pt.y * unitScalar).toFixed( precision )} );\n`;
                    break;
            }
        })

        if (this.config.holes){
            let index = 1;

            for( const [key, nodes] of Object.entries( this.ghosts.paths)){
                const path = `path${index++}`;
                str = `${str}const ${path} = new THREE.Path()\n`;

                nodes.forEach( node => {
                    switch( node.tool ){
                        case "moveTo":
                            str = `${str}${path}.moveTo( ${(node.x * unitScalar).toFixed( precision )} , ${(-node.y * unitScalar).toFixed( precision ) });\n`;
                            break;
                        case "lineTo":
                            str = `${str}${path}.lineTo( ${(node.x * unitScalar).toFixed( precision )}, ${(-node.y * unitScalar).toFixed( precision ) });\n`;
                            break;
                        case "quadraticCurveTo":
                            str = `${str}${path}.quadraticCurveTo( ${(node.options.ctrlA.x * unitScalar).toFixed( precision )}, ${(-node.options.ctrlA.y * unitScalar).toFixed( precision )}, ${(node.x * unitScalar).toFixed( precision )}, ${(-node.y * unitScalar).toFixed( precision ) });\n`;
                            break;
                        case "bezierCurveTo":
                            str = `${str}${path}.bezierCurveTo( ${(node.options.ctrlA.x * unitScalar).toFixed( precision )}, ${(-node.options.ctrlA.y * unitScalar).toFixed( precision )}, ${(node.options.ctrlB.x * unitScalar).toFixed( precision )}, ${(-node.options.ctrlB.y * unitScalar).toFixed( precision )}, ${(node.x * unitScalar).toFixed( precision )}, ${(-node.y * unitScalar).toFixed( precision ) });\n`;
                            break;
                        case 'arc':
                            str = `${str}${path}.absarc( ${(node.x * unitScalar).toFixed( precision )}, ${(-node.y * unitScalar).toFixed( precision )}, ${(node.options.radius * unitScalar).toFixed( precision )}, ${-node.options.start.toFixed( 3 )}, ${-node.options.end.toFixed( 3 )}, ${(node.options.clockwise) ? 'true' : 'false'} );\n`;
                            const pt = Geometry.calcPointOnCircle( node.x, node.y, node.options.radius, node.options.end );
                            str = `${str}${path}.moveTo( ${(pt.x* unitScalar).toFixed( precision )}, ${(-pt.y * unitScalar).toFixed( precision )} );\n`;
                            break;
                    }
                });

                str = `${str}shape.holes.push(${path});\n`;
            }
        }

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
        
        this.config.yAxis = 0.5;
        this.config.xAxis = 0.5;
        this.config.xMax = 2;
        this.config.snap = false;
        this.config.name = name;
        this.config.tool = 'select';
        this.config.depth = 0.2;
        
        this.gui.controllers.forEach( controller => controller.updateDisplay() );
        //this.nameCtrl.updateDisplay();

        this.activeNode = null;
        this.nodes = [];

        this.activePath = name;

        this.render(true);
        this.updatePathNamesGUI();
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
        this.updatePathNamesGUI();
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
        if (this.config.snap) this.graph.snapToGrid( pt );
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
        this.graph.render( this.nodes, this.activeNode, this.activeCtrl, this.ghosts.paths );

        if (save) this.store.write( this.config, this.nodes );
    }
}

const app = new App();
window.app = app;