export class Store{
    static namespace = "THREEJS-PATH-EDITOR";

    constructor(){

    }

    write( config, nodes ) {
        const serializedData = localStorage.getItem( Store.namespace );
        const data = serializedData ? JSON.parse(serializedData) : {};
        const config1 = {};
        for (const [key, value] of Object.entries(config)) {
            if (typeof value != "function" ) config1[key] = value;
        }
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

    get activePath(){
        const key = this.read( 'activePath' );
        return this.read( key );
    }
}