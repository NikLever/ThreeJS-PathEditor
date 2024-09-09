export class Menu{
    constructor( links ){
        this.menu = document.querySelector(".context-menu");
        this.menuState = 0;
        this.contextMenuActive = "block";
        this.addLinks( links );

        document.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.show(e);
          });

        // Event Listener for Close Context Menu when outside of menu clicked
        document.addEventListener("click", (e) => {
            if (e.button === 0) this.hide();
        });
        
        // Close Context Menu on Esc key press
        window.onkeyup =  (e) => {
            if (e.keyCode === 27) this.hide();
        }
    }

    addLinks( links ){

    }

    show(e) {
        if (this.menuState !== 1) {
            this.positionMenu(e);
          this.menuState = 1;
          this.menu.style.display = "block";
        }
    }

    hide(){
        if (this.menuState !== 0) {
            this.menuState = 0;
            this.menu.style.display = "none";
        }
    }

    getPosition(e) {
        let posx = 0;
        let posy = 0;
      
        if (!e) e = window.event;
      
        if (e.pageX || e.pageY) {
          posx = e.pageX;
          posy = e.pageY;
        } else if (e.clientX || e.clientY) {
          posx =
            e.clientX +
            document.body.scrollLeft +
            document.documentElement.scrollLeft;
          posy =
            e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
      
        return {
          x: posx,
          y: posy
        };
      }

      positionMenu(e) {
        let clickCoords = this.getPosition(e);
      
        let menuWidth = this.menu.offsetWidth + 4;
        let menuHeight = this.menu.offsetHeight + 4;
      
        let windowWidth = window.innerWidth;
        let windowHeight = window.innerHeight;
      
        if (windowWidth - clickCoords.x < menuWidth) {
          this.menu.style.left = windowWidth - menuWidth + "px";
        } else {
          this.menu.style.left = clickCoords.x + "px";
        }
      
        if (windowHeight - clickCoords.y < menuHeight) {
          this.menu.style.top = windowHeight - menuHeight + "px";
        } else {
          this.menu.style.top = clickCoords.y + "px";
        }
      }
}