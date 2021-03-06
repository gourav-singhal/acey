import * as Cookies from 'es-cookie';
import config from './config'
import _ from 'lodash'

class LocalStoreManager {

    private LOCAL_STORAGE_KEYS_ID  = '_ascey_local_ids'
    private _keys: any = {};

    constructor(){
        if (config.isNextJS())
            return
        else if (config.isReactNative() && !this.engine())
            throw new Error("The local store engine should be set manually at the root of your app when using React-Native -> config.setStoreEngine(AsyncStore)")
        
        this._fetchKeys()
    }

    disabledError = () => {
        throw new Error("Local store is not accessible for one of these reasons.\n1. Local store doesn't work with NextJS.\n2. The local store engine should be set manually at the root of your app if using React-Native -> config.setStoreEngine(AsyncStore)")
    }

    public engine = () => config.getStoreEngine()

    public getKeys = () => this._keys
    public toString = () => JSON.stringify(this._keys)
    public toJSON = (keys: string) => this._keys = JSON.parse(keys)

    public isEnabled = (): boolean => !config.isNextJS() && !!this.engine()

    public addElement = (key: string, data: string, expires: number = 7) => {
        if (!this.engine()){
            return
        }

        if (!this.isEnabled())
            return this.disabledError()
        if (!config.isReactNative() && Cookies.get(key)){
            throw new Error("You've attempted to add to the local store, a data already present in the cookies. Cookies have priority over local store, empty your cookes linked with the key before performing this action.")
        }

        this.engine().setItem(key, data)
        this.addKey(key, expires)
    }

    public getElement = async (key: string) => {
        if (!this.isEnabled())
            return this.disabledError()

        const data = await this.engine().getItem(key)
        return data ? JSON.parse(data) : undefined
    }

    public removeElement = (key: string) => {
        if (!this.isEnabled())
            return this.disabledError()
        this.engine().removeItem(key)
        this.removeKey(key)
    }

    public addKey = (key: string, expires: number = 7) => {
        if (expires < 0) 
            throw new Error("expire value can't be negative.")
        if (!this.isEnabled())
            return this.disabledError()

        const d = new Date()
        d.setSeconds(d.getSeconds() + (expires * 86400));
        this.getKeys()[key] = d.toString()
        this.engine().setItem(this.LOCAL_STORAGE_KEYS_ID, this.toString())
    }

    public removeKey = (key: string) => {
        if (!this.isEnabled())
            return this.disabledError()
        if (this.getKeys()[key]){
            delete this.getKeys()[key]
            this.engine().setItem(this.LOCAL_STORAGE_KEYS_ID, this.toString())
        }
    }

    public getKeyExpiration = (key: string) => {
        if (!this.isEnabled())
            return this.disabledError()
        const dateString = this.getKeys()[key]
        return dateString ? new Date(dateString) : undefined
    }

    public prune = () => {
        if (!this.isEnabled())
            return this.disabledError()
        for (let key in this.getKeys()){
            this.engine().removeItem(key)
            delete this.getKeys()[key]
        }
    }

    private _fetchKeys = async () => {
        if (!this.isEnabled())
            return this.disabledError()
        const keys = await this.engine().getItem(this.LOCAL_STORAGE_KEYS_ID)
        !_.isEmpty(keys) && this.toJSON(keys)
        this._analyzeExpired()
    }

    private _analyzeExpired = () => {
        if (!this.isEnabled())
            return this.disabledError()
        const now = new Date()
        for (let key in this.getKeys()){
            const date = this.getKeyExpiration(key)
            date && date < now && this.removeKey(key)
        }
    }
}

export default LocalStoreManager