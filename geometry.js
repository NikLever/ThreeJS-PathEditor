export class Geometry{
    //Returns {.x, .y}, a projected point perpendicular on the (infinite) line.
    static calcNearestPointOnLine(line1, line2, pnt) {
        const L2 = ( ((line2.x - line1.x) * (line2.x - line1.x)) + ((line2.y - line1.y) * (line2.y - line1.y)) );
        if(L2 == 0) return false;
        const r = ( ((pnt.x - line1.x) * (line2.x - line1.x)) + ((pnt.y - line1.y) * (line2.y - line1.y)) ) / L2;

        return {
            x: line1.x + (r * (line2.x - line1.x)), 
            y: line1.y + (r * (line2.y - line1.y))
        };
    }

    //Returns float, the shortest distance to the (infinite) line.
    static calcDistancePointToLine(line1, line2, pnt) {
        const L2 = ( ((line2.x - line1.x) * (line2.x - line1.x)) + ((line2.y - line1.y) * (line2.y - line1.y)) );
        if(L2 == 0) return false;
        const s = (((line1.y - pnt.y) * (line2.x - line1.x)) - ((line1.x - pnt.x) * (line2.y - line1.y))) / L2;
        return Math.abs(s) * Math.sqrt(L2);
    }

    //Returns bool, whether the projected point is actually inside the (finite) line segment.
    static calcIsInsideLineSegment(line1, line2, pnt) {
        const L2 = ( ((line2.x - line1.x) * (line2.x - line1.x)) + ((line2.y - line1.y) * (line2.y - line1.y)) );
        if(L2 == 0) return false;
        const r = ( ((pnt.x - line1.x) * (line2.x - line1.x)) + ((pnt.y - line1.y) * (line2.y - line1.y)) ) / L2;

        return (0 <= r) && (r <= 1);
    }

    //The most useful function. Returns bool true, if the mouse point is actually inside the (finite) line, given a line thickness from the theoretical line away. It also assumes that the line end points are circular, not square.
    static calcIsInsideThickLineSegment(line1, line2, pnt, lineThickness) {
        const L2 = ( ((line2.x - line1.x) * (line2.x - line1.x)) + ((line2.y - line1.y) * (line2.y - line1.y)) );
        if(L2 == 0) return false;
        const r = ( ((pnt.x - line1.x) * (line2.x - line1.x)) + ((pnt.y - line1.y) * (line2.y - line1.y)) ) / L2;

        //Assume line thickness is circular
        if(r < 0) {
            //Outside line1
            return (Math.sqrt(( (line1.x - pnt.x) * (line1.x - pnt.x) ) + ( (line1.y - pnt.y) * (line1.y - pnt.y) )) <= lineThickness);
        } else if((0 <= r) && (r <= 1)) {
            //On the line segment
            const s = (((line1.y - pnt.y) * (line2.x - line1.x)) - ((line1.x - pnt.x) * (line2.y - line1.y))) / L2;
            return (Math.abs(s) * Math.sqrt(L2) <= lineThickness);
        } else {
            //Outside line2
            return (Math.sqrt(( (line2.x - pnt.x) * (line2.x - pnt.x) ) + ( (line2.y - pnt.y) * (line2.y - pnt.y) )) <= lineThickness);
        }
    }
}