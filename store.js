export class Store{
    static namespace = "THREEJS-PATH-EDITOR";

    constructor(){
        this.udoArr = [];
    }

    udo(){
        const data = this.udoArr.pop();
        if (data){
            localStorage.setItem(Store.namespace, data );
            return true;
        }
        return false;
    }

    write( config, nodes ) {
        const serializedData = localStorage.getItem( Store.namespace );
        const data = serializedData ? JSON.parse(serializedData) : {};
        const config1 = {};
        for (const [key, value] of Object.entries(config)) {
            if (typeof value != "function" ) config1[key] = value;
        }
        this.udoArr.push( JSON.stringify(data) );
        if (this.udoArr.length>6) this.udoArr.shift();
        const path = { config: config1, nodes };
        data[config.name] = path;
        data['activePath'] = config.name;
        localStorage.setItem(Store.namespace, JSON.stringify(data));
    }
       
    read( key ) {
        const serializedData = localStorage.getItem( Store.namespace );
        const data = JSON.parse(serializedData);
        return data ? data[key] : undefined;
    }

    delete( key ){
        const serializedData = localStorage.getItem( Store.namespace );
        const data = JSON.parse(serializedData);
        delete data[key];
        localStorage.setItem(Store.namespace, JSON.stringify(data));
    }

    getPathNames(){
        const names = [];
        const serializedData = localStorage.getItem( Store.namespace );
        if (serializedData==null) return ['Path1'];
        const data = JSON.parse(serializedData);
        for (const [key, value] of Object.entries(data)) {
            if (key != 'activePath' && key != 'tips') names.push( key );
        }
        return names;
    }

    copy(){
        let name = this.read( 'activePath' );
        if (name){
            const path = this.read( name );
            if (path){
                name = this.nextPathName;
                path.config.name = name;
                this.write( path.config, path.nodes );
                return name;
            }
        }
    }

    get nextPathName(){
        const names = this.getPathNames();
        if (names.length == 0 ) return "Path1";
        const lastName = names.pop();
        const lastIndex = Number(lastName.substring(4));
        return `Path${lastIndex + 1}`;
    }

    get activePath(){
        const key = this.read( 'activePath' );
        return this.read( key );
    }

    set activePath( value ){
        const serializedData = localStorage.getItem( Store.namespace );
        const data = serializedData ? JSON.parse(serializedData) : {};
        data['activePath'] = value;
        localStorage.setItem(Store.namespace, JSON.stringify(data));
    }

    get tipsShown(){
        let tips = this.read( 'tips' );
        if (tips == undefined) tips = [ false, false, false, false, false, false ];
        return tips;
    }

    set tipShown( index ){
        const serializedData = localStorage.getItem( Store.namespace );
        const data = serializedData ? JSON.parse(serializedData) : {};
        if (data['tips']==undefined) data['tips'] = [ false, false, false, false, false, false ];
        data['tips'][index] = true;
        localStorage.setItem(Store.namespace, JSON.stringify(data));
    }
}