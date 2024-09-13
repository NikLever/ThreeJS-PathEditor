# The ThreeJS Path Editor

For this years [js13kGames](https://js13kgames.com) competition. I submitted a WebXR game. To stay under 13k, you can't use glb files as assets. Instead you build them at runtime. I used ExtrudeGeometry a lot. This takes a ThreeJS Path as a parameter. I used a lot of graph paper designing the paths. For next year I decided to create an editor. 

## Instructions

You can use the gui to position the x and y axes. And position the max x value visible. 
Your path is saved to localStorage with the name from the gui.

### Tutorial

Select the moveTo tool. 
Click to place the first point.
Select the lineTo tool
Click to add lines
Right click to delete a node
Right click over a line to insert a node
Right click to change the tool to the active node. 

Click a blue node to select.
The current active line will be displayed in black.

### Settings
- **xAxis** the positioning of the xAxis. 0 axis will be at the bottom of the screen, 1 at the top
- **yAxis** the positioning of the yAxis. 0 axis will be at the left of the screen, 1 at the right
- **xMax** the maximum x axis value 
- **units** setting cm will scale the export value by 0.01, mm will scale by 0.001
- **extrudeDepth** the depth value used when displaying the 3d view of the extruded path
- **tool** the tool used when creating a new node or changing an existing node

### Commands
- **new** creates a new empty path. 
- **copy** creates a copy of the current path and switches to the copy
- **delete** deletes the current path
- **show** displays a ThreeJS 3D view of the extruded path
- **export** converts the path to ThreeJS code and copies this to the clipboard for copying into your project
**name** select a different path

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


