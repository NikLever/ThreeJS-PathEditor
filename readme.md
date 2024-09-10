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
Right click to change the tool for the active node. 

### Demo
View an online demo [here](https://niklever.com/apps/threejs-path-editor/)


