import { Geometry } from "./geometry.js";

export class Graph{
    constructor( canvas, config ){
        this.canvas = canvas;
        this.config = config;
        this.context = canvas.getContext( '2d' );
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

    drawCircle( x, y, radius, fill, stroke = false ){
        this.context.fillStyle = fill;
        if ( stroke ) this.context.strokeStyle = "#000";
        this.context.lineWidth = 1;
        this.context.beginPath();
        this.context.arc( x, y, radius, 0, Math.PI*2 );
        this.context.fill();
        if ( stroke ) this.context.stroke();
    }

    drawArrow( x, y, radius, fill, left ){
        this.context.fillStyle = fill;
        let pt;
        let theta = (left) ? Math.PI : 0;
        const inc = Math.PI / 1.5;
        this.context.beginPath();
        pt = Geometry.calcPointOnCircle( x, y, radius, theta );
        this.context.moveTo( pt.x, pt.y );
        for( let i=0; i<3; i++){
            theta += inc;
            pt = Geometry.calcPointOnCircle( x, y, radius, theta );
            this.context.lineTo( pt.x, pt.y );
        }
        this.context.fill();
    }

    drawNode( node, activeNode, activeCtrl ){
        const pt = this.convertPathToScreen( node.x, node.y );
        let ptA, ptB;
        let active = ( activeNode == node );
        switch( node.tool ){
            case 'moveTo':
                this.drawCircle( pt.x, pt.y, 8, "#88f", active );
                break;
            case 'lineTo':
                this.context.strokeStyle = (node == activeNode) ? "#000" : "#777";
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
                    this.drawCircle( ptA.x, ptA.y, 8, "#8f8", activeCtrl == node.options.ctrlA );
                }catch( e ){

                }
                this.drawCircle( pt.x, pt.y, 8, "#88f", active );
                break;
            case 'bezierCurveTo':
                try{
                    this.context.fillStyle = "#88f";
                    this.context.strokeStyle = (node == activeNode || node.options.ctrlA == activeCtrl || node.options.ctrlB == activeCtrl ) ? "#000" : "#777";
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
                    this.drawCircle( ptA.x, ptA.y, 8, "#8f8", activeCtrl == node.options.ctrlA );
                    this.drawCircle( ptB.x, ptB.y, 8, "#8f8", activeCtrl == node.options.ctrlB );
                }catch( e ){
                    console.log(`Problem displaying a bezier curve ${e.message}`);
                }
                this.drawCircle( pt.x, pt.y, 8, "#88f", active );
                break;
            case 'arc':
                this.context.fillStyle = "#88f";
                this.context.strokeStyle = (node == this.activeNode || node.options.start == activeCtrl || node.options.end == activeCtrl ) ? "#000" : "#777";
                this.context.lineWidth = 1;
                const radius = this.scalePathValueToScreen( node.options.radius );
                this.context.beginPath();
                this.context.arc( pt.x, pt.y, radius, node.options.start, node.options.end, node.options.clockwise );
                this.context.stroke();
                this.drawCircle( pt.x, pt.y, 8, "#88f", active );
                ptA = Geometry.calcPointOnCircle( pt.x, pt.y, radius, Math.PI );
                active = this.isValueCtrlActive( 'radius' );
                this.drawCircle( ptA.x, ptA.y, 8, "#ea0", active );
                ptA = Geometry.calcPointOnCircle( pt.x, pt.y, radius, node.options.start );
                active = this.isValueCtrlActive( 'start' );
                this.drawCircle( ptA.x, ptA.y, 8, "#8f8", active );
                ptA = Geometry.calcPointOnCircle( pt.x, pt.y, radius, node.options.end);
                active = this.isValueCtrlActive( 'end' );
                this.drawCircle( ptA.x, ptA.y, 8, "#f88", active );
                pt.y += 20;
                if (node.options.clockwise==null) node.options.clockwise = false;
                this.drawArrow( pt.x, pt.y, 8, "#aaa", node.options.clockwise );
                pt.x = ptA.x;
                pt.y = ptA.y;
                break;
        }
        this.prevPt = pt;
    }

    drawGhosts( ghosts ){
        this.context.strokeStyle = "#333";
        this.context.setLineDash([5, 10]);
                            
        this.context.beginPath();

        let pt, ptA, ptB, radius;

        for( const [key, nodes] of Object.entries( ghosts )){
            try{
                nodes.forEach( node => {
                    pt = this.convertPathToScreen( node.x, node.y );
                    switch( node.tool ){
                        case 'moveTo':
                            this.context.moveTo( pt.x, pt.y );
                            break;
                        case 'lineTo':
                            this.context.lineTo( pt.x, pt.y );
                            break;
                        case 'quadraticCurveTo':
                            ptA = this.convertPathToScreen( node.options.ctrlA.x, node.options.ctrlA.y );
                            this.context.quadraticCurveTo( ptA.x, ptA.y, pt.x, pt.y );
                            break;
                        case 'bezierCurveTo':
                            ptA = this.convertPathToScreen( node.options.ctrlA.x, node.options.ctrlA.y );
                            ptB = this.convertPathToScreen( node.options.ctrlB.x, node.options.ctrlB.y );
                            this.context.bezierCurveTo( ptA.x, ptA.y, ptB.x, ptB.y, pt.x, pt.y );
                            break;
                        case 'arc':
                            radius = this.scalePathValueToScreen( node.options.radius );
                            this.context.arc( pt.x, pt.y, radius, node.options.start, node.options.end, node.options.clockwise );
                            break;
                    }
                });
            }catch(e){
                console.warn( e.message );
            }
        }

        this.context.stroke();

        this.context.setLineDash([]);
    }

    isValueCtrlActive( type ){
        if (this.activeCtrl == null ) return false;
        if (this.activeCtrl.node == null ) return false;
        return this.activeCtrl.type == type;
    }

    snapToGrid( pt ){
        pt.x = Math.round(pt.x * 10) / 10;
        pt.y = Math.round(pt.y * 10) / 10;
        //return { x, y };
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

    render( nodes, activeNode, activeCtrl, ghosts ){
        this.context.clearRect( 0, 0, this.canvas.width, this.canvas.height );

        this.drawBg();
        nodes.forEach( node => this.drawNode( node, activeNode, activeCtrl ) );

        if ( ghosts ) this.drawGhosts( ghosts );
    }
}