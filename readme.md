# The ThreeJS Path Editor

For this years [js13kGames](https://js13kgames.com) competition. I submitted a WebXR game. To stay under 13k, you can't use glb files as assets. Instead you build them at runtime. I used ExtrudeGeometry a lot. This takes a ThreeJS Path as a parameter. I used a lot of graph paper designing the paths. For next year I decided to create an editor. 

Click the thumbnail to view a video\
[![Watch the video](https://img.youtube.com/vi/Zy4Myfd0XAI/default.jpg)](https://youtu.be/Zy4Myfd0XAI)

## Instructions

You can use the gui to position the x and y axes. And position the max x value visible. 
Your path is saved to localStorage with the name from the gui.

### Tutorial

- Select the moveTo tool. 
- Click to place the first point.
- Select the lineTo tool.
- Click to add lines.
- Right click to delete a node
- Right click over a line to insert a node
- Right click to change the tool to the active node. 
- The green nodes allow you to edit the control point for a curve.
- For an arc, orange adjusts the radius, green the start angle and red the end angle. The grey triangle when clicked flips the arc direction.

Click a blue node to select.
The current active line will be displayed in black.

### Settings
- **xAxis** the positioning of the xAxis. 0 axis will be at the bottom of the screen, 1 at the top
- **yAxis** the positioning of the yAxis. 0 axis will be at the left of the screen, 1 at the right
- **xMax** the maximum x axis value 
- **units** setting cm will scale the export value by 0.01, mm will scale by 0.001
- **extrudeDepth** the depth value used when displaying the 3d view of the extruded path
- **tool** the tool used when creating a new node or changing an existing node
- **snap** If checked then placement will snap to the grid.

### Commands
- **new** creates a new empty path. 
- **copy** creates a copy of the current path and switches to the copy
- **udo** Udo upto 6 times.
- **delete** deletes the current path
- **show** displays a ThreeJS 3D view of the extruded path
- **export** converts the path to ThreeJS code and copies this to the clipboard for copying into your project
**name** select a different path

### Backdrop
The backdrop folder can be used to view an existing path(s) while editing another. Just set the Ghosts > PathX as checked. If 'Use ghosts as holes' is checked then the ghosts will appear as holes in the 3D object when ***show*** is clicked. The code to add holes will also be added when using ***export*** 

### Tools
- **moveTo**
Click the screen to add.
- **lineTo**
Click the screen to add.
- **quadraticCurveTo:**
Click the screen to add. Then move the green control to shape the curve.
- **bezierCurveTo:**
Click the screen to add. Then move the green controls to shape the curve.
- **arc:**
Click the screen to add. Then move the orange control to change the radius, green to change the start angle and red to change the end angle. Click the arrow to change the arc direction. 

### Demo
View an online demo [here](https://niklever.com/apps/threejs-path-editor/)


