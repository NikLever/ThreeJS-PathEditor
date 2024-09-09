export class Store{
    static namespace = "THREEJS-PATH-EDITOR";

    constructor(){

    }

    write( key, value ) {
        const serializedData = localStorage.getItem( Store.namespace );
        const data = serializedData ? JSON.parse(serializedData) : {};
        data[key] = value;
        data['activePath'] = value.config.name;
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