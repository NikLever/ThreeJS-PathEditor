import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import * as THREE from "three";
import { Store } from "./store.js";
import { Menu } from "./menu.js";
import { Geometry } from "./geometry.js";
import { Preview } from "./preview.js";

class App{
    constructor(){
        const canvas = document.createElement('canvas');
        document.body.appendChild( canvas );
        this.canvas = canvas;
        this.context = canvas.getContext( '2d' );

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
            name: activePath,
            tool: 'select', depth: 0.5
         };

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
        gui.add( this.config, 'show');
        gui.add( this.config, 'export');
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
            const pt = this.convertScreenToPath( evt.x, evt.y );
            this.activeNode = this.selectNode( pt.x, pt.y );
            if ( this.activeNode == null){
                this.activeCtrl = this.selectCtrl( pt.x, pt.y );
                if (this.activeCtrl == null) this.addNode( this.config.tool, evt.x, evt.y );
            }
            this.render();
        }, false);

        canvas.addEventListener( 'pointermove', ( evt ) => {
            if (this.pointerDown ){
                const pt = this.convertScreenToPath( evt.x, evt.y );
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
            //this.activeNode = null;
            //this.render();
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
                    str = `${str}shape.absarc( ${node.x * unitScalar}, ${-node.y * unitScalar}, ${node.options.radius* unitScalar}, ${-node.options.start}, ${-node.options.end}, true );\n`;
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
            this.render();
        }
    }

    insertNode( ){
        //Called by context menu
        const pt = this.menu.position;
        const prevPt = {};
        let found = false;

        this.nodes.forEach( node => {
            if ( !found ){
                const pt1 = this.convertPathToScreen( node.x, node.y );

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
                            node.options = { radius, start: 0, end: Math.PI/2 };
                            break;
                    }
                }
                this.render();
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

        this.render();
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
        const ctrls = [ 'ctrlA', 'ctrlB', 'radius', 'start', 'end' ];
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
        let pt = this.convertScreenToPath( x, y );
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
                node.options = { radius, start: 0, end: Math.PI*2 };
                break;
        }

        this.render();
    }

    resize(){
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.render();
    }

    drawBg(){
        let x = this.canvas.width * this.config.yAxis;
        let y = this.canvas.height - this.canvas.height * this.config.xAxis;

        this.drawGrid( x, y );
        this.drawAxes( x, y );
    }

    drawAxes( x, y, lineWidth = 2 ){
        this.context.strokeStyle = "#88A";
        this.context.lineWidth = lineWidth;

        // yAxis
        this.context.beginPath();
        this.context.moveTo( x, 0 );
        this.context.lineTo( x, this.canvas.height );

        // xAxis
        this.context.moveTo( 0, y );
        this.context.lineTo( this.canvas.width, y );

        // Draw the Path
        this.context.stroke();
    }

    drawLightGrid( yAxis, pos, extent ){
        if ( extent < 5 ) return;

        const inc = ( extent < 30 ) ? extent/2 : extent/10;

        this.context.strokeStyle = "#AAD";
        this.context.lineWidth = 0.5;

        this.context.beginPath();

        if (yAxis){
            for( let x=pos; x<pos + extent; x+=inc){
                this.context.moveTo( x, 0 );
                this.context.lineTo( x, this.canvas.height );
            }
        }else{
            for( let y=pos; y<pos + extent; y+=inc){
                this.context.moveTo( 0, y );
                this.context.lineTo( this.canvas.width, y );
            }
        }

        // Draw the Path
        this.context.stroke();
    }

    drawGrid( x, y, lineWidth = 0.7 ){

        this.context.font = "12px Arial";
        this.context.textAlign = "center";
        this.context.textBaseline = "middle";

        const inc = (this.canvas.width * 0.95 - x)/ this.config.xMax;

        let num = 0;

        for( let xPos = x; xPos > 0; xPos -= inc){
            this.drawLightGrid( true, xPos-inc, inc );

            this.context.strokeStyle = "#99C";
            this.context.lineWidth = lineWidth;

            // y grid
            this.context.beginPath();
            this.context.moveTo( xPos, 0 );
            this.context.lineTo( xPos, this.canvas.height );

            // Draw the Path
            this.context.stroke();

            if (num){
                this.context.fillText( num, xPos, y + 10 );
            }

            num--;
        }

        num = 0;

        for( let xPos = x; xPos < this.canvas.width; xPos += inc){
            this.drawLightGrid( true, xPos, inc );

            this.context.strokeStyle = "#555";
            this.context.lineWidth = lineWidth;

            // y grid
            this.context.beginPath();
            this.context.moveTo( xPos, 0 );
            this.context.lineTo( xPos, this.canvas.height );

            // Draw the Path
            this.context.stroke();

            if (num){
                this.context.fillText( num, xPos, y + 10 );
            }

            num++;
        }

        num = 0;

        for( let yPos = y; yPos > 0; yPos -= inc){
            this.drawLightGrid( false, yPos-inc, inc );

            this.context.strokeStyle = "#555";
            this.context.lineWidth = lineWidth;

            // x grid
            this.context.beginPath();
            this.context.moveTo( 0, yPos );
            this.context.lineTo( this.canvas.width, yPos );

            // Draw the Path
            this.context.stroke();

            if (num){
                this.context.fillText( num, x - 8, yPos );
            }

            num++;
        }

        num = 0;

        for( let yPos = y; yPos < this.canvas.height; yPos += inc){
            this.drawLightGrid( false, yPos, inc );

            this.context.strokeStyle = "#558";
            this.context.lineWidth = lineWidth;

            // y grid
            this.context.beginPath();
            this.context.moveTo( 0, yPos );
            this.context.lineTo( this.canvas.width, yPos );

            // Draw the Path
            this.context.stroke();

            if (num){
                this.context.fillText( num, x - 10, yPos );
            }

            num--;
        }
    }

    convertScreenToPath( x, y ){
        const xOrg = this.canvas.width * this.config.yAxis;
        const yOrg = this.canvas.height - this.canvas.height * this.config.xAxis;
        const scale = (this.canvas.width * 0.95 - xOrg)/ this.config.xMax;
        return { x: ( x - xOrg ) / scale, y: ( y - yOrg ) / scale };
    }

    convertPathToScreen( x, y ){
        const xOrg = this.canvas.width * this.config.yAxis;
        const yOrg = this.canvas.height - this.canvas.height * this.config.xAxis;
        const scale = (this.canvas.width * 0.95 - xOrg)/ this.config.xMax;
        return { x: x * scale + xOrg, y: y * scale + yOrg };
    }

    scalePathValueToScreen( value ){
        const xOrg = this.canvas.width * this.config.yAxis;
        const scale = (this.canvas.width * 0.95 - xOrg)/ this.config.xMax;
        return value * scale;
    }

    drawCircle( x, y, radius, fill, stroke = false ){
        this.context.fillStyle = fill;
        if ( stroke ) this.context.strokeStyle = "#000";
        this.context.lineWidth = 1;
        this.context.beginPath();
        this.context.arc( x, y, radius, 0, Math.PI*2 );
        this.context.fill();
        if ( stroke ) this.context.stroke();
    }

    drawNode( node ){
        const pt = this.convertPathToScreen( node.x, node.y );
        let ptA, ptB;
        let active = ( this.activeNode == node );
        switch( node.tool ){
            case 'moveTo':
                this.drawCircle( pt.x, pt.y, 8, "#88f", active );
                break;
            case 'lineTo':
                this.context.strokeStyle = (node == this.activeNode) ? "#000" : "#777";
                this.context.lineWidth = 1;
                this.context.beginPath();
                this.context.moveTo( this.prevPt.x, this.prevPt.y );
                this.context.lineTo( pt.x, pt.y );
                this.context.stroke();
                this.drawCircle( pt.x, pt.y, 8, "#88f", active );
                break;
            case 'quadraticCurveTo':
                try{
                    this.context.fillStyle = "#88f";
                    this.context.strokeStyle = (node == this.activeNode || node.options.ctrlA == this.activeCtrl ) ? "#000" : "#777";
                    this.context.lineWidth = 1;
                    ptA = this.convertPathToScreen( node.options.ctrlA.x, node.options.ctrlA.y );
                    this.context.beginPath();
                    this.context.moveTo( this.prevPt.x, this.prevPt.y );
                    this.context.quadraticCurveTo( ptA.x, ptA.y, pt.x, pt.y );
                    this.context.stroke();
                    this.context.setLineDash([5, 5]);
                    this.context.beginPath();
                    this.context.moveTo( this.prevPt.x, this.prevPt.y );
                    this.context.lineTo( ptA.x, ptA.y );
                    this.context.lineTo( pt.x, pt.y );
                    this.context.stroke();
                    this.context.setLineDash([]);
                    this.drawCircle( ptA.x, ptA.y, 8, "#8f8", this.activeCtrl == node.options.ctrlA );
                }catch( e ){

                }
                this.drawCircle( pt.x, pt.y, 8, "#88f", active );
                break;
            case 'bezierCurveTo':
                try{
                    this.context.fillStyle = "#88f";
                    this.context.strokeStyle = (node == this.activeNode || node.options.ctrlA == this.activeCtrl || node.options.ctrlB == this.activeCtrl ) ? "#000" : "#777";
                    this.context.lineWidth = 1;
                    ptA = this.convertPathToScreen( node.options.ctrlA.x, node.options.ctrlA.y );
                    ptB = this.convertPathToScreen( node.options.ctrlB.x, node.options.ctrlB.y );
                    this.context.beginPath();
                    this.context.moveTo( this.prevPt.x, this.prevPt.y );
                    this.context.bezierCurveTo( ptA.x, ptA.y, ptB.x, ptB.y, pt.x, pt.y );
                    this.context.stroke();
                    this.context.setLineDash([5, 5]);
                    this.context.beginPath();
                    this.context.moveTo( this.prevPt.x, this.prevPt.y );
                    this.context.lineTo( ptB.x, ptB.y );
                    this.context.lineTo( ptA.x, ptA.y );
                    this.context.lineTo( pt.x, pt.y );
                    this.context.stroke();
                    this.context.setLineDash([]);
                    this.drawCircle( ptA.x, ptA.y, 8, "#8f8", this.activeCtrl == node.options.ctrlA );
                    this.drawCircle( ptB.x, ptB.y, 8, "#8f8", this.activeCtrl == node.options.ctrlB );
                }catch( e ){
                    console.log(`Problem displaying a bezier curve ${e.message}`);
                }
                this.drawCircle( pt.x, pt.y, 8, "#88f", active );
                break;
            case 'arc':
                this.context.fillStyle = "#88f";
                this.context.strokeStyle = (node == this.activeNode || node.options.start == this.activeCtrl || node.options.end == this.activeCtrl ) ? "#000" : "#777";
                this.context.lineWidth = 1;
                const radius = this.scalePathValueToScreen( node.options.radius );
                this.context.beginPath();
                this.context.arc( pt.x, pt.y, radius, node.options.start, node.options.end );
                this.context.stroke();
                this.drawCircle( pt.x, pt.y, 8, "#88f", active );
                ptA = Geometry.calcPointOnCircle( pt.x, pt.y, radius, Math.PI );
                active = this.isValueCtrlActive( 'radius' );
                this.drawCircle( ptA.x, ptA.y, 8, "#8f8", active );
                ptA = Geometry.calcPointOnCircle( pt.x, pt.y, radius, node.options.start );
                active = this.isValueCtrlActive( 'start' );
                this.drawCircle( ptA.x, ptA.y, 8, "#f88", active );
                ptA = Geometry.calcPointOnCircle( pt.x, pt.y, radius, node.options.end);
                active = this.isValueCtrlActive( 'end' );
                this.drawCircle( ptA.x, ptA.y, 8, "#f88", active );
                pt.x = ptA.x;
                pt.y = ptA.y;
                break;
        }
        this.prevPt = pt;
    }

    isValueCtrlActive( type ){
        if (this.activeCtrl == null ) return false;
        if (this.activeCtrl.node == null ) return false;
        return this.activeCtrl.type == type;
    }

    render(){
        this.context.clearRect( 0, 0, this.canvas.width, this.canvas.height );

        this.drawBg();
        this.nodes.forEach( node => this.drawNode( node ) );

        this.store.write( this.config, this.nodes );
    }
}

const app = new App();
window.app = app;