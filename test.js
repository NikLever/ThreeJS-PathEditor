const shape = new THREE.Shape();
shape.moveTo( 0.000 , -0.500);
shape.lineTo( 0.400, -0.500);
shape.quadraticCurveTo( 0.994, -0.497, 1.000, 0.100;
shape.quadraticCurveTo( 1.004, 0.600, 0.400, 0.600;
shape.lineTo( 0.400, 1.000);
shape.lineTo( -0.400, 1.000);
shape.lineTo( -0.400, 0.600);
shape.quadraticCurveTo( -1.000, 0.599, -1.000, 0.100;
shape.quadraticCurveTo( -1.002, -0.498, -0.400, -0.500;
shape.lineTo( 0.000, -0.500);
const path1 = new THREE.Path()
path1.absarc( -0.002, 0.068, 0.328, 0, -6.283, false );
path1.moveTo( 0.326, 0.068 );
shape.holes.push(path1);
