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

        this.config = { yAxis: 0.1, xAxis: 0.1, xMax: 5, scale: 50, snap: true,
            export: () => {
                console.log( 'Export' );
                this.export();
            }, 
            newPath: () => {
                console.log( 'New' );
                if ( confirm('Are you sure you want to clear the path?')){
                    this.newPath();
                }
            },
            show: () => {
                //console.log( 'Show' );
                this.preview.show( this.nodes );
                this.previewOn = true;
            },
            name: 'Path1',
            tool: 'select', depth: 0.5
         };

        const gui = new GUI();
        gui.add( this.config, 'xAxis', 0, 1).onChange( value => this.render() );
        gui.add( this.config, 'yAxis', 0, 1).onChange( value => this.render() );
        gui.add( this.config, 'xMax', 0.5, 10, 1).onChange( value => this.render() );
        gui.add( this.config, 'scale', 0, 100).name('scale (%)');
        gui.add( this.config, 'depth', 0.02, 20).name('extrude depth');
        gui.add( this.config, 'snap' );
        gui.add( this.config, 'tool', ['select', 'moveTo', 'lineTo']);
        gui.add( this.config, 'name');
        gui.add( this.config, 'newPath').name('New');
        gui.add( this.config, 'show');
        gui.add( this.config, 'export');

        window.addEventListener( 'resize', this.resize.bind(this) );

        this.nodes = [];
        this.activeNode = null;

        this.store = new Store();

        const activePath = this.store.read( 'activePath' );
        if (activePath){
            const data = this.store.read( activePath );
            if (data){
                this.nodes = data.nodes;
                for (const [key, value] of Object.entries(data.config)) {
                    this.config[key] = value;
                }
            } 
            this.render();
            gui.controllersRecursive().forEach( controller => controller.updateDisplay() );
        }

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
                this.addNode( this.config.tool, evt.x, evt.y );
                /*switch( this.config.tool ){
                    case 'moveTo':
                        this.addNode( 'moveTo', evt.x, evt.y );
                        break;
                    case 'lineTo':
                        this.addNode( 'lineTo', evt.x, evt.y );
                        break;
                }*/
            }
            this.render();
        }, false);

        canvas.addEventListener( 'pointermove', ( evt ) => {
            if (this.pointerDown && this.activeNode ){
                const pt = this.convertScreenToPath( evt.x, evt.y );
                this.activeNode.x = pt.x;
                this.activeNode.y = pt.y;
                this.render();
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

    export(){
        let str = "const shape = new THREE.Shape();\n";
        this.nodes.forEach( node => {
            switch( node.tool ){
                case "moveTo":
                    str = `${str}shape.moveTo( ${node.x}, ${node.y });\n`;
                    break;
                case "lineTo":
                    str = `${str}shape.lineTo( ${node.x}, ${node.y });\n`;
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
                node.tool = this.config.tool;
                this.render();
            }
        }
    }

    newPath(){
        this.config.yAxis = 0.1;
        this.config.xAxis = 0.1;
        this.config.xMax = 5;
        this.config.scale = 50;
        this.config.snap = true;
        this.config.name = 'Path2';
        this.config.tool = 'select';
        this.config.depth = 0.5;
        
        this.activeNode = null;
        this.nodes = [];

        this.render();
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
        })
        return activeNode;
    }

    addNode( tool, x, y, insertIndex = -1 ){
        const pt = this.convertScreenToPath( x, y );
        const node = { tool, x: pt.x, y: pt.y };
        this.activeNode = node;
        if (insertIndex != -1){
            this.nodes.splice( insertIndex, 0, node );
        }else{
            this.nodes.push( node );
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

    drawNode( node ){
        const pt = this.convertPathToScreen( node.x, node.y );
        switch( node.tool ){
            case 'moveTo':
                this.context.fillStyle = "#88f";
                this.context.strokeStyle = "#000";
                this.context.lineWidth = 1;
                this.context.beginPath();
                this.context.arc( pt.x, pt.y, 10, 0, Math.PI*2 );
                this.context.fill();
                if ( this.activeNode == node ) this.context.stroke();
                break;
            case 'lineTo':
                this.context.fillStyle = "#88f";
                this.context.strokeStyle = "#000";
                this.context.lineWidth = 1;
                this.context.beginPath();
                this.context.moveTo( this.prevPt.x, this.prevPt.y );
                this.context.lineTo( pt.x, pt.y );
                this.context.stroke();
                this.context.beginPath();
                this.context.arc( pt.x, pt.y, 10, 0, Math.PI*2 );
                this.context.fill();
                if ( this.activeNode == node ) this.context.stroke();
                break;
        }
        this.prevPt = pt;
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